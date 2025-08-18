import { NextResponse } from 'next/server';
import WebSocket from 'ws';

export async function GET() {
    let binanceWs: WebSocket;
    const stream = new ReadableStream({
        start(controller) {
            binanceWs = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');

            binanceWs.on('message', (data) => {
                const message = `data: ${data.toString()}\n\n`;
                controller.enqueue(new TextEncoder().encode(message));
            });

            binanceWs.on('close', () => {
                controller.close();
            });

            binanceWs.on('error', (err) => {
                controller.error(err);
            });
        },
        cancel() {
            if (binanceWs) {
                binanceWs.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
