// src/app/api/bot/analyze-on-demand/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { onDemandAnalysisQueue } from '../../../../core/job-queue';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // TODO: Įdiegti rate limiter (pvz., 5 užklausos/min)

    try {
        const { symbol } = await req.json();
        if (!symbol || typeof symbol !== 'string') {
            return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
        }

        const job = await onDemandAnalysisQueue.add('analyze-symbol', {
            username: session.user.name,
            symbol: symbol.toUpperCase()
        });

        return NextResponse.json({ jobId: job.id });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
