import WebSocket from 'ws';
import { OpportunityScanner } from '@/core/opportunity-scanner';

let ws: WebSocket | null = null;
const trackedSymbols: { [symbol: string]: { price: number; time: number } } = {};
const FIVE_MINUTES = 5 * 60 * 1000;
const PRICE_CHANGE_THRESHOLD = 5.0; // 5%

function connectAndStream(controller: ReadableStreamDefaultController<any>) {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log('[MarketStream] WebSocket is already connected.');
        return;
    }

    console.log('[MarketStream] Connecting to Binance WebSocket for client stream...');
    ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
    const encoder = new TextEncoder();

    ws.on('open', () => {
        console.log('[MarketStream] Client stream connection established.');
    });

    ws.on('message', async (data: WebSocket.Data) => {
        const tickers = JSON.parse(data.toString());
        const opportunityScanner = OpportunityScanner.getInstance();
        
        // Send the raw ticker data to the client for real-time price updates
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(tickers)}\n\n`));

        // Also, process for opportunities internally
        for (const ticker of tickers) {
            const symbol = ticker.s;
            const price = parseFloat(ticker.c);
            const now = Date.now();

            if (!trackedSymbols[symbol]) {
                trackedSymbols[symbol] = { price, time: now };
                continue;
            }

            const initialData = trackedSymbols[symbol];
            if (now - initialData.time > FIVE_MINUTES) {
                trackedSymbols[symbol] = { price, time: now };
            } else {
                const priceChangePercent = ((price - initialData.price) / initialData.price) * 100;
                if (priceChangePercent > PRICE_CHANGE_THRESHOLD) {
                    console.log(`[MarketStream] OPPORTUNITY DETECTED: ${symbol} increased by ${priceChangePercent.toFixed(2)}%`);
                    await opportunityScanner.addOpportunity({ symbol, priceChangePercent });
                    trackedSymbols[symbol] = { price, time: now };
                }
            }
        }
    });

    ws.on('close', () => {
        console.log('[MarketStream] Client stream closed.');
        ws = null;
        try {
            controller.close();
        } catch (e) {
            // Controller might already be closed
        }
    });

    ws.on('error', (error) => {
        console.error('[MarketStream] Client stream error:', error);
        try {
            controller.error(error);
            ws?.close();
        } catch (e) {
            // Controller might already be closed
        }
    });
}

export async function GET(req: Request) {
    const stream = new ReadableStream({
        start(controller) {
            connectAndStream(controller);
        },
        cancel() {
            console.log('[MarketStream] Client disconnected, closing WebSocket.');
            ws?.close();
            ws = null;
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
