// scripts/migrate_trades.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const ADMIN_USERNAME = 'admin'; // IMPORTANT: Specify the user who owns these records

interface TradeData {
    symbol: string;
    amount: string | number;
    entryPrice: string | number;
    exitPrice: string | number;
    pnl: string | number;
    reason: string;
    timestamp: string;
}

async function main() {
    console.log('🌱 Starting trades_log.json migration...');

    // 1. Check and verify user exists
    const user = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });
    if (!user) {
        console.error(`❌ User '${ADMIN_USERNAME}' not found. Please create it first.`);
        return;
    }

    // 2. Read JSON file
    const filePath = path.join(process.cwd(), 'trades_log.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const tradesData: TradeData[] = JSON.parse(fileContent);

    if (tradesData.length === 0) {
        console.log('ℹ️ No trades to migrate from trades_log.json.');
        return;
    }

    // 3. Format data according to Prisma schema
    const formattedData = tradesData.map(trade => ({
        userId: user.username,
        symbol: String(trade.symbol),
        amount: parseFloat(String(trade.amount)),
        entryPrice: parseFloat(String(trade.entryPrice)),
        exitPrice: parseFloat(String(trade.exitPrice)),
        pnl: parseFloat(String(trade.pnl)),
        reason: String(trade.reason),
        timestamp: new Date(trade.timestamp), // Convert string to Date object
    }));

    // 4. Insert data into database
    const result = await prisma.tradeLog.createMany({
        data: formattedData,
        skipDuplicates: true, // Protection against accidentally running the script twice
    });

    console.log(`✅ Migration complete! Added ${result.count} new trade logs to the database.`);
}

main()
    .catch((e) => {
        console.error('❌ Error during migration:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
