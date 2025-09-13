import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'admin123'; // Change this to a secure password in production

  const existingUser = await prisma.user.findUnique({
    where: { username: ADMIN_USERNAME }
  });

  if (!existingUser) {
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await prisma.user.create({
      data: {
        username: ADMIN_USERNAME,
        password: hashedPassword,
      },
    });
    console.log('✅ Admin user created successfully');
  } else {
    console.log('ℹ️ Admin user already exists');
  }

  // Create default user configuration
  const adminUser = await prisma.user.findUnique({
    where: { username: ADMIN_USERNAME }
  });

  if (adminUser) {
    const existingConfig = await prisma.userConfiguration.findUnique({
      where: { userId: adminUser.username }
    });

    if (!existingConfig) {
      console.log('⚙️ Creating default user configuration...');
      await prisma.userConfiguration.create({
        data: {
          userId: adminUser.username,
          strategyConfig: {
            riskManagement: {
              maxPositionSize: 0.1,
              maxDrawdown: 0.05,
              stopLossPercentage: 0.02
            },
            trading: {
              enabled: true,
              maxConcurrentTrades: 5,
              minTradeAmount: 100
            }
          }
        }
      });
      console.log('✅ Default configuration created');
    } else {
      console.log('ℹ️ User configuration already exists');
    }

    // Create default portfolio
    const existingPortfolio = await prisma.portfolio.findFirst({
      where: { userId: adminUser.username, type: 'MAIN' }
    });

    if (!existingPortfolio) {
      console.log('💼 Creating default portfolio...');
      await prisma.portfolio.create({
        data: {
          userId: adminUser.username,
          balance: 100000, // Starting balance
          type: 'MAIN'
        }
      });
      console.log('✅ Default portfolio created');
    } else {
      console.log('ℹ️ Portfolio already exists');
    }
  }

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
