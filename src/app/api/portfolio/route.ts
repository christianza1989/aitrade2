// src/app/api/portfolio/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { PortfolioService } from '../../../core/portfolio';
import { PaperExecutionService } from '../../../core/services/ExecutionService';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const executionService = new PaperExecutionService();
        const portfolioService = new PortfolioService(username, 'MAIN', executionService);
        const portfolio = await portfolioService.getPortfolio();
        return NextResponse.json(portfolio);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
