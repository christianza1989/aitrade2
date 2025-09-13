// PATH: src/core/chat-processor.ts
import { Redis } from 'ioredis';
import { AgentService } from './agent-service';
import { OrchestratorAgent } from './agents';
import { ConversationService } from './services/ConversationService';
import { ToolRegistry } from './tools';
import { MemoryService } from './memory';
import { telegramService } from './services/TelegramService';
import { get } from 'lodash';

// Import all tools
import { getMarketRegimeTool } from './tools/MarketTools';
import { getPortfolioStatusTool } from './tools/PortfolioTools';
import { analyzeSymbolTool } from './tools/AnalysisTools';
import { categorizeSymbolsTool } from './tools/CategorizationTools';
import { proposeRiskAdjustmentTool } from './tools/RiskTools';
import { updatePositionRiskTool } from './tools/PositionTools';
import { confirmActionWithUserTool } from './tools/ConfirmationTools';
import { setRiskAppetiteTool, modifyStrategyParameterTool } from './tools/ConfigTools';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const agentService = new AgentService();
const conversationService = new ConversationService();

// Register all available tools
const toolRegistry = new ToolRegistry();
toolRegistry.register(getMarketRegimeTool);
toolRegistry.register(getPortfolioStatusTool);
toolRegistry.register(analyzeSymbolTool);
toolRegistry.register(categorizeSymbolsTool);
toolRegistry.register(proposeRiskAdjustmentTool);
toolRegistry.register(updatePositionRiskTool);
toolRegistry.register(confirmActionWithUserTool);
toolRegistry.register(setRiskAppetiteTool);
toolRegistry.register(modifyStrategyParameterTool);

const MAX_STEPS = 7;

function resolvePlaceholders(parameters: Record<string, unknown>, context: Record<string, unknown>): Record<string, unknown> {
    const resolvedParams = { ...parameters };
    for (const key in resolvedParams) {
        const value = resolvedParams[key];
        if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
            const path = value.substring(2, value.length - 2).replace('context.', '');
            resolvedParams[key] = get(context, path, null);
        }
    }
    return resolvedParams;
}

export async function processChatMessage(jobId: string, conversationId: string, message: string, username: string, replyChannel?: string, replyTo?: string) {
    const resultKey = `chat-result:${jobId}`;
    let finalAiResponse: Record<string, unknown> = { response: "I'm sorry, I encountered an issue. Please try again.", responseType: 'text' };
    const executionContext: Record<string, unknown> = {};
    let toolChain: unknown[] = [];

    const memoryService = new MemoryService(username);
    const orchestratorAgent = new OrchestratorAgent(agentService);

    try {
        await conversationService.addToHistory(conversationId, { sender: 'user', message });
        const history = await conversationService.getHistory(conversationId);

        const pastExperiences = await memoryService.recallMemories(message, 3);

        // Konteksto Biudžetavimas (supaprastinta versija)
        let historyForPrompt = history;
        const contextLength = JSON.stringify(pastExperiences).length + JSON.stringify(history).length;
        if (contextLength > 4000) { // Apytikslis simbolių limitas
            historyForPrompt = history.slice(-4); // Paliekam tik paskutines 2 poras
        }
        const planResult = await orchestratorAgent.createPlan(message, historyForPrompt, toolRegistry.getAllTools(), pastExperiences);
        toolChain = planResult?.response?.tool_chain as unknown[];

        if (!toolChain || toolChain.length === 0) {
            finalAiResponse = { response: "I'm not sure how to help. Could you rephrase?", responseType: 'text' };
            throw new Error("OrchestratorAgent did not return a valid plan.");
        }

        if (toolChain.length > MAX_STEPS) {
            throw new Error(`Plan exceeds maximum step limit of ${MAX_STEPS}.`);
        }

        // Patikriname, ar paskutinis žingsnis yra patvirtinimas
        const lastStep = toolChain[toolChain.length - 1] as Record<string, unknown>;
        const requiresConfirmation = lastStep?.tool_name === 'confirm_action_with_user';

        const stepsToExecute = requiresConfirmation ? toolChain.slice(0, -1) : toolChain;

        for (let i = 0; i < stepsToExecute.length; i++) {
            const step = stepsToExecute[i] as Record<string, unknown>;
            const tool = toolRegistry.getTool(step.tool_name as string);

            if (!tool) throw new Error(`Plan references a non-existent tool: ${step.tool_name}`);

            const resolvedParameters = resolvePlaceholders(step.parameters as Record<string, unknown>, executionContext);
            const validation = tool.schema.safeParse(resolvedParameters);
            if (!validation.success) throw new Error(`Invalid parameters for tool ${tool.name}: ${validation.error.message}`);

            const result = await tool.execute(validation.data, username);
            if (!result.success) throw new Error(`Error in step ${i} (${tool.name}): ${result.error}`);

            executionContext[`step_${i}`] = result;
        }

        if (requiresConfirmation) {
            const planKey = `plan:${jobId}`;
            const planToSave = {
                tool_chain: toolChain,
                executionContext
            };
            await redis.set(planKey, JSON.stringify(planToSave), 'EX', 60 * 10); // Planas galioja 10 minučių

            const confirmationSummary = (lastStep.parameters as Record<string, unknown>)?.summary || "Please confirm the planned action.";
            finalAiResponse = {
                response: confirmationSummary as string,
                responseType: 'confirmation_required',
                actionPlanId: jobId
            };
        } else {
            const synthesizedResponse = await orchestratorAgent.synthesizeResponse(message, executionContext);
            finalAiResponse = { response: synthesizedResponse, responseType: 'text' };
        }

    } catch (error) {
        console.error(`[ChatProcessor] Critical error in job ${jobId}:`, error);
        finalAiResponse = { response: `I encountered an error while processing your request: ${(error as Error).message}`, responseType: 'text' };
    } finally {
        await conversationService.addToHistory(conversationId, { sender: 'ai', message: String(finalAiResponse.response) });
        await redis.set(resultKey, JSON.stringify(finalAiResponse), 'EX', 60 * 5);

        try {
            // Tikriname, ar nebuvo klaidos ir ar tai nebuvo tik patvirtinimo reikalaujantis atsakymas
            const responseText = typeof finalAiResponse.response === 'string' ? finalAiResponse.response : String(finalAiResponse.response || '');
            const isSuccessfulExecution = !responseText.toLowerCase().includes('error') && finalAiResponse.responseType === 'text';

            if (isSuccessfulExecution && Object.keys(executionContext).length > 0) {
                const narrative = await orchestratorAgent.summarizeInteraction(message, executionContext);
                if (narrative) {
                    const symbolMatch = message.match(/[A-Z]{3,}/); // Bandoma išgauti simbolį
                    const memoryMetadata = {
                        symbol: symbolMatch ? symbolMatch[0] : 'GENERAL',
                        outcome: 'dialogue_summary' as const,
                        pnl_percent: 0,
                        timestamp: new Date().toISOString(),
                        narrative: narrative,
                        source: 'AI' as const,
                        context: executionContext,
                    };
                    await memoryService.addMemory(memoryMetadata);
                }
            }
        } catch (memError) {
            console.error(`[ChatProcessor] Failed to save interaction to memory for job ${jobId}:`, memError);
        }

        try {
            const configChangeTools = ['set_risk_appetite', 'modify_strategy_parameter'];
            const planMadeConfigChange = toolChain.some((step) => {
                const stepRecord = step as Record<string, unknown>;
                return configChangeTools.includes(stepRecord.tool_name as string);
            });

            if (planMadeConfigChange) {
                const narrative = await orchestratorAgent.summarizeInteraction(message, executionContext);
                if (narrative) {
                    await memoryService.addMemory({
                        symbol: 'SYSTEM_CONFIG',
                        outcome: 'dialogue_summary' as const,
                        pnl_percent: 0,
                        timestamp: new Date().toISOString(),
                        narrative: narrative,
                        source: 'AI' as const,
                        context: executionContext,
                    });
                }
            }
        } catch (configMemError) {
            console.error(`[ChatProcessor] Failed to save config change to memory for job ${jobId}:`, configMemError);
        }

        // NAUJAS BLOKAS: Atsakymo siuntimas
        if (replyChannel === 'telegram' && replyTo) {
            await telegramService.sendMessage(replyTo, finalAiResponse.response as string);
        }
    }
}
