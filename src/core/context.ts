// src/core/context.ts

export interface ISharedContext {
    marketRegime: 'Risk-On' | 'Risk-Off' | 'Neutral';
    regimeScore: number;
    riskTrend: 'Improving' | 'Deteriorating' | 'Stable'; // NEW
    sentiment: 'Bullish' | 'Bearish' | 'Neutral';
    sentimentScore: number;
    fearAndGreedIndex: { value: string; classification: string } | null;
    keyTopics: string[];
    activeThreats: string[];
    activeOpportunities: string[];
    dexOpportunities?: string[]; // NEW: For DEX Scout findings
}

export class SharedContext {
    private context: ISharedContext;

    constructor() {
        this.context = {
            marketRegime: 'Neutral',
            regimeScore: 5.0,
            riskTrend: 'Stable', // Initialize new field
            sentiment: 'Neutral',
            sentimentScore: 0.0,
            fearAndGreedIndex: null,
            keyTopics: [],
            activeThreats: [],
            activeOpportunities: [],
            dexOpportunities: [],
        };
    }

    public updateContext(updates: Partial<ISharedContext>): void {
        this.context = { ...this.context, ...updates };
        console.log('SharedContext updated:', updates);
    }

    public getContext(): ISharedContext {
        return { ...this.context };
    }
}
