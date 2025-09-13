// PATH: src/core/tools/CategorizationTools.ts
import { z } from 'zod';
import { Tool, ToolResult } from './index';
import { CategorizationService } from '../categorization-service';

export const categorizeSymbolsTool: Tool = {
    name: "categorize_symbols",
    description: "Takes a list of cryptocurrency symbols and returns their market categories. Essential for filtering positions by sector (e.g., 'AI', 'DePIN', 'Layer 1').",
    permission_level: 'read_only',
    schema: z.object({
        symbols: z.array(z.string()).min(1, "At least one symbol is required."),
    }),
    execute: async (params: Record<string, unknown>, username: string): Promise<ToolResult> => {
        try {
            const { symbols } = params as { symbols: string[] };
            const categorizationService = CategorizationService.getInstance();
            const categorizedSymbols: Record<string, string[]> = {};

            for (const symbol of symbols) {
                const categories = await categorizationService.getCategory(symbol);
                // Sukuriame įrašą kiekvienai kategorijai
                for (const category of categories) {
                    if (!categorizedSymbols[category]) {
                        categorizedSymbols[category] = [];
                    }
                    categorizedSymbols[category].push(symbol);
                }
            }

            return { success: true, data: categorizedSymbols, error: null };
        } catch (error) {
            console.error('[Tool categorize_symbols] Error:', error);
            return { success: false, data: null, error: "Failed to categorize symbols." };
        }
    }
};
