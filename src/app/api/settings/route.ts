import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const configFilePath = path.join(process.cwd(), 'config.json');

export async function GET() {
    try {
        const data = await fs.readFile(configFilePath, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch (error) {
        return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const settings = await request.json();
        await fs.writeFile(configFilePath, JSON.stringify(settings, null, 2));
        return NextResponse.json({ message: 'Settings saved' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
