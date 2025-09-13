// src/app/api/chart-data/route.ts

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
        
        // Ensure that we only proceed if candles is an array with data
        if (!Array.isArray(candles) || candles.length === 0) {
            return NextResponse.json({ error: `No historical data found for symbol: ${symbol}` }, { status: 404 });
        }
        
        const formattedData = candles.map(c => ({
            time: c.timestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));

        return NextResponse.json(formattedData);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error fetching chart data for ${symbol}: ${errorMessage}`);
        // Ensure a proper JSON error response is always sent on failure
        return NextResponse.json({ error: `Failed to fetch data from Binance API: ${errorMessage}` }, { status: 500 });
    }
}
