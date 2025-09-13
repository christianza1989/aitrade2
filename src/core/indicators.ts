import { Candle } from "./interfaces";

// Professional Trading Pattern Recognition
export interface CandlestickPattern {
    name: string;
    type: 'bullish' | 'bearish' | 'neutral' | 'reversal' | 'continuation';
    strength: 'weak' | 'moderate' | 'strong';
    confidence: number; // 0-100
    description: string;
}

export interface MarketStructure {
    trend: 'uptrend' | 'downtrend' | 'sideways';
    trendStrength: number; // 0-100
    supports: number[];
    resistances: number[];
    keyLevels: { price: number, type: 'support' | 'resistance', strength: number }[];
    volatilityRegime: 'low' | 'normal' | 'high' | 'extreme';
}

export interface VolumeAnalysis {
    trend: 'increasing' | 'decreasing' | 'stable';
    profile: 'accumulation' | 'distribution' | 'neutral';
    institutionalActivity: 'high' | 'medium' | 'low';
    averageVolume: number;
    volumeRatio: number; // Current vs average
}

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

// Advanced Professional Trading Indicators
export function calculateBollingerBands(candles: Candle[], period: number = 20, stdDev: number = 2): { upper: number, middle: number, lower: number, bandwidth: number } | null {
    if (candles.length < period) return null;
    
    const closes = candles.slice(-period).map(c => c.close);
    const sma = closes.reduce((sum, close) => sum + close, 0) / period;
    
    const variance = closes.reduce((sum, close) => sum + Math.pow(close - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    const upper = sma + (standardDeviation * stdDev);
    const lower = sma - (standardDeviation * stdDev);
    const bandwidth = (upper - lower) / sma * 100;
    
    return {
        upper,
        middle: sma,
        lower,
        bandwidth
    };
}

export function calculateStochasticRSI(candles: Candle[], rsiPeriod: number = 14, stochPeriod: number = 14): { k: number, d: number } | null {
    if (candles.length < rsiPeriod + stochPeriod) return null;
    
    // Calculate RSI values for the required period
    const rsiValues: number[] = [];
    for (let i = rsiPeriod; i <= candles.length; i++) {
        const rsi = calculateRSI(candles.slice(0, i), rsiPeriod);
        if (rsi !== null) rsiValues.push(rsi);
    }
    
    if (rsiValues.length < stochPeriod) return null;
    
    const recentRSI = rsiValues.slice(-stochPeriod);
    const minRSI = Math.min(...recentRSI);
    const maxRSI = Math.max(...recentRSI);
    const currentRSI = rsiValues[rsiValues.length - 1];
    
    const k = maxRSI - minRSI !== 0 ? ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100 : 50;
    const d = recentRSI.reduce((sum, rsi) => {
        const stochValue = maxRSI - minRSI !== 0 ? ((rsi - minRSI) / (maxRSI - minRSI)) * 100 : 50;
        return sum + stochValue;
    }, 0) / stochPeriod;
    
    return { k, d };
}

export function calculateEMA(candles: Candle[], period: number): number | null {
    if (candles.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = candles[0].close; // Start with first close price
    
    for (let i = 1; i < candles.length; i++) {
        ema = (candles[i].close - ema) * multiplier + ema;
    }
    
    return ema;
}

export function calculateVWAP(candles: Candle[]): number | null {
    if (candles.length === 0) return null;
    
    let totalVolume = 0;
    let totalPriceVolume = 0;
    
    candles.forEach(candle => {
        const typicalPrice = (candle.high + candle.low + candle.close) / 3;
        totalPriceVolume += typicalPrice * candle.volume;
        totalVolume += candle.volume;
    });
    
    return totalVolume > 0 ? totalPriceVolume / totalVolume : null;
}

export function calculateSupportsAndResistances(candles: Candle[], lookback: number = 20): { supports: number[], resistances: number[] } {
    if (candles.length < lookback * 2) return { supports: [], resistances: [] };
    
    const supports: number[] = [];
    const resistances: number[] = [];
    
    for (let i = lookback; i < candles.length - lookback; i++) {
        const current = candles[i];
        const leftSide = candles.slice(i - lookback, i);
        const rightSide = candles.slice(i + 1, i + lookback + 1);
        
        // Check for local high (resistance)
        const isLocalHigh = leftSide.every(c => c.high <= current.high) && rightSide.every(c => c.high <= current.high);
        if (isLocalHigh) {
            resistances.push(current.high);
        }
        
        // Check for local low (support)
        const isLocalLow = leftSide.every(c => c.low >= current.low) && rightSide.every(c => c.low >= current.low);
        if (isLocalLow) {
            supports.push(current.low);
        }
    }
    
    return { supports, resistances };
}

export function calculateVolumeProfile(candles: Candle[], priceBins: number = 20): { price: number, volume: number }[] {
    if (candles.length === 0) return [];
    
    const minPrice = Math.min(...candles.map(c => c.low));
    const maxPrice = Math.max(...candles.map(c => c.high));
    const binSize = (maxPrice - minPrice) / priceBins;
    
    const volumeProfile: { price: number, volume: number }[] = [];
    
    for (let i = 0; i < priceBins; i++) {
        const binPrice = minPrice + (i * binSize) + (binSize / 2);
        let binVolume = 0;
        
        candles.forEach(candle => {
            const binStart = minPrice + (i * binSize);
            const binEnd = binStart + binSize;
            
            // If candle overlaps with this bin, add proportional volume
            if (candle.low <= binEnd && candle.high >= binStart) {
                const overlap = Math.min(candle.high, binEnd) - Math.max(candle.low, binStart);
                const candleRange = candle.high - candle.low;
                const volumeRatio = candleRange > 0 ? overlap / candleRange : 0;
                binVolume += candle.volume * volumeRatio;
            }
        });
        
        volumeProfile.push({ price: binPrice, volume: binVolume });
    }
    
    return volumeProfile.sort((a, b) => b.volume - a.volume);
}

export function calculateMomentumDivergence(candles: Candle[], period: number = 14): {
    priceTrend: 'bullish' | 'bearish' | 'neutral',
    rsiTrend: 'bullish' | 'bearish' | 'neutral',
    divergence: 'bullish' | 'bearish' | 'none'
} | null {
    if (candles.length < period * 2) return null;
    
    const recentCandles = candles.slice(-period);
    const priorCandles = candles.slice(-period * 2, -period);
    
    const recentHighs = recentCandles.map(c => c.high);
    const recentLows = recentCandles.map(c => c.low);
    const priorHighs = priorCandles.map(c => c.high);
    const priorLows = priorCandles.map(c => c.low);
    
    const recentMaxHigh = Math.max(...recentHighs);
    const recentMinLow = Math.min(...recentLows);
    const priorMaxHigh = Math.max(...priorHighs);
    const priorMinLow = Math.min(...priorLows);
    
    // Determine price trend
    let priceTrend: 'bullish' | 'bearish' | 'neutral';
    if (recentMaxHigh > priorMaxHigh && recentMinLow > priorMinLow) {
        priceTrend = 'bullish';
    } else if (recentMaxHigh < priorMaxHigh && recentMinLow < priorMinLow) {
        priceTrend = 'bearish';
    } else {
        priceTrend = 'neutral';
    }
    
    // Calculate RSI for both periods
    const recentRSI = calculateRSI(candles.slice(-period), 14);
    const priorRSI = calculateRSI(candles.slice(-period * 2, -period), 14);
    
    if (recentRSI === null || priorRSI === null) return null;
    
    // Determine RSI trend
    let rsiTrend: 'bullish' | 'bearish' | 'neutral';
    if (recentRSI > priorRSI + 5) {
        rsiTrend = 'bullish';
    } else if (recentRSI < priorRSI - 5) {
        rsiTrend = 'bearish';
    } else {
        rsiTrend = 'neutral';
    }
    
    // Determine divergence
    let divergence: 'bullish' | 'bearish' | 'none';
    if (priceTrend === 'bearish' && rsiTrend === 'bullish') {
        divergence = 'bullish'; // Bullish divergence: price making lower lows, RSI making higher lows
    } else if (priceTrend === 'bullish' && rsiTrend === 'bearish') {
        divergence = 'bearish'; // Bearish divergence: price making higher highs, RSI making lower highs
    } else {
        divergence = 'none';
    }
    
    return { priceTrend, rsiTrend, divergence };
}

export function calculateWilliamsR(candles: Candle[], period: number = 14): number | null {
    if (candles.length < period) return null;
    
    const recentCandles = candles.slice(-period);
    const highestHigh = Math.max(...recentCandles.map(c => c.high));
    const lowestLow = Math.min(...recentCandles.map(c => c.low));
    const currentClose = candles[candles.length - 1].close;
    
    if (highestHigh === lowestLow) return -50; // Avoid division by zero
    
    return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
}
