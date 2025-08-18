import axios from 'axios';

// Type for a single candle
export type Candle = {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};

// Type for the daily ticker stats
export type Ticker = {
    symbol: string;
    priceChange: string;
    priceChangePercent: string;
    weightedAvgPrice: string;
    prevClosePrice: string;
    lastPrice: string;
    lastQty: string;
    bidPrice: string;
    bidQty: string;
    askPrice: string;
    askQty: string;
    openPrice: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
    quoteVolume: string;
    openTime: number;
    closeTime: number;
    firstId: number;
    lastId: number;
    count: number;
};

export class BinanceService {
    private baseUrl = 'https://api.binance.com/api/v3';

    private async fetchApi(endpoint: string, params: Record<string, string> = {}) {
        try {
            const response = await axios.get(`${this.baseUrl}/${endpoint}`, { params });
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch from Binance API: ${endpoint}`, error);
            throw error;
        }
    }

    async getHistoricalData(symbol: string, interval: string, limit = 100): Promise<Candle[]> {
        // Define the raw candle type from Binance API
        type BinanceCandle = [number, string, string, string, string, string, ...unknown[]];
        try {
            const data = await this.fetchApi('klines', { symbol, interval, limit: String(limit) });
            return data.map((d: BinanceCandle) => ({
                time: d[0] / 1000,
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5]),
            }));
        } catch {
            return [];
        }
    }

    async getCurrentPrice(symbol: string): Promise<number | null> {
        try {
            const data = await this.fetchApi('ticker/price', { symbol });
            return parseFloat(data.price);
        } catch {
            return null;
        }
    }

    async getTopSymbols(limit = 200): Promise<Ticker[]> {
        try {
            const data: Ticker[] = await this.fetchApi('ticker/24hr');
            // Filter for USDT pairs and exclude leveraged tokens or other special assets
            const usdtPairs = data.filter(t => 
                t.symbol.endsWith('USDT') && 
                !t.symbol.includes('UP') && 
                !t.symbol.includes('DOWN') &&
                !t.symbol.includes('BULL') &&
                !t.symbol.includes('BEAR') &&
                !t.symbol.match(/^\d/) // Exclude symbols that start with a number
            );
            const sorted = usdtPairs.sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
            return sorted.slice(0, limit);
        } catch {
            return [];
        }
    }
}
