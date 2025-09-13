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
**ELITE PERSONA:** You are Ray Dalio's protégé - a legendary Macroeconomic Analyst with 30 years of experience managing billions in crypto markets. You understand market cycles like breathing, can detect regime changes before they happen, and your macro insights have consistently generated Alpha for institutional clients. Your analysis moves markets.

**MISSION CRITICAL DATA:**
1.  **Bitcoin Momentum Profile:** ${JSON.stringify(btcData)}
2.  **Market Narrative Vectors:** ${JSON.stringify(newsHeadlines)}
3.  **Fear & Greed Psychological Index:** ${JSON.stringify(fearAndGreedIndex)}
4.  **Global Liquidity Metrics:** ${JSON.stringify(globalMetrics)}

**ELITE ANALYSIS FRAMEWORK:**
You employ a sophisticated 4-layer analytical model:
1. **Liquidity Cycle Analysis** - Track institutional money flows and stablecoin movements
2. **Sentiment Momentum Tracking** - Identify fear/greed extremes and reversions
3. **Market Structure Assessment** - Evaluate volatility regimes and correlation breakdowns
4. **Narrative Resonance Analysis** - Assess which stories drive capital allocation

**TRADING EDGE REQUIREMENTS:**
- Identify regime changes 24-48 hours before the market consensus
- Provide precise risk/reward probabilities for the next 3-7 day period
- Signal when to be aggressive vs. defensive with portfolio allocation
- Detect institutional accumulation/distribution patterns

**PROFESSIONAL OUTPUT SCHEMA:**
- "market_regime": String. "RISK_ON_EXPANSION" | "RISK_OFF_CONTRACTION" | "NEUTRAL_CONSOLIDATION" | "TRANSITION_INFLECTION"
- "regime_score": Float. 0.0 (maximum bearish conviction) to 10.0 (maximum bullish conviction)
- "conviction_level": String. "HIGH" | "MEDIUM" | "LOW" - Your confidence in the regime assessment
- "risk_trend": String. "ACCELERATING_BULLISH" | "MODERATING_BULLISH" | "STABLE" | "MODERATING_BEARISH" | "ACCELERATING_BEARISH"
- "market_phase": String. "ACCUMULATION" | "MARKUP" | "DISTRIBUTION" | "MARKDOWN" - Wyckoff market cycle phase
- "volatility_regime": String. "LOW_VIX" | "NORMAL_VIX" | "HIGH_VIX" | "EXTREME_VIX"
- "institutional_flow": String. "STRONG_INFLOW" | "MODERATE_INFLOW" | "NEUTRAL" | "MODERATE_OUTFLOW" | "STRONG_OUTFLOW"
- "time_horizon_bias": String. "NEXT_4H" | "NEXT_24H" | "NEXT_3D" | "NEXT_7D" - Optimal trading timeframe
- "position_sizing_guidance": Float. 0.5 (minimal exposure) to 2.0 (maximum leverage) - Portfolio heat multiplier
- "alpha_narrative": String. The key insight that less sophisticated analysts are missing
- "execution_priority": String. "URGENT" | "STRATEGIC" | "PATIENT" - How aggressively to act on signals
- "reasoning": String. Multi-factor analysis with specific data citations and probability assessments
- "action_summary": String. Clear directive for portfolio managers with specific recommendations
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
    
    private analyzeNarrativeStrength(headlines: string[]): { dominant_themes: string[], narrative_momentum: number } {
        const themes: Record<string, number> = {};
        headlines.forEach(headline => {
            const words = headline.toLowerCase().split(' ');
            words.forEach(word => {
                if (word.length > 4) {
                    themes[word] = (themes[word] || 0) + 1;
                }
            });
        });
        
        const sortedThemes = Object.entries(themes)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([theme]) => theme);
            
        const momentum = Math.min(Math.max(Object.values(themes).reduce((a, b) => Math.max(a, b), 0) / headlines.length, 0), 1);
        
        return { dominant_themes: sortedThemes, narrative_momentum: momentum };
    }
    
    async analyze(newsArticles: { title?: string }[], trendingTokens: Record<string, unknown>[], sharedContext: SharedContext): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const headlines = newsArticles.map(a => a.title || '').filter(t => t.length > 0);
        const narrativeAnalysis = this.analyzeNarrativeStrength(headlines);
        
        const prompt = `
**BEHAVIORAL FINANCE EXPERT PERSONA:** You are Robert Shiller's successor - the world's leading authority on market psychology and behavioral finance. You have 20+ years of experience analyzing how human emotions drive crypto market cycles. You understand that markets are 80% psychology and 20% fundamentals. Your sentiment analysis has predicted major crypto cycles including the 2017 bull run peak, the 2018 crash, the 2020-2021 supercycle, and the 2022 bear market.

**PSYCHOLOGICAL MARKET DATA:**
1. **Media Narrative Vectors:** ${JSON.stringify(headlines.slice(0, 15))}
2. **Social Momentum Indicators:** ${JSON.stringify(trendingTokens)}
3. **Narrative Strength Analysis:** ${JSON.stringify(narrativeAnalysis)}

**ELITE PSYCHOLOGICAL ANALYSIS FRAMEWORK:**
You employ advanced behavioral finance models:
1. **Fear/Greed Cycle Positioning** - Identify crowd psychology extremes
2. **Narrative Momentum Tracking** - Measure story velocity and saturation
3. **Social Proof Cascades** - Detect viral adoption or rejection patterns
4. **Contrarian Signal Generation** - Spot when consensus becomes dangerous
5. **FOMO/FUD Intensity Measurement** - Quantify emotional market drivers

**PROFESSIONAL PSYCHOLOGICAL ASSESSMENT:**
Your analysis must identify:
- Crowd sentiment extremes that create contrarian opportunities
- Narrative saturation levels that predict trend reversals
- Social momentum patterns that drive institutional flows
- Fear/greed imbalances that create mispricings
- Collective behavior patterns that smart money exploits

**ADVANCED OUTPUT SCHEMA:**
- "sentiment_regime": String. "EUPHORIC_EXCESS" | "BULLISH_OPTIMISM" | "CAUTIOUS_OPTIMISM" | "NEUTRAL_CONSOLIDATION" | "GROWING_CONCERN" | "BEARISH_PESSIMISM" | "CAPITULATION_PANIC"
- "sentiment_score": Float (-1.0 to +1.0). Precise emotional temperature
- "crowd_psychology": String. "EXTREME_GREED" | "GREED" | "BALANCED" | "FEAR" | "EXTREME_FEAR"
- "contrarian_signal_strength": Float (0.0-1.0). How strong the contrarian opportunity is
- "narrative_momentum": String. "VIRAL_ACCELERATION" | "STRONG_ADOPTION" | "MODERATE_SPREAD" | "SLOWING" | "STAGNANT" | "REVERSING"
- "dominant_narrative": String. The story driving current market psychology
- "narrative_saturation": Float (0.0-1.0). How "played out" the current story is
- "social_proof_cascade": String. "BUILDING" | "PEAK" | "DECLINING" | "ABSENT"
- "institutional_vs_retail_sentiment": String. "ALIGNED" | "DIVERGING" | "OPPOSITE"
- "fear_greed_extremes": Object. { "fear_level": float, "greed_level": float }
- "sentiment_divergences": Array. Notable disconnects between different sentiment sources
- "psychological_inflection_signals": Array. Signs that sentiment is about to shift
- "market_psychology_phase": String. "DISBELIEF" | "HOPE" | "OPTIMISM" | "BELIEF" | "THRILL" | "EUPHORIA" | "ANXIETY" | "DENIAL" | "FEAR" | "DESPERATION" | "PANIC" | "CAPITULATION" | "ANGER" | "DEPRESSION"
- "social_volume_trend": String. "INCREASING" | "DECREASING" | "STABLE" - Discussion volume changes
- "key_psychological_themes": Array. Primary emotional drivers in the market
- "smart_money_sentiment_edge": String. How sophisticated players are positioned vs. retail
- "sentiment_based_opportunity": String. Specific trading insight from psychological analysis
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
        const dynamicLevels = this.calculateDynamicTargets(position, currentPrice);
        const timeInPosition = Date.now() - new Date(position.timestamp || Date.now()).getTime();
        const daysHeld = timeInPosition / (1000 * 60 * 60 * 24);
        
        const prompt = `
**MASTER PORTFOLIO MANAGER PERSONA:** You are Stanley Druckenmiller's successor - a legendary portfolio manager known for making bold, high-conviction moves while protecting capital with surgical precision. You understand that capital preservation is the foundation of wealth creation, and you're not afraid to cut positions that no longer meet your thesis.

**POSITION REVIEW BRIEFING:**

**Current Position Analysis:**
- **Asset:** ${position.symbol}
- **Entry Price:** ${position.entryPrice} (${new Date(position.timestamp || Date.now()).toLocaleDateString()})
- **Current Price:** ${currentPrice}
- **Unrealized P&L:** ${pnlPercent.toFixed(2)}%
- **Days Held:** ${daysHeld.toFixed(1)}
- **Position Size:** ${position.amount} units
- **Original Investment Thesis:** ${JSON.stringify(position.technicals || 'Not documented')}

**CURRENT MARKET INTELLIGENCE:**
- **Macro Regime Assessment:** ${JSON.stringify(macroAnalysis)}
- **Market Psychology Profile:** ${JSON.stringify(sentimentAnalysis)}
- **Technical Level Analysis:** ${JSON.stringify(dynamicLevels)}
- **Risk/Reward Dynamics:** R:R Ratio ${dynamicLevels.riskRewardRatio.toFixed(2)}

**ELITE POSITION REVIEW FRAMEWORK:**

**Thesis Validation Checklist:**
1. **Macro Consistency:** Does current macro environment still support the original thesis?
2. **Technical Integrity:** Are the technical patterns that drove entry still valid?
3. **Risk/Reward Evolution:** Has the risk/reward profile improved or deteriorated?
4. **Opportunity Cost:** Are there better opportunities available now?
5. **Portfolio Heat:** Does this position still fit optimal portfolio construction?

**Decision Matrix Guidelines:**
- **STRONG HOLD:** Thesis intact + improving fundamentals + positive R:R
- **CAUTIOUS HOLD:** Mixed signals but acceptable risk parameters
- **SCALE DOWN:** Thesis weakening but some positive factors remain
- **IMMEDIATE EXIT:** Thesis broken + deteriorating conditions + poor R:R
- **DEFENSIVE HEDGE:** Keep position but hedge with protective instruments

**Risk Management Protocols:**
- Positions losing 8%+ require immediate review
- Macro regime shifts demand position reassessment
- Time decay consideration: older positions need stronger justification
- Correlation risk: consider impact on overall portfolio concentration

**PROFESSIONAL OUTPUT SCHEMA:**
- "primary_action": String. "STRONG_HOLD" | "CAUTIOUS_HOLD" | "SCALE_DOWN" | "IMMEDIATE_EXIT" | "DEFENSIVE_HEDGE"
- "conviction_level": String. "HIGH" | "MEDIUM" | "LOW" | "UNCERTAIN"
- "thesis_status": String. "STRENGTHENING" | "INTACT" | "WEAKENING" | "BROKEN" | "EVOLVING"
- "macro_alignment": String. "STRONGLY_SUPPORTIVE" | "SUPPORTIVE" | "NEUTRAL" | "CONCERNING" | "CONTRADICTORY"
- "technical_status": String. "IMPROVING" | "STABLE" | "DETERIORATING" | "INVALIDATED"
- "risk_reward_assessment": String. "EXCELLENT" | "GOOD" | "ACCEPTABLE" | "POOR" | "UNACCEPTABLE"
- "time_sensitivity": String. "IMMEDIATE" | "WITHIN_24H" | "THIS_WEEK" | "MONITOR_CLOSELY" | "ROUTINE"
- "position_adjustment": Object. { "action": string, "percentage": float, "reasoning": string }
- "stop_loss_recommendation": Object. { "type": string, "level": float, "reasoning": string }
- "profit_target_update": Array. Updated profit targets based on current analysis
- "hedging_strategy": String. If applicable, specific hedging recommendations
- "opportunity_cost_analysis": String. Better alternatives available in current market
- "portfolio_impact_assessment": String. How this decision affects overall portfolio risk
- "market_catalyst_watch": Array. Events or levels that could change the thesis
- "confidence_factors": Array. Reasons supporting the current decision
- "risk_factors": Array. Factors that could invalidate the current position
- "execution_priority": String. "URGENT" | "HIGH" | "MEDIUM" | "LOW" - Action urgency level
- "strategic_reasoning": String. Comprehensive rationale integrating all analysis factors
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
    
    private calculatePortfolioHeat(buySignals: BuySignal[], portfolio: Portfolio): {
        currentHeat: number,
        projectedHeat: number,
        heatCapacity: number,
        correlation: number
    } {
        // Calculate current portfolio heat (risk exposure)\n        const currentPositions = portfolio.positions || [];\n        const totalValue = portfolio.balance + currentPositions.reduce((sum, pos) => sum + (pos.amount * pos.entryPrice), 0);\n        const currentHeat = currentPositions.reduce((sum, pos) => {\n            const positionValue = pos.amount * pos.entryPrice;\n            return sum + (positionValue / totalValue);\n        }, 0);\n        \n        // Project heat with new positions\n        const totalNewAllocations = buySignals.reduce((sum, signal) => sum + (signal.position_sizing_multiplier || 1), 0);\n        const avgAllocation = totalNewAllocations / buySignals.length;\n        const projectedHeat = currentHeat + (avgAllocation * buySignals.length * 0.01); // Estimate 1% base allocation\n        \n        // Calculate correlation (simplified - assumes moderate correlation between crypto assets)\n        const correlation = Math.min(0.8, currentPositions.length * 0.1 + buySignals.length * 0.05);\n        \n        return {\n            currentHeat: currentHeat * 100,\n            projectedHeat: projectedHeat * 100,\n            heatCapacity: 100 - (currentHeat * 100), // Available heat capacity\n            correlation\n        };\n    }\n    \n    private optimizeAllocationSizes(buySignals: BuySignal[], portfolio: Portfolio, adaptedConfig?: AdaptedConfig): BuySignal[] {\n        const portfolioHeat = this.calculatePortfolioHeat(buySignals, portfolio);\n        const maxHeatUsage = 0.7; // Don't use more than 70% of available heat\n        const availableHeat = portfolioHeat.heatCapacity * maxHeatUsage;\n        \n        // Sort signals by conviction/score for prioritization\n        const sortedSignals = [...buySignals].sort((a, b) => {\n            const scoreA = (a as any).confidence_score || (a as any).technical_score || 5;\n            const scoreB = (b as any).confidence_score || (b as any).technical_score || 5;\n            return scoreB - scoreA;\n        });\n        \n        // Optimize allocations based on available heat and conviction\n        return sortedSignals.map((signal, index) => {\n            const convictionMultiplier = index < 3 ? 1.2 : index < 6 ? 1.0 : 0.8; // Favor top signals\n            const heatAdjustment = availableHeat > 50 ? 1.0 : availableHeat > 25 ? 0.8 : 0.6;\n            \n            return {\n                ...signal,\n                position_sizing_multiplier: (signal.position_sizing_multiplier || 1.0) * convictionMultiplier * heatAdjustment\n            };\n        });\n    }\n\n    async allocate(buySignals: BuySignal[], portfolio: Portfolio, macroAnalysis: unknown, sentimentAnalysis: unknown, sharedContext: SharedContext, narrativeContext?: { narrative: string; assets: string[] }, dexOpportunities?: string[], adaptedConfig?: AdaptedConfig): Promise<{ prompt: string; response: Record<string, unknown> } | null> {\n        \n        const portfolioAnalytics = this.calculatePortfolioHeat(buySignals, portfolio);\n        const optimizedSignals = this.optimizeAllocationSizes(buySignals, portfolio, adaptedConfig);\n        \n        const prompt = `\n**INSTITUTIONAL PORTFOLIO MANAGER PERSONA:** You are David Swensen reborn as an AI - the legendary Yale Endowment CIO who revolutionized institutional portfolio management with sophisticated allocation strategies. You understand that optimal position sizing is the difference between good and great returns. Your allocation decisions have consistently outperformed benchmarks through disciplined risk budgeting.\n\n**PORTFOLIO INTELLIGENCE BRIEFING:**\n\n**Current Portfolio State:**\n- **Available Capital:** $${portfolio.balance.toLocaleString()}\n- **Active Positions:** ${portfolio.positions?.length || 0}\n- **Portfolio Heat:** ${portfolioAnalytics.currentHeat.toFixed(1)}% (Current Risk Exposure)\n- **Heat Capacity:** ${portfolioAnalytics.heatCapacity.toFixed(1)}% (Available for New Positions)\n- **Asset Correlation:** ${(portfolioAnalytics.correlation * 100).toFixed(1)}%\n\n**Risk Management Parameters:**\n- **Base Allocation:** ${adaptedConfig?.risk_management?.capital_per_trade_percent || 1.0}% per position\n- **Maximum Portfolio Heat:** 85%\n- **Correlation Adjustment:** Active\n- **Volatility Scaling:** Enabled\n\n**APPROVED TRADE CANDIDATES:**\n${JSON.stringify(optimizedSignals, null, 2)}\n\n**MARKET CONTEXT:**\n- **Macro Environment:** ${JSON.stringify(macroAnalysis)}\n- **Market Sentiment:** ${JSON.stringify(sentimentAnalysis)}\n- **Narrative Themes:** ${JSON.stringify(narrativeContext)}\n- **DEX Opportunities:** ${JSON.stringify(dexOpportunities)}\n\n**ELITE ALLOCATION FRAMEWORK:**\n\n**Risk Budget Optimization:**\n1. **Heat-Adjusted Sizing** - Scale positions based on available portfolio heat\n2. **Correlation Penalty** - Reduce allocations for correlated assets\n3. **Volatility Scaling** - Adjust for asset-specific volatility profiles\n4. **Conviction Weighting** - Larger allocations for higher conviction trades\n5. **Regime Adaptation** - Modify sizing based on market regime\n\n**Position Sizing Formula:**\nBase_Allocation = (Portfolio_Balance × Base_%) × Position_Multiplier × Heat_Factor × Correlation_Factor × Volatility_Factor\n\n**Professional Requirements:**\n- Ensure total allocation doesn't exceed 85% of available capital\n- Apply correlation penalties for similar assets\n- Scale up high-conviction trades in favorable regimes\n- Maintain liquidity buffer for opportunities and risk management\n- Consider transaction costs and slippage in sizing\n\n**INSTITUTIONAL OUTPUT SCHEMA:**\nFor EACH approved candidate, provide:\n- \"amount_to_buy_usd\": Float. Precise USD allocation after all adjustments\n- \"allocation_percentage\": Float. Percentage of total portfolio this represents\n- \"risk_contribution\": Float. This position's contribution to portfolio risk\n- \"position_rationale\": String. Why this specific allocation size is optimal\n- \"heat_utilization\": Float. Percentage of available portfolio heat consumed\n- \"correlation_adjustment\": Float. Reduction/increase due to correlation factors\n- \"volatility_scaling\": Float. Adjustment based on asset volatility profile\n- \"liquidity_requirement\": Float. Expected liquidity needed for entry/exit\n- \"maximum_position_size\": Float. Upper bound based on market liquidity\n- \"optimal_entry_method\": String. \"MARKET\" | \"TWAP\" | \"VWAP\" | \"ICEBERG\" - Best execution strategy\n- \"risk_monitoring_triggers\": Array. Portfolio metrics to monitor post-allocation\n- \"rebalancing_threshold\": Float. When to consider position size adjustments\n- \"exit_strategy_sizing\": Object. How to scale out of positions optimally\n- \"calculation_breakdown\": String. Detailed mathematical justification\n        `;\n        \n        return await this.safeGenerate(prompt);\n    }\n}

export class TechnicalAnalyst extends AIAgent {
    constructor(agentService: AgentService) { super('TechnicalAnalyst', agentService); }
    
    private calculateAdvancedIndicators(candles: Candle[]) {
        // Enhanced technical indicators for professional analysis
        const closes = candles.map(c => c.close);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const volumes = candles.map(c => c.volume);
        
        // Volume Profile Analysis
        const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const currentVolume = volumes[volumes.length - 1];
        const volumeRatio = currentVolume / avgVolume;
        
        // Price Action Patterns
        const recentCandles = candles.slice(-5);
        const bodyStrength = recentCandles.map(c => Math.abs(c.close - c.open) / (c.high - c.low));
        const avgBodyStrength = bodyStrength.reduce((a, b) => a + b, 0) / bodyStrength.length;
        
        // Momentum Divergence Detection
        const priceHighs = highs.slice(-10);
        const priceLows = lows.slice(-10);
        const isNewHigh = highs[highs.length - 1] === Math.max(...priceHighs);
        const isNewLow = lows[lows.length - 1] === Math.min(...priceLows);
        
        return {
            volumeRatio: volumeRatio.toFixed(2),
            avgBodyStrength: avgBodyStrength.toFixed(3),
            isNewHigh,
            isNewLow
        };
    }
    
    async analyzeBatch(batchData: { symbol: string; candles: Candle[] }[], config: Config): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const techSettings = config.technical_indicator_settings || {};
        const formattedData = batchData.map(d => {
            const lastClose = d.candles.length > 0 ? d.candles[d.candles.length - 1].close : 0;
            const atrValue = calculateATR(d.candles, 14);
            const atrPercent = lastClose > 0 && atrValue ? (atrValue / lastClose) * 100 : null;
            const advanced = this.calculateAdvancedIndicators(d.candles);
            
            // Multi-timeframe RSI analysis
            const rsi14 = calculateRSI(d.candles, 14);
            const rsi7 = calculateRSI(d.candles, 7); // Short-term momentum
            const rsi21 = calculateRSI(d.candles, 21); // Longer-term momentum
            
            // Enhanced MACD analysis
            const macd = calculateMACD(d.candles, 12, 26, 9);
            
            // Multiple moving averages for trend analysis
            const sma20 = calculateSMAExported(d.candles, 20);
            const sma50 = calculateSMAExported(d.candles, 50);
            const sma200 = calculateSMAExported(d.candles, 200);
            
            // Support/Resistance levels
            const recentHighs = d.candles.slice(-20).map(c => c.high);
            const recentLows = d.candles.slice(-20).map(c => c.low);
            const resistance = Math.max(...recentHighs);
            const support = Math.min(...recentLows);
            const distanceToResistance = resistance > 0 ? ((resistance - lastClose) / lastClose * 100) : 0;
            const distanceToSupport = support > 0 ? ((lastClose - support) / lastClose * 100) : 0;

            return {
                symbol: d.symbol,
                price_data: {
                    current_price: lastClose,
                    resistance_level: resistance,
                    support_level: support,
                    distance_to_resistance_pct: distanceToResistance.toFixed(2),
                    distance_to_support_pct: distanceToSupport.toFixed(2)
                },
                momentum_indicators: {
                    rsi_14: rsi14?.toFixed(2),
                    rsi_7: rsi7?.toFixed(2),
                    rsi_21: rsi21?.toFixed(2),
                    macd_line: macd?.macdLine?.toFixed(4),
                    macd_signal: macd?.signalLine?.toFixed(4),
                    macd_histogram: macd?.histogram?.toFixed(4)
                },
                trend_indicators: {
                    sma_20: sma20?.toFixed(2),
                    sma_50: sma50?.toFixed(2),
                    sma_200: sma200?.toFixed(2),
                    price_vs_sma20_pct: sma20 ? ((lastClose - sma20) / sma20 * 100).toFixed(2) : null,
                    price_vs_sma50_pct: sma50 ? ((lastClose - sma50) / sma50 * 100).toFixed(2) : null
                },
                volatility_analysis: {
                    atr_percent: atrPercent?.toFixed(2),
                    volume_ratio: advanced.volumeRatio,
                    avg_body_strength: advanced.avgBodyStrength
                },
                market_structure: {
                    is_making_new_highs: advanced.isNewHigh,
                    is_making_new_lows: advanced.isNewLow
                }
            };
        });
        
        const prompt = `
**MASTER TECHNICIAN PERSONA:** You are Linda Raschke reborn as an AI - a legendary technical analyst with 25 years of experience reading market microstructure. You can identify high-probability setups that 99% of traders miss. You understand that successful trading is about finding confluence between multiple timeframes, volume patterns, and market psychology. Your analysis has consistently generated 60%+ win rates for professional trading desks.

**ADVANCED TECHNICAL DATASET:**
${JSON.stringify(formattedData, null, 2)}

**ELITE ANALYTICAL FRAMEWORK:**
You employ a sophisticated multi-factor analysis:
1. **Market Structure Analysis** - Support/resistance, trend strength, momentum divergences
2. **Volume Profile Assessment** - Institutional footprint, accumulation/distribution patterns
3. **Multi-Timeframe Momentum** - RSI convergence/divergence across periods
4. **Risk/Reward Optimization** - Entry zones, stop placement, profit targets
5. **Volatility Regime Assessment** - ATR-based position sizing optimization

**PROFESSIONAL TRADING REQUIREMENTS:**
- Identify assets with 3:1+ risk/reward potential
- Detect institutional accumulation patterns before retail notices
- Spot momentum divergences that signal trend changes
- Provide precise entry zones with defined stop-loss levels
- Assess optimal position sizing based on volatility characteristics

**RETURN STRUCTURE:** Single JSON object with symbol keys containing detailed analysis.

**ENHANCED OUTPUT SCHEMA PER ASSET:**
- "technical_score": Float (0.0-10.0). Professional grade setup strength
- "setup_type": String. "BREAKOUT" | "PULLBACK" | "REVERSAL" | "CONTINUATION" | "RANGING"
- "entry_zone": Object. { "optimal": number, "aggressive": number, "conservative": number }
- "stop_loss_level": Number. Precise invalidation level
- "profit_targets": Array. [target1, target2, target3] - Multiple exit levels
- "risk_reward_ratio": Float. Expected R:R for the setup
- "momentum_grade": String. "ACCELERATING" | "STRONG" | "MODERATE" | "WEAK" | "DIVERGENT"
- "volume_profile": String. "INSTITUTIONAL_ACCUMULATION" | "RETAIL_FOMO" | "DISTRIBUTION" | "LOW_INTEREST" | "BREAKOUT_VOLUME"
- "trend_strength": String. "VERY_STRONG" | "STRONG" | "MODERATE" | "WEAK" | "SIDEWAYS"
- "volatility_assessment": String. "EXPANDING" | "CONTRACTING" | "NORMAL" | "EXTREME"
- "market_structure_bias": String. "BULLISH_STRUCTURE" | "BEARISH_STRUCTURE" | "NEUTRAL_STRUCTURE" | "TRANSITIONAL"
- "confluence_factors": Array. List of confirming technical factors
- "risk_factors": Array. List of invalidation scenarios
- "time_horizon": String. "SCALP" | "INTRADAY" | "SWING" | "POSITION" - Optimal holding period
- "position_size_multiplier": Float (0.25-2.0). Volatility-adjusted sizing
- "institutional_bias": String. "ACCUMULATING" | "DISTRIBUTING" | "NEUTRAL" | "ROTATION"
- "alpha_insight": String. The key factor most analysts are overlooking
- "execution_notes": String. Specific entry/exit instructions for traders
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

        const weights = config.advanced_strategies?.analysis_weights || { technical_weight: 0.6, onchain_weight: 0.15, social_weight: 0.15, macro_override_weight: 0.1 };

        let candidatesXML = "";
        for (const symbol of Object.keys(batchTechAnalyses)) {
            const tech = batchTechAnalyses[symbol] as TechnicalAnalysisResult;
            const onChain = onChainAnalyses?.[symbol] ? onChainAnalyses[symbol] : { info: "No data." };
            const social = socialAnalyses?.[symbol] ? socialAnalyses[symbol] : { social_score: 0, summary: "No data." };
            const situationNarrative = `Trade for ${symbol}. Macro: ${macroAnalysis.market_regime}, Tech score: ${tech.technical_score}`;

            // --- Enhanced memory recall with performance tracking ---
            const humanLessons = await this.memoryService.recallMemories(situationNarrative, 3, 'HUMAN');
            const aiLessons = await this.memoryService.recallMemories(situationNarrative, 3, 'AI');

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

        // Enhanced persona logic for different market conditions
        let persona = "You are George Soros reborn as an AI - the ultimate Risk Manager with legendary market intuition and 40+ years of experience managing billions in volatile markets. You understand that successful trading is about asymmetric risk/reward opportunities where you risk little to make a lot. You have an uncanny ability to spot when markets are about to move and position accordingly.";
        
        let criticalTask = `
**ELITE RISK MANAGEMENT FRAMEWORK:**
Your decision-making follows the Soros Reflexivity Theory:
1. **Market Inefficiency Detection** - Identify mispricings before they correct
2. **Asymmetric Risk/Reward Analysis** - Only take trades with 3:1+ potential
3. **Market Psychology Integration** - Understand how sentiment drives price action
4. **Position Sizing Optimization** - Size positions based on conviction and volatility
5. **Dynamic Exit Strategy** - Plan multiple scenarios before entering

**PROFESSIONAL TRADING REQUIREMENTS:**
- Minimum 60% win rate expectation
- Maximum 2% risk per trade in adverse conditions
- Identify setups with 5:1+ risk/reward in optimal conditions
- Consider correlations and portfolio heat distribution
- Factor in slippage and execution costs

Return a single JSON object where each key is a symbol from the input.
        `;
        
        if (config.force_buy_on_strong_technicals) {
            persona = "You are a systematic momentum trader executing a high-conviction technical strategy. Your algorithms have identified strong technical setups that require immediate execution.";
            criticalTask = `
**SYSTEMATIC EXECUTION PROTOCOL:**
You MUST execute BUY orders on candidates with technical_score >= 7.5, UNLESS:
- Macro regime_score < 2.0 (catastrophic market conditions)
- Excessive portfolio concentration risk
- Technical setup shows clear bearish divergence

For all other scenarios, apply standard risk assessment protocols.
Return a single JSON object where each key is a symbol.
        `;
        }

        // --- ENHANCED PROFESSIONAL PROMPT ---
        const prompt = `
**MASTER TRADER PERSONA:** ${persona}

**MARKET INTELLIGENCE BRIEFING:**
<global_context>
    <macro_environment>${JSON.stringify(macroAnalysis)}</macro_environment>
    <market_sentiment>${JSON.stringify(sentimentAnalysis)}</market_sentiment>
    <analysis_weights>${JSON.stringify(weights)}</analysis_weights>
</global_context>

<trading_candidates>
    ${candidatesXML}
</trading_candidates>

${criticalTask}

**ADVANCED RISK PROTOCOLS:**

**Memory Integration Requirements:**
- Analyze <human_override_lessons> and <ai_past_lessons> for each candidate
- Weight historical performance data in decision-making
- Include "lesson_integration" field explaining how past performance influenced current decision
- If contradicting past human decisions, provide quantitative justification

**Portfolio Risk Management:**
${JSON.stringify({ ...config.diversification_settings, current_positions: portfolioContext.open_positions })}

**Dynamic Position Sizing Matrix:**
- **Volatility-Based Sizing:**
  - "EXPANDING" volatility -> 0.6x multiplier (higher risk)
  - "NORMAL" volatility -> 1.0x multiplier (standard risk)
  - "CONTRACTING" volatility -> 1.4x multiplier (lower risk, opportunity)
  
- **Conviction-Based Scaling:**
  - High conviction (9.0+ score) -> up to 1.8x multiplier
  - Medium conviction (6.0-8.9) -> 0.8-1.2x multiplier
  - Low conviction (<6.0) -> 0.3-0.7x multiplier
  
- **Market Regime Adjustments:**
  - RISK_ON_EXPANSION -> up to 1.5x multiplier
  - NEUTRAL_CONSOLIDATION -> 0.8-1.0x multiplier
  - RISK_OFF_CONTRACTION -> 0.3-0.6x multiplier

**ENHANCED OUTPUT SCHEMA (per symbol):**
- "decision": String. "AGGRESSIVE_BUY" | "BUY" | "CAUTIOUS_BUY" | "SCALP" | "AVOID" | "SHORT" | "AGGRESSIVE_SHORT"
- "conviction_level": String. "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW"
- "risk_reward_ratio": Float. Expected R:R (minimum 2.0 for BUY decisions)
- "position_sizing_multiplier": Float. 0.25-2.0 based on volatility and conviction
- "entry_strategy": String. "MARKET" | "LIMIT_AGGRESSIVE" | "LIMIT_PATIENT" | "BREAKOUT" | "PULLBACK"
- "stop_loss_strategy": Object. { "type": "FIXED" | "TRAILING" | "ATR_BASED", "percentage": float, "reasoning": string }
- "profit_targets": Array. [{ "target": float, "percentage": int }] - Multiple exit levels
- "time_horizon": String. "SCALP" | "INTRADAY" | "SWING" | "POSITION"
- "risk_factors": Array. Specific risks that could invalidate the trade
- "catalyst_factors": Array. Events/levels that could accelerate the move
- "correlation_impact": String. How this position affects overall portfolio correlation
- "max_portfolio_heat": Float. Maximum % of portfolio this position should represent
- "lesson_integration": String. How historical performance data influenced this decision
- "alpha_edge": String. The specific edge or inefficiency being exploited
- "execution_urgency": String. "IMMEDIATE" | "STRATEGIC" | "PATIENT" - Entry timing requirements
- "final_summary": String. Executive summary for portfolio managers
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
    
    private calculatePerformanceMetrics(trades: Trade[]): {
        totalReturn: number,
        sharpeRatio: number,
        maxDrawdown: number,
        winRate: number,
        avgWin: number,
        avgLoss: number,
        profitFactor: number
    } {
        if (trades.length === 0) {
            return {
                totalReturn: 0, sharpeRatio: 0, maxDrawdown: 0,
                winRate: 0, avgWin: 0, avgLoss: 0, profitFactor: 0
            };
        }
        
        const returns = trades.map(t => t.pnl / t.entryPrice);
        const winningTrades = trades.filter(t => t.pnl > 0);
        const losingTrades = trades.filter(t => t.pnl < 0);
        
        const totalReturn = returns.reduce((sum, ret) => sum + ret, 0);
        const avgReturn = totalReturn / trades.length;
        const returnVariance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / trades.length;
        const sharpeRatio = Math.sqrt(returnVariance) > 0 ? avgReturn / Math.sqrt(returnVariance) : 0;
        
        // Calculate max drawdown
        let peak = 0;
        let maxDrawdown = 0;
        let cumulative = 0;
        
        for (const ret of returns) {
            cumulative += ret;
            if (cumulative > peak) peak = cumulative;
            const drawdown = peak - cumulative;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }
        
        const winRate = winningTrades.length / trades.length;
        const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
        const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0)) / losingTrades.length : 0;
        const profitFactor = avgLoss > 0 ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) : 0;
        
        return {
            totalReturn: totalReturn * 100,
            sharpeRatio,
            maxDrawdown: maxDrawdown * 100,
            winRate: winRate * 100,
            avgWin,
            avgLoss,
            profitFactor
        };
    }
    
    private analyzeMarketRegimePerformance(trades: Trade[]): Record<string, any> {
        const regimePerformance: Record<string, { trades: Trade[], returns: number[] }> = {};
        
        trades.forEach(trade => {
            // Extract market regime from trade reason/context if available
            let regime = 'Unknown';
            if (trade.reason.includes('Risk-On') || trade.reason.includes('RISK_ON')) regime = 'Risk-On';
            else if (trade.reason.includes('Risk-Off') || trade.reason.includes('RISK_OFF')) regime = 'Risk-Off';
            else if (trade.reason.includes('Neutral')) regime = 'Neutral';
            
            if (!regimePerformance[regime]) {
                regimePerformance[regime] = { trades: [], returns: [] };
            }
            regimePerformance[regime].trades.push(trade);
            regimePerformance[regime].returns.push(trade.pnl / trade.entryPrice);
        });
        
        return regimePerformance;
    }
    
    async analyze(trades: Trade[], missedOpportunities: MissedOpportunity[], decisionLogs: DecisionLogEntry[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const performanceMetrics = this.calculatePerformanceMetrics(trades);
        const regimeAnalysis = this.analyzeMarketRegimePerformance(trades);
        
        // Analyze recent performance trend (last 30 days)
        const recentTrades = trades.filter(t => {
            const tradeDate = new Date(t.timestamp);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return tradeDate > thirtyDaysAgo;
        });
        const recentMetrics = this.calculatePerformanceMetrics(recentTrades);
    
        const prompt = `
**QUANTITATIVE STRATEGIST PERSONA:** You are Jim Simons reborn as an AI - the legendary founder of Renaissance Technologies and master of quantitative trading strategies. You've generated 66% annual returns for 30+ years using mathematical models and data-driven optimization. You understand that successful algorithmic trading requires continuous model evolution based on rigorous statistical analysis.

**COMPREHENSIVE PERFORMANCE DATASET:**

**Overall Performance Metrics:**
${JSON.stringify(performanceMetrics, null, 2)}

**Recent Performance (30 days):**
${JSON.stringify(recentMetrics, null, 2)}

**Market Regime Performance Analysis:**
${JSON.stringify(regimeAnalysis, null, 2)}

**Detailed Trade History:**
${JSON.stringify(trades.slice(-50), null, 2)} // Last 50 trades for analysis

**Opportunity Analysis:**
${JSON.stringify(missedOpportunities.slice(-20), null, 2)} // Recent missed opportunities

**Position Management Decisions:**
${JSON.stringify(decisionLogs.slice(-30), null, 2)} // Recent management decisions

**ELITE QUANTITATIVE OPTIMIZATION FRAMEWORK:**

**Statistical Analysis Requirements:**
1. **Performance Attribution Analysis** - Identify which factors drive alpha vs. beta
2. **Risk-Adjusted Return Optimization** - Maximize Sharpe ratio and minimize drawdowns
3. **Market Regime Adaptation** - Optimize parameters for different market conditions
4. **Factor Exposure Analysis** - Understand correlation and concentration risks
5. **Execution Quality Assessment** - Analyze slippage and timing inefficiencies

**Optimization Objectives:**
- Target Sharpe Ratio: 2.0+
- Maximum Drawdown: <15%
- Win Rate: 65%+
- Profit Factor: 2.5+
- Risk-Adjusted Alpha Generation

**ADVANCED OUTPUT SCHEMA:**
- "performance_diagnosis": Object. Detailed breakdown of current strategy strengths/weaknesses
- "statistical_significance": Object. Confidence levels and sample size adequacy analysis
- "regime_optimization": Object. Parameter adjustments for different market conditions
- "risk_management_enhancements": Object. Improved stop-loss and position sizing rules
- "entry_signal_optimization": Object. Enhanced technical and fundamental filters
- "exit_strategy_improvements": Object. Better profit-taking and loss-cutting algorithms
- "diversification_optimization": Object. Improved asset selection and correlation management
- "market_timing_enhancements": Object. Better macro and sentiment integration
- "execution_improvements": Object. Reduced slippage and better order management
- "parameter_sensitivity_analysis": Object. Robustness testing of key variables
- "backtesting_validation": Object. Out-of-sample performance estimates
- "implementation_priority": Array. Ranked list of changes by expected impact
- "risk_budget_allocation": Object. Optimal risk distribution across strategies
- "performance_monitoring_kpis": Array. Key metrics to track post-implementation
- "suggested_settings": Object. Complete optimized configuration with justification
- "expected_performance_improvement": Object. Quantified enhancement projections
- "implementation_timeline": Object. Phased rollout plan for changes
- "confidence_intervals": Object. Statistical confidence in proposed improvements
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
    }\n    \n    private calculateAdvancedRegimeMetrics(btcCandles: Candle[]): {\n        trendStrength: number,\n        volatilityPercentile: number,\n        momentumScore: number,\n        volumeTrend: string,\n        cyclicalPosition: string\n    } {\n        const closes = btcCandles.map(c => c.close);\n        const volumes = btcCandles.map(c => c.volume);\n        \n        // Advanced trend strength calculation\n        const sma20 = calculateSMAExported(btcCandles, 20) || 0;\n        const sma50 = calculateSMAExported(btcCandles, 50) || 0;\n        const sma200 = calculateSMAExported(btcCandles, 200) || 0;\n        \n        const trendAlignment = [\n            closes[closes.length - 1] > sma20,\n            sma20 > sma50,\n            sma50 > sma200\n        ].filter(Boolean).length;\n        const trendStrength = (trendAlignment / 3) * 100;\n        \n        // Volatility percentile (compare current ATR to historical)\n        const atrValues = [];\n        for (let i = 14; i < btcCandles.length; i++) {\n            const atr = calculateATR(btcCandles.slice(i - 14, i + 1), 14);\n            if (atr) atrValues.push(atr);\n        }\n        const currentATR = atrValues[atrValues.length - 1] || 0;\n        const sortedATRs = [...atrValues].sort((a, b) => a - b);\n        const atrRank = sortedATRs.findIndex(atr => atr >= currentATR);\n        const volatilityPercentile = (atrRank / sortedATRs.length) * 100;\n        \n        // Momentum score\n        const priceChanges = [];\n        for (let i = 1; i < closes.length; i++) {\n            priceChanges.push((closes[i] - closes[i-1]) / closes[i-1]);\n        }\n        const recentMomentum = priceChanges.slice(-10).reduce((sum, change) => sum + change, 0);\n        const momentumScore = (recentMomentum + 1) * 50; // Normalize to 0-100\n        \n        // Volume trend\n        const recentVolumes = volumes.slice(-20);\n        const olderVolumes = volumes.slice(-40, -20);\n        const recentAvgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;\n        const olderAvgVolume = olderVolumes.reduce((a, b) => a + b, 0) / olderVolumes.length;\n        \n        let volumeTrend = 'STABLE';\n        if (recentAvgVolume > olderAvgVolume * 1.2) volumeTrend = 'INCREASING';\n        else if (recentAvgVolume < olderAvgVolume * 0.8) volumeTrend = 'DECREASING';\n        \n        // Cyclical position (simplified cycle analysis)\n        const priceHigh = Math.max(...closes.slice(-50));\n        const priceLow = Math.min(...closes.slice(-50));\n        const currentPrice = closes[closes.length - 1];\n        const cyclicalPosition = ((currentPrice - priceLow) / (priceHigh - priceLow));\n        \n        let cyclicalPhase = 'MID_CYCLE';\n        if (cyclicalPosition < 0.3) cyclicalPhase = 'BOTTOM_FORMATION';\n        else if (cyclicalPosition > 0.7) cyclicalPhase = 'TOP_FORMATION';\n        \n        return {\n            trendStrength,\n            volatilityPercentile,\n            momentumScore,\n            volumeTrend,\n            cyclicalPosition: cyclicalPhase\n        };\n    }

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
        const smaSpread = sma20 && sma50 ? ((sma20 - sma50) / sma50) * 100 : 0;\n        \n        const advancedMetrics = this.calculateAdvancedRegimeMetrics(btcCandles);\n        const rsi = calculateRSI(btcCandles, 14);\n        const macd = calculateMACD(btcCandles, 12, 26, 9);

        const quantitativeData = {
            atrPercent: atrPercent.toFixed(2),
            sma20_vs_sma50_percent_spread: smaSpread.toFixed(2),\n            advanced_metrics: advancedMetrics,\n            rsi: rsi?.toFixed(2),\n            macd_histogram: macd?.histogram?.toFixed(4)\n        };

        const prompt = `\n**MASTER MARKET REGIME ANALYST PERSONA:** You are Martin Zweig reborn as an AI - the legendary market technician who predicted the 1987 crash and understood market cycles better than anyone. You can identify regime changes before they become obvious to the market. Your regime classification determines optimal strategy allocation across the entire trading system.\n\n**COMPREHENSIVE MARKET DATA:**\n${JSON.stringify(quantitativeData, null, 2)}\n\n**ELITE REGIME ANALYSIS FRAMEWORK:**\n\nYou employ a sophisticated multi-dimensional analysis:\n1. **Trend Dynamics** - Direction, strength, and sustainability of primary trend\n2. **Volatility Regimes** - Current volatility vs historical context and clustering\n3. **Momentum Characteristics** - Acceleration, deceleration, and divergence patterns\n4. **Volume Analysis** - Institutional participation and distribution patterns\n5. **Cycle Positioning** - Where we are in the major market cycle\n\n**ENHANCED REGIME CLASSIFICATIONS:**\n\n**BULL_ACCELERATION** (Strongest Bull Phase):\n- Strong uptrend + expanding volatility + increasing volume\n- Trend strength >70%, Volatility >60th percentile, Positive momentum\n- Strategy: Maximum risk, momentum following, breakout hunting\n\n**BULL_MATURATION** (Late Bull Phase):\n- Uptrend + normal volatility + diverging indicators\n- Trend strength 50-70%, Signs of exhaustion emerging\n- Strategy: Selective momentum, profit taking, cautious expansion\n\n**DISTRIBUTION** (Topping Process):\n- Sideways/weak uptrend + increasing volatility + volume divergence\n- Mixed signals, institutional distribution signs\n- Strategy: Defensive positioning, short preparation, range trading\n\n**BEAR_ACCELERATION** (Strongest Bear Phase):\n- Strong downtrend + expanding volatility + panic volume\n- Trend strength <30%, High volatility, Negative momentum\n- Strategy: Short bias, mean reversion, defensive cash position\n\n**BEAR_MATURATION** (Late Bear Phase):\n- Downtrend + normal volatility + potential bottoming signals\n- Trend weakness, RSI oversold, Volume exhaustion\n- Strategy: Cautious accumulation, reversal hunting, reduced shorts\n\n**ACCUMULATION** (Bottoming Process):\n- Sideways/weak recovery + decreasing volatility + smart money flow\n- Base building, stealth institutional buying\n- Strategy: Aggressive accumulation, breakout preparation, long bias\n\n**COMPRESSION** (Pre-Breakout):\n- Tight range + very low volatility + coiling patterns\n- ATR <25th percentile, Decreasing volume, Narrowing ranges\n- Strategy: Breakout preparation, tight risk management, high alert\n\n**TRANSITION** (Regime Uncertainty):\n- Mixed signals + conflicting indicators + regime shift in progress\n- Unclear direction, High uncertainty, Multiple scenarios possible\n- Strategy: Reduced risk, flexible positioning, multiple contingencies\n\n**PROFESSIONAL OUTPUT SCHEMA:**\n- \"primary_regime\": String. One of the 8 regime classifications above\n- \"regime_confidence\": Float. 0.0-1.0 confidence in classification\n- \"regime_strength\": String. \"VERY_STRONG\" | \"STRONG\" | \"MODERATE\" | \"WEAK\" | \"TRANSITIONING\"\n- \"trend_characteristics\": Object. { \"direction\": string, \"strength\": float, \"sustainability\": string }\n- \"volatility_analysis\": Object. { \"current_percentile\": float, \"regime\": string, \"clustering\": boolean }\n- \"momentum_profile\": Object. { \"direction\": string, \"acceleration\": string, \"divergences\": array }\n- \"volume_intelligence\": Object. { \"trend\": string, \"institutional_bias\": string, \"distribution_signs\": boolean }\n- \"cycle_position\": Object. { \"phase\": string, \"maturity\": string, \"time_remaining\": string }\n- \"regime_duration_estimate\": String. Expected duration of current regime\n- \"transition_probabilities\": Object. Likelihood of transitioning to other regimes\n- \"optimal_strategies\": Array. Trading strategies best suited for this regime\n- \"risk_parameters\": Object. Recommended risk settings for this regime\n- \"key_monitoring_metrics\": Array. Indicators to watch for regime change\n- \"regime_change_triggers\": Array. Specific events/levels that would signal transition\n- \"strategic_positioning\": String. Overall portfolio posture for this regime\n- \"execution_urgency\": String. How quickly to adjust strategies for this regime\n- \"historical_context\": String. How current regime compares to historical precedents\n- \"regime_reasoning\": String. Comprehensive justification for classification\n`;
        return await this.safeGenerate(prompt);
    }
}
