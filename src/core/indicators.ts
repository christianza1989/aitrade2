import { Candle } from './binance';

// Helper to calculate Simple Moving Average (SMA)
function calculateSMA(data: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = 0; i <= data.length - period; i++) {
        const chunk = data.slice(i, i + period);
        const sum = chunk.reduce((a, b) => a + b, 0);
        sma.push(sum / period);
    }
    return sma;
}

// Helper to calculate Exponential Moving Average (EMA)
function calculateEMA(data: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    let prevEma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema.push(prevEma);

    for (let i = period; i < data.length; i++) {
        const currentEma = (data[i] - prevEma) * multiplier + prevEma;
        ema.push(currentEma);
        prevEma = currentEma;
    }
    return ema;
}

export function calculateSMAExported(candles: Candle[], period: number): number | null {
    if (candles.length < period) return null;
    const prices = candles.map(c => c.close);
    const smaValues = calculateSMA(prices, period);
    return smaValues[smaValues.length - 1];
}

export function calculateRSI(candles: Candle[], period: number = 14): number | null {
    if (candles.length < period) return null;
    const prices = candles.map(c => c.close);
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) {
            gains += diff;
        } else {
            losses -= diff;
        }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

export function calculateMACD(candles: Candle[], shortPeriod: number = 12, longPeriod: number = 26, signalPeriod: number = 9) {
    if (candles.length < longPeriod) return null;
    const prices = candles.map(c => c.close);
    
    const emaShort = calculateEMA(prices, shortPeriod);
    const emaLong = calculateEMA(prices, longPeriod);
    
    const macdLine = emaShort.slice(emaLong.length - emaShort.length).map((val, index) => val - emaLong[index]);
    const signalLine = calculateEMA(macdLine, signalPeriod);
    
    const histogram = macdLine.slice(signalLine.length - macdLine.length).map((val, index) => val - signalLine[index]);

    return {
        macd: macdLine[macdLine.length - 1],
        signal: signalLine[signalLine.length - 1],
        histogram: histogram[histogram.length - 1],
    };
}
