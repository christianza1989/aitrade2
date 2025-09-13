import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const ADMIN_USERNAME = 'admin'; // Svarbu: atitinka esamą vartotoją

async function main() {
    console.log('Starting migration for user:', ADMIN_USERNAME);

    const user = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });
    if (!user) {
        console.error('Admin user not found. Please create it first.');
        return;
    }

    // 1. Migruoti portfelį ir pozicijas
    const portfolioData = JSON.parse(await fs.readFile(path.join(process.cwd(), 'portfolio_admin.json'), 'utf-8'));
    const portfolio = await prisma.portfolio.create({
        data: {
            userId: user.username,
            balance: portfolioData.balance,
            type: 'MAIN' as const,
            positions: {
                create: portfolioData.positions.map((p: any) => ({
                    symbol: p.symbol,
                    amount: p.amount,
                    entryPrice: p.entryPrice,
                    type: p.type || 'long'
                }))
            }
        }
    });
    console.log('Portfolio migrated.');

    // 2. Migruoti prekybos žurnalą
    const tradesData = JSON.parse(await fs.readFile(path.join(process.cwd(), 'trades_log_admin.json'), 'utf-8'));
    await prisma.tradeLog.createMany({
        data: tradesData.map((t: any) => ({ ...t, userId: user.username })),
    });
    console.log('Trade logs migrated.');

    // 3. Migruoti sprendimų žurnalą
    const decisionsData = JSON.parse(await fs.readFile(path.join(process.cwd(), 'decision_log.json'), 'utf-8'));
    const flattenedDecisions = [];
    for (const [symbol, decisions] of Object.entries(decisionsData)) {
        for (const decision of decisions as any[]) {
            flattenedDecisions.push({
                timestamp: decision.timestamp,
                symbol,
                userId: user.username,
                decision: decision.decision,
                reason: decision.justification || decision.reason || '',
                pnlPercent: decision.pnlPercent,
                price: decision.currentPrice || 0,
            });
        }
    }
    await prisma.decisionLog.createMany({
        data: flattenedDecisions,
    });
    console.log('Decision logs migrated.');

    // 4. Migruoti praleistas galimybes
    const missedData = JSON.parse(await fs.readFile(path.join(process.cwd(), 'missed_opportunities.json'), 'utf-8'));
    await prisma.missedOpportunity.createMany({
        data: missedData.map((m: any) => ({
            ...m,
            userId: user.username,
            priceChangePercent: m.priceChangePercent || 0
        })),
    });
    console.log('Missed opportunities migrated.');

    console.log('Migration complete!');
}

main().catch(e => console.error(e)).finally(async () => await prisma.$disconnect());
