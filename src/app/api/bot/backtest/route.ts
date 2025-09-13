// src/app/api/bot/backtest/route.ts

import { NextRequest } from 'next/server';
import { AgentService } from '@/core/agent-service';
import { MacroAnalyst, SentimentAnalyst, TechnicalAnalyst, RiskManager, TechnicalAnalysisResult } from '@/core/agents';
import { BinanceService } from '@/core/binance';
import { VirtualPortfolio, TradeEvent } from '@/core/virtual-portfolio';
import { calculateATR, calculateSMAExported } from '@/core/indicators';

export async function POST(request: NextRequest) {
    const { symbol, interval } = await request.json();

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const sendEvent = (type: string, data: unknown) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`));
            };

            try {
                sendEvent('log', 'Backtest variklis paleistas...');

                // --- INICIALIZACIJA ---
                const agentService = new AgentService();
                const macroAnalyst = new MacroAnalyst(agentService);
                const sentimentAnalyst = new SentimentAnalyst(agentService);
                const techAnalyst = new TechnicalAnalyst(agentService);
                const riskManager = new RiskManager(agentService, "backtest_user"); // Naudojame specialų vartotoją

                const binance = new BinanceService();
                const historicalData = await binance.getHistoricalData(symbol, interval, 500);
                if (historicalData.length < 201) {
                    throw new Error(`Nepakanka istorinių duomenų simboliui ${symbol} (${historicalData.length}). Reikia bent 201.`);
                }

                const virtualPortfolio = new VirtualPortfolio(100000);
                const tradesLog: TradeEvent[] = [];
                const config = { strategies: { main_ai: { technical_indicator_settings: {} } } }; // Minimali konfigūracija

                // --- PAGRINDINIS SIMULIACIJOS CIKLAS ---
                for (let i = 200; i < historicalData.length; i++) {
                    const currentCandle = historicalData[i];
                    const dataSlice = historicalData.slice(0, i + 1);

                    // 1. Atnaujiname portfelį ir tikriname SL/TP
                    const tradeEvent = virtualPortfolio.updatePrice(symbol, currentCandle);
                    if (tradeEvent) {
                        tradesLog.push(tradeEvent);
                        sendEvent('trade', tradeEvent);
                    }

                    // Toliau vykdome tik jei nėra atviros pozicijos
                    if (virtualPortfolio.hasOpenPosition(symbol)) {
                        continue;
                    }

                    // 2. Agentų analizės simuliacija
                    sendEvent('log', `Analizuojama žvakė: ${new Date(currentCandle.timestamp).toLocaleString()}`);

                    // a. Techninė analizė
                    const techAnalysisResult = await techAnalyst.analyzeBatch([{ symbol, candles: dataSlice }], config);
                    const techAnalysis = techAnalysisResult?.response?.[symbol] as TechnicalAnalysisResult | undefined;
                    if (!techAnalysis) continue;

                    // b. Kiekybiniai rodikliai makro analizei
                    const atr = calculateATR(dataSlice.slice(-20), 14); // Volatilumas
                    const sma200 = calculateSMAExported(dataSlice, 200); // Trendas
                    const priceVsSma = sma200 ? ((currentCandle.close - sma200) / sma200) * 100 : 0;

                    const macroPrompt = `Persona: AI makro analitikas. Remiantis pateiktu kainos grafiku iki datos ${new Date(currentCandle.timestamp).toLocaleDateString()}, ir žinant, kad tuo metu istoriškai apskaičiuotas volatilumas (ATR) buvo ${atr?.toFixed(4)}, o kaina buvo ${priceVsSma.toFixed(2)}% ${priceVsSma > 0 ? 'virš' : 'žemiau'} 200 periodų slankiojo vidurkio, koks buvo labiausiai tikėtinas rinkos režimas ('Risk-On'/'Risk-Off') ir rizikos balas (0-10)? Tavo atsakymas yra simuliacija.`;

                    const simulatedMacroResult = await macroAnalyst.safeGenerate(macroPrompt);
                    const simulatedMacro = simulatedMacroResult?.response as any;
                    if (!simulatedMacro) continue;

                    // 3. Rizikos vertinimas ir sprendimas
                    const decisionsResult = await riskManager.decideBatch({[symbol]: techAnalysis}, simulatedMacro, {sentiment: "Neutral", sentiment_score: 0, dominant_narrative: "Backtest simulation", key_topics: []}, {}, {}, config, { open_positions: [] });
                    const decision = decisionsResult?.response?.[symbol] as any;
                    if (!decision) continue;

                    sendEvent('analysis', { techAnalysis, simulatedMacro, decision });

                    // 4. Virtualios prekybos vykdymas
                    if (decision.decision === 'BUY') {
                        const capitalToAllocate = virtualPortfolio.balance * 0.1; // Fiksuota 10% suma testavimui
                        const buyEvent = virtualPortfolio.executeBuy(symbol, capitalToAllocate, currentCandle, decision.stop_loss_percentage, decision.take_profit_percentage);
                        tradesLog.push(buyEvent);
                        sendEvent('trade', buyEvent);
                        sendEvent('log', `ĮVYKDYTAS PIRKIMAS @ ${buyEvent.price.toFixed(2)}`);
                    }
                }

                sendEvent('log', 'Backtest baigtas.');
                sendEvent('final_results', {
                    trades: tradesLog,
                    finalBalance: virtualPortfolio.balance,
                    pnl: virtualPortfolio.balance - 100000,
                });
                controller.close();

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error("[Backtest API Error]", errorMessage);
                sendEvent('error', errorMessage);
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
