export interface Candle {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface SocialData {
    mentions_24h: number;
    sentiment_score: number;
    is_trending?: boolean;
}
