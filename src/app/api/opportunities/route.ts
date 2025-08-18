import { NextResponse } from 'next/server';
import { OpportunityScanner } from '@/core/opportunity-scanner';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const scanner = OpportunityScanner.getInstance();
        const opportunities = scanner.getOpportunities();
        return NextResponse.json(opportunities);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
