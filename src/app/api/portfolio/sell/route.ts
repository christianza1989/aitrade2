import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PortfolioService } from '@/core/portfolio';
import { BinanceService } from '@/core/binance';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const { symbol, amount } = await req.json();
        if (!symbol || !amount) {
            return NextResponse.json({ error: 'Symbol and amount are required' }, { status: 400 });
        }

        const portfolioService = new PortfolioService(username);
        const binanceService = new BinanceService();

        const currentPrice = await binanceService.getCurrentPrice(symbol);
        if (!currentPrice) {
            return NextResponse.json({ error: 'Could not fetch current price' }, { status: 500 });
        }

        await portfolioService.sell(symbol, amount, currentPrice, { reason: 'Manual sell' });

        const updatedPortfolio = await portfolioService.getPortfolio();
        return NextResponse.json(updatedPortfolio);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error in sell API: ${errorMessage}`);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
