// src/core/context.ts

/**
 * Defines the structure for the shared context that all AI agents can access.
 * This acts as a "hive mind" or a central nervous system for the trading bot,
 * allowing agents to be aware of the broader state discovered by other agents.
 */
export interface ISharedContext {
    marketRegime: 'Risk-On' | 'Risk-Off' | 'Neutral';
    regimeScore: number; // 0.0 to 10.0
    sentiment: 'Bullish' | 'Bearish' | 'Neutral';
    sentimentScore: number; // -1.0 to 1.0
    keyTopics: string[];
    activeThreats: string[]; // e.g., ["High volatility", "Low liquidity"]
    activeOpportunities: string[]; // e.g., ["Strong narrative in AI tokens"]
}

/**
 * Manages the shared state (the "hive mind") for a single trading cycle.
 * An instance of this class will be created at the start of each cycle
 * and passed to each agent.
 */
export class SharedContext {
    private context: ISharedContext;

    constructor() {
        this.context = {
            marketRegime: 'Neutral',
            regimeScore: 5.0,
            sentiment: 'Neutral',
            sentimentScore: 0.0,
            keyTopics: [],
            activeThreats: [],
            activeOpportunities: [],
        };
    }

    /**
     * Updates one or more properties of the shared context.
     * @param updates A partial object of the ISharedContext to update.
     */
    public updateContext(updates: Partial<ISharedContext>): void {
        this.context = { ...this.context, ...updates };
        console.log('SharedContext updated:', updates);
    }

    /**
     * Retrieves the current state of the shared context.
     * @returns The full shared context object.
     */
    public getContext(): ISharedContext {
        return { ...this.context };
    }
}
