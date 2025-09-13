# Multi-stage build for optimal image size
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy source code BEFORE installing dependencies to ensure prisma schema is available
COPY . .

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install all dependencies (including dev dependencies for building)
RUN npm ci --legacy-peer-deps
RUN chown -R nextjs:nodejs /app/node_modules

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# Compile worker TypeScript to JavaScript
RUN npx tsc --project tsconfig.worker.json

# Production stage for Next.js app
FROM node:20-alpine AS app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package files
COPY package*.json ./

# Copy prisma schema BEFORE installing dependencies
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force
RUN chown -R nextjs:nodejs /app/node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy necessary config files
COPY --from=builder --chown=nextjs:nodejs /app/strategy_config_defaults.json ./
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check for the app
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Production stage for worker
FROM node:20-alpine AS worker

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package files
COPY package*.json ./

# Copy prisma schema BEFORE installing dependencies
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force
RUN chown -R nextjs:nodejs /app/node_modules

# Copy compiled worker and necessary files
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/strategy_config_defaults.json ./
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.worker.json ./

# Switch to non-root user
USER nextjs

# Health check for worker (check if the node process is running)
# This is more reliable than pgrep which may not be installed
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD ps | grep -v grep | grep worker.js || exit 1
