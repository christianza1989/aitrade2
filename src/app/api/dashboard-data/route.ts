import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { BinanceService } from '@/core/binance';
import { PortfolioService } from '@/core/portfolio';

export async function GET() {
    const session = await getServerSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const binance = new BinanceService();
        const portfolioService = new PortfolioService();

        const marketData = await binance.getTopSymbols(50);
        const portfolio = await portfolioService.getPortfolio();

        return NextResponse.json({ marketData, portfolio });

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
