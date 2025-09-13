// src/app/api/analytics/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { PortfolioService } from '../../../core/portfolio';
import { PaperExecutionService } from '../../../core/services/ExecutionService';
import { Trade } from '../../../core/optimizer';

// Helper calculation functions for Phase 3 analytics
function calculateMonthlyPnl(trades: Trade[]) {
    const monthlyData: { [key: string]: number } = {};

    trades.forEach(trade => {
        const date = new Date(trade.timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = 0;
        }
        monthlyData[monthKey] += trade.pnl;
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    return {
        labels: sortedMonths,
        data: sortedMonths.map(month => monthlyData[month])
    };
}

function calculateWinRateBreakdown(trades: Trade[]) {
    const winningTrades = trades.filter(trade => trade.pnl > 0);
    const losingTrades = trades.filter(trade => trade.pnl <= 0);

    const winningPnl = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const losingPnl = losingTrades.reduce((sum, trade) => sum + trade.pnl, 0);

    return {
        winningTrades: {
            count: winningTrades.length,
            totalPnl: winningPnl
        },
        losingTrades: {
            count: losingTrades.length,
            totalPnl: Math.abs(losingPnl) // Make positive for display
        }
    };
}

function calculateDrawdown(equityCurve: { date: string; pnl: number }[]) {
    if (equityCurve.length === 0) {
        return { dates: [], values: [] };
    }

    let peak = equityCurve[0].pnl;
    let maxDrawdown = 0;
    const drawdownValues: number[] = [];
    const dates: string[] = [];

    equityCurve.forEach(point => {
        if (point.pnl > peak) {
            peak = point.pnl;
        }

        const currentDrawdown = ((peak - point.pnl) / peak) * 100;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);

        drawdownValues.push(-currentDrawdown); // Negative for chart display
        dates.push(point.date);
    });

    return {
        dates,
        values: drawdownValues,
        maxDrawdown
    };
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const executionService = new PaperExecutionService();
        const portfolioService = new PortfolioService(username, 'MAIN', executionService);
        const trades = await portfolioService.getTradeLogs();

        if (trades.length === 0) {
            return NextResponse.json({ message: 'No trades to analyze.' });
        }

        // Apskaičiuojame metrikas
        const totalTrades = trades.length;
        const winningTrades = trades.filter((t: Trade) => t.pnl > 0);
        const losingTrades = trades.filter((t: Trade) => t.pnl <= 0);

        const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
        const totalPnl = trades.reduce((acc: number, t: Trade) => acc + t.pnl, 0);

        const grossProfit = winningTrades.reduce((acc: number, t: Trade) => acc + t.pnl, 0);
        const grossLoss = Math.abs(losingTrades.reduce((acc: number, t: Trade) => acc + t.pnl, 0));
        
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;

        const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
        const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
        
        // Equity kreivės duomenys
        const equityCurve = [];
        let cumulativePnl = 0;
        // Iteruojame per sandorius atvirkštine tvarka (nuo seniausio iki naujausio)
        for (let i = trades.length - 1; i >= 0; i--) {
            cumulativePnl += trades[i].pnl;
            equityCurve.push({
                date: new Date(trades[i].timestamp).toLocaleDateString(),
                pnl: cumulativePnl,
            });
        }

        // Phase 3: Calculate additional analytics data
        const monthlyPnl = calculateMonthlyPnl(trades);
        const winRateBreakdown = calculateWinRateBreakdown(trades);
        const drawdown = calculateDrawdown(equityCurve);

        return NextResponse.json({
            // Existing data
            totalTrades,
            winRate,
            totalPnl,
            profitFactor,
            avgWin,
            avgLoss,
            equityCurve,

            // Phase 3: New analytics data
            monthlyPnl,
            winRateBreakdown,
            drawdown,
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error fetching analytics data:", errorMessage);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
