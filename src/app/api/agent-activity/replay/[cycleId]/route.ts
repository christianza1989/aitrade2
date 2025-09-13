// PATH: src/app/api/agent-activity/replay/[cycleId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const parseStreamEntry = (entry: [string, string[]]) => {
    const id = entry[0];
    const data: Record<string, any> = {};
    const arr = entry[1];
    for (let i = 0; i < arr.length; i += 2) {
        data[arr[i]] = arr[i + 1];
    }
    if (data.payload) {
        try { data.payload = JSON.parse(data.payload); } catch (e) { /* ignore */ }
    }
    return { id, ...data } as { id: string; cycleId?: string; timestamp?: string; [key: string]: any };
};

export async function GET(req: Request, { params }: { params: Promise<{ cycleId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { cycleId } = await params;
    const streamKey = `agent_activity_stream:${session.user.name}`;

    const allActivitiesRaw = await redis.xrevrange(streamKey, '+', '-');
    const cycleActivities = allActivitiesRaw
        .map(parseStreamEntry)
        .filter(entry => entry.cycleId === cycleId)
        .sort((a, b) => {
            const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return aTime - bTime;
        }); // Rūšiuojam chronologiškai

    return NextResponse.json(cycleActivities);
}
