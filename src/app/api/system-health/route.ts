// src/app/api/system-health/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { tradingCycleQueue } from '../../../core/job-queue';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function checkService(name: string, checkFn: () => Promise<unknown>) {
    const start = Date.now();
    try {
        const data = await checkFn();
        const latency = Date.now() - start;
        return { status: 'OK', latency_ms: latency, data };
    } catch (error) {
        const latency = Date.now() - start;
        return { status: 'Error', latency_ms: latency, error: (error as Error).message };
    }
}

export async function GET() {
    const dbCheck = await checkService('database', () => prisma.$queryRaw`SELECT 1`);
    const redisCheck = await checkService('redis', () => redis.ping());
    const queueCheck = await checkService('queue', () => tradingCycleQueue.getJobCounts('wait', 'active', 'failed'));

    const services = {
        database: dbCheck,
        redis: redisCheck,
        queue: queueCheck,
    };

    const isOk = Object.values(services).every(s => s.status === 'OK');
    const overallStatus = isOk ? 'OK' : 'Error';

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        status: overallStatus,
        services,
    }, { status: isOk ? 200 : 503 });
}
