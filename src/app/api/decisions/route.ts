import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Define the interface for consistency with other parts of the app
interface DecisionLog {
    [symbol: string]: {
        timestamp: string;
        decision: string;
        justification: string;
        pnlPercent: number;
        currentPrice: number;
    }[];
}

const decisionLogPath = path.join(process.cwd(), 'decision_log.json');

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await fs.readFile(decisionLogPath, 'utf-8');
        const decisionLog: DecisionLog = JSON.parse(data);
        return NextResponse.json(decisionLog);
    } catch (error) {
        // Check if the error is a file system error for a missing file
        if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'ENOENT') {
            return NextResponse.json({}); // Return empty object if file doesn't exist
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error fetching decision log: ${errorMessage}`);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
