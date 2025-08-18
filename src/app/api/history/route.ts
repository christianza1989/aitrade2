import { NextResponse } from 'next/server';
import { PortfolioService } from '@/core/portfolio';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const portfolioService = new PortfolioService();
        const tradeLogs = await portfolioService.getTradeLogs();
        return NextResponse.json(tradeLogs);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error fetching trade history: ${errorMessage}`);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
