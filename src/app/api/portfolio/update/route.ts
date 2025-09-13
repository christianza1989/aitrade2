import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PortfolioService } from '@/core/portfolio';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { PaperExecutionService } from '@/core/services/ExecutionService';

const updatePositionSchema = z.object({
    symbol: z.string().min(1, "Symbol is required"),
    updates: z.object({
        takeProfitPercent: z.number().optional(),
        stopLossPrice: z.number().optional(),
        holdCount: z.number().optional(),
        lastHoldPrice: z.number().optional()
    }),
});

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const body = await req.json();
        const { symbol, updates } = updatePositionSchema.parse(body);

        const executionService = new PaperExecutionService();
        const portfolioService = new PortfolioService(username, 'MAIN', executionService);
        await portfolioService.updatePosition(symbol, updates);

        return NextResponse.json({ success: true, message: `Position ${symbol} updated.` });

    } catch (error) {
        if (error instanceof z.ZodError) {
            const validationError = fromZodError(error);
            return NextResponse.json({ success: false, error: validationError.message }, { status: 400 });
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error in update API: ${errorMessage}`);
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
