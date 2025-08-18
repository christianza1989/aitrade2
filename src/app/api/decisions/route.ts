import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const decisionLogPath = path.join(process.cwd(), 'decision_log.json');

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await fs.readFile(decisionLogPath, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return NextResponse.json({}); // Return empty object if file doesn't exist
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error fetching decision log: ${errorMessage}`);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
