// src/core/coinmarketcap.ts
interface FearAndGreedData {
    value: string;
    classification: string; // Pakeista iš value_classification
    timestamp: string;
}

interface GlobalMetricsQuote {
    total_market_cap: number;
    btc_dominance: number;
    defi_market_cap: number;
    stablecoin_market_cap: number;
}

interface CMCResponse<T> {
    data: T;
    status: {
        error_code: number;
        error_message?: string;
    };
}

export interface GlobalMetricsData {
    quote: {
        USD: GlobalMetricsQuote;
    };
}

export class CoinMarketCapService {
    private apiKey: string;
    private baseUrl: string = 'https://pro-api.coinmarketcap.com';

    constructor() {
        this.apiKey = process.env.CMC_API_KEY || '';
        if (!this.apiKey) {
            console.warn('CMC_API_KEY is not defined. CMC features will be limited.');
        }
    }

    private async fetchApi<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
        if (!this.apiKey) return null;

        const url = new URL(`${this.baseUrl}${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        try {
            const response = await fetch(url.toString(), {
                headers: {
                    'X-CMC_PRO_API_KEY': this.apiKey,
                    'Accept': 'application/json',
                },
            });

            const data = await response.json() as CMCResponse<T>;

            if (!response.ok || data.status?.error_code !== 0) {
                console.warn(`CoinMarketCap API warning for ${endpoint}: ${data.status?.error_message || response.statusText}. The system will proceed with available data.`);
                return null;
            }

            return data.data as T;
        } catch (error) {
            console.error(`Error fetching from CoinMarketCap API endpoint ${endpoint}:`, error);
            return null;
        }
    }

    async getFearAndGreedIndex(): Promise<FearAndGreedData | null> {
        try {
            const response = await fetch('https://api.alternative.me/fng/?limit=1');
             if (!response.ok) {
                 console.error(`[FearAndGreed API] Error: Failed to fetch data. Status: ${response.status} ${response.statusText}`);
                 return null;
             }
             const data = await response.json() as { data?: { value: string; value_classification: string; timestamp: number }[] };
             if (!data || !data.data || !data.data[0]) {
                console.error('[FearAndGreed API] Error: API returned an invalid data structure.', data);
                return null;
             }
             // PATAISYMAS ČIA: Suvienodiname pavadinimus
             return {
                 value: data.data[0].value,
                 classification: data.data[0].value_classification, // <-- Pakeista
                 timestamp: new Date(data.data[0].timestamp * 1000).toISOString(),
             };
        } catch (error) {
            console.error('[FearAndGreed API] Critical Error: Could not execute fetch.', error);
            return null;
        }
    }
    
    async getGlobalMetrics(): Promise<GlobalMetricsData | null> {
        return this.fetchApi<GlobalMetricsData>('/v1/global-metrics/quotes/latest');
    }
    
    async getTrendingTokens(): Promise<unknown[] | null> {
        return this.fetchApi<unknown[]>('/v1/cryptocurrency/trending/most-visited', { limit: '10' });
    }

    async getTrendingGainersAndLosers(): Promise<unknown | null> {
        return this.fetchApi<unknown>('/v1/cryptocurrency/trending/gainers-losers', { time_period: '24h' });
    }

    async getCategories(): Promise<unknown[] | null> {
        return this.fetchApi<unknown[]>('/v1/cryptocurrency/categories', { limit: '10' });
    }

    async getCategoryById(id: string): Promise<unknown | null> {
        return this.fetchApi<unknown>(`/v1/cryptocurrency/category`, { id });
    }

    async getAirdrops(): Promise<unknown[] | null> {
        return this.fetchApi<unknown[]>('/v1/cryptocurrency/airdrops', { status: 'UPCOMING' });
    }

    async getCryptocurrencyInfo(symbols: string[]): Promise<unknown | null> {
        if (symbols.length === 0) return null;
        return this.fetchApi<unknown>('/v2/cryptocurrency/info', { symbol: symbols.join(',') });
    }

    async getLatestDexPairs(): Promise<unknown[] | null> {
        return this.fetchApi<unknown[]>('/v4/dex/spot-pairs/latest', { sort: 'volume_24h', limit: '100' });
    }
}
