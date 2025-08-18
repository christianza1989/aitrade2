import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BinanceService } from '@/core/binance';
import { PortfolioService } from '@/core/portfolio';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const binance = new BinanceService();
        const portfolioService = new PortfolioService(session.user.name);

        const marketData = await binance.getTopSymbols(50);
        const portfolio = await portfolioService.getPortfolio();

        return NextResponse.json({ marketData, portfolio });

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
