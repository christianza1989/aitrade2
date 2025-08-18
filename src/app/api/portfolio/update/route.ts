import { NextRequest, NextResponse } from 'next/server';
import { PortfolioService } from '@/core/portfolio';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { symbol, updates } = await request.json();
        if (!symbol || !updates) {
            return NextResponse.json({ error: 'Symbol and updates are required' }, { status: 400 });
        }

        const portfolioService = new PortfolioService();
        await portfolioService.updatePosition(symbol, updates);

        return NextResponse.json({ success: true });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error in portfolio update API: ${errorMessage}`);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
