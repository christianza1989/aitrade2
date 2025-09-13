// src/app/api/missed-opportunities/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { OpportunityLogger } from '@/core/opportunity-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const opportunityLogger = new OpportunityLogger(username);
        const logs = await opportunityLogger.getLogs();
        return NextResponse.json(logs);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Failed to fetch missed opportunities:", errorMessage);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
