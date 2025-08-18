import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from "@google/generative-ai";
import { Candle } from "./binance";
import { SharedContext } from "./context";
import { calculateRSI, calculateMACD, calculateSMAExported } from "./indicators";
class KeyRotator {
    private keys: string[];
    public currentIndex: number;

    constructor() {
        this.keys = process.env.GEMINI_API_KEYS?.split(',') || [];
        if (this.keys.length === 0) {
            throw new Error("GEMINI_API_KEYS not found or empty in .env.local");
        }
        this.currentIndex = 0;
        console.log(`Found ${this.keys.length} Gemini API keys. Starting with key #0.`);
    }

    getKey(): string {
        return this.keys[this.currentIndex];
    }

    getNextKey(): string {
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        console.warn(`Switching Gemini API key to #${this.currentIndex}`);
        return this.getKey();
    }
}

export class AIAgent {
    private keyRotator: KeyRotator;
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;

    constructor() {
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
                const safetySettings = [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ];

                const result = await this.model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    safetySettings,
                });
                const response = result.response;
                let jsonText = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
                
                // Find the first '{' and the last '}' to ensure we get a valid JSON object
                const firstBrace = jsonText.indexOf('{');
                const lastBrace = jsonText.lastIndexOf('}');
                if (firstBrace === -1 || lastBrace === -1) {
                    throw new Error("No valid JSON object found in the response.");
                }
                jsonText = jsonText.substring(firstBrace, lastBrace + 1);

                const jsonResponse = JSON.parse(jsonText) as Record<string, unknown>;
                return { prompt, response: jsonResponse };

            } catch (error) {
                const errorMessage = (error as Error).message;
                if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
                    console.error(`AI Agent Error (Key #${this.keyRotator.currentIndex}): Limit exceeded.`);
                    this.keyRotator.getNextKey();
                    this.reinitializeModel();
                    if (attempt < retries - 1) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        continue;
                    } else {
                        console.error("All keys have exhausted their limits or are invalid.");
                        return null;
                    }
                }
                console.error(`AI Agent generation error: ${errorMessage}. Prompt: ${prompt.substring(0, 100)}...`);
                return null;
            }
        }
        return null;
    }

    // Placeholder for a more complex consultation mechanism
    async consult(agentName: string, query: Record<string, unknown>): Promise<Record<string, unknown> | null> {
        console.log(`Consultation requested from ${agentName} with query:`, query);
        // In a real implementation, this would dynamically call another agent instance.
        // For now, it's a conceptual placeholder for the architecture.
        return { response: `Consultation response placeholder for ${agentName}.` };
    }
}

export class MacroAnalyst extends AIAgent {
    async analyze(btcData: Record<string, unknown>, newsHeadlines: string[], sharedContext: SharedContext): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const prompt = `
        **Persona:** You are a Macroeconomic and Crypto Market Cycle Analyst. Your task is to assess the overall market environment.
        **Data:**
        1.  **Bitcoin (4H TF) Last Candle:** ${JSON.stringify(btcData)}
        2.  **Top News Headlines:** ${JSON.stringify(newsHeadlines)}
        3.  **Simulated On-Chain Data:** "Exchange Netflow: -1500 BTC (Neutral), Stablecoin Supply Ratio: Rising (Bullish)"

        **Task:** Provide a critical market assessment in JSON format.
        - \`market_regime\`: "Risk-On" (favorable for risky assets) or "Risk-Off" (avoid risk).
        - \`regime_score\`: A number from 0.0 (extreme fear) to 10.0 (extreme greed).
        - \`reasoning\`: A brief explanation of why you chose this regime, referencing the provided data (e.g., "BTC price action is bullish, but news sentiment is neutral, leading to a cautiously optimistic score.").
        - \`summary\`: A one-sentence, actionable summary for the portfolio manager.
        `;
        const result = await this.safeGenerate(prompt);
        if (result?.response) {
            const { market_regime, regime_score } = result.response;
            if (typeof market_regime === 'string' && (market_regime === 'Risk-On' || market_regime === 'Risk-Off') && typeof regime_score === 'number') {
                sharedContext.updateContext({ marketRegime: market_regime, regimeScore: regime_score });
            }
        }
        return result;
    }
}

// Define interfaces for agent method parameters
interface Position {
    symbol: string;
    amount: number;
    entryPrice: number;
    takeProfitPercent?: number;
    technicals?: Record<string, unknown>;
}

interface Config {
    riskAmountPercent: number;
    takeProfitPercent: number;
    stopLossPercent: number;
    rsiPeriod: number;
    macdShortPeriod: number;
    macdLongPeriod: number;
    macdSignalPeriod: number;
    smaShortPeriod: number;
    smaLongPeriod: number;
}

interface DecisionHistory {
    timestamp: string;
    decision: string;
    justification: string;
}

export class PositionManager extends AIAgent {
    // Placeholder for a more complex consultation mechanism
    async consult(agentName: string, query: Record<string, unknown>): Promise<Record<string, unknown> | null> {
        console.log(`Consultation requested from ${agentName} with query:`, query);
        // In a real implementation, this would dynamically call another agent.
        // For now, it's a conceptual placeholder.
        return { response: "Consultation response placeholder." };
    }

    async decide(position: Position, currentPrice: number, macroAnalysis: unknown, sentimentAnalysis: unknown, config: Config, decisionHistory: DecisionHistory[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const pnlPercent = (currentPrice - position.entryPrice) / position.entryPrice * 100;
        const atTakeProfit = pnlPercent >= (position.takeProfitPercent || config.takeProfitPercent);
        const atStopLoss = pnlPercent <= config.stopLossPercent;

        let taskDescription = '';
        if (atStopLoss) {
            taskDescription = `The position has hit its stop-loss of ${config.stopLossPercent}%. You MUST sell to prevent further losses. Your only valid decision is "SELL_NOW".`;
        } else if (atTakeProfit) {
            taskDescription = `The position has reached its take-profit target of ${config.takeProfitPercent}%. Decide whether to sell now or let the profit run by increasing the take-profit target. Consider the macro/sentiment environment, the asset's momentum, and your own past decisions on this asset.`;
        }

        const prompt = `
        **Persona:** You are a professional, stateful trader managing a profitable position. Your goal is to maximize gains while intelligently protecting profits.

        **Current Context:**
        - **Position:** ${JSON.stringify(position, null, 2)}
        - **Current Price:** ${currentPrice}
        - **Current P/L (%):** ${pnlPercent.toFixed(2)}%
        - **Take-Profit Target (%):** ${position.takeProfitPercent || config.takeProfitPercent}%
        - **Stop-Loss Target (%):** ${config.stopLossPercent}%
        - **Macro Environment:** ${JSON.stringify(macroAnalysis, null, 2)}
        - **Market Sentiment:** ${JSON.stringify(sentimentAnalysis, null, 2)}
        - **Asset's Technical Indicators:** ${JSON.stringify(position.technicals, null, 2)}

        **Your Decision History For This Asset (Memory):**
        ${JSON.stringify(decisionHistory, null, 2)}

        **Task:** ${taskDescription}
        Critically evaluate the situation. Your primary goal is to protect capital and maximize profit.
        1.  **Review Initial Thesis:** Was the original reason for buying this asset still valid, based on the current macro and sentiment data?
        2.  **Analyze Technical Health:** Do the technical indicators (RSI, MACD) show strength, or are they suggesting the trend is exhausted (e.g., bearish divergence)?
        3.  **Make a Prudent Decision:** Decide between "SELL_NOW" to lock in profits or "HOLD_AND_INCREASE_TP" to let profits run. If holding, the new take-profit must be realistic. Be a disciplined profit-taker, not a greedy gambler.

        **Format (JSON):**
        - \`decision\`: "SELL_NOW" or "HOLD_AND_INCREASE_TP".
        - \`new_take_profit_percent\`: (Only if holding) The new take-profit percentage (e.g., if current is ${config.takeProfitPercent}%, new could be ${config.takeProfitPercent + 1}%).
        - \`justification\`: A brief reason for your decision.
        `;
        return await this.safeGenerate(prompt);
    }
}

interface BuySignal {
    symbol: string;
    [key: string]: unknown;
}

interface Portfolio {
    balance: number;
    positions: Position[];
}

export class PortfolioAllocator extends AIAgent {
    async allocate(buySignals: BuySignal[], portfolio: Portfolio, macroAnalysis: unknown, sentimentAnalysis: unknown, sharedContext: SharedContext): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const prompt = `
        **Persona:** You are a Chief Investment Officer managing a high-risk, high-reward crypto portfolio. Your primary goal is to maximize returns while managing risk.

        **Context:**
        - **Current Portfolio:** ${JSON.stringify(portfolio, null, 2)}
        - **Macro Environment:** ${JSON.stringify(macroAnalysis, null, 2)}
        - **Market Sentiment:** ${JSON.stringify(sentimentAnalysis, null, 2)}
        - **Candidate Assets with "BUY" Signals:**
        ${JSON.stringify(buySignals, null, 2)}

        **Task & Rules:**
        1.  **Holistic Review:** Synthesize all available data. A high technical score is not enough if the macro environment is poor.
        2.  **Risk Management First:**
            - Do not deploy more than 50% of the available \`portfolio.balance\` in a single cycle.
            - Do not allocate more than 25% of the *deployable capital* to a single asset to ensure diversification.
        3.  **Strategic Capital Allocation:** Based on the rules above, decide on the total capital to deploy. Then, allocate this capital across the opportunities with the highest conviction (strong alignment between macro, sentiment, and technicals).
        4.  **Prioritize and Justify:** You must prioritize. If no signal is strong enough to meet your high standards, it is mandatory to "PASS" on all of them to preserve capital.

        **Format (JSON):** An object where each key is the symbol. The value should be an object with:
        - \`decision\`: "EXECUTE_BUY" or "PASS".
        - \`amount_to_buy_usd\`: The amount in USD to invest. Must be a number.
        - \`justification\`: A professional, concise reason for your decision, referencing the provided data.
        `;
        const result = await this.safeGenerate(prompt);
        if (result?.response) {
            const allocations = result.response;
            const executedBuys = Object.entries(allocations)
                .filter(([, decision]) => (decision as { decision: string }).decision === 'EXECUTE_BUY')
                .map(([symbol]) => symbol);
            
            if (executedBuys.length > 0) {
                sharedContext.updateContext({ activeOpportunities: executedBuys });
            }
        }
        return result;
    }
}

export class SentimentAnalyst extends AIAgent {
    async analyze(newsArticles: { title?: string }[], sharedContext: SharedContext): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const headlines = newsArticles.map(article => article.title || '');
        const prompt = `
        **Persona:** You are an AI that analyzes text sentiment.
        **Data:** These news headlines: ${JSON.stringify(headlines.slice(0, 10))}
        **Task:** Evaluate the overall sentiment from the headlines and provide a structured analysis in JSON format.
        - \`sentiment\`: "Bullish", "Bearish", or "Neutral".
        - \`sentiment_score\`: A number from -1.0 (extremely negative) to 1.0 (extremely positive).
        - \`dominant_narrative\`: A short phrase describing the main story in the news (e.g., "Regulatory concerns" or "Bitcoin ETF hype").
        - \`key_topics\`: [List, of, key, topics, driving, the, narrative].
        `;
        const result = await this.safeGenerate(prompt);
        if (result?.response) {
            const { sentiment, sentiment_score, key_topics } = result.response;
            if (typeof sentiment === 'string' && (sentiment === 'Bullish' || sentiment === 'Bearish' || sentiment === 'Neutral') && typeof sentiment_score === 'number' && Array.isArray(key_topics)) {
                sharedContext.updateContext({
                    sentiment: sentiment,
                    sentimentScore: sentiment_score,
                    keyTopics: key_topics as string[]
                });
            }
        }
        return result;
    }
}

export class TechnicalAnalyst extends AIAgent {
    async analyze(symbol: string, candles: Candle[], config: Config): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        return this.analyzeBatch([{ symbol, candles }], config);
    }

    async analyzeBatch(batchData: { symbol: string, candles: Candle[] }[], config: Config): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const formattedData = batchData.map(data => {
            const { symbol, candles } = data;
            const rsi = calculateRSI(candles, config.rsiPeriod);
            const macd = calculateMACD(candles, config.macdShortPeriod, config.macdLongPeriod, config.macdSignalPeriod);
            const sma20 = calculateSMAExported(candles, config.smaShortPeriod);
            const sma50 = calculateSMAExported(candles, config.smaLongPeriod);
            return {
                symbol,
                lastClose: candles[candles.length - 1].close,
                sma20: sma20?.toFixed(2),
                sma50: sma50?.toFixed(2),
                rsi: rsi?.toFixed(2),
                macdHistogram: macd?.histogram?.toFixed(4)
            };
        });

        const prompt = `
        **Persona:** You are a world-class quantitative analyst. Analyze the following batch of assets.
        **Data:**
        ${JSON.stringify(formattedData, null, 2)}

        **Task:** For each asset, provide a concise technical analysis and a score.
        **Format (JSON):** An object where each key is the symbol (e.g., "BTCUSDT"). The value should be an object with:
        - \`technical_score\`: 0.0 (strong sell) to 10.0 (strong buy).
        - \`trend\`: "Uptrend", "Downtrend", "Sideways".
        - \`momentum\`: "Bullish", "Bearish", "Neutral".
        - \`summary\`: A one-sentence summary, including any warning signs like potential trend exhaustion or divergence.
        `;
        return await this.safeGenerate(prompt);
    }
}

export interface Analysis {
    MacroAnalyst: unknown;
    SentimentAnalyst: unknown;
    [key: string]: unknown;
}

export class RiskManager extends AIAgent {
    determineRiskParameters(baseConfig: Config, sharedContext: SharedContext): Config {
        const { regimeScore } = sharedContext.getContext();
        const newConfig = { ...baseConfig };

        // Example of dynamic adjustment:
        // If market regime is very bullish (e.g., score > 7.5), slightly increase risk.
        if (regimeScore > 7.5) {
            newConfig.riskAmountPercent = baseConfig.riskAmountPercent * 1.25; // Risk 25% more
            newConfig.takeProfitPercent = baseConfig.takeProfitPercent * 0.9; // Take profit sooner
        } 
        // If market regime is bearish (e.g., score < 4.0), decrease risk significantly.
        else if (regimeScore < 4.0) {
            newConfig.riskAmountPercent = baseConfig.riskAmountPercent * 0.5; // Risk 50% less
            newConfig.stopLossPercent = baseConfig.stopLossPercent * 0.8; // Tighter stop loss
        }
        
        return newConfig;
    }

    async decide(analysis: Analysis): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        return this.decideBatch([analysis], analysis.MacroAnalyst, analysis.SentimentAnalyst);
    }

    async decideBatch(batchAnalyses: Analysis[], macroAnalysis: unknown, sentimentAnalysis: unknown): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        // Conceptual example of using consultation
        // if (some_condition_of_uncertainty) {
        //     const deeperAnalysis = await this.consult('TechnicalAnalyst', { query: 'Re-analyze BTCUSDT on 1D timeframe' });
        //     // ... incorporate deeperAnalysis into the decision prompt
        // }

        const prompt = `
        **Persona:** You are a seasoned Portfolio Manager. Make final decisions for the following batch of assets.
        **Macro Environment:** ${JSON.stringify(macroAnalysis, null, 2)}
        **Market Sentiment:** ${JSON.stringify(sentimentAnalysis, null, 2)}
        **Batch Technical Analysis:**
        ${JSON.stringify(batchAnalyses, null, 2)}

        **Task:** Act as the final decision-maker. For each asset, synthesize all analysis layers (Macro, Sentiment, Technical) to make a final, risk-assessed trading decision.
        **Your Thought Process:**
        1.  Is the **Macro Environment** favorable for this trade? (\`regime_score\`)
        2.  Does the **Market Sentiment** support this trade? (\`sentiment_score\`)
        3.  Is the **Technical Score** high enough and does the summary indicate a good entry point?
        4.  A "BUY" signal requires a strong alignment across ALL THREE layers. Do not issue a BUY if one layer is strongly negative.

        **Format (JSON):** An object where each key is the symbol. The value should be an object with:
        - \`decision\`: "BUY", "HOLD", or "AVOID".
        - \`confidence_score\`: 0.0 (low) to 10.0 (high). This score must reflect the alignment of all three analysis layers.
        - \`final_summary\`: A one-sentence justification that explicitly references why the macro, sentiment, and technical data support your decision.
        `;
        return await this.safeGenerate(prompt);
    }
}
