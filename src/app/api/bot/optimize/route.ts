import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PortfolioService } from '@/core/portfolio';
import { StrategyOptimizer } from '@/core/optimizer';
import { OpportunityLogger } from '@/core/opportunity-logger';
import { DecisionLogger } from '@/core/decision-logger';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.name) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const username = session.user.name;

        const portfolioService = new PortfolioService(username);
        const opportunityLogger = new OpportunityLogger(username);
        const decisionLogger = new DecisionLogger(username);
        const optimizer = new StrategyOptimizer();

        const trades = await portfolioService.getTradeLogs();
        const missedOpportunities = await opportunityLogger.getLogs();
        const decisionLogs = await decisionLogger.getLogs();

        if (trades.length === 0 && missedOpportunities.length === 0 && decisionLogs.length === 0) {
            return NextResponse.json({ error: 'No data available to analyze.' }, { status: 400 });
        }

        const analysis = await optimizer.analyze(trades, missedOpportunities, decisionLogs);
        return NextResponse.json(analysis);

    } catch (error) {
        console.error("An error occurred during optimization:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
