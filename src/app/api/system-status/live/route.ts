// PATH: src/app/api/system-status/live/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const prisma = new PrismaClient();

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const marketRegime = await redis.get('global_market_regime') || 'N/A';

        const userConfig = await prisma.userConfiguration.findUnique({
            where: { userId: username },
            select: { strategyConfig: true }
        });

        const strategyConfig = userConfig?.strategyConfig as Record<string, unknown>;
        const strategyMapping = strategyConfig?.strategy_mapping as Record<string, string>;
        const activeStrategyName = (strategyMapping && strategyMapping[marketRegime]) || (strategyMapping as Record<string, string>)?.default || 'N/A';

        return NextResponse.json({
            marketRegime,
            activeStrategyName,
        });

    } catch (error) {
        console.error('[API /system-status/live] Error fetching live status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
