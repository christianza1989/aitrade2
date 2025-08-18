import { NextResponse } from 'next/server';
import { NewsService } from '@/core/news';

export async function GET() {
    try {
        const newsService = new NewsService();
        const articles = await newsService.getCryptoNews('crypto', 20);
        return NextResponse.json({ articles });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
