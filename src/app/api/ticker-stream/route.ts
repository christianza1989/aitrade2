// src/app/api/ticker-stream/route.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BinanceService } from '@/core/binance';
import { PortfolioService } from '@/core/portfolio';
import { WebSocketService } from '@/core/websocket-service';
import { PaperExecutionService } from '@/core/services/ExecutionService';

type WebSocketTicker = {
    s: string;
    c: string;
    // Add other fields as needed
};

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return new Response(null, { status: 401 });
    }
    const username = session.user.name;

    // Duomenų surinkimas lieka toks pats
    const binance = new BinanceService();
    const executionService = new PaperExecutionService();
    const portfolioService = new PortfolioService(username, 'MAIN', executionService);
    const [topSymbols, portfolio] = await Promise.all([
        binance.getTopSymbols(50),
        portfolioService.getPortfolio()
    ]);

    const symbolsToTrack = new Set<string>();
    topSymbols.forEach(t => symbolsToTrack.add(t.symbol));
    if (portfolio?.positions) {
        portfolio.positions.forEach(p => symbolsToTrack.add(p.symbol));
    }

    // Inicijuojame servisą
    const wsService = WebSocketService.getInstance();
    wsService.connectTickerStream(symbolsToTrack);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            const onTickerUpdate = (tickers: WebSocketTicker[]) => {
                 if (controller.desiredSize !== null && controller.desiredSize > 0) {
                    const eventData = { type: 'TICKER_UPDATE', payload: tickers };
                    try {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
                    } catch (e) {
                        console.error('[TickerStream API] Failed to send data, controller closed.');
                    }
                }
            };
            wsService.on('ticker_update', onTickerUpdate);
        },
        cancel() {
            console.log('[TickerStream API] Client disconnected.');
            // Atjungia tik kainų srautą, bet palieka "fast mover" srautą veikti
            wsService.disconnectTickerStream();
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
