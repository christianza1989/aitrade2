#!/bin/bash

# Pre-commit hook for fast local validation before Docker builds
# This script runs quick checks to catch issues early

echo "🔍 Running pre-commit validation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the project root?"
    exit 1
fi

echo "Running TypeScript type check..."
if npm run type-check > /dev/null 2>&1; then
    print_status "TypeScript check passed"
else
    print_error "TypeScript check failed"
    echo "Run 'npm run type-check' to see detailed errors"
    exit 1
fi

echo "Running ESLint check..."
if npm run lint > /dev/null 2>&1; then
    print_status "ESLint check passed"
else
    print_warning "ESLint check found issues (warnings/errors)"
    echo "Run 'npm run lint' to see details"
    # Don't fail on lint warnings, just warn
fi

echo "Running Docker config validation..."
if docker-compose config > /dev/null 2>&1; then
    print_status "Docker config validation passed"
else
    print_error "Docker config validation failed"
    echo "Run 'docker-compose config' to see details"
    exit 1
fi

print_status "All pre-commit checks passed! 🎉"
print_status "You can now safely run: docker-compose up --build"

exit 0
