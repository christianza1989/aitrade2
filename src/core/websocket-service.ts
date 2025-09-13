// src/core/websocket-service.ts

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { OpportunityScanner } from './opportunity-scanner';
import { Ticker } from './binance';
import { Portfolio } from './portfolio';

type WebSocketTicker = {
    s: string;
    c: string;
    // Add other fields as needed
};

// Ši klasė valdys visus nuolatinius WebSocket ryšius su Binance.
export class WebSocketService extends EventEmitter {
    private static instance: WebSocketService;
    private marketStreamWs: WebSocket | null = null;
    private tickerStreamWs: WebSocket | null = null;
    private trackedSymbols: { [symbol: string]: { price: number; time: number } } = {};

    private constructor() {
        super();
    }

    public static getInstance(): WebSocketService {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }

    // Metodas "Fast Mover" srauto paleidimui
    public connectMarketStream() {
        if (this.marketStreamWs && (this.marketStreamWs.readyState === WebSocket.OPEN || this.marketStreamWs.readyState === WebSocket.CONNECTING)) {
            console.log('[WebSocketService] Market Stream is already connected.');
            return;
        }

        console.log('[WebSocketService] Connecting to Binance Market Stream for fast movers...');
        this.marketStreamWs = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');

        this.marketStreamWs.on('open', () => console.log('[WebSocketService] Market Stream connection established.'));
        this.marketStreamWs.on('message', this.handleMarketStreamMessage.bind(this));
        this.marketStreamWs.on('close', () => {
            console.log('[WebSocketService] Market Stream connection closed. Reconnecting in 10s...');
            this.marketStreamWs = null;
            setTimeout(() => this.connectMarketStream(), 10000);
        });
        this.marketStreamWs.on('error', (err) => console.error('[WebSocketService] Market Stream error:', err));
    }

    // Metodas Kainų srauto paleidimui
    public connectTickerStream(symbolsToTrack: Set<string>) {
         if (this.tickerStreamWs && (this.tickerStreamWs.readyState === WebSocket.OPEN || this.tickerStreamWs.readyState === WebSocket.CONNECTING)) {
            console.log('[WebSocketService] Ticker Stream is already connected.');
            return;
        }

        console.log(`[WebSocketService] Connecting to Binance Ticker Stream for ${symbolsToTrack.size} symbols...`);
        this.tickerStreamWs = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
        
        this.tickerStreamWs.on('open', () => console.log('[WebSocketService] Ticker Stream connection established.'));
        this.tickerStreamWs.on('message', (data: WebSocket.Data) => this.handleTickerStreamMessage(data, symbolsToTrack));
        this.tickerStreamWs.on('close', () => {
            console.log('[WebSocketService] Ticker Stream connection closed.');
            this.tickerStreamWs = null;
        });
        this.tickerStreamWs.on('error', (err) => console.error('[WebSocketService] Ticker Stream error:', err));
    }

    public disconnectTickerStream() {
        if(this.tickerStreamWs) {
            this.tickerStreamWs.close();
            console.log('[WebSocketService] Ticker Stream disconnected.');
        }
    }
    
    // Logika iš seno market-stream.ts failo
    private async handleMarketStreamMessage(data: WebSocket.Data) {
        // Ši logika lieka beveik nepakitusi, tik dabar ji yra klasės viduje
        const FAST_MOVER_TIME_MS = 5 * 60 * 1000;
        const FAST_MOVER_PRICE_CHANGE_PERCENT = 3.5;

        const tickers: WebSocketTicker[] = JSON.parse(data.toString());
        const opportunityScanner = OpportunityScanner.getInstance();
        
        for (const ticker of tickers) {
            const symbol = ticker.s;
            const price = parseFloat(ticker.c);
            const now = Date.now();

            if (!symbol.endsWith('USDT')) continue;

            if (!this.trackedSymbols[symbol]) {
                this.trackedSymbols[symbol] = { price, time: now };
                continue;
            }

            const initialData = this.trackedSymbols[symbol];
            if (now - initialData.time > FAST_MOVER_TIME_MS) {
                this.trackedSymbols[symbol] = { price, time: now };
            } else {
                const priceChangePercent = ((price - initialData.price) / initialData.price) * 100;
                if (priceChangePercent > FAST_MOVER_PRICE_CHANGE_PERCENT) {
                    const newOpportunity = { symbol, priceChangePercent };
                    await opportunityScanner.addOpportunity(newOpportunity);
                    this.trackedSymbols[symbol] = { price, time: now }; 
                    this.emit('new_opportunity', newOpportunity);
                }
            }
        }
    }

    // Logika iš seno ticker-stream.ts failo
    private handleTickerStreamMessage(data: WebSocket.Data, symbolsToTrack: Set<string>) {
        const tickers: WebSocketTicker[] = JSON.parse(data.toString());
        const relevantTickers = tickers.filter((ticker: WebSocketTicker) => symbolsToTrack.has(ticker.s));

        if (relevantTickers.length > 0) {
            this.emit('ticker_update', relevantTickers);
        }
    }
}
