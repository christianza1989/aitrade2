// src/core/optimizer.ts
import { AIAgent } from './agents';
import { DecisionLogEntry } from './decision-logger';
import { MissedOpportunity } from './opportunity-logger';

// Atnaujinta sąsaja
export interface Trade {
    symbol: string;
    amount: number;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    timestamp: string;
    reason: string;
    marketContext?: {
        regime: string;
        regimeScore: number;
        sentiment: string;
        sentimentScore: number;
    };
    appliedRiskParameters?: {
        capitalPerTradePercent: number;
        stopLossPercentage: number;
        takeProfitPercentage: number;
    };
}

export class StrategyOptimizer extends AIAgent {
    async analyze(trades: Trade[], missedOpportunities: MissedOpportunity[], decisionLogs: DecisionLogEntry[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const prompt = `
        **Persona:** You are a Quantitative Analyst and AI Strategist. Your core function is to evolve this trading bot by learning from its complete performance history.

        **You have three data sources:**
        1.  **Executed Trades Log:** The final outcome of each trade (profit or loss), including the market context at the time of sale.
        ${JSON.stringify(trades, null, 2)}

        2.  **Missed Opportunities Log:** Assets the bot decided to "AVOID".
        ${JSON.stringify(missedOpportunities, null, 2)}

        3.  **Position Management Decisions Log:** Records of when the bot decided to "HOLD" a winning position instead of selling immediately.
        ${JSON.stringify(decisionLogs, null, 2)}

        **CRITICAL TASK: Perform a holistic, data-driven analysis and generate a new, superior configuration.**
        - Analyze winning vs. losing trades in context of the market regime. (e.g., "Are we losing money during 'Risk-Off' even with good signals?").
        - Analyze Missed Opportunities.
        - Analyze Position Management decisions.
        - Propose & Justify a new, fully optimized configuration.

        **Format (JSON):**
        - \`analysis_summary\`: A brief summary of your key findings.
        - \`suggested_settings\`: A complete JSON object containing the full, new configuration.
        `;
        return await this.safeGenerate(prompt);
    }
}
