// PATH: src/core/tools/PortfolioTools.ts
import { z } from 'zod';
import { Tool, ToolResult } from './index';
import { PortfolioService } from '../portfolio';
import { PaperExecutionService } from '../services/ExecutionService';

export const getPortfolioStatusTool: Tool = {
    name: "get_portfolio_status",
    description: "Retrieves the user's current portfolio balance and a summary of open positions.",
    permission_level: 'read_only',
    schema: z.object({}),
    execute: async (params: Record<string, unknown>, username: string): Promise<ToolResult> => {
        try {
            const executionService = new PaperExecutionService();
            const portfolioService = new PortfolioService(username, 'MAIN', executionService);
            const portfolio = await portfolioService.getPortfolio();

            if (!portfolio) {
                return { success: false, data: null, error: "Portfolio not found for the user." };
            }

            const positionCount = portfolio.positions.length;
            const symbols = portfolio.positions.map(p => p.symbol).join(', ');
            const response = `Your current balance is €${portfolio.balance.toFixed(2)}. You have ${positionCount} open position(s): ${symbols || 'None'}.`;

            return { success: true, data: response, error: null };
        } catch (error) {
            console.error('[Tool get_portfolio_status] Error:', error);
            return { success: false, data: null, error: "Failed to retrieve portfolio status." };
        }
    }
};
