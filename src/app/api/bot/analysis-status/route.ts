// src/app/api/bot/analysis-status/route.ts
import { NextResponse } from 'next/server';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
        return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const resultKey = `on-demand-result:${jobId}`;
    const result = await redis.get(resultKey);

    if (!result) {
        return NextResponse.json({ status: 'NOT_FOUND' });
    }

    return NextResponse.json(JSON.parse(result));
}
