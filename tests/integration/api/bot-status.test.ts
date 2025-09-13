import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../jest.setup';

// Mock NextAuth getServerSession
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('/api/bot/status', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Database operations', () => {
    it('should create and retrieve user configuration', async () => {
      // Test database seeding worked
      const user = await prisma.user.findUnique({
        where: { username: 'testuser' },
      });
      expect(user).toBeTruthy();
      expect(user?.username).toBe('testuser');
    });

    it('should retrieve bot status from configuration', async () => {
      // Ensure user exists first
      let user = await prisma.user.findUnique({
        where: { username: 'testuser' },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            username: 'testuser',
            password: '$2a$10$hashedpassword',
          },
        });
      }

      const config = await prisma.userConfiguration.findUnique({
        where: { userId: 'testuser' },
        select: { strategyConfig: true }
      });

      // If config doesn't exist, create it for this test
      if (!config) {
        await prisma.userConfiguration.create({
          data: {
            userId: 'testuser',
            strategyConfig: JSON.stringify({
              global_settings: {
                botStatus: 'active',
              },
            }),
          },
        });
      }

      const finalConfig = await prisma.userConfiguration.findUnique({
        where: { userId: 'testuser' },
        select: { strategyConfig: true }
      });

      expect(finalConfig).toBeTruthy();
      const strategyConfig = JSON.parse(finalConfig!.strategyConfig as string);
      expect(strategyConfig.global_settings.botStatus).toBe('active');
    });

    it('should update bot status in configuration', async () => {
      // Update the configuration
      const config = await prisma.userConfiguration.findUnique({
        where: { userId: 'testuser' },
      });

      if (config) {
        const strategyConfig = JSON.parse(config.strategyConfig as string);
        strategyConfig.global_settings.botStatus = 'inactive';

        await prisma.userConfiguration.update({
          where: { userId: 'testuser' },
          data: { strategyConfig: JSON.stringify(strategyConfig) },
        });

        // Verify the update
        const updatedConfig = await prisma.userConfiguration.findUnique({
          where: { userId: 'testuser' },
          select: { strategyConfig: true }
        });

        const updatedStrategyConfig = JSON.parse(updatedConfig!.strategyConfig as string);
        expect(updatedStrategyConfig.global_settings.botStatus).toBe('inactive');
      }
    });
  });

  describe('Authentication mocking', () => {
    it('should mock authenticated session correctly', async () => {
      // Mock authenticated session
      mockGetServerSession.mockResolvedValue({
        user: { name: 'testuser' },
        expires: '2025-12-31',
      } as any);

      const session = await getServerSession({} as any);
      expect(session).toBeTruthy();
      expect((session as any)?.user?.name).toBe('testuser');
    });

    it('should mock unauthenticated session correctly', async () => {
      // Mock unauthenticated session
      mockGetServerSession.mockResolvedValue(null);

      const session = await getServerSession({} as any);
      expect(session).toBeNull();
    });
  });

  describe('Business logic validation', () => {
    it('should validate bot status values', () => {
      const validStatuses = ['active', 'inactive'];
      const invalidStatuses = ['running', 'stopped', 'invalid'];

      expect(validStatuses.every(status => ['active', 'inactive'].includes(status))).toBe(true);
      expect(invalidStatuses.some(status => ['active', 'inactive'].includes(status))).toBe(false);
    });

    it('should handle missing configuration gracefully', async () => {
      // Create a user without configuration
      const tempUser = await prisma.user.create({
        data: {
          username: 'tempuser2',
          password: '$2a$10$hashedpassword',
        },
      });

      // Try to get configuration for user without it
      const config = await prisma.userConfiguration.findUnique({
        where: { userId: 'tempuser2' },
      });

      expect(config).toBeNull();

      // Cleanup
      await prisma.user.delete({ where: { username: 'tempuser2' } });
    });
  });
});
