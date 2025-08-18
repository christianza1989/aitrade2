import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const statusFilePath = path.join(process.cwd(), 'bot-status.json');

async function getBotStatus() {
    try {
        const data = await fs.readFile(statusFilePath, 'utf-8');
        return JSON.parse(data).status;
    } catch {
        return 'inactive';
    }
}

async function setBotStatus(status: 'active' | 'inactive') {
    await fs.writeFile(statusFilePath, JSON.stringify({ status }));
}

export async function GET() {
    const status = await getBotStatus();
    return NextResponse.json({ status });
}

export async function POST(request: Request) {
    const { status } = await request.json();
    if (status === 'active' || status === 'inactive') {
        await setBotStatus(status);
        return NextResponse.json({ status });
    }
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
}
