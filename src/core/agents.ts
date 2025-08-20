// src/core/agents.ts

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from "@google/generative-ai";
import { Candle } from "./binance";
import { SharedContext } from "./context";
import { calculateRSI, calculateMACD, calculateSMAExported } from "./indicators";
import { AgentService } from './agent-service';
import { MemoryService } from "./memory";
import fs from 'fs/promises';
import path from 'path';

class KeyRotator {
    private keys: string[];
    public currentIndex: number;

    constructor() {
        this.keys = process.env.GEMINI_API_KEYS?.split(',') || [];
        if (this.keys.length === 0) {
            throw new Error("GEMINI_API_KEYS not found or empty in .env.local");
        }
        this.currentIndex = 0;
    }

    getKey(): string { return this.keys[this.currentIndex]; }
    getNextKey(): string {
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        console.warn(`Switching Gemini API key to #${this.currentIndex}`);
        return this.getKey();
    }
}

export abstract class AIAgent {
    private keyRotator: KeyRotator;
    private genAI: GoogleGenerativeAI;
    protected model: GenerativeModel;
    public readonly name: string;
    protected agentService: AgentService;

    constructor(name: string, agentService: AgentService) {
        if (!name || !agentService) {
            throw new Error("AIAgent requires a name and AgentService instance.");
        }
        this.name = name;
        this.agentService = agentService;
        const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash';
        this.keyRotator = new KeyRotator();
        this.genAI = new GoogleGenerativeAI(this.keyRotator.getKey());
        this.model = this.genAI.getGenerativeModel({ model: modelName });
    }

    private reinitializeModel() {
        this.genAI = new GoogleGenerativeAI(this.keyRotator.getKey());
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    async safeGenerate(prompt: string, retries = 3): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const safetySettings = [ { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }, ];
                const result = await this.model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], safetySettings, });
                const response = result.response;
                let jsonText = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
                const firstBrace = jsonText.indexOf('{');
                const lastBrace = jsonText.lastIndexOf('}');
                if (firstBrace === -1 || lastBrace === -1) { throw new Error("No valid JSON object found in the response."); }
                jsonText = jsonText.substring(firstBrace, lastBrace + 1);
                const jsonResponse = JSON.parse(jsonText) as Record<string, unknown>;
                return { prompt, response: jsonResponse };
            } catch (error) {
                const errorMessage = (error as Error).message;
                if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
                    this.keyRotator.getNextKey();
                    this.reinitializeModel();
                    if (attempt < retries - 1) { await new Promise(resolve => setTimeout(resolve, 2000)); continue; } 
                    else { return null; }
                }
                return null;
            }
        }
        return null;
    }
    
    protected async consult(targetAgentName: string, query: string): Promise<any> {
        const agent = this.agentService.getAgent(targetAgentName);
        if (!agent) { return { error: `Agent ${targetAgentName} not found.` }; }
        return agent.handleConsultation(query, this.name);
    }
    
    public async handleConsultation(query: string, callingAgentName: string): Promise<any> {
        const prompt = `
        **Persona:** You are ${this.name}, an expert in your domain.
        **Context:** The agent '${callingAgentName}' is requesting your expert opinion.
        **Query:** "${query}"
        **Task:** Provide a concise, direct, and expert answer to the query in JSON format, under the key "response".
        `;
        const result = await this.safeGenerate(prompt);
        return result?.response;
    }
}

export class MacroAnalyst extends AIAgent {
    constructor(agentService: AgentService) {
        super('MacroAnalyst', agentService);
    }
    
    async analyze(btcData: Record<string, unknown>, newsHeadlines: string[], fearAndGreedIndex: { value: string; classification: string } | null, globalMetrics: any, sharedContext: SharedContext): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const prompt = `
        **Persona:** You are a Macroeconomic and Crypto Market Cycle Analyst. Your task is to assess the overall market environment to determine if it's safe to take on risk.
        **Data Provided:**
        1.  **Bitcoin (4H TF) Last Candle:** ${JSON.stringify(btcData)}
        2.  **Top News Headlines:** ${JSON.stringify(newsHeadlines)}
        3.  **CoinMarketCap Fear and Greed Index:** ${JSON.stringify(fearAndGreedIndex)}
        4.  **Global Market Metrics:** ${JSON.stringify(globalMetrics)}
        **Task:** Provide a critical market assessment in JSON format.
        - \`market_regime\`: "Risk-On" (favorable for risky assets like altcoins) or "Risk-Off" (avoid risk, preserve capital).
        - \`regime_score\`: A number from 0.0 (extreme fear/danger) to 10.0 (extreme greed/opportunity).
        - \`reasoning\`: A brief explanation of why you chose this regime, referencing specific data points from the Global Metrics and Fear/Greed Index.
        - \`summary\`: A one-sentence, actionable summary for the portfolio manager.
        `;
        const result = await this.safeGenerate(prompt);
        if (result?.response) {
            const { market_regime, regime_score } = result.response;
            if (typeof market_regime === 'string' && (market_regime === 'Risk-On' || market_regime === 'Risk-Off') && typeof regime_score === 'number') {
                sharedContext.updateContext({
                    marketRegime: market_regime,
                    regimeScore: regime_score
                });
            }
        }
        return result;
    }
}

export class SentimentAnalyst extends AIAgent {
    constructor(agentService: AgentService) {
        super('SentimentAnalyst', agentService);
    }
    
    async analyze(newsArticles: { title?: string }[], trendingTokens: any, sharedContext: SharedContext): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const headlines = newsArticles.map(article => article.title || '');
        const prompt = `
        **Persona:** You are an AI that analyzes text sentiment and social hype. You measure the emotional state of the market.
        **Data Provided:**
        1.  **General News Headlines:** ${JSON.stringify(headlines.slice(0, 10))}
        2.  **Community Trending Tokens:** ${JSON.stringify(trendingTokens)}
        **Task:** Evaluate the overall sentiment from the provided data and provide a structured analysis in JSON format.
        - \`sentiment\`: "Bullish", "Bearish", or "Neutral".
        - \`sentiment_score\`: A number from -1.0 (extremely negative) to 1.0 (extremely positive).
        - \`dominant_narrative\`: A short phrase describing the main story in the news AND what the community is focused on.
        - \`key_topics\`: An array of key topics driving the narrative.
        `;
        const result = await this.safeGenerate(prompt);
        if (result?.response) {
            const { sentiment, sentiment_score, key_topics, dominant_narrative } = result.response;
            if (typeof sentiment === 'string' && typeof sentiment_score === 'number' && Array.isArray(key_topics)) {
                sharedContext.updateContext({
                    sentiment: sentiment as any,
                    sentimentScore: sentiment_score,
                    keyTopics: key_topics as string[],
                    // @ts-ignore 
                    dominantNarrative: dominant_narrative as string,
                });
            }
        }
        return result;
    }
}

interface Position { symbol: string; amount: number; entryPrice: number; highPrice?: number; takeProfitPercent?: number; technicals?: Record<string, unknown>; }
interface Config { [key: string]: any; }
interface DecisionHistory { timestamp: string; decision: string; justification: string; }

export class PositionManager extends AIAgent {
    constructor(agentService: AgentService) {
        super('PositionManager', agentService);
    }
    
    async decide(position: Position, currentPrice: number, macroAnalysis: unknown, sentimentAnalysis: unknown, config: Config, decisionHistory: DecisionHistory[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const pnlPercent = (currentPrice - position.entryPrice) / position.entryPrice * 100;
        const prompt = `
        **Persona:** You are a professional, stateful trader managing a profitable position. Your goal is to maximize gains while intelligently protecting profits.
        **Current Context:**
        - **Position:** ${JSON.stringify(position, null, 2)}
        - **Current Price:** ${currentPrice}
        - **Current P/L (%):** ${pnlPercent.toFixed(2)}%
        - **Take-Profit Target (%):** ${position.takeProfitPercent || config.takeProfitPercent}%
        - **Macro Environment:** ${JSON.stringify(macroAnalysis, null, 2)}
        - **Market Sentiment:** ${JSON.stringify(sentimentAnalysis, null, 2)}
        **Task:** The position has reached its take-profit target. Decide whether to sell now or to let the profit run by increasing the take-profit target. Be a disciplined profit-taker, not a greedy gambler.
        **Format (JSON):**
        - \`decision\`: "SELL_NOW" or "HOLD_AND_INCREASE_TP".
        - \`new_take_profit_percent\`: (Only if holding) The new take-profit percentage (e.g., if current is ${config.takeProfitPercent}%, new could be ${config.takeProfitPercent + 2}%).
        - \`justification\`: A brief reason for your decision.
        `;
        return await this.safeGenerate(prompt);
    }
}

interface BuySignal { symbol: string; [key: string]: unknown; }
interface Portfolio { balance: number; positions: Position[]; }

export class PortfolioAllocator extends AIAgent {
    constructor(agentService: AgentService) { super('PortfolioAllocator', agentService); }
    async allocate(buySignals: BuySignal[], portfolio: Portfolio, macroAnalysis: unknown, sentimentAnalysis: unknown, sharedContext: SharedContext, narrativeContext?: { narrative: string; assets: string[] }, dexOpportunities?: string[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        let strategicPrioritySection = "No dominant narrative identified.";
        if (narrativeContext?.narrative) {
            strategicPrioritySection = `**Strategic Priority: Dominant narrative is '${narrativeContext.narrative}'.** Prioritize these assets: [${narrativeContext.assets.join(', ')}]`;
        }
        let dexSection = "No high-risk DEX opportunities identified.";
        if (dexOpportunities?.length) {
            dexSection = `**High-Risk Ops:** DEX Scout found: [${dexOpportunities.join(', ')}]. Consider very small, speculative allocations.`;
        }
        const prompt = `
        **Persona:** You are a Chief Investment Officer.
        **Context:**
        - **Portfolio:** ${JSON.stringify(portfolio)}
        - **Macro:** ${JSON.stringify(macroAnalysis)}
        - **Sentiment:** ${JSON.stringify(sentimentAnalysis)}
        - **Candidates:** ${JSON.stringify(buySignals)}
        **Directives:**
        1.  **Narrative:** ${strategicPrioritySection}
        2.  **Speculative:** ${dexSection}
        **Task & Rules:**
        1.  Synthesize all data. Prioritize narrative assets.
        2.  Do not deploy >50% of balance. Do not allocate >25% of deployable capital to one asset. DEX assets are capped at 1% each.
        3.  Justify your decisions based on the directives.
        **Format (JSON):** An object where each key is the symbol, with \`decision\`, \`amount_to_buy_usd\`, and \`justification\`.
        `;
        return await this.safeGenerate(prompt);
    }
}

export class TechnicalAnalyst extends AIAgent {
    constructor(agentService: AgentService) { super('TechnicalAnalyst', agentService); }
    async analyzeBatch(batchData: { symbol: string; candles: Candle[] }[], config: any): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const formattedData = batchData.map(d => ({
            symbol: d.symbol,
            rsi: calculateRSI(d.candles, config.rsiPeriod)?.toFixed(2),
            macdHistogram: calculateMACD(d.candles, config.macdShortPeriod, config.macdLongPeriod, config.macdSignalPeriod)?.histogram?.toFixed(4),
            sma20: calculateSMAExported(d.candles, config.smaShortPeriod)?.toFixed(2),
            sma50: calculateSMAExported(d.candles, config.smaLongPeriod)?.toFixed(2)
        }));
        const prompt = `
        **Persona:** You are a quantitative analyst. Analyze the following batch.
        **Data:** ${JSON.stringify(formattedData)}
        **Task:** For each asset, provide a technical score and summary in JSON format.
        - \`technical_score\`: 0.0 to 10.0.
        - \`trend\`: "Uptrend", "Downtrend", "Sideways".
        - \`momentum\`: "Bullish", "Bearish", "Neutral".
        - \`summary\`: One-sentence summary.
        `;
        return await this.safeGenerate(prompt);
    }
}

export interface Analysis { [key: string]: any; }

export class RiskManager extends AIAgent {
    private memoryService: MemoryService;
    constructor(agentService: AgentService) {
        super('RiskManager', agentService);
        this.memoryService = MemoryService.getInstance();
    }
    determineRiskParameters(baseConfig: any, sharedContext: SharedContext): any {
        const { regimeScore } = sharedContext.getContext();
        const newConfig = { ...baseConfig };
        if (regimeScore > 7.5) { newConfig.riskAmountPercent *= 1.25; } 
        else if (regimeScore < 4.0) { newConfig.riskAmountPercent *= 0.5; }
        return newConfig;
    }
    async decideBatch(batchTechAnalyses: Record<string, any>, macroAnalysis: any, sentimentAnalysis: any, fundamentalData: Record<string, any>): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const candidatesForPrompt: Record<string, any> = {};
        const consultationPromises: Promise<any>[] = [];
        const conflictSymbols: string[] = [];
        for (const symbol in batchTechAnalyses) {
            const tech = batchTechAnalyses[symbol];
            const situationNarrative = `Trade for ${symbol}. Macro: ${macroAnalysis?.market_regime}, Tech score: ${tech?.technical_score}`;
            const pastLessons = await this.memoryService.recallMemories(situationNarrative, 3);
            candidatesForPrompt[symbol] = {
                technicalAnalysis: tech,
                fundamentalAnalysis: fundamentalData[symbol.replace('USDT', '')] || { error: "No data." },
                pastLessons: pastLessons.map(p => p.narrative)
            };
            if ((tech?.technical_score || 0) > 8.0 && (macroAnalysis?.regime_score || 5.0) < 4.0) {
                const question = `Excellent tech signal for ${symbol} but macro is Risk-Off. Is this a trap?`;
                consultationPromises.push(this.consult('MacroAnalyst', question));
                conflictSymbols.push(symbol);
                candidatesForPrompt[symbol].consultation = { question };
            }
        }
        if (consultationPromises.length > 0) {
            const debateResults = await Promise.all(consultationPromises);
            debateResults.forEach((answer, index) => {
                const symbol = conflictSymbols[index];
                if (candidatesForPrompt[symbol].consultation) {
                    candidatesForPrompt[symbol].consultation.answer = answer?.response || "No response.";
                }
            });
        }
        const prompt = `
        **Persona:** You are a critical Risk Manager with perfect memory.
        **Context:**
        - **Macro:** ${JSON.stringify(macroAnalysis)}
        - **Sentiment:** ${JSON.stringify(sentimentAnalysis)}
        - **Candidates:** ${JSON.stringify(candidatesForPrompt)}
        **CRITICAL TASK & RULES:**
        1.  Synthesize all data: Macro, Technical, Fundamental, and Past Lessons.
        2.  **Learn from History:** If past lessons show losses in similar situations, be more cautious.
        3.  **Fundamental Veto:** If fundamentals are weak (missing URLs, vague description), reduce confidence_score by 2-3 points.
        4.  **Debate Interpretation:** Use consultation answers to resolve conflicts.
        **Format (JSON):** An object where each key is the symbol, with \`decision\`, \`confidence_score\`, and \`final_summary\`. Justification must mention key factors.
        `;
        return await this.safeGenerate(prompt);
    }
}

export class DEX_ScoutAgent extends AIAgent {
    constructor(agentService: AgentService) { super('DEX_ScoutAgent', agentService); }
    async analyze(latestDexPairs: any[], sharedContext: SharedContext): Promise<void> {
        if (!latestDexPairs?.length) return;
        const anomalies = latestDexPairs
            .filter(pair => {
                const quote = pair.quote?.[Object.keys(pair.quote)[0]];
                const volume24h = quote?.volume_24h || 0;
                const liquidity = quote?.liquidity || 0;
                return volume24h > 50000 && (liquidity === 0 || volume24h > liquidity);
            })
            .map(pair => pair.base_asset_symbol || pair.symbol);

        if (anomalies.length > 0) {
            // @ts-ignore
            sharedContext.updateContext({ dexOpportunities: anomalies });
        }
    }
}

export interface Trade { symbol: string; amount: number; entryPrice: number; exitPrice: number; pnl: number; timestamp: string; reason: string; }
export interface MissedOpportunity { timestamp: string; symbol: string; reason: string; }
export interface DecisionLogEntry { timestamp: string; symbol: string; decision: string; }

export class StrategyOptimizer extends AIAgent {
    constructor(agentService: AgentService) { super('StrategyOptimizer', agentService); }
    async analyze(trades: Trade[], missedOpportunities: MissedOpportunity[], decisionLogs: DecisionLogEntry[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const prompt = `
        **Persona:** You are a Quantitative Analyst. Evolve the bot by learning from its history.
        **Data:**
        1.  **Trades:** ${JSON.stringify(trades.slice(-50))}
        2.  **Missed Ops:** ${JSON.stringify(missedOpportunities.slice(-50))}
        3.  **Decisions:** ${JSON.stringify(decisionLogs.slice(-50))}
        **TASK:** Perform a holistic analysis and generate a new, superior configuration.
        - Analyze performance: What are the common characteristics of winning vs. losing trades?
        - Propose & Justify: Generate a new configuration and explain why you are making each key change.
        **Format (JSON):**
        - \`analysis_summary\`: Brief summary of your findings.
        - \`suggested_settings\`: A complete JSON object with all configuration keys for the main config.json file.
        `;
        return await this.safeGenerate(prompt);
    }
}

export class MasterAgent extends AIAgent {
    constructor(agentService: AgentService) { super('MasterAgent', agentService); }
    async manageOptimizationCycle(mainPortfolio: Portfolio, shadowPortfolio: Portfolio | null, config: any, username: string): Promise<void> {
        const mainConfigPath = path.join(process.cwd(), 'config.json');
        const shadowConfigPath = path.join(process.cwd(), `shadow_config_${username}.json`);
        if (shadowPortfolio) {
            const mainValue = mainPortfolio.balance;
            const shadowValue = shadowPortfolio.balance;
            const performanceDiff = ((shadowValue - mainValue) / mainValue) * 100;
            if (performanceDiff > 5.0) {
                console.log(`[MasterAgent] Shadow config performed ${performanceDiff.toFixed(2)}% better. Promoting to main config.`);
                const shadowConfigData = await fs.readFile(shadowConfigPath, 'utf-8');
                await fs.writeFile(mainConfigPath, shadowConfigData);
                await fs.unlink(shadowConfigPath);
                const shadowPortfolioPath = path.join(process.cwd(), `portfolio_shadow_${username}.json`);
                await fs.writeFile(shadowPortfolioPath, JSON.stringify({ balance: 100000, positions: [] }, null, 2));
            } else {
                console.log(`[MasterAgent] Shadow config did not outperform. Discarding and generating a new one.`);
                await fs.unlink(shadowConfigPath);
                await this.generateNewShadowConfig(username, config);
            }
        } else {
            console.log('[MasterAgent] No shadow portfolio found. Generating a new shadow config.');
            await this.generateNewShadowConfig(username, config);
        }
    }
    private async generateNewShadowConfig(username: string, currentConfig: any): Promise<void> {
        const optimizer = this.agentService.getAgent('StrategyOptimizer') as StrategyOptimizer;
        if (!optimizer) { return; }
        const tradesLogPath = path.join(process.cwd(), `trades_log_${username}.json`);
        const missedLogPath = path.join(process.cwd(), `missed_opportunities_${username}.json`);
        const decisionLogPath = path.join(process.cwd(), `decision_log_${username}.json`);
        try {
            const trades = JSON.parse(await fs.readFile(tradesLogPath, 'utf-8'));
            const missed = JSON.parse(await fs.readFile(missedLogPath, 'utf-8'));
            const decisions = JSON.parse(await fs.readFile(decisionLogPath, 'utf-8'));
            if (trades.length < 10) { return; }
            const analysisResult = await optimizer.analyze(trades, missed, decisions);
            const suggestedSettings = analysisResult?.response?.suggested_settings as any;
            if (suggestedSettings) {
                const newConfig = { ...currentConfig, ...suggestedSettings };
                const shadowConfigPath = path.join(process.cwd(), `shadow_config_${username}.json`);
                await fs.writeFile(shadowConfigPath, JSON.stringify(newConfig, null, 2));
            }
        } catch (error) {
            if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
                 console.error('[MasterAgent] Error during shadow config generation:', error);
            }
        }
    }
}