// src/app/api/market-stream/route.ts
import { WebSocketService } from '@/core/websocket-service';

type Opportunity = {
    symbol: string;
    priceChangePercent: number;
};

export async function GET() {
    // Inicijuojame servisą. Jei dar nepaleistas, jis prisijungs.
    const wsService = WebSocketService.getInstance();
    wsService.connectMarketStream();

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            const onNewOpportunity = (opportunity: Opportunity) => {
                const eventData = { type: 'NEW_OPPORTUNITY', payload: opportunity };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
            };

            wsService.on('new_opportunity', onNewOpportunity);

            // Svarbu: atjungti listener'į, kai klientas atsijungia
            // Nors šiuo atveju stream'as pats neužsidaro, tai gera praktika
            // Vercel'yje funkcija vis tiek baigs darbą po timeout'o
        },
        cancel() {
            console.log('[MarketStream API] Client disconnected.');
            // Čia mes neuždarome ryšio, nes jis yra globalus ir gali būti naudojamas kitų
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
