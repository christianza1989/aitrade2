import { NextResponse } from 'next/server';
import { PortfolioService } from '@/core/portfolio';
import { BinanceService } from '@/core/binance';

export async function POST(request: Request) {
    try {
        const { symbol, amount } = await request.json();
        const portfolioService = new PortfolioService();
        const binanceService = new BinanceService();

        const currentPrice = await binanceService.getCurrentPrice(symbol);
        if (!currentPrice) {
            return NextResponse.json({ error: 'Failed to fetch current price' }, { status: 500 });
        }

        await portfolioService.sell(symbol, amount, currentPrice, { reason: 'Manual sell' });
        const updatedPortfolio = await portfolioService.getPortfolio();

        return NextResponse.json(updatedPortfolio);
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
