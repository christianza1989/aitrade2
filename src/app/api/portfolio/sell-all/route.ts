// src/app/api/portfolio/sell-all/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PortfolioService } from '@/core/portfolio';
import { BinanceService } from '@/core/binance';
import { PaperExecutionService } from '@/core/services/ExecutionService';

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const executionService = new PaperExecutionService();
        const portfolioService = new PortfolioService(username, 'MAIN', executionService);
        const binanceService = new BinanceService();

        const portfolio = await portfolioService.getPortfolio();

        if (!portfolio || portfolio.positions.length === 0) {
            return NextResponse.json({ message: 'No open positions to sell.' });
        }

        const sellResults = [];
        for (const position of portfolio.positions) {
            try {
                const currentPrice = await binanceService.getCurrentPrice(position.symbol);
                if (!currentPrice) {
                    throw new Error(`Could not fetch price for ${position.symbol}`);
                }
                await portfolioService.sell(position.symbol, position.amount, currentPrice, "PANIC SELL ALL (Manual Trigger)");
                sellResults.push({ symbol: position.symbol, status: 'success' });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                sellResults.push({ symbol: position.symbol, status: 'failed', reason: errorMessage });
                console.error(`Failed to panic sell ${position.symbol}:`, errorMessage);
            }
        }

        const failedSells = sellResults.filter(r => r.status === 'failed');
        if (failedSells.length > 0) {
             return NextResponse.json({ 
                message: `Panic sell completed, but ${failedSells.length} positions failed to sell.`,
                failed: failedSells 
            }, { status: 207 }); // 207 Multi-Status
        }

        return NextResponse.json({ message: 'All open positions have been successfully sold.' });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Panic Sell All Error:", errorMessage);
        return NextResponse.json({ error: 'An unexpected error occurred during the panic sell process.' }, { status: 500 });
    }
}
