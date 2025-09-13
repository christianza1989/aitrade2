// PATH: src/core/triggers/profitAtRisk.ts
import { Portfolio, PortfolioService } from '../portfolio';
import { BinanceService } from '../binance';
import { Redis } from 'ioredis';
import { AgentService } from '../agent-service';
import { AIAgent } from '../agents';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const PROFIT_THRESHOLD_PERCENT = 15.0; // 15% pelno slenkstis
const NOTIFICATION_COOLDOWN_SECONDS = 6 * 60 * 60; // 6 valandos

class InsightAgent extends AIAgent {
    constructor(agentService: AgentService) {
        super('InsightAgent', agentService);
    }

    async formulateInsight(symbol: string, pnlPercent: number) {
        const prompt = `
        **Persona:** You are a Proactive Risk Analyst AI. Your goal is to alert the user about a significant opportunity to secure profits that is now at risk due to changing market conditions.

        **Context:**
        - A user's open position for **${symbol}** has an unrealized profit of **+${pnlPercent.toFixed(2)}%**.
        - The overall market regime has just shifted to **BEAR_VOLATILITY**, indicating a hostile and unpredictable environment.

        **CRITICAL TASK:** Formulate a single, concise, and helpful message for the user. The message should:
        1.  State the situation clearly (profitable position + hostile market).
        2.  Suggest a concrete, actionable step (e.g., consider taking some profit, tightening the stop-loss).
        3.  Be helpful and advisory, not a direct command.

        **Your Output (JSON only):**
        {
          "insight": "<Your formulated message>"
        }
        `;
        const result = await this.safeGenerate(prompt);
        return result?.response?.insight as string || null;
    }
}

export async function checkProfitAtRisk(username: string, portfolio: Portfolio, marketRegime: string): Promise<string | null> {
    if (marketRegime !== 'BEAR_VOLATILITY') {
        return null;
    }

    const binanceService = new BinanceService();

    for (const position of portfolio.positions) {
        const currentPrice = await binanceService.getCurrentPrice(position.symbol);
        if (!currentPrice) continue;

        const unrealizedPnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

        if (unrealizedPnlPercent > PROFIT_THRESHOLD_PERCENT) {
            const cooldownKey = `notified:profit-at-risk:${username}:${position.symbol}`;
            const isNotified = await redis.get(cooldownKey);

            if (!isNotified) {
                const agentService = new AgentService();
                const insightAgent = new InsightAgent(agentService);
                const insightMessage = await insightAgent.formulateInsight(position.symbol, unrealizedPnlPercent);

                if (insightMessage) {
                    await redis.set(cooldownKey, 'true', 'EX', NOTIFICATION_COOLDOWN_SECONDS);
                    return insightMessage;
                }
            }
        }
    }
    return null;
}
