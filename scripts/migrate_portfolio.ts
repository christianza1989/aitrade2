// scripts/migrate_portfolio.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const ADMIN_USERNAME = 'admin'; // IMPORTANT: Specify the user who owns these records

interface PortfolioData {
    balance: number;
    positions: Array<{
        symbol: string;
        amount: number;
        entryPrice: number;
    }>;
}

async function main() {
    console.log('🌱 Starting portfolio.json migration...');

    // 1. Check and verify user exists
    const user = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });
    if (!user) {
        console.error(`❌ User '${ADMIN_USERNAME}' not found. Please create it first.`);
        return;
    }

    // 2. Read JSON file
    const filePath = path.join(process.cwd(), 'portfolio.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const portfolioData: PortfolioData = JSON.parse(fileContent);

    console.log(`📊 Found portfolio with balance: €${portfolioData.balance.toFixed(2)} and ${portfolioData.positions.length} positions`);

    // 3. Create or update MAIN portfolio
    // First try to find existing portfolio
    let portfolio = await prisma.portfolio.findFirst({
        where: {
            userId: user.username,
            type: 'MAIN'
        }
    });

    if (portfolio) {
        // Update existing portfolio
        portfolio = await prisma.portfolio.update({
            where: { id: portfolio.id },
            data: { balance: portfolioData.balance }
        });
        console.log(`✅ Updated existing portfolio with ID: ${portfolio.id}`);
    } else {
        // Create new portfolio
        portfolio = await prisma.portfolio.create({
            data: {
                userId: user.username,
                balance: portfolioData.balance,
                type: 'MAIN'
            }
        });
        console.log(`✅ Created new portfolio with ID: ${portfolio.id}`);
    }

    console.log(`✅ Portfolio created/updated with ID: ${portfolio.id}`);

    // 4. Migrate positions
    if (portfolioData.positions.length > 0) {
        const positionData = portfolioData.positions.map(position => ({
            portfolioId: portfolio.id,
            symbol: position.symbol,
            amount: position.amount,
            entryPrice: position.entryPrice,
            status: 'confirmed' as const,
            type: 'long' as const,
            appliedRiskParameters: {},
            initialDecision: { summary: 'Migrated from JSON', confidence_score: 1.0 },
            decisionContext: { summary: 'Migrated from JSON', confidence_score: 1.0 }
        }));

        const result = await prisma.position.createMany({
            data: positionData,
            skipDuplicates: true
        });

        console.log(`✅ Added ${result.count} positions to the portfolio`);
    }

    console.log('🎉 Portfolio migration complete!');
}

main()
    .catch((e) => {
        console.error('❌ Error during migration:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
