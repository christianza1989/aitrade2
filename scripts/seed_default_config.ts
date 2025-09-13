// scripts/seed_default_config.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const ADMIN_USERNAME = 'admin';

async function main() {
    console.log('🌱 Seeding default configuration...');

    // Check if admin user exists
    const adminUser = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });
    if (!adminUser) {
        console.error(`❌ Admin user '${ADMIN_USERNAME}' not found. Please create it first.`);
        return;
    }

    // Read the default configuration from JSON file
    const defaultsPath = path.join(process.cwd(), 'strategy_config_defaults.json');
    const defaultConfig = JSON.parse(await fs.readFile(defaultsPath, 'utf-8'));

    // Seed/update the configuration in database
    await prisma.userConfiguration.upsert({
        where: { userId: ADMIN_USERNAME },
        update: { strategyConfig: defaultConfig },
        create: { userId: ADMIN_USERNAME, strategyConfig: defaultConfig },
    });

    console.log(`✅ Default configuration seeded for user '${ADMIN_USERNAME}'.`);
    console.log('This configuration will be used as a template for new user registrations.');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
