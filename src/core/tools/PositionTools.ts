// PATH: src/core/tools/PositionTools.ts
import { z } from 'zod';
import { Tool, ToolResult } from './index';
import { PortfolioService } from '../portfolio';
import { PaperExecutionService } from '../services/ExecutionService';

export const updatePositionRiskTool: Tool = {
    name: "update_position_risk",
    description: "[STATE_CHANGING] Updates the risk parameters (e.g., stop-loss) for a specific open position.",
    permission_level: 'state_changing',
    schema: z.object({
        symbol: z.string().describe("The symbol of the position to update, e.g., 'BTCUSDT'"),
        stop_loss: z.number().optional().describe("The new stop-loss price."),
        take_profit: z.number().optional().describe("The new take-profit percentage."),
    }),
    async execute(params: Record<string, unknown>, username: string): Promise<ToolResult> {
        const executionService = new PaperExecutionService();
        const portfolioService = new PortfolioService(username, 'MAIN', executionService);
        try {
            const symbol = params.symbol as string;
            const stopLoss = params.stop_loss as number | undefined;
            const takeProfit = params.take_profit as number | undefined;

            await portfolioService.updatePosition(symbol, {
                stopLossPrice: stopLoss,
                takeProfitPercent: takeProfit,
            });
            return { success: true, data: `Successfully updated risk parameters for ${symbol}.`, error: null };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            return { success: false, data: null, error: message };
        }
    },
};
