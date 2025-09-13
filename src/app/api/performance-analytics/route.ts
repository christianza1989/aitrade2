// src/app/api/performance-analytics/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { PortfolioService } from '../../../core/portfolio';
import { Trade } from '../../../core/optimizer';
import { PrismaClient } from '@prisma/client';
import { PaperExecutionService } from '../../../core/services/ExecutionService';

const prisma = new PrismaClient();

// Pagalbinė funkcija standartiniam nuokrypiui apskaičiuoti
function calculateStdDev(values: number[]): number {
    const n = values.length;
    if (n === 0) return 0;
    const mean = values.reduce((a, b) => a + b) / n;
    const variance = values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n;
    return Math.sqrt(variance);
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const executionService = new PaperExecutionService();
        const portfolioService = new PortfolioService(username, 'MAIN', executionService);
        const trades = await portfolioService.getTradeLogs();

        const mainPortfolio = await prisma.portfolio.findFirst({ where: { userId: username, type: 'MAIN' } });
        const initialBalance = 100000; // Tarkime, kad visada pradedame nuo 100k

        if (trades.length < 3) { // Reikia bent kelių sandorių statistikai
            return NextResponse.json({ message: 'Not enough trades to calculate performance metrics.' });
        }

        // --- Duomenų paruošimas ---
        const dailyPnl: { [date: string]: number } = {};
        let cumulativePnl = 0;
        const equityCurve = [{ date: new Date(trades[trades.length-1].timestamp), value: initialBalance }];

        // Iteruojame nuo seniausio iki naujausio sandorio
        for (const trade of [...trades].reverse()) {
            const date = new Date(trade.timestamp).toISOString().split('T')[0];
            dailyPnl[date] = (dailyPnl[date] || 0) + trade.pnl;
            cumulativePnl += trade.pnl;
            equityCurve.push({ date: new Date(trade.timestamp), value: initialBalance + cumulativePnl });
        }

        // --- Metrikų Skaičiavimas ---
        const totalPnl = cumulativePnl;
        const totalReturnPercent = (totalPnl / initialBalance) * 100;

        // Max Drawdown
        let peak = -Infinity;
        let maxDrawdown = 0;
        for (const point of equityCurve) {
            if (point.value > peak) {
                peak = point.value;
            }
            const drawdown = (peak - point.value) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }

        // Sharpe Ratio (supaprastintas, tarkime, kad rizikos norma lygi 0)
        const dailyReturns = Object.values(dailyPnl).map(pnl => (pnl / initialBalance) * 100);
        const avgDailyReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
        const stdDevOfReturn = calculateStdDev(dailyReturns);
        const sharpeRatio = stdDevOfReturn === 0 ? 0 : (avgDailyReturn / stdDevOfReturn) * Math.sqrt(365); // Metinis koeficientas

        // Calmar Ratio
        // Reikėtų metinės grąžos, bet supaprastinkime ir naudokime bendrą grąžą
        const calmarRatio = maxDrawdown === 0 ? Infinity : totalReturnPercent / (maxDrawdown * 100);

        return NextResponse.json({
            totalPnl,
            totalReturnPercent,
            sharpeRatio,
            maxDrawdown: maxDrawdown * 100, // Paverčiame procentais
            calmarRatio,
            equityCurve: equityCurve.map(p => ({ date: p.date.toISOString().split('T')[0], value: p.value })),
        });

    } catch (error) {
        console.error("Error fetching performance analytics:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
