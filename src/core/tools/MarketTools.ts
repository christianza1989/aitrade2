// PATH: src/core/tools/MarketTools.ts
import { z } from 'zod';
import { Tool, ToolResult } from './index';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const getMarketRegimeTool: Tool = {
    name: "get_market_regime",
    description: "Gets the current overall market condition (regime) identified by the system's analysis.",
    permission_level: 'read_only',
    schema: z.object({}),
    execute: async (params: Record<string, unknown>, username: string): Promise<ToolResult> => {
        try {
            const regime = await redis.get('global_market_regime');
            if (!regime) {
                return { success: true, data: "The market regime has not been determined yet. Please wait for the next cycle.", error: null };
            }
            return { success: true, data: `The current market regime is: ${regime}.`, error: null };
        } catch (error) {
            console.error('[Tool get_market_regime] Error:', error);
            return { success: false, data: null, error: "Failed to retrieve market regime from Redis." };
        }
    }
};
