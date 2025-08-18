import { NextResponse } from 'next/server';
import { PortfolioService } from '@/core/portfolio';
import { StrategyOptimizer } from '@/core/optimizer';

export async function POST() {
    try {
        const portfolioService = new PortfolioService();
        const optimizer = new StrategyOptimizer();

        const trades = await portfolioService.getTradeLogs();
        if (trades.length === 0) {
            return NextResponse.json({ error: 'No trades to analyze' }, { status: 400 });
        }

        const analysis = await optimizer.analyze(trades);
        return NextResponse.json(analysis);

    } catch (error) {
        console.error("An error occurred during optimization:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
