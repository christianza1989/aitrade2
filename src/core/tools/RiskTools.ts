// PATH: src/core/tools/RiskTools.ts
import { z } from 'zod';
import { Tool, ToolResult } from './index';
import { AgentService } from '../agent-service';
import { AIAgent } from '../agents'; // Reikia bazinės klasės tipui apibrėžti

class RiskAdjustmentAgent extends AIAgent {
    constructor(agentService: AgentService) {
        super('RiskAdjustmentAgent', agentService);
    }

    async propose(positions: Record<string, unknown>[], profile: 'defensive' | 'aggressive') {
        const prompt = `
        **Persona:** You are a professional Risk Manager AI.
        **Task:** Analyze the provided list of open positions and a desired risk profile. Propose new, adjusted stop-loss values for each position.
        - For a 'defensive' profile, tighten the stop-loss to be just below a recent significant low to protect profits or minimize further losses.
        - For an 'aggressive' profile, you can give the position more room to breathe, placing the stop-loss below a more major support level.

        **Data:**
        - Positions: ${JSON.stringify(positions)}
        - Desired Profile: ${profile}

        **Your Output (JSON only):**
        {
          "adjustments": [
            { "symbol": "...", "current_stop_loss": "...", "proposed_stop_loss": "..." },
            { "symbol": "...", "current_stop_loss": "...", "proposed_stop_loss": "..." }
          ],
          "reasoning": "A brief summary of your logic."
        }
        `;
        return await this.safeGenerate(prompt);
    }
}


export const proposeRiskAdjustmentTool: Tool = {
    name: "propose_risk_adjustment",
    description: "Analyzes a list of positions and a desired risk profile ('defensive' or 'aggressive') to propose new, optimized risk parameters like stop-loss values.",
    permission_level: 'read_only',
    schema: z.object({
        positions: z.array(z.any()),
        profile: z.enum(['defensive', 'aggressive']),
    }),
    execute: async (params: Record<string, unknown>, username: string): Promise<ToolResult> => {
        try {
            const { positions, profile } = params as { positions: any[], profile: 'defensive' | 'aggressive' };
            const agentService = new AgentService();
            const riskAgent = new RiskAdjustmentAgent(agentService);
            const result = await riskAgent.propose(positions, profile);

            if (!result || !result.response) {
                throw new Error("RiskAdjustmentAgent failed to provide a proposal.");
            }

            return { success: true, data: result.response, error: null };
        } catch (error) {
            console.error('[Tool propose_risk_adjustment] Error:', error);
            return { success: false, data: null, error: "AI failed to propose risk adjustments." };
        }
    }
};
