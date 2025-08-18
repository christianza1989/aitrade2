import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from "@google/generative-ai";
import { Candle } from "./binance";
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
}

export class MacroAnalyst extends AIAgent {
    async analyze(btcData: Record<string, unknown>, newsHeadlines: string[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const prompt = `
        **Persona:** You are a Macroeconomic and Crypto Market Cycle Analyst. Your task is to assess the overall market environment.
        **Data:**
        1.  **Bitcoin (4H TF) Last Candle:** ${JSON.stringify(btcData)}
        2.  **Top News Headlines:** ${JSON.stringify(newsHeadlines)}
        3.  **Simulated On-Chain Data:** "Exchange Netflow: -1500 BTC (Neutral), Stablecoin Supply Ratio: Rising (Bullish)"

        **Task:** Provide a general market assessment in JSON format.
        - \`market_regime\`: "Risk-On" (favorable for risky assets) or "Risk-Off" (avoid risk).
        - \`regime_score\`: A number from 0.0 (very bad) to 10.0 (very good).
        - \`summary\`: A one-sentence summary.
        `;
        return await this.safeGenerate(prompt);
    }
}

export class PositionManager extends AIAgent {
    async decide(position: any, currentPrice: number, macroAnalysis: any, sentimentAnalysis: any, config: any, decisionHistory: any[]): Promise<{ prompt: string; response: Record<string, any> } | null> {
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
        Your primary task is to decide between "SELL_NOW" to lock in profits or "HOLD_AND_INCREASE_TP" to let profits run. Do not hold indefinitely. If the asset's technical indicators (like a very high RSI or weakening MACD) suggest the trend is exhausted, you should lean towards "SELL_NOW" even if the macro/sentiment is positive. Be a prudent profit-taker, not just a trend-follower.

        **Format (JSON):**
        - \`decision\`: "SELL_NOW" or "HOLD_AND_INCREASE_TP".
        - \`new_take_profit_percent\`: (Only if holding) The new take-profit percentage (e.g., if current is ${config.takeProfitPercent}%, new could be ${config.takeProfitPercent + 1}%).
        - \`justification\`: A brief reason for your decision.
        `;
        return await this.safeGenerate(prompt);
    }
}

export class PortfolioAllocator extends AIAgent {
    async allocate(buySignals: any[], portfolio: any, macroAnalysis: any, sentimentAnalysis: any): Promise<{ prompt: string; response: Record<string, any> } | null> {
        const prompt = `
        **Persona:** You are a Chief Investment Officer managing a high-risk, high-reward crypto portfolio. Your primary goal is to maximize returns while managing risk.

        **Context:**
        - **Current Portfolio:** ${JSON.stringify(portfolio, null, 2)}
        - **Macro Environment:** ${JSON.stringify(macroAnalysis, null, 2)}
        - **Market Sentiment:** ${JSON.stringify(sentimentAnalysis, null, 2)}
        - **Candidate Assets with "BUY" Signals:**
        ${JSON.stringify(buySignals, null, 2)}

        **Task:**
        1.  **Holistic Review:** Synthesize all available data. Do not just look at the signals in isolation.
        2.  **Strategic Capital Allocation:** Based on the available balance (\`portfolio.balance\`), decide on the total capital to deploy in this cycle. Then, allocate this capital across the strongest opportunities.
        3.  **Prioritize and Justify:** You must prioritize. Not all "BUY" signals are equal. Allocate more capital to high-conviction plays. If no signal is strong enough, it is perfectly acceptable to "PASS" on all of them.

        **Format (JSON):** An object where each key is the symbol. The value should be an object with:
        - \`decision\`: "EXECUTE_BUY" or "PASS".
        - \`amount_to_buy_usd\`: The amount in USD to invest. Must be a number.
        - \`justification\`: A professional, concise reason for your decision, referencing the provided data.
        `;
        return await this.safeGenerate(prompt);
    }
}

export class SentimentAnalyst extends AIAgent {
    async analyze(newsArticles: { title?: string }[]): Promise<{ prompt: string; response: Record<string, unknown> } | null> {
        const headlines = newsArticles.map(article => article.title || '');
        const prompt = `
        **Persona:** You are an AI that analyzes text sentiment.
        **Data:** These news headlines: ${JSON.stringify(headlines.slice(0, 10))}
        **Task:** Evaluate the overall sentiment in JSON format.
        - \`sentiment\`: "Bullish", "Bearish", or "Neutral".
        - \`sentiment_score\`: A number from -1.0 (very negative) to 1.0 (very positive).
        - \`key_topics\`: [List, of, key, topics].
        `;
        return await this.safeGenerate(prompt);
    }
}

export class TechnicalAnalyst extends AIAgent {
    async analyzeBatch(batchData: { symbol: string, candles: Candle[] }[], config: any): Promise<{ prompt: string; response: Record<string, any> } | null> {
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

        **Task:** For each asset, provide a technical analysis and a score.
        **Format (JSON):** An object where each key is the symbol (e.g., "BTCUSDT"). The value should be an object with:
        - \`technical_score\`: 0.0 to 10.0.
        - \`trend\`: "Uptrend", "Downtrend", "Sideways".
        - \`momentum\`: "Bullish", "Bearish", "Neutral".
        - \`summary\`: A one-sentence summary.
        `;
        return await this.safeGenerate(prompt);
    }
}

export class RiskManager extends AIAgent {
    async decideBatch(batchAnalyses: any[], macroAnalysis: any, sentimentAnalysis: any): Promise<{ prompt: string; response: Record<string, any> } | null> {
        const prompt = `
        **Persona:** You are a seasoned Portfolio Manager. Make final decisions for the following batch of assets.
        **Macro Environment:** ${JSON.stringify(macroAnalysis, null, 2)}
        **Market Sentiment:** ${JSON.stringify(sentimentAnalysis, null, 2)}
        **Batch Technical Analysis:**
        ${JSON.stringify(batchAnalyses, null, 2)}

        **Task:** For each asset, provide a final trading decision.
        **Format (JSON):** An object where each key is the symbol. The value should be an object with:
        - \`decision\`: "BUY", "HOLD", or "AVOID".
        - \`confidence_score\`: 0.0 to 10.0.
        - \`final_summary\`: A one-sentence justification.
        `;
        return await this.safeGenerate(prompt);
    }
}
