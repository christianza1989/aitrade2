// src/core/social.ts
import { SocialData } from './interfaces';

// Šis failas ateityje bus pakeistas realiais X (Twitter) API kvietimais.
const mockSocialData: Record<string, SocialData> = {
    "BTCUSDT": { mentions_24h: 15000, sentiment_score: 0.65 },
    "ETHUSDT": { mentions_24h: 12000, sentiment_score: 0.70 },
    "SOLUSDT": { mentions_24h: 8000, sentiment_score: 0.85, is_trending: true },
};

export async function getSocialMediaMentions(symbols: string[]): Promise<Record<string, SocialData>> {
    const result: Record<string, SocialData> = {};
    symbols.forEach(symbol => {
        if (mockSocialData[symbol]) {
            result[symbol] = mockSocialData[symbol];
        }
    });
    return result;
}
