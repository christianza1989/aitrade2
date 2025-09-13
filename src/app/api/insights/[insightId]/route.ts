import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ insightId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { insightId } = await params;
    if (!insightId) {
        return NextResponse.json({ error: 'Insight ID is required' }, { status: 400 });
    }

    try {
        // 1. Gauk įžvalgos įrašą
        const insightRecord = await prisma.tradeMemory.findUnique({
            where: { id: insightId },
        });

        if (!insightRecord || insightRecord.outcome !== 'dialogue_summary') {
            return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
        }

        const insightContext = insightRecord.context as any;
        const supportingData = insightContext?.supporting_data;

        if (!supportingData?.analyzed_memory_ids?.length) {
            return NextResponse.json({
                chart_data: supportingData?.chart_data || null,
                analyzed_trades: [],
            });
        }

        // 2. Gauk visus susijusius sandorius
        const analyzedTrades = await prisma.tradeMemory.findMany({
            where: {
                id: { in: supportingData.analyzed_memory_ids },
            },
        });

        return NextResponse.json({
            chart_data: supportingData.chart_data,
            analyzed_trades: analyzedTrades,
        });

    } catch (error) {
        console.error(`[API /insights] Error fetching insight data for ${insightId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
