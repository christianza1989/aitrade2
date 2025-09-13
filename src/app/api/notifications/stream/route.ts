// PATH: src/app/api/notifications/stream/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { Redis } from 'ioredis';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
        return new Response('Unauthorized', { status: 401 });
    }
    const username = session.user.name;

    const stream = new ReadableStream({
        async start(controller) {
            const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
            const channel = `user-notifications:${username}`;

            subscriber.subscribe(channel, (err) => {
                if (err) {
                    console.error(`[SSE] Failed to subscribe to Redis channel ${channel}`, err);
                    controller.error(err);
                } else {
                    console.log(`[SSE] Subscribed to ${channel}`);
                    // Siunčiame prisijungimo patvirtinimą
                    controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
                }
            });

            subscriber.on('message', (ch, message) => {
                if (ch === channel) {
                    controller.enqueue(`data: ${message}\n\n`);
                }
            });

            req.signal.onabort = () => {
                console.log(`[SSE] Client disconnected from ${channel}. Unsubscribing.`);
                subscriber.unsubscribe(channel);
                subscriber.quit();
                controller.close();
            };
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
