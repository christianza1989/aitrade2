// src/core/onchain.ts

// Mock onchain data - replace with real API calls when available
const MOCK_ONCHAIN_DATA: Record<string, unknown> = {
    'BTC': {
        whale_activity: 'neutral',
        exchange_flow: 'net_inflow_small',
        active_addresses_24h: 950000,
        mentions_24h: 15000,
        sentiment_score: 0.65
    },
    'ETH': {
        whale_activity: 'accumulation',
        exchange_flow: 'net_outflow_significant',
        active_addresses_24h: 650000,
        mentions_24h: 12000,
        sentiment_score: 0.7
    },
    'SOL': {
        whale_activity: 'distribution',
        exchange_flow: 'net_inflow_large',
        active_addresses_24h: 450000,
        mentions_24h: 8000,
        sentiment_score: 0.85,
        is_trending: true
    },
    'ADA': {
        whale_activity: 'neutral',
        exchange_flow: 'net_inflow_small',
        active_addresses_24h: 120000,
        mentions_24h: 3000,
        sentiment_score: 0.55
    },
    'BNB': {
        whale_activity: 'neutral',
        exchange_flow: 'net_outflow_small',
        active_addresses_24h: 180000,
        mentions_24h: 5000,
        sentiment_score: 0.6
    }
};

// Ši funkcija ateityje bus pakeista realiais API kvietimais.
export async function getOnChainData(symbols: string[]): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    symbols.forEach(symbol => {
        const cleanedSymbol = symbol.replace('USDT', '');
        if (MOCK_ONCHAIN_DATA[cleanedSymbol]) {
            result[symbol] = MOCK_ONCHAIN_DATA[cleanedSymbol];
        }
    });

    return result;
}
