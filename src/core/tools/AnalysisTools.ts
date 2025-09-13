// PATH: src/core/tools/AnalysisTools.ts
import { z } from 'zod';
import { Tool, ToolResult } from './index';
import { onDemandAnalysisQueue } from '../job-queue';

export const analyzeSymbolTool: Tool = {
    name: "analyze_symbol",
    description: "Initiates a detailed on-demand AI analysis for a specific cryptocurrency symbol. The result will be available shortly.",
    permission_level: 'state_changing',
    schema: z.object({
        symbol: z.string().min(3, "Symbol must be at least 3 characters long.").toUpperCase()
    }),
    execute: async (params: Record<string, unknown>, username: string): Promise<ToolResult> => {
        try {
            await onDemandAnalysisQueue.add('analyze-symbol', {
                username: username,
                symbol: params.symbol
            });

            const response = `Understood. I have initiated a full on-demand analysis for ${params.symbol}. You can view the results in the 'On-Demand Analysis' page once it is complete.`;
            return { success: true, data: response, error: null };
        } catch (error) {
            console.error('[Tool analyze_symbol] Error:', error);
            return { success: false, data: null, error: `Failed to queue analysis for ${params.symbol}.` };
        }
    }
};
