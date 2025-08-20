import { AIAgent } from './agents';
import { DecisionLogEntry } from './decision-logger';
import { MissedOpportunity } from './opportunity-logger';

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
    async analyze(trades: Trade[], missedOpportunities: MissedOpportunity[], decisionLogs: DecisionLogEntry[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const prompt = `
        **Persona:** You are a Quantitative Analyst and AI Strategist. Your core function is to evolve this trading bot by learning from its complete performance history.

        **You have three data sources:**
        1.  **Executed Trades Log:** The final outcome of each trade (profit or loss).
        ${JSON.stringify(trades, null, 2)}

        2.  **Missed Opportunities Log:** Assets the bot decided to "AVOID".
        ${JSON.stringify(missedOpportunities, null, 2)}

        3.  **Position Management Decisions Log:** Records of when the bot decided to "HOLD" a winning position instead of selling immediately.
        ${JSON.stringify(decisionLogs, null, 2)}

        **CRITICAL TASK: Perform a holistic, data-driven analysis and generate a new, superior configuration.**

        1.  **Analyze Executed Trades:** What are the common characteristics of winning trades vs. losing trades? Look for patterns in technical indicators, market regime, etc.
        2.  **Analyze Missed Opportunities:** Were there any "AVOID" decisions that turned out to be highly profitable? Does this suggest the bot's entry criteria are too strict?
        3.  **Analyze Position Management (MOST IMPORTANT):** This is key to maximizing profit. For each "HOLD_AND_INCREASE_TP" decision in the log, compare the price at the time of the decision to the final exit price in the "Executed Trades Log".
            - Was holding the position, on average, more profitable than selling immediately?
            - Does the data suggest the \`takeProfitPercent\` should be higher or lower? Should it be more dynamic?
        4.  **Propose & Justify:** Based on your complete analysis, generate a new, fully optimized configuration. Your summary must explain *why* you are making each key change, referencing your findings from all three data logs.

        **Format (JSON):**
        - \`analysis_summary\`: A brief summary of your key findings from the trade history.
        - \`suggested_settings\`: A complete JSON object containing the full, new configuration. This object must include values for all of these keys: "sellStrategy", "takeProfitPercent", "stopLossPercent", "trailingStopPercent", "riskAmountPercent", "rsiPeriod", "symbolsToAnalyze", "batchSize", "macroScoreThreshold", "minimumBalance", "cycleIntervalMinutes", "smaShortPeriod", "smaLongPeriod", "macdShortPeriod", "macdLongPeriod", "macdSignalPeriod".
        `;
        return await this.safeGenerate(prompt);
    }
}
