import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Test database file path
const TEST_DB_PATH = path.join(__dirname, 'test.db');
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

// Global test database instance
let prisma: PrismaClient;

// Setup before all tests
beforeAll(async () => {
  // Set test database URL
  process.env.DATABASE_URL = TEST_DB_URL;

  // Remove existing test database if it exists
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  // Create new Prisma client for tests
  prisma = new PrismaClient({
    datasourceUrl: TEST_DB_URL,
  });

  // Create database schema for test database
  try {
    execSync('npx prisma db push --schema=./prisma/schema.test.prisma --accept-data-loss', {
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  }

  // Seed test data
  await seedTestData();
});

// Cleanup after each test
afterEach(async () => {
  // Clear all tables
  await prisma.$executeRaw`DELETE FROM "AgentActivityLog"`;
  await prisma.$executeRaw`DELETE FROM "Notification"`;
  await prisma.$executeRaw`DELETE FROM "ApiKey"`;
  await prisma.$executeRaw`DELETE FROM "Opportunity"`;
  await prisma.$executeRaw`DELETE FROM "AgentMetric"`;
  await prisma.$executeRaw`DELETE FROM "TradeMemory"`;
  await prisma.$executeRaw`DELETE FROM "MissedOpportunity"`;
  await prisma.$executeRaw`DELETE FROM "DecisionLog"`;
  await prisma.$executeRaw`DELETE FROM "TradeLog"`;
  await prisma.$executeRaw`DELETE FROM "Position"`;
  await prisma.$executeRaw`DELETE FROM "Portfolio"`;
  await prisma.$executeRaw`DELETE FROM "UserConfiguration"`;
  await prisma.$executeRaw`DELETE FROM "User"`;
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect from database
  await prisma.$disconnect();

  // Remove test database file
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

// Seed function for test data
async function seedTestData() {
  // Create test user
  const testUser = await prisma.user.create({
    data: {
      username: 'testuser',
      password: '$2a$10$hashedpassword', // bcrypt hash for 'testpass'
    },
  });

  // Create user configuration with bot status
  await prisma.userConfiguration.create({
    data: {
      userId: testUser.username,
      strategyConfig: JSON.stringify({
        global_settings: {
          botStatus: 'active',
        },
      }),
    },
  });

  // Create test portfolio
  await prisma.portfolio.create({
    data: {
      userId: testUser.username,
      balance: 100000,
      type: 'MAIN',
    },
  });
}

// Mock getServerSession for authentication tests
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Export prisma for use in tests
export { prisma };
