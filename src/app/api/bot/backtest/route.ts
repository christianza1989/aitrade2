import { BinanceService } from '@/core/binance';
import { MacroAnalyst, SentimentAnalyst, TechnicalAnalyst, RiskManager } from '@/core/agents';

export async function POST(request: Request) {
    const { symbol, startDate, endDate, interval } = await request.json();

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const sendEvent = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            sendEvent({ type: 'log', message: 'Backtest started...' });

            try {
                const binance = new BinanceService();
                const macroAnalyst = new MacroAnalyst();
                const sentimentAnalyst = new SentimentAnalyst();
                const techAnalyst = new TechnicalAnalyst();
                const riskManager = new RiskManager();

                const historicalData = await binance.getHistoricalData(symbol, interval, 200); // Reduced for faster streaming

                let positionOpen = false;

            for (let i = 1; i < historicalData.length; i++) {
                const currentCandle = historicalData[i];
                sendEvent({ type: 'log', message: `Analyzing data for ${new Date(currentCandle.time * 1000).toISOString()}` });

                const macroAnalysisResult = await macroAnalyst.analyze(currentCandle, []);
                const sentimentAnalysisResult = await sentimentAnalyst.analyze([]);
                const techAnalysisResult = await techAnalyst.analyze(symbol, historicalData.slice(0, i + 1));

                const macroAnalysis = macroAnalysisResult?.response;
                const sentimentAnalysis = sentimentAnalysisResult?.response;
                const techAnalysis = techAnalysisResult?.response;

                sendEvent({ type: 'aiChat', data: { agent: 'MacroAnalyst', ...macroAnalysisResult } });
                sendEvent({ type: 'aiChat', data: { agent: 'SentimentAnalyst', ...sentimentAnalysisResult } });
                sendEvent({ type: 'aiChat', data: { agent: 'TechnicalAnalyst', ...techAnalysisResult } });

                const fullAnalysis = {
                        Symbol: symbol,
                        MacroAnalyst: macroAnalysis,
                        SentimentAnalyst: sentimentAnalysis,
                        TechnicalAnalyst: techAnalysis,
                    };
                    
                    sendEvent({ type: 'analysis', data: fullAnalysis });

                    const finalDecisionResult = await riskManager.decide(fullAnalysis);
                    const finalDecision = finalDecisionResult?.response;
                    sendEvent({ type: 'aiChat', data: { agent: 'RiskManager', ...finalDecisionResult } });

                    if (finalDecision?.decision === 'BUY' && !positionOpen) {
                        sendEvent({ type: 'trade', data: { date: new Date(currentCandle.time * 1000).toISOString(), action: 'BUY', price: currentCandle.close } });
                        positionOpen = true;
                    } else if (finalDecision?.decision === 'SELL' && positionOpen) {
                        sendEvent({ type: 'trade', data: { date: new Date(currentCandle.time * 1000).toISOString(), action: 'SELL', price: currentCandle.close } });
                        positionOpen = false;
                    }
                    
                    // Add a small delay to make the stream visible
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

                sendEvent({ type: 'log', message: 'Backtest finished.' });
                controller.close();

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                sendEvent({ type: 'error', message: errorMessage });
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
