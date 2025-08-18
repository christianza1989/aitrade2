import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BinanceService } from '@/core/binance';
import { TechnicalAnalyst, RiskManager, Analysis } from '@/core/agents';
import { SharedContext } from '@/core/context';
import { OpportunityScanner } from '@/core/opportunity-scanner';
import fs from 'fs/promises';
import path from 'path';

const configFilePath = path.join(process.cwd(), 'config.json');

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbol } = await req.json();
    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        const opportunityScanner = OpportunityScanner.getInstance();
        await opportunityScanner.updateOpportunityStatus(symbol, 'analyzing');

        // Initialize services and agents
        const binance = new BinanceService();
        const techAnalyst = new TechnicalAnalyst();
        const riskManager = new RiskManager();
        const sharedContext = new SharedContext(); // Using a default context for quick analysis

        // Load config
        const configData = await fs.readFile(configFilePath, 'utf-8');
        const config = JSON.parse(configData);

        // Fetch necessary data
        const candles = await binance.getHistoricalData(symbol, '5m', 100);
        if (candles.length === 0) {
            throw new Error(`Could not fetch historical data for ${symbol}`);
        }

        // Perform analysis
        const techAnalysisResult = await techAnalyst.analyze(symbol, candles, config);
        const techAnalysis = techAnalysisResult?.response?.[symbol] as Analysis;

        if (!techAnalysis) {
            throw new Error(`Technical analysis failed for ${symbol}`);
        }
        
        // For a quick decision, we use a simplified, neutral context
        const mockMacro = { market_regime: 'Risk-On', regime_score: 6.0, summary: 'Neutral context for tactical decision.' };
        const mockSentiment = { sentiment: 'Neutral', sentiment_score: 0.0, key_topics: [] };

        const riskManagerResult = await riskManager.decide({ ...techAnalysis, MacroAnalyst: mockMacro, SentimentAnalyst: mockSentiment });
        const finalDecision = riskManagerResult?.response?.[symbol] as { decision?: string };

        if (finalDecision?.decision === 'BUY') {
            await opportunityScanner.updateOpportunityStatus(symbol, 'bought');
            // In a real implementation, you would trigger the buy logic here.
            // For now, we just log the decision.
        } else {
            await opportunityScanner.updateOpportunityStatus(symbol, 'ignored');
        }

        return NextResponse.json({ symbol, decision: finalDecision?.decision || 'AVOID' });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Decision API] Error analyzing ${symbol}:`, errorMessage);
        // If analysis fails, mark as ignored to prevent retries
        const opportunityScanner = OpportunityScanner.getInstance();
        await opportunityScanner.updateOpportunityStatus(symbol, 'ignored');
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
