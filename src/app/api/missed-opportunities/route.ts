// src/app/api/missed-opportunities/route.ts
import { NextResponse } from 'next/server';
import { OpportunityLogger } from '@/core/opportunity-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const opportunityLogger = new OpportunityLogger();
        const logs = await opportunityLogger.getLogs();
        return NextResponse.json(logs);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Failed to fetch missed opportunities:", errorMessage);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
