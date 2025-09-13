import { NextResponse } from 'next/server';
import { telegramService } from '../../../../core/services/TelegramService';

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        // Saugumo patikrinimas (supaprastintas)
        if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== process.env.TELEGRAM_SECRET_TOKEN) {
            return new Response('Unauthorized', { status: 401 });
        }

        await telegramService.handleUpdate(payload);
        return NextResponse.json({ status: 'ok' });

    } catch (error) {
        console.error('[Telegram Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
