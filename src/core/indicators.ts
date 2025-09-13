import { Candle } from "./interfaces";

export function calculateRSI(candles: Candle[], period: number = 14): number | null {
    if (candles.length < period) return null;

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < candles.length; i++) {
        const change = candles[i].close - candles[i - 1].close;
        if (change > 0) {
            gains.push(change);
            losses.push(0);
        } else {
            gains.push(0);
            losses.push(Math.abs(change));
        }
    }

    let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

    for (let i = period; i < gains.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

export function calculateMACD(candles: Candle[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
    if (candles.length < slowPeriod + signalPeriod) return null;

    const ema = (period: number) => {
    const k = 2 / (period + 1);
    const emaValues: number[] = [];
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += candles[i].close;
        }
        emaValues.push(sum / period);

        for (let i = period; i < candles.length; i++) {
            emaValues.push((candles[i].close - emaValues[emaValues.length - 1]) * k + emaValues[emaValues.length - 1]);
        }
        return emaValues;
    };

    const fastEma = ema(fastPeriod);
    const slowEma = ema(slowPeriod);

    const macdLine: number[] = [];
    for (let i = 0; i < fastEma.length; i++) {
        if (i >= slowPeriod - 1) { // Adjusting for different lengths of EMAs
            macdLine.push(fastEma[i] - slowEma[i - (fastPeriod - slowPeriod)]);
        }
    }

    const signalLine: number[] = [];
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) {
        sum += macdLine[i];
    }
    signalLine.push(sum / signalPeriod);

    const kSignal = 2 / (signalPeriod + 1);
    for (let i = signalPeriod; i < macdLine.length; i++) {
        signalLine.push((macdLine[i] - signalLine[signalLine.length - 1]) * kSignal + signalLine[signalLine.length - 1]);
    }

    const histogram = macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1];

    return {
        macdLine: macdLine[macdLine.length - 1],
        signalLine: signalLine[signalLine.length - 1],
        histogram: histogram
    };
}

export function calculateSMAExported(candles: Candle[], period: number): number | null {
    if (candles.length < period) return null;
    const sum = candles.slice(-period).reduce((acc, candle) => acc + candle.close, 0);
    return sum / period;
}

export function calculateATR(candles: Candle[], period: number = 14): number | null {
    if (candles.length < period) return null;

    const trueRanges: number[] = [];
    for (let i = 1; i < candles.length; i++) {
        const high = candles[i].high;
        const low = candles[i].low;
        const prevClose = candles[i-1].close;
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trueRanges.push(tr);
    }

    // Simple Moving Average of True Ranges
    const atr = trueRanges.slice(-period).reduce((sum, val) => sum + val, 0) / period;
    return atr;
}
