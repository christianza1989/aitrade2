// src/app/api/initial-data/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BinanceService, Ticker } from '@/core/binance';
import { PortfolioService } from '@/core/portfolio';
import { PaperExecutionService } from '@/core/services/ExecutionService';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';



export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ error: 'Unauthorized: Please log in.' }, { status: 401 });
    }

    try {
        const username = session.user.name;
        const prisma = new PrismaClient();
        const binance = new BinanceService();
        const executionService = new PaperExecutionService();
        const portfolioService = new PortfolioService(username, 'MAIN', executionService);

        const [
            topSymbols,
            portfolio,
            userConfig
        ] = await Promise.all([
            binance.getTopSymbols(50),
            portfolioService.getPortfolio(),
            prisma.userConfiguration.findUnique({
                where: { userId: username },
                select: { strategyConfig: true }
            })
        ]);

        // Extract botStatus from user configuration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const strategyConfig = userConfig?.strategyConfig as Record<string, any>;
        const botStatus = strategyConfig?.global_settings?.botStatus === 'active' ? 'active' : 'inactive';

        const marketDataSymbols = new Set(topSymbols.map((s: Ticker) => s.symbol));
        const combinedMarketData: Ticker[] = [...topSymbols];

        if (portfolio?.positions) {
            for (const position of portfolio.positions) {
                if (!marketDataSymbols.has(position.symbol)) {
                    const currentPrice = await binance.getCurrentPrice(position.symbol);
                    if (currentPrice !== null) {
                        combinedMarketData.push({
                            symbol: position.symbol,
                            lastPrice: currentPrice.toString(),
                            priceChange: '0', priceChangePercent: '0', weightedAvgPrice: '0',
                            prevClosePrice: '0', lastQty: '0', bidPrice: '0', bidQty: '0',
                            askPrice: '0', askQty: '0', openPrice: '0', highPrice: '0',
                            lowPrice: '0', volume: '0', quoteVolume: '0', openTime: 0,
                            closeTime: 0, firstId: 0, lastId: 0, count: 0,
                        });
                        marketDataSymbols.add(position.symbol);
                    }
                }
            }
        }

        return NextResponse.json({ 
            marketData: combinedMarketData, 
            portfolio,
            botStatus
        });

    } catch (error) {
        console.error("[InitialData API] Error fetching initial data:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown internal error occurred";
        return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}
