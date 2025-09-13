import { z } from 'zod';
import { Tool, ToolResult } from './index';
import { PrismaClient, Prisma } from '@prisma/client';
import { get, set } from 'lodash';

const prisma = new PrismaClient();

// Įrankis Nr. 1: Rizikos Apetito Keitimas
export const setRiskAppetiteTool: Tool = {
    name: "set_risk_appetite",
    description: "[STATE_CHANGING] Sets the user's overall risk appetite. This single change affects multiple parameters like capital per trade and concentration limits.",
    permission_level: 'state_changing',
    schema: z.object({
        profile: z.enum(['Conservative', 'Balanced', 'Aggressive']),
    }),
    async execute(params: Record<string, unknown>, username: string): Promise<ToolResult> {
        try {
            const userConfig = await prisma.userConfiguration.findUnique({ where: { userId: username } });
            if (!userConfig) throw new Error("User configuration not found.");

            const currentConfig = userConfig.strategyConfig as Prisma.JsonObject;
            set(currentConfig, 'global_settings.risk_appetite', params.profile);

            await prisma.userConfiguration.update({
                where: { userId: username },
                data: { strategyConfig: currentConfig },
            });
            return { success: true, data: `Risk appetite successfully set to '${params.profile}'.`, error: null };
        } catch (error) {
            return { success: false, data: null, error: (error as Error).message };
        }
    }
};

// Įrankis Nr. 2: Specifinio Parametro Keitimas su Saugikliais
export const modifyStrategyParameterTool: Tool = {
    name: "modify_strategy_parameter",
    description: "[STATE_CHANGING] Modifies a specific numerical parameter within a given strategy. Includes safety checks for critical values.",
    permission_level: 'state_changing',
    schema: z.object({
        strategy_name: z.string().describe("The machine-readable name of the strategy, e.g., 'main_ai_balanced'."),
        parameter_path: z.string().describe("The dot-notation path to the parameter, e.g., 'risk_management.stop_loss_percentage'."),
        new_value: z.number().describe("The new numerical value for the parameter."),
    }),
    async execute(params: Record<string, unknown>, username: string): Promise<ToolResult> {
        const { strategy_name, parameter_path, new_value } = params;

        // "Sveiko proto" saugikliai
        if (parameter_path === 'risk_management.capital_per_trade_percent' && (new_value as number > 10 || new_value as number <= 0)) {
            return { success: false, data: null, error: "For safety reasons, capital per trade must be between 0 and 10%." };
        }
        if (parameter_path === 'risk_management.stop_loss_percentage' && (new_value as number > 20 || new_value as number <= 0)) {
            return { success: false, data: null, error: "For safety reasons, stop-loss must be between 0 and 20%." };
        }

        try {
            const userConfig = await prisma.userConfiguration.findUnique({ where: { userId: username } });
            if (!userConfig) throw new Error("User configuration not found.");

            const currentConfig = userConfig.strategyConfig as Prisma.JsonObject;
            const fullPath = `strategies.${strategy_name}.${parameter_path}`;

            // Patikriname, ar parametras egzistuoja prieš keičiant
            if (get(currentConfig, fullPath) === undefined) {
                return { success: false, data: null, error: `Parameter '${parameter_path}' not found in strategy '${strategy_name}'.` };
            }

            set(currentConfig, fullPath, new_value);

            await prisma.userConfiguration.update({
                where: { userId: username },
                data: { strategyConfig: currentConfig },
            });
            return { success: true, data: `Parameter '${parameter_path}' in '${strategy_name}' was set to ${new_value}.`, error: null };
        } catch (error) {
            return { success: false, data: null, error: (error as Error).message };
        }
    }
};
