import { NextRequest, NextResponse } from 'next/server';
import { BinanceService } from '@/core/binance';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
    }

    try {
        const binanceService = new BinanceService();
        // Fetching 1-day interval data for a broader view
        const candles = await binanceService.getHistoricalData(symbol, '1d', 365); 
        
        const formattedData = candles.map(c => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));

        return NextResponse.json(formattedData);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error fetching chart data for ${symbol}: ${errorMessage}`);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
