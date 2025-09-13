import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const streamKey = `agent_activity_stream:${session.user.name}`;
    const rawData = await redis.xrevrange(streamKey, '+', '-', 'COUNT', 1);
    if (rawData.length === 0) {
        return NextResponse.json([]);
    }

    const lastEntry = rawData[0][1];
    const lastCycleId = lastEntry[lastEntry.length - 2]; // cycleId is the second to last element

    const cycleActivitiesRaw = await redis.xrevrange(streamKey, '+', '-');
    const cycleActivities = cycleActivitiesRaw
        .map(entry => {
            const data = entry[1];
            const obj: any = {};
            for (let i = 0; i < data.length; i += 2) {
                obj[data[i]] = data[i + 1];
            }
            return obj;
        })
        .filter(entry => entry.cycleId === lastCycleId);

    return NextResponse.json(cycleActivities);
}
