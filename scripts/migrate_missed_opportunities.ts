// scripts/migrate_missed_opportunities.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const ADMIN_USERNAME = 'admin'; // IMPORTANT: Specify the user who owns these records

interface MissedOpportunityData {
    timestamp: string;
    symbol: string;
    reason: string;
    confidenceScore: number | null;
    finalSummary: string | null;
}

async function main() {
    console.log('🌱 Starting missed_opportunities.json migration...');

    // 1. Check and verify user exists
    const user = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });
    if (!user) {
        console.error(`❌ User '${ADMIN_USERNAME}' not found. Please create it first.`);
        return;
    }

    // 2. Read JSON file
    const filePath = path.join(process.cwd(), 'missed_opportunities.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const opportunitiesData: MissedOpportunityData[] = JSON.parse(fileContent);

    if (opportunitiesData.length === 0) {
        console.log('ℹ️ No missed opportunities to migrate from missed_opportunities.json.');
        return;
    }

    console.log(`📊 Found ${opportunitiesData.length} missed opportunities to migrate`);

    // 3. Format data according to Prisma schema
    const formattedData = opportunitiesData.map(opportunity => ({
        userId: user.username,
        timestamp: new Date(opportunity.timestamp),
        symbol: opportunity.symbol,
        priceChangePercent: 0, // Default value since JSON doesn't have this field
        reason: opportunity.reason,
        confidenceScore: opportunity.confidenceScore,
        finalSummary: opportunity.finalSummary
    }));

    // 4. Insert data into database
    const result = await prisma.missedOpportunity.createMany({
        data: formattedData,
        skipDuplicates: true, // Protection against accidentally running the script twice
    });

    console.log(`✅ Migration complete! Added ${result.count} missed opportunities to the database.`);
}

main()
    .catch((e) => {
        console.error('❌ Error during migration:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
