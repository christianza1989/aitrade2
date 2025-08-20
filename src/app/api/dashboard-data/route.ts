import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BinanceService } from '@/core/binance';
import { PortfolioService } from '@/core/portfolio';
import { CoinMarketCapService } from '@/core/coinmarketcap';
import { globalSharedContext } from '@/core/global-context'; // Import globalSharedContext

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        console.error("[DashboardData API] Unauthorized access attempt: No session or username.");
        return NextResponse.json({ error: 'Unauthorized: Please log in.' }, { status: 401 });
    }

    try {
        const username = session.user.name;
        const binance = new BinanceService();
        const portfolioService = new PortfolioService(username);
        // const coinMarketCapService = new CoinMarketCapService(); // No longer needed here

        const topSymbols = await binance.getTopSymbols(50);
        const portfolio = await portfolioService.getPortfolio();
        // Get Fear and Greed Index from global context
        const fearAndGreedIndex = globalSharedContext.getContext().fearAndGreedIndex;

        console.log('[DashboardData API] Fear and Greed Index:', fearAndGreedIndex);

        const marketDataSymbols = new Set(topSymbols.map(s => s.symbol));
        const combinedMarketData = [...topSymbols];

        for (const position of portfolio.positions) {
            if (!marketDataSymbols.has(position.symbol)) {
                const currentPrice = await binance.getCurrentPrice(position.symbol);
                if (currentPrice !== null) {
                    // Create a Ticker object with available data and dummy values for others
                    combinedMarketData.push({
                        symbol: position.symbol,
                        lastPrice: currentPrice.toString(),
                        priceChange: '0', // Dummy
                        priceChangePercent: '0', // Dummy
                        weightedAvgPrice: '0', // Dummy
                        prevClosePrice: '0', // Dummy
                        lastQty: '0', // Dummy
                        bidPrice: '0', // Dummy
                        bidQty: '0', // Dummy
                        askPrice: '0', // Dummy
                        askQty: '0', // Dummy
                        openPrice: '0', // Dummy
                        highPrice: '0', // Dummy
                        lowPrice: '0', // Dummy
                        volume: '0', // Dummy
                        quoteVolume: '0', // Dummy
                        openTime: 0, // Dummy
                        closeTime: 0, // Dummy
                        firstId: 0, // Dummy
                        lastId: 0, // Dummy
                        count: 0, // Dummy
                    });
                    marketDataSymbols.add(position.symbol); // Add to set to avoid duplicates
                } else {
                    console.warn(`[DashboardData API] Could not fetch current price for portfolio symbol: ${position.symbol}`);
                }
            }
        }

        // console.log('[DashboardData API] Sending marketData to frontend:', combinedMarketData.map(d => d.symbol));
        return NextResponse.json({ marketData: combinedMarketData, portfolio, fearAndGreedIndex });

    } catch (error) {
        console.error("[DashboardData API] Error fetching dashboard data:", error);
        return NextResponse.json({ error: `Internal Server Error: ${(error as Error).message}` }, { status: 500 });
    }
}
