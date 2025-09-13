// src/core/agents.ts

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from "@google/generative-ai";
import { Candle, Ticker } from "./binance";
import { SharedContext } from "./context";
import { calculateRSI, calculateMACD, calculateSMAExported, calculateATR } from "./indicators"; // Ensure calculateATR is imported
import { AgentService } from './agent-service';
import { MemoryService } from "./memory";
import { Position, Portfolio } from './portfolio'; // Import Position and Portfolio interfaces
import { GlobalMetricsData } from './coinmarketcap'; // Import GlobalMetricsData
import fs from 'fs/promises';
import path from 'path';
import { AdaptedConfig } from './risk-adapter';
import { sendEvent } from '@/utils/event-emitter';
import * as binance from './binance';
import { getOnChainData } from './onchain';
import { getSocialMediaMentions } from './social';
import { agentMetricsService } from './metrics-service';
import { PrismaClient } from '@prisma/client';
import { ChatMessage } from './services/ConversationService';
import { Tool } from './tools';

const prisma = new PrismaClient();

type ApiKey = {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  userId: string;
  createdAt: Date;
};

class KeyRotator {
    private keys: ApiKey[];
    private currentIndex: number;
    private username: string;

    constructor(keys: ApiKey[], username: string) {
        this.keys = keys;
        this.username = username;
        this.currentIndex = this.keys.findIndex(k => k.isActive);
        if (this.currentIndex === -1) {
            this.currentIndex = 0;
    }
}

    public getKey(): string {
        if (this.keys.length === 0) {
            // Grąžiname `.env` raktą kaip atsarginį variantą
            return process.env.GEMINI_API_KEYS?.split(',')[0] || '';
        }
        return this.keys[this.currentIndex].key;
    }

    public getActiveKeyName(): string {
        if (this.keys.length === 0) return 'Default (.env)';
        return this.keys[this.currentIndex].name;
    }

    public async getNextKey(): Promise<string> {
        if (this.keys.length <= 1) {
            console.error(`[KeyRotator] No keys to rotate to for user ${this.username}.`);
            return this.getKey();
        }

        const oldIndex = this.currentIndex;
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        const newActiveKey = this.keys[this.currentIndex];

        console.warn(`[KeyRotator] API limit hit for user ${this.username}. Rotating from key '${this.keys[oldIndex].name}' to '${newActiveKey.name}'.`);

        // Atominis atnaujinimas duomenų bazėje
        try {
            await prisma.$transaction([
                prisma.apiKey.updateMany({
                    where: { userId: this.username },
                    data: { isActive: false }
                }),
                prisma.apiKey.update({
                    where: { id: newActiveKey.id },
                    data: { isActive: true }
                })
            ]);
        } catch (error) {
            console.error(`[KeyRotator] Failed to update active key in DB for user ${this.username}:`, error);
        }

        return newActiveKey.key;
    }
}




export abstract class AIAgent {
    private keyRotator?: KeyRotator; // Dabar nebūtinas iškart
    protected model: GenerativeModel;
    public readonly name: string;
    protected agentService: AgentService;
    private modelName: string;
    private lastSuccessfulResult: { prompt: string; response: Record<string, unknown> } | null = null;
    private username?: string; // Saugosime vartotojo vardą

    constructor(name: string, agentService: AgentService, username?: string) {
        if (!name || !agentService) {
            throw new Error("AIAgent requires a name and AgentService instance.");
        }
        this.name = name;
        this.agentService = agentService;
        this.username = username;
        this.modelName = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash';

        if (!process.env.GEMINI_MODEL_NAME) {
            console.warn(`GEMINI_MODEL_NAME not found in .env.local, defaulting to 'gemini-1.5-flash'.`);
        }

        // Pradinė inicializacija su numatytuoju raktu
        const defaultKey = process.env.GEMINI_API_KEYS?.split(',')[0] || '';
        const genAI = new GoogleGenerativeAI(defaultKey);
        this.model = genAI.getGenerativeModel({ model: this.modelName });
    }

    // Asinchroninė inicializacija, kuri bus kviečiama prieš pirmą `safeGenerate`
    private async initializeRotator() {
        if (this.keyRotator || !this.username) return;

        const userKeys = await prisma.apiKey.findMany({
            where: { userId: this.username },
            orderBy: { createdAt: 'asc' }
        });

        if (userKeys.length > 0) {
            this.keyRotator = new KeyRotator(userKeys, this.username);
            this.reinitializeModel(this.keyRotator.getKey());
            console.log(`[${this.name}] Initialized with key rotator for user ${this.username}. Active key: ${this.keyRotator.getActiveKeyName()}`);
        } else {
            console.warn(`[${this.name}] No API keys found in DB for user ${this.username}. Using default key from .env.`);
        }
    }

    private reinitializeModel(apiKey: string) {
        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({ model: this.modelName });
    }

    async safeGenerate(prompt: string, retries = 3): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        await this.initializeRotator(); // Užtikriname, kad rotorius inicializuotas

        const startTime = Date.now();
        let lastError: Error | null = null;
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const safetySettings = [ { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }, ];
                const result = await this.model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], safetySettings, });
                const response = result.response;

                const rawText = response.text();

                const startIndex = rawText.indexOf('{');
                if (startIndex === -1) throw new Error("No JSON object found in the response.");

                let balance = 0;
                let endIndex = -1;
                for (let i = startIndex; i < rawText.length; i++) {
                    if (rawText[i] === '{') balance++;
                    else if (rawText[i] === '}') balance--;
                    if (balance === 0) {
                        endIndex = i;
                        break;
                    }
                }

                if (endIndex === -1) throw new Error("Could not find a valid closing bracket for the JSON object.");

                const jsonText = rawText.substring(startIndex, endIndex + 1);

                const jsonResponse = JSON.parse(jsonText) as Record<string, unknown>;

                // Sėkmės registravimas
                const endTime = Date.now();
                await agentMetricsService.recordSuccess(this.name, endTime - startTime);

                this.lastSuccessfulResult = { prompt, response: jsonResponse };

                return { prompt, response: jsonResponse };

            } catch (error) {
                lastError = error as Error;
                const errorMessage = lastError.message;
                if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
                    if (this.keyRotator) {
                        const newKey = await this.keyRotator.getNextKey();
                        this.reinitializeModel(newKey);
                    }
                    if (attempt < retries - 1) { await new Promise(resolve => setTimeout(resolve, 2000)); continue; }
                }
            }
        }
        // Klaidos registravimas
        await agentMetricsService.recordError(this.name);
        console.error(`[${this.name}] AI Agent generation failed after ${retries} retries. Last error: ${lastError?.message}`);
        return null;
    }
    
    public getLastResult(): { prompt: string; response: Record<string, unknown> } | null {
        return this.lastSuccessfulResult;
    }

    protected async consult(targetAgentName: string, query: string): Promise<Record<string, unknown> | null> {
        const agent = this.agentService.getAgent(targetAgentName);
        if (!agent) { return null; } // Return null explicitly
        const result = await agent.handleConsultation(query, this.name);
        return result;
    }
    
    public async handleConsultation(query: string, callingAgentName: string): Promise<Record<string, unknown> | null> {
        const prompt = `
        **Persona:** You are ${this.name}, an expert in your domain.
        **Query:** "${query}"
        **Task:** Provide a concise, direct answer in JSON format under the key "response".
        `;
        const result = await this.safeGenerate(prompt);
        return result ? result.response : null;
    }
}

export class MacroAnalyst extends AIAgent {
    constructor(agentService: AgentService) {
        super('MacroAnalyst', agentService);
    }
    
    async analyze(btcData: Record<string, unknown>, newsHeadlines: string[], fearAndGreedIndex: { value: string; classification: string } | null, globalMetrics: GlobalMetricsData | null, sharedContext: SharedContext): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const prompt = `
**Persona:** You are a Macroeconomic Analyst. Your task is to assess the market environment and its current momentum.

**Data Provided:**
1.  **Bitcoin Last Candle:** ${JSON.stringify(btcData)}
2.  **News Headlines:** ${JSON.stringify(newsHeadlines)}
3.  **Fear & Greed Index:** ${JSON.stringify(fearAndGreedIndex)}
4.  **Global Metrics (Total Market Cap, Stablecoin Cap Change etc.):** ${JSON.stringify(globalMetrics)}

CRITICAL TASK: Analyze all provided data to determine the market state and its short-term trend. Provide your analysis in a structured JSON format.

JSON Output Schema:
- "market_regime": String. Must be one of: "Risk-On", "Risk-Off", "Neutral".
- "regime_score": Float. A score from 0.0 (extreme danger) to 10.0 (extreme opportunity). A neutral market is ~5.0.
- "risk_trend": String. (NEW) Based on the 24h change in metrics (Total Market Cap, Fear & Greed, Stablecoin inflows), determine the immediate trend. Must be one of: "Improving", "Deteriorating", "Stable".
- "reasoning": String. A brief explanation for your choices, referencing specific data points (e.g., "Fear & Greed dropped, indicating a deteriorating trend.").
- "summary": String. A one-sentence, actionable summary for a portfolio manager.
`;
        const result = await this.safeGenerate(prompt);
        if (result?.response) {
            const { market_regime, regime_score, risk_trend } = result.response;
            if (typeof market_regime === 'string' && typeof regime_score === 'number' && typeof risk_trend === 'string') {
                sharedContext.updateContext({
                    marketRegime: market_regime as 'Risk-On' | 'Risk-Off' | 'Neutral',
                    regimeScore: regime_score,
                    riskTrend: risk_trend as 'Improving' | 'Deteriorating' | 'Stable'
                });
            }
        }
        return result;
    }
}

interface Config {
    [key: string]: unknown;
    exit_criteria?: {
        initial_take_profit_percent?: number;
    };
    technical_indicator_settings?: {
        rsi_period?: number;
        macd_fast_period?: number;
        macd_slow_period?: number;
        macd_signal_period?: number;
        moving_averages_short_period?: number;
        moving_averages_long_period?: number;
    };
    advanced_strategies?: {
        require_fundamental_analysis?: boolean;
        enable_social_analysis?: boolean;
        analysis_weights?: {
            technical_weight?: number;
            onchain_weight?: number;
            social_weight?: number;
            macro_override_weight?: number;
        };
    };
    force_buy_on_strong_technicals?: boolean; // Added for the new logic
    dynamic_market_overlay_DMO_strategy?: { enabled: boolean };
}
interface DecisionHistory { timestamp: string; decision: string; justification: string; }

export class SentimentAnalyst extends AIAgent {
    constructor(agentService: AgentService) { super('SentimentAnalyst', agentService); }
    async analyze(newsArticles: { title?: string }[], trendingTokens: Record<string, unknown>[], sharedContext: SharedContext): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const prompt = `
        **Persona:** You are an AI that analyzes text sentiment and social hype.
        **Data:**
        1.  **News Headlines:** ${JSON.stringify(newsArticles.map(a => a.title).slice(0, 10))}
        2.  **Community Trending Tokens:** ${JSON.stringify(trendingTokens)}
        **Task:** Evaluate the overall sentiment in JSON format.
        - \`sentiment\`: "Bullish", "Bearish", or "Neutral".
        - \`sentiment_score\`: A number from -1.0 to 1.0.
        - \`dominant_narrative\`: A short phrase describing the main story.
        - \`key_topics\`: An array of key topics.
        `;
        const result = await this.safeGenerate(prompt);
        if (result?.response) {
            const { sentiment, sentiment_score, key_topics, dominant_narrative } = result.response;
            if (typeof sentiment === 'string' && typeof sentiment_score === 'number' && Array.isArray(key_topics)) {
                sharedContext.updateContext({
                    sentiment: sentiment as 'Bullish' | 'Bearish' | 'Neutral', // Cast to specific union type
                    sentimentScore: sentiment_score,
                    // @ts-expect-error: The type of dominant_narrative is inferred as unknown, but we are asserting it as string.
                    dominantNarrative: dominant_narrative as string,
                    keyTopics: key_topics as string[],
                });
            }
        }
        return result;
    }
}

export class PositionManager extends AIAgent {
    constructor(agentService: AgentService) {
        super('PositionManager', agentService);
    }
    
    async decide(position: Position, currentPrice: number, macroAnalysis: Record<string, unknown>, sentimentAnalysis: Record<string, unknown>, config: Config, decisionHistory: DecisionHistory[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const pnlPercent = (currentPrice - position.entryPrice) / position.entryPrice * 100;
        const takeProfitTarget = position.takeProfitPercent || config.exit_criteria?.initial_take_profit_percent || 1.0;
        
        const prompt = `
        **Persona:** You are a professional, stateful trader managing a profitable position. Your goal is to maximize gains while intelligently protecting profits.
        **Current Context:**
        - **Position:** ${JSON.stringify(position, null, 2)}
        - **Current Price:** ${currentPrice}
        - **Current P/L (%):** ${pnlPercent.toFixed(2)}%
        - **Take-Profit Target (%):** ${takeProfitTarget}%
        - **Macro Environment:** ${JSON.stringify(macroAnalysis, null, 2)}
        - **Market Sentiment:** ${JSON.stringify(sentimentAnalysis, null, 2)}
        **Task:** The position has reached its take-profit target. Decide whether to sell now or to let the profit run by increasing the take-profit target. Be a disciplined profit-taker, not a greedy gambler.
        **Format (JSON):**
        - \`decision\`: "SELL_NOW" or "HOLD_AND_INCREASE_TP".
        - \`new_take_profit_percent\`: (Only if holding) The new take-profit percentage (e.g., if current is ${takeProfitTarget}%, new could be ${takeProfitTarget + 2}%).
        - \`reason\`: A brief reason for your decision.
        `;
        return await this.safeGenerate(prompt);
    }

    async review_open_position(position: Position, currentPrice: number, macroAnalysis: MacroAnalysisResult, sentimentAnalysis: SentimentAnalysisResult, config: Config): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const pnlPercent = (currentPrice - position.entryPrice) / position.entryPrice * 100;
        const prompt = `
**Persona:** You are a pragmatic and disciplined Portfolio Manager. Your primary job is to protect capital and profits by actively managing open positions.

**Context:** You are reviewing an existing, open position. The market conditions may have changed since this position was opened.

**Position Details:**
- **Symbol:** ${position.symbol}
- **Entry Price:** ${position.entryPrice}
- **Current Price:** ${currentPrice}
- **Current P/L (%):** ${pnlPercent.toFixed(2)}%
- **Original Justification (Technicals):** ${JSON.stringify(position.technicals || {})}

**NEW Market Data (Current Cycle):**
- **Macro Environment:** ${JSON.stringify(macroAnalysis)}
- **Market Sentiment:** ${JSON.stringify(sentimentAnalysis)}

**CRITICAL TASK:** Based on the NEW market data, decide if it's still strategically sound to keep this position open. A profitable position in a deteriorating market is a risk. A small loss can become a big loss if the market turns.

**Decision Rules:**
1.  **High Priority:** If the Macro Regime has shifted to "Risk-Off" (score < 4.0) since the position was opened, you should strongly consider selling to protect capital, even if the position is at a small loss.
2.  **Consider P/L:** If the position has a healthy profit, but market conditions are worsening, locking in that profit is a wise move.
3.  **Hold Condition:** Only decide to "HOLD" if the current Macro and Sentiment analysis still strongly supports the original reason for entering the trade.

**Format (JSON):**
- \`decision\`: "HOLD" or "SELL_NOW".
- \`reason\`: A brief, clear justification for your decision, referencing the NEW market data. Example: "Macro regime has shifted to Risk-Off; closing position to preserve capital."
        `;
        return await this.safeGenerate(prompt);
    }
}

export class SocialMediaAnalyst extends AIAgent {
    constructor(agentService: AgentService) {
        super('SocialMediaAnalyst', agentService);
    }

    async analyzeBatch(symbols: string[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const dataForPrompt = await getSocialMediaMentions(symbols);

        const prompt = `
        **Persona:** You are a Social Media Analyst, specializing in crypto community trends.
        **Data:** ${JSON.stringify(dataForPrompt)}
        **Task:** For each asset, interpret the social media data and provide a score and summary in JSON format.
        - \`social_score\`: A number from 0.0 to 10.0, indicating overall hype and positive sentiment.
        - \`summary\`: A brief statement on the asset's social media presence (e.g., "Trending with strong positive sentiment", "High mention volume but mixed sentiment", "Low social activity").
        `;
        return await this.safeGenerate(prompt);
    }
}

interface BuySignal { symbol: string; [key: string]: unknown; }

export class PortfolioAllocator extends AIAgent {
    constructor(agentService: AgentService) { super('PortfolioAllocator', agentService); }

    async allocate(buySignals: BuySignal[], portfolio: Portfolio, macroAnalysis: unknown, sentimentAnalysis: unknown, sharedContext: SharedContext, narrativeContext?: { narrative: string; assets: string[] }, dexOpportunities?: string[], adaptedConfig?: AdaptedConfig): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        
        // --- PROMPT'AS YRA VISIŠKAI PAKEISTAS ---
        const prompt = `
        Persona: You are a precise Quantitative Portfolio Allocator. Your role is purely mathematical. You do not make strategic decisions; you execute them based on provided multipliers.

        Context & Data:
        - Current Portfolio Balance: ${portfolio.balance} USD
        - Base Capital Per Trade (from config): ${adaptedConfig?.risk_management?.capital_per_trade_percent || 0}% of the total portfolio balance.
        - Approved Trade Candidates from Risk Manager: Each candidate includes a mandatory \`position_sizing_multiplier\`.
        ${JSON.stringify(buySignals)}

        CRITICAL TASK: For EACH candidate provided, calculate the final \`amount_to_buy_usd\`. You MUST NOT skip any candidate. Your job is only to calculate.

        Calculation Logic:
        \`final_allocation_USD = (Portfolio_Balance * base_capital_per_trade_percent / 100) * position_sizing_multiplier\`
        
        Example:
        - Portfolio Balance: $100,000
        - Base Capital %: 1.0% (=> $1,000)
        - Candidate Multiplier: 1.15
        - Final Allocation: $1,000 * 1.15 = $1150

        Final JSON Output Schema: Your response MUST be a JSON object where each key is the symbol. The value for each symbol MUST be an object with these keys:
        - \`amount_to_buy_usd\`: Float. The precise USD amount to allocate, calculated using the multiplier. This CANNOT be zero.
        - \`calculation_breakdown\`: String. A brief confirmation of the calculation. e.g., "Balance: $${portfolio.balance} * Base: ${adaptedConfig?.risk_management?.capital_per_trade_percent}% * Multiplier: [multiplier] = [final_amount]".
        `;
        
        return await this.safeGenerate(prompt);
    }
}

export class TechnicalAnalyst extends AIAgent {
    constructor(agentService: AgentService) { super('TechnicalAnalyst', agentService); }
    async analyzeBatch(batchData: { symbol: string; candles: Candle[] }[], config: Config): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const techSettings = config.technical_indicator_settings || {};
        const formattedData = batchData.map(d => {
            const lastClose = d.candles.length > 0 ? d.candles[d.candles.length - 1].close : 0;
            const atrValue = calculateATR(d.candles, 14); // Standard 14-period ATR
            const atrPercent = lastClose > 0 && atrValue ? (atrValue / lastClose) * 100 : null;

            return {
                symbol: d.symbol,
                rsi: calculateRSI(d.candles, techSettings.rsi_period || 14)?.toFixed(2),
                macdHistogram: calculateMACD(d.candles, techSettings.macd_fast_period || 12, techSettings.macd_slow_period || 26, techSettings.macd_signal_period || 9)?.histogram?.toFixed(4),
                sma20: calculateSMAExported(d.candles, techSettings.moving_averages_short_period || 20)?.toFixed(2),
                sma50: calculateSMAExported(d.candles, techSettings.moving_averages_long_period || 50)?.toFixed(2),
                atr_percent: atrPercent?.toFixed(2)
            };
        });
        const prompt = `
**Persona:** You are a quantitative analyst. Your task is to analyze raw technical indicator data for a batch of assets and provide a structured technical assessment.

**Data Provided:** An array of assets with their indicators, including \`atr_percent\` which represents asset volatility.
${JSON.stringify(formattedData)}

**CRITICAL TASK:** Analyze ALL assets provided and return a SINGLE JSON OBJECT. The keys of this object MUST be the asset symbols from the input data, and the values must be the JSON objects containing their respective analysis.

**Example Output Structure:**
{
  "MKRUSDT": { "technical_score": 5.5, "is_bearish_setup": false, ... },
  "ALGOUSDT": { "technical_score": 3.2, "is_bearish_setup": false, ... },
  ...
}

**JSON Schema for EACH Asset's Analysis:**
- \`technical_score\`: Float. A score from 0.0 to 10.0 on the strength of the technical setup.
- \`is_bearish_setup\`: Boolean. Set to \`true\` if you identify specific, strong bearish patterns (e.g., bearish divergence, major resistance rejection, overbought conditions with confirmation). Otherwise, set to \`false\`.
- \`volatility_level\`: String. Categorize the asset's volatility based on \`atr_percent\`. Must be one of: "High" (if atr_percent > 4.0), "Normal" (if atr_percent is between 1.5 and 4.0), "Low" (if atr_percent < 1.5).
- \`trend\`: String. Must be one of: "Uptrend", "Downtrend", "Sideways".
- \`momentum\`: String. Must be one of: "Bullish", "Bearish", "Neutral".
- \`summary\`: String. A concise, one-sentence summary of the technical picture.
        `;
        return await this.safeGenerate(prompt);
    }

    public async analyzeForScalping(symbol: string, candles: Candle[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        // Formuojame duomenis tik svarbiausiems rodikliams
        const formattedData = {
            symbol: symbol,
            last_5_candles: candles.slice(-5).map(c => ({ o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume })),
            rsi: calculateRSI(candles, 14)?.toFixed(2),
        };

        const prompt = `
        **Persona:** Esi greitas ir tikslus techninis analitikas, specializuojantis trumpalaikiuose (scalping) signaluose.
        **Duomenys:** Pateikti 1-minutės žvakių duomenys ir RSI rodiklis simboliui ${symbol}.
        ${JSON.stringify(formattedData)}
        **Užduotis:** Įvertink, ar dabartinis kainos impulsas yra stiprus ir vertas "žvalgybinės" (scout) pozicijos. Tavo analizė turi būti žaibiška.
        
        **JSON Atsakymo Struktūra:**
        {
          "is_strong_impulse": "Boolean", // true, jei matai aiškų, stiprų impulsą su patvirtinančiu volumenu.
          "reason": "String" // trumpas paaiškinimas, pvz., "Stipri 'bullish engulfing' žvakė su padidėjusiu volumenu."
        }
        `;
        return await this.safeGenerate(prompt);
    }
}

export interface MacroAnalysisResult {
    market_regime: 'Risk-On' | 'Risk-Off' | 'Neutral';
    regime_score: number;
    risk_trend: 'Improving' | 'Deteriorating' | 'Stable'; // NEW
    reasoning: string;
    summary: string;
}

export interface TechnicalAnalysisResult {
    technical_score: number;
    is_bearish_setup: boolean; // NEW
    volatility_level: 'High' | 'Normal' | 'Low'; // NEW: Volatility level based on ATR %
    trend: 'Uptrend' | 'Downtrend' | 'Sideways';
    momentum: 'Bullish' | 'Bearish' | 'Neutral';
    summary: string;
}

export interface SentimentAnalysisResult {
    sentiment: 'Bullish' | 'Bearish' | 'Neutral';
    sentiment_score: number;
    dominant_narrative: string;
    key_topics: string[];
}

export interface FundamentalAnalysisResult {
    info: string;
    [key: string]: unknown; // Allow other properties
}

export interface Analysis { [key: string]: unknown; }

export interface OnChainData {
    info?: string;
    [key: string]: unknown;
}

export interface SocialMediaAnalysisResult {
    social_score: number;
    summary: string;
}

export class RiskManager extends AIAgent {
    private memoryService: MemoryService;

    constructor(agentService: AgentService, username: string) {
        super('RiskManager', agentService);
        this.memoryService = new MemoryService(username);
    }

    // decideSingle method is commented out as per instructions
    /*
    async decideSingle(
        symbol: string,
        techAnalysis: TechnicalAnalysisResult,
        macroAnalysis: MacroAnalysisResult,
        sentimentAnalysis: SentimentAnalysisResult,
        onChainAnalysis: OnChainData,
        socialAnalysis: SocialMediaAnalysisResult,
        fundamentalData: FundamentalAnalysisResult | null,
        config: Config
    ): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        // ... (original decideSingle logic)
    }
    */ // Explicitly close the comment block

public async decideBatch(
        batchTechAnalyses: Record<string, TechnicalAnalysisResult>,
        macroAnalysis: MacroAnalysisResult, // This will be mutable
        sentimentAnalysis: SentimentAnalysisResult,
        onChainAnalyses: Record<string, OnChainData>,
        socialAnalyses: Record<string, SocialMediaAnalysisResult>,
        config: Config,
        portfolioContext: { open_positions: { symbol: string; categories: string[] }[] }
    ): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        // --- START OF MODIFICATION ---
        const dmoConfig = (config as any).dynamic_market_overlay_DMO_strategy;
        if (dmoConfig && dmoConfig.enabled === false) {
            console.log("[RiskManager] DMO is disabled. Bypassing macro-level risk assessment and proceeding with neutral assumptions.");
            // Override macro analysis to be permissive for testing purposes
            macroAnalysis = {
                market_regime: 'Neutral',
                regime_score: 6.0, // Neutral score to pass most checks
                risk_trend: 'Stable',
                reasoning: 'DMO DISABLED BY CONFIG',
                summary: 'DMO is disabled; macro conditions are being ignored for this cycle.'
            };
        }
        // --- END OF MODIFICATION ---

        const weights = config.advanced_strategies?.analysis_weights || { technical_weight: 0.7, onchain_weight: 0.1, social_weight: 0.1, macro_override_weight: 0.1 };

        let candidatesXML = "";
        for (const symbol of Object.keys(batchTechAnalyses)) {
            const tech = batchTechAnalyses[symbol] as TechnicalAnalysisResult;
            const onChain = onChainAnalyses?.[symbol] ? onChainAnalyses[symbol] : { info: "No data." };
            const social = socialAnalyses?.[symbol] ? socialAnalyses[symbol] : { social_score: 0, summary: "No data." };
            const situationNarrative = `Trade for ${symbol}. Macro: ${macroAnalysis.market_regime}, Tech score: ${tech.technical_score}`;

            // --- NAUJA DALIS: Atskiras pamokų surinkimas ---
            const humanLessons = await this.memoryService.recallMemories(situationNarrative, 2, 'HUMAN');
            const aiLessons = await this.memoryService.recallMemories(situationNarrative, 2, 'AI');

            candidatesXML += `
            <candidate>
                <symbol>${symbol}</symbol>
                <technical_analysis>${JSON.stringify(tech)}</technical_analysis>
                <onchain_analysis>${JSON.stringify(onChain)}</onchain_analysis>
                <social_analysis>${JSON.stringify(social)}</social_analysis>
                <human_override_lessons>${JSON.stringify(humanLessons)}</human_override_lessons>
                <ai_past_lessons>${JSON.stringify(aiLessons)}</ai_past_lessons>
            </candidate>`;
        }

        // <-- PRIDĖTA LOGIKA: Dinamiškai keičiame prompt'o dalis
        let persona = "You are a multi-asset Risk Manager. Your task is to analyze a BATCH of candidates and make decisions.";
        let criticalTask = `
        CRITICAL TASK: Return a single JSON object where each key is a symbol from the input. The value for each key must be another JSON object with the specified schema.
        `;
        if (config.force_buy_on_strong_technicals) {
            persona = "You are an aggressive trader executing a high-risk strategy for testing purposes. Your primary goal is to execute trades based on strong technical signals.";
            criticalTask = `
        CRITICAL TASK & NEW RULE: Your main objective is to test trade execution. You MUST approve a "BUY" decision if a candidate's \`technical_score\` is 7.5 or higher, UNLESS the \`regime_score\` in the macro_environment is below 2.0 (catastrophic conditions). For all other cases, use your judgment.
        
        Return a single JSON object where each key is a symbol from the input. The value for each key must be another JSON object with the specified schema.
        `;
        }

        // --- NAUJAS, PILNAI PAKEISTAS PROMPT'AS ---
        const prompt = `
Persona: ${persona}

Strategic Weights: ${JSON.stringify(weights)}

<context>
    <macro_environment>${JSON.stringify(macroAnalysis)}</macro_environment>
    <market_sentiment>${JSON.stringify(sentimentAnalysis)}</market_sentiment>
</context>

<candidates>
    ${candidatesXML}
</candidates>

${criticalTask}

**MANDATORY ACTION: For each candidate, you MUST analyze the <human_override_lessons>.**
- In your final JSON response for each symbol, you MUST include a new field called \`human_lesson_consideration\`.
- In this field, you must explicitly state which human lesson you considered (by its narrative).
- You must then briefly state if the current situation is similar or different.
- If your final decision contradicts the human's past action in a similar scenario, you MUST provide a strong, data-driven reason in this field.

**Example for \`human_lesson_consideration\` field:**
"Considered lesson 'Human-AI Conflict on SOLUSDT... Teacher closed for profit'. Current situation is different as macro score is now 8.1 (vs 4.5 in lesson). AI's strong technical signal is given higher priority."

**PORTFOLIO CONTEXT & DIVERSIFICATION RULES:**
${JSON.stringify({ ...(config.diversification_settings || {}), open_positions: portfolioContext.open_positions })}

**POSITION SIZING RULES:**
- Volatility "Low" -> multiplier 1.2
- Volatility "Normal" -> multiplier 1.0
- Volatility "High" -> multiplier 0.7

JSON Schema for EACH symbol's decision:
- "decision": String. "BUY", "SELL_SHORT", or "AVOID".
- "confidence_score": Float. 0.0 to 1.0.
- "position_sizing_multiplier": Float.
- "take_profit_percent": Float.
- "stop_loss_percentage": Float.
- "final_summary": String.
- "human_lesson_consideration": String. (MANDATORY NEW FIELD)
`;

        return await this.safeGenerate(prompt);
    }

    public async provideAdvisory(symbol: string, techAnalysis: any, macroAnalysis: any, sentimentAnalysis: any): Promise<any> {
        const prompt = `
    **Persona:** Esi elitinis kiekybinis analitikas ir rizikos vertintojas, dirbantis kaip asmeninis patarėjas. Vartotojas paprašė tavo nuomonės apie ${symbol}. Tavo užduotis – pateikti išsamią, bet lengvai suprantamą analizę ir aiškią rekomendaciją. Tai yra patarimas, o ne prekybos komanda.
    
    **Duomenys:**
    - **Techninė Analizė:** ${JSON.stringify(techAnalysis)}
    - **Makroekonominė Aplinka:** ${JSON.stringify(macroAnalysis)}
    - **Rinkos Sentientas:** ${JSON.stringify(sentimentAnalysis)}

    **CRITICAL TASK:** Pateik savo analizę griežtai apibrėžtu JSON formatu. Atsakyme neturi būti jokių pašalinių žodžių ar paaiškinimų, tik JSON objektas.

    **JSON Atsakymo Struktūra:**
    {
      "recommendation": "String", // Aiškus, žmogui suprantamas verdiktas: "Strong Buy", "Cautious Buy", "Hold", "High-Risk Speculation", "Avoid", "Strong Sell"
      "confidence_score": "Float", // 0.0 - 1.0
      "summary": "String", // 1-2 sakinių santrauka, paaiškinanti rekomendaciją.
      "key_positive_factors": ["String"], // 2-3 esminiai teigiami veiksniai.
      "key_risks_and_concerns": ["String"], // 2-3 esminės rizikos.
      "suggested_action": "String" // Konkretus siūlomas veiksmas, pvz., "Apsvarstyti pirkimą dabartine kaina su stop-loss ties X. Pirmas pelno fiksavimo taškas ties Y."
    }
    `;
    return await this.safeGenerate(prompt);
    }
}

export class DEX_ScoutAgent extends AIAgent {
    constructor(agentService: AgentService) { super('DEX_ScoutAgent', agentService); }
    async analyze(latestDexPairs: Record<string, unknown>[], sharedContext: SharedContext): Promise<void> {
        if (!latestDexPairs?.length) return;
        const anomalies = latestDexPairs
            .filter(pair => {
                const quoteData = pair.quote as Record<string, { volume_24h?: number; liquidity?: number }>;
                if (!quoteData) {
                    return false;
                }
                
                const quoteKeys = Object.keys(quoteData);
                if (quoteKeys.length === 0) {
                    return false;
                }
                
                const firstQuote = quoteData[quoteKeys[0]];
                const volume24h = firstQuote?.volume_24h || 0;
                const liquidity = firstQuote?.liquidity || 0;
                return volume24h > 50000 && (liquidity === 0 || volume24h > liquidity);
            })
            .map(pair => pair.base_asset_symbol || pair.symbol);

        if (anomalies.length > 0) {
            // @ts-expect-error: dexOpportunities is not directly defined in ISharedContext, but added dynamically.
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
    **Persona:** You are a Quantitative Analyst and AI Strategist. Your core function is to evolve this trading bot by learning from its complete performance history.

    **You have three data sources:**
    1.  **Executed Trades Log:** The final outcome of each trade (profit or loss), including the market context at the time of sale.
    ${JSON.stringify(trades, null, 2)}

    2.  **Missed Opportunities Log:** Assets the bot decided to "AVOID".
    ${JSON.stringify(missedOpportunities, null, 2)}

    3.  **Position Management Decisions Log:** Records of when the bot decided to "HOLD" a winning position instead of selling immediately.
    ${JSON.stringify(decisionLogs, null, 2)}

    **CRITICAL TASK: Perform a holistic, data-driven analysis and generate a new, superior configuration.**
    - Analyze winning vs. losing trades in context of the market regime. (e.g., "Are we losing money during 'Risk-Off' even with good signals?").
    - Analyze Missed Opportunities.
    - Analyze Position Management decisions.
    - Propose & Justify a new, fully optimized configuration.

    **Format (JSON):**
    - \`analysis_summary\`: A brief summary of your key findings.
    - \`suggested_settings\`: A complete JSON object containing the full, new configuration.
    `;
    return await this.safeGenerate(prompt);
}
}

export class OnChainAnalyst extends AIAgent {
    constructor(agentService: AgentService) {
        super('OnChainAnalyst', agentService);
    }

    async analyzeBatch(symbols: string[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const dataForPrompt = await getOnChainData(symbols);

        const prompt = `
    **Persona:** You are an On-Chain Data Analyst. Your task is to interpret raw on-chain metrics for a batch of cryptocurrencies.
    **Data:** ${JSON.stringify(dataForPrompt)}
    **Task:** For each asset, provide a concise summary of its on-chain status in JSON format.
    - \`on_chain_score\`: A number from 0.0 to 10.0, indicating overall on-chain health/strength. High score means accumulation, low score means distribution.
    - \`implications\`: A brief statement on what these metrics imply (e.g., "Bullish accumulation by whales", "Bearish distribution to exchanges", "Neutral consolidation").
    `;
        return await this.safeGenerate(prompt);
    }
}

export class ScalperAgent extends AIAgent {
    constructor(agentService: AgentService) {
        super('ScalperAgent', agentService);
    }

    async manage_open_position(
        position: Position,
        pnlPercent: number,
        currentPrice: number,
        candles: Candle[]
    ): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const prompt = `
        **Persona:** You are a ruthless, high-frequency Trade Manager AI. A scalping position has reached its profit target. Greed is a liability. Your function is to execute the most profitable action based on data, not hope.

        **Context:**
        - **Symbol:** ${position.symbol}
        - **Current P/L:** +${pnlPercent.toFixed(2)}%
        - **Initial Take Profit Target Hit:** The position is currently profitable.
        - **Recent Price Action (Candles):** ${JSON.stringify(candles.slice(-10))}

        **CRITICAL TASK: Decide to exit immediately to lock in profit, or to let the winner run by increasing the take-profit target.**

        **Your Analysis Process:**
        1.  **Analyze Momentum:** Look at the last few candles. Is the price movement accelerating (long green candles)? Or is it slowing down, showing wicks at the top (a sign of exhaustion)?
        2.  **Analyze Volume:** Is the volume on the last green candle significantly higher than the previous ones (confirmation of strength)? Or is the volume fading as the price rises (a divergence indicating weakness)?
        3.  **Make the Decision:**
            - **"SELL_NOW" (High-Probability Default):** This is your primary action. Lock in the profit. Choose this if momentum is slowing, volume is not confirming the move, or if you see any sign of a reversal (e.g., a long upper wick).
            - **"HOLD_AND_INCREASE_TP" (The Alpha Move):** This is a rare, calculated risk for exceptional circumstances. Choose this ONLY IF the last candles show **extreme, undeniable acceleration in both price and volume**, suggesting the beginning of a parabolic leg.

        **Format (JSON):**
        - \`decision\`: "SELL_NOW" or "HOLD_AND_INCREASE_TP".
        - \`new_take_profit_percent\`: (Only if holding) A new, slightly higher take-profit target (e.g., if current was ${pnlPercent.toFixed(1)}%, new could be ${pnlPercent + 1.5}%).
        - \`reason\`: A cold, calculated reason. E.g., "Volume fading into resistance, securing profit." or "Parabolic volume and price acceleration detected, trailing stop to capture further upside."
        `;

        return await this.safeGenerate(prompt);
    }

    async confirm_or_reject_scout(
        position: Position,
        candles: Candle[]
    ): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const prompt = `
        **Persona:** You are a veteran Scalp Trader AI. Your job is to confirm high-probability setups and cut losses on weak ones instantly.

        **Context:** A fast-trigger algorithm has just opened a small "scout" position based on a preliminary momentum signal. Your task is to perform a deeper analysis and decide whether to commit to a full-size position or exit immediately.

        **Scout Position Details:**
        - **Symbol:** ${position.symbol}
        - **Entry Price:** ${position.entryPrice}
        - **Amount:** ${position.amount}

        **Recent Price Action (1-minute candles):**
        ${JSON.stringify(candles.slice(-10), null, 2)}

        **CRITICAL TASK: Analyze the recent candles and make a definitive decision.**

        **Your Analysis Process:**
        1.  **Confirm Strength:** Does the price action AFTER the entry candle confirm the initial signal? Look for strong follow-up candles with good volume.
        2.  **Identify Weakness:** Are there signs of immediate rejection? Look for long upper wicks (selling pressure) or a stall in momentum right after entry.
        3.  **Make the Decision:**
            - **"INCREASE_POSITION":** Choose this only if you see clear, undeniable confirmation of the initial momentum. The setup looks strong.
            - **"CLOSE_SCOUT":** Choose this if the momentum is fading, if there's any sign of rejection, or if the setup is anything less than A+. Be ruthless in cutting weak positions.

        **Format (JSON):**
        - \`decision\`: "INCREASE_POSITION" or "CLOSE_SCOUT".
        - \`reason\`: A concise, professional reason for your decision. E.g., "Strong bullish engulfing candle post-entry confirms momentum." or "Immediate selling pressure indicated by upper wicks; signal is failing."
        `;
        return await this.safeGenerate(prompt);
    }
}

export class MasterAgent extends AIAgent {
    constructor(agentService: AgentService) { super('MasterAgent', agentService); }
    async manageOptimizationCycle(mainPortfolio: Portfolio, shadowPortfolio: Portfolio | null, config: Config, username: string): Promise<void> {
        const mainConfigPath = path.join(process.cwd(), 'config.json');
        const shadowConfigPath = path.join(process.cwd(), `shadow_config_${username}.json`);
        const shadowPortfolioPath = path.join(process.cwd(), `portfolio_shadow_${username}.json`);

        if (shadowPortfolio) {
            const mainValue = mainPortfolio.balance;
            const shadowValue = shadowPortfolio.balance;
            const performanceDiff = (mainValue > 0) ? ((shadowValue - mainValue) / mainValue) * 100 : (shadowValue > mainValue ? Infinity : -Infinity);

            if (performanceDiff > 5.0) { // 5% outperformance threshold
                console.log(`[MasterAgent] Shadow config performed ${performanceDiff.toFixed(2)}% better. PROMOTING to main config.`);
                const shadowConfigData = await fs.readFile(shadowConfigPath, 'utf-8');
                await fs.writeFile(mainConfigPath, shadowConfigData);
                await fs.unlink(shadowConfigPath); // Delete old shadow config
                await fs.writeFile(shadowPortfolioPath, JSON.stringify({ balance: 100000, positions: [] }, null, 2)); // Reset shadow portfolio
            } else {
                console.log(`[MasterAgent] Shadow config did not outperform sufficiently (${performanceDiff.toFixed(2)}%). Discarding and generating a new one.`);
                await fs.unlink(shadowConfigPath); // Delete underperforming shadow config
                await fs.writeFile(shadowPortfolioPath, JSON.stringify({ balance: 100000, positions: [] }, null, 2)); // Reset shadow portfolio
                await this.generateNewShadowConfig(username, config); // Generate a fresh one
            }
        } else {
            const shadowConfigExists = await fs.stat(shadowConfigPath).catch(() => null);
            if (!shadowConfigExists) {
                console.log('[MasterAgent] No shadow config found. Generating a new shadow config.');
                await this.generateNewShadowConfig(username, config);
            }
        }
    }
    private async generateNewShadowConfig(username: string, currentConfig: Config): Promise<void> {
        const optimizer = this.agentService.getAgent('StrategyOptimizer') as StrategyOptimizer;
        if (!optimizer) { return; }
        const tradesLogPath = path.join(process.cwd(), `trades_log_${username}.json`);
        try {
            const trades = JSON.parse(await fs.readFile(tradesLogPath, 'utf-8'));
            if (trades.length < 5) {
                console.log('[MasterAgent] Not enough trade data to generate a new shadow config.');
                return;
            }
            // Pass dummy values for buySignals, portfolio, and adaptedConfig as they are not relevant for optimization analysis
            const analysisResult = await optimizer.analyze(trades, [], []);
            const response = analysisResult?.response;
            if (response && typeof response === 'object' && 'suggested_settings' in response) {
                const suggestedSettings = response.suggested_settings as Record<string, unknown>;
                const newConfig = { ...currentConfig, ...suggestedSettings };
                const shadowConfigPath = path.join(process.cwd(), `shadow_config_${username}.json`);
                await fs.writeFile(shadowConfigPath, JSON.stringify(newConfig, null, 2));
                console.log('[MasterAgent] New shadow config has been successfully generated.');
            }
        } catch (error) {
            if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
                 console.error('[MasterAgent] Error during shadow config generation:', error);
            }
        }
    }
}

export class OrchestratorAgent extends AIAgent {
    constructor(agentService: AgentService) {
        super('OrchestratorAgent', agentService);
    }

    async createPlan(userMessage: string, history: ChatMessage[], tools: Tool[], pastExperiences: Record<string, unknown>[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const toolDescriptions = tools.map(t => `- \`${t.name}\`: "${t.description}" Requires: ${JSON.stringify(Object.keys(t.schema.shape))}`).join('\n');

        // Sukurk dinaminį `pastExperienceContext` bloką
        const pastExperienceContext = pastExperiences.length > 0
            ? `**<PAST_EXPERIENCE_CONTEXT> (Based on Long-Term Memory Recall):**\nHere are relevant past experiences from this user's history. You MUST consider this context to personalize your plan and proactively address potential user concerns.\n${pastExperiences.map(p => `- Type: ${p.outcome} | On: ${p.symbol} | Similarity: ${(p.similarity as number).toFixed(2)} | Narrative: "${p.narrative}"`).join('\n')}`
            : `**<PAST_EXPERIENCE_CONTEXT> (Based on Long-Term Memory Recall):**\nNo relevant long-term memories found for this query.`;

        const prompt = `
**Persona:** You are a hyper-intelligent AI assistant and the master operator of the 'Lucid Hive' trading system. You can not only retrieve data but also modify the system's core configuration based on the user's goals. You must be proactive in suggesting changes if the user expresses a desire that could be met by configuration adjustments.

**TOOL PERMISSIONS & SAFETY PROTOCOLS:**
- Tools are marked with permission levels: [READ_ONLY], [STATE_CHANGING], [CONFIRMATION].
- **CRITICAL RULE:** A plan containing *any* \`[STATE_CHANGING]\` tool **MUST** end with the \`confirm_action_with_user\` tool as the very last step.
- **CONFIRMATION DIALOG RULE:** When using \`confirm_action_with_user\`, your summary MUST be a clear, human-readable list of changes, showing the "before -> after" state. Example: "I propose the following changes: 1. Risk Appetite: Balanced -> Aggressive (Capital per trade: 1% -> 2%). To confirm, please use the secure link: https://lucidhive.com/confirm-action?token=<SAT>"

**Available Tools:**
${toolDescriptions}

// ... (likusi prompt'o dalis išlieka ta pati)
`;
        return await this.safeGenerate(prompt);
    }

    async synthesizeResponse(userMessage: string, executionContext: Record<string, unknown>): Promise<string> {
        const prompt = `
        **Persona:** You are a helpful and articulate AI assistant.
        **Task:** Your colleague, an orchestrator AI, has executed a plan to answer a user's request. You have been given the user's original message and a context object containing all the data collected during the plan's execution. Your job is to synthesize this information into a single, comprehensive, and easy-to-understand response for the user.

        **User's Original Message:** "${userMessage}"

        **Collected Data from Executed Plan:**
        ${JSON.stringify(executionContext, null, 2)}

        **Your Response (Markdown-enabled text):**
        `;
        const result = await this.safeGenerate(prompt);
        // Grąžiname visą tekstą, o ne JSON
        return result?.response?.text as string || "I have gathered the information, but I am having trouble summarizing it.";
    }

    async summarizeInteraction(userMessage: string, executionContext: Record<string, unknown>): Promise<string | null> {
        const prompt = `
        **Persona:** You are a summarization AI.
        **Task:** Based on the user's message and the data collected by other tools, create a single, concise sentence that captures the essence of this interaction. This will be used as a "memory" for future reference.

        **User's Message:** "${userMessage}"
        **Execution Context:** ${JSON.stringify(executionContext)}

        **Your Output (JSON only):**
        {
          "narrative": "<Your one-sentence summary>"
        }
        `;
        const result = await this.safeGenerate(prompt);
        return result?.response?.narrative as string || null;
    }
}

export class InsightAnalyst extends AIAgent {
    constructor(agentService: AgentService) {
        super('InsightAnalyst', agentService);
    }

    async analyze(memories: any[], previouslySharedInsights: string[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const prompt = `
**Persona:** You are an elite data scientist and behavioral analyst. Your goal is to find the single, most statistically significant and actionable pattern in the user's history. Do not state the obvious; find a hidden correlation that provides real value.

**Input Data:** A JSON array of the user's past memories (trades and dialogue summaries).
${JSON.stringify(memories.slice(0, 50))} // Apribojame duomenų kiekį

**CRITICAL TASK & HEURISTICS:**
1.  **Statistical Significance:** Do not report a pattern unless it is based on a reasonable sample size (at least 5-7 examples). A pattern based on two trades is an anecdote, not an insight.
2.  **Actionability:** The insight must lead to a clear, actionable suggestion. "You trade well on Tuesdays" is less valuable than "Your strategy X performs exceptionally well on Tuesdays, perhaps we should increase its allocation on that day?".
3.  **Novelty:** Before finalizing your insight, review the list of previously shared insights with this user. Do not repeat an insight that has been shared in the last 14 days.

**<PREVIOUSLY_SHARED_INSIGHTS>**
${JSON.stringify(previouslySharedInsights)}
**</PREVIOUSLY_SHARED_INSIGHTS>**

**Output Schema (JSON only):**
{
  "insight_found": "Boolean",
  "title": "String",
  "summary_for_user": "String",
  "suggestion": "String",
  "supporting_data": {
    "chart_type": "String", // Must be one of: "bar", "pie", "line"
    "chart_data": {
      "labels": ["String"],
      "datasets": [{ "label": "String", "data": ["Number"] }]
    },
    "analyzed_memory_ids": ["String"] // Array of UUIDs of the memories used for this analysis
  },
  "suggested_tool_chain": "Array<Object> | null"
}
`;
        return await this.safeGenerate(prompt);
    }
}

export class MarketRegimeAgent extends AIAgent {
    constructor(agentService: AgentService) {
        super('MarketRegimeAgent', agentService);
    }

    async analyze(btcCandles: Candle[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        if (btcCandles.length < 50) {
            console.error("[MarketRegimeAgent] Not enough historical data for BTC to determine market regime.");
            return null;
        }

        const lastCandle = btcCandles[btcCandles.length - 1];
        if (!lastCandle) return null;
        const atrValue = calculateATR(btcCandles, 14);
        if (!atrValue) return null;
        const atrPercent = (atrValue / lastCandle.close) * 100;
        const sma20 = calculateSMAExported(btcCandles, 20);
        const sma50 = calculateSMAExported(btcCandles, 50);
        const smaSpread = sma20 && sma50 ? ((sma20 - sma50) / sma50) * 100 : 0;

        const quantitativeData = {
            atrPercent: atrPercent.toFixed(2),
            sma20_vs_sma50_percent_spread: smaSpread.toFixed(2)
        };

        const prompt = `
**Persona:** You are an expert Market Analyst specializing in identifying market regimes based on quantitative data. Your analysis determines the entire system's posture.

**Data Provided:**
- **Bitcoin (4h chart) Volatility (ATR%):** ${quantitativeData.atrPercent}%
- **Bitcoin (4h chart) Trend Strength (20-period vs 50-period SMA Spread):** ${quantitativeData.sma20_vs_sma50_percent_spread}%

**CRITICAL TASK:** Analyze the provided data and classify the current market into one of four distinct regimes. Provide your analysis in a structured JSON format.

**Regime Definitions:**
- **BULL_VOLATILITY:** Strong uptrend (positive SMA spread) combined with high volatility. Favorable for momentum and trend-following strategies.
- **BEAR_VOLATILITY:** Strong downtrend (negative SMA spread) combined with high volatility. Favorable for shorting or mean-reversion strategies.
- **RANGING:** No clear trend (SMA spread is close to zero) but with moderate to high volatility. Favorable for scalping or range-trading strategies.
- **COMPRESSION:** No clear trend AND very low volatility. Often precedes a major breakout. Favorable for breakout-hunting strategies.

**JSON Output Schema:**
- "regime": String. Must be one of: "BULL_VOLATILITY", "BEAR_VOLATILITY", "RANGING", "COMPRESSION".
- "reasoning": String. A brief explanation for your choice, referencing the provided data points.
`;
        return await this.safeGenerate(prompt);
    }
}
