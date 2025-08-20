// src/core/coinmarketcap.ts

interface FearAndGreedData {
    value: string;
    value_classification: string;
    timestamp: string;
}

interface GlobalMetricsQuote {
    total_market_cap: number;
    btc_dominance: number;
    defi_market_cap: number;
    stablecoin_market_cap: number;
}

interface GlobalMetricsData {
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

            if (!response.ok) {
                console.error(`CoinMarketCap API error for ${endpoint}: ${response.statusText}`, await response.text());
                return null;
            }

            const data = await response.json();
            if (data.status.error_code !== 0) {
                console.error('CoinMarketCap API error status:', data.status);
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
             if (!response.ok) return null;
             const data = await response.json();
             return data.data[0] ? {
                 value: data.data[0].value,
                 value_classification: data.data[0].value_classification,
                 timestamp: new Date(data.data[0].timestamp * 1000).toISOString(),
             } : null;
        } catch (error) {
            console.error('Error fetching Fear and Greed Index:', error);
            return null;
        }
    }
    
    async getGlobalMetrics(): Promise<GlobalMetricsData | null> {
        return this.fetchApi<GlobalMetricsData>('/v1/global-metrics/quotes/latest');
    }
    
    async getTrendingTokens(): Promise<any[] | null> {
        return this.fetchApi<any[]>('/v1/cryptocurrency/trending/most-visited', { limit: '10' });
    }
    
    async getTrendingGainersAndLosers(): Promise<any | null> {
        return this.fetchApi<any>('/v1/cryptocurrency/trending/gainers-losers', { limit: '10', sort_dir: 'desc', time_period: '24h' });
    }

    async getCategories(): Promise<any[] | null> {
        return this.fetchApi<any[]>('/v1/cryptocurrency/categories', { limit: '10', sort: 'market_cap', sort_dir: 'desc' });
    }
    
    async getCategoryById(id: string): Promise<any | null> {
        return this.fetchApi<any>(`/v1/cryptocurrency/category`, { id });
    }

    async getAirdrops(): Promise<any[] | null> {
        return this.fetchApi<any[]>('/v1/cryptocurrency/airdrops', { status: 'upcoming' });
    }

    async getCryptocurrencyInfo(symbols: string[]): Promise<any | null> {
        if (symbols.length === 0) return null;
        return this.fetchApi<any>('/v2/cryptocurrency/info', { symbol: symbols.join(',') });
    }

    async getLatestDexPairs(): Promise<any[] | null> {
        // CORRECTED ENDPOINT based on documentation and strategic plan
        return this.fetchApi<any[]>('/v4/dex/spot-pairs/latest', { sort: 'volume_24h', limit: '100' });
    }
}