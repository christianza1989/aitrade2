// PATH: src/app/api/chat/status/[jobId]/route.ts
import { NextResponse } from 'next/server';
import { chatCommandsQueue } from '../../../../../core/job-queue';
import { Job } from 'bullmq';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
    const { jobId } = await params;
    const resultKey = `chat-result:${jobId}`;

    try {
        const result = await redis.get(resultKey);

        if (result) {
            // Rezultatas rastas, darbas baigtas
            await redis.del(resultKey); // Išvalome po nuskaitymo
            return NextResponse.json({ status: 'COMPLETED', data: JSON.parse(result) });
        }

        // Tikriname paties darbo būseną BullMQ
        const job = await chatCommandsQueue.getJob(jobId);
        if (!job) {
            return NextResponse.json({ status: 'NOT_FOUND' }, { status: 404 });
        }

        if (await job.isFailed()) {
            return NextResponse.json({ status: 'FAILED', error: job.failedReason });
        }

        // Darbas vis dar eilėje arba vykdomas
        return NextResponse.json({ status: 'PENDING' });

    } catch (error) {
        console.error(`[API /chat/status] Error for job ${jobId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
