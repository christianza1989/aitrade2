import { AIAgent } from './agents';
import { OpportunityLogger } from './opportunity-logger';

// Define the Trade interface
export interface Trade {
    symbol: string;
    amount: number;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    timestamp: string;
    reason: string;
}

export class StrategyOptimizer extends AIAgent {
    async analyze(trades: Trade[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const opportunityLogger = new OpportunityLogger();
        const missedOpportunities = await opportunityLogger.getLogs();

        const prompt = `
        **Persona:** You are a Quantitative Analyst specializing in algorithmic trading strategy optimization.
        **Data:**
        1. A log of past executed trades:
        ${JSON.stringify(trades, null, 2)}

        2. A log of missed opportunities (assets you decided to "AVOID" that might have been profitable):
        ${JSON.stringify(missedOpportunities, null, 2)}

        **Task:** You are an autonomous trading agent. Your goal is to become more profitable by learning from past performance. Analyze BOTH executed trades and missed opportunities to generate a new, optimized configuration file.

        1.  **Analyze Performance:** Identify patterns in profitable and unprofitable trades. Pay close attention to stop-loss events, market conditions (macro score), and technical indicators (RSI, etc.) that were present during those trades.
        2.  **Propose New Parameters:** Based on your analysis, decide on a new, optimized set of parameters. You must provide a complete configuration object. Do not just suggest one change; provide a full, ready-to-use configuration that you believe will perform better. Be bold but data-driven.
        3.  **Justify Your Changes:** Briefly explain the key reasons for your proposed changes in the summary.

        **Format (JSON):**
        - \`analysis_summary\`: A brief summary of your key findings from the trade history.
        - \`suggested_settings\`: A complete JSON object containing the full, new configuration. This object must include values for all of these keys: "sellStrategy", "takeProfitPercent", "stopLossPercent", "trailingStopPercent", "riskAmountPercent", "rsiPeriod", "symbolsToAnalyze", "batchSize", "macroScoreThreshold", "minimumBalance", "cycleIntervalMinutes", "smaShortPeriod", "smaLongPeriod", "macdShortPeriod", "macdLongPeriod", "macdSignalPeriod".
        `;
        return await this.safeGenerate(prompt);
    }
}
