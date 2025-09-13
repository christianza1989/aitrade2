// PATH: src/app/api/agent-activity/cycles/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const historyKey = `cycle_history:${session.user.name}`;
    const cycleIds = await redis.lrange(historyKey, 0, -1);

    return NextResponse.json(cycleIds);
}
