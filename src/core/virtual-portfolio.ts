// src/core/virtual-portfolio.ts
import { Candle } from './binance';

// Sąsaja, apibrėžianti prekybos įvykį (pirkimą arba pardavimą)
export interface TradeEvent {
    type: 'BUY' | 'SELL';
    symbol: string;
    price: number;
    amount: number;
    timestamp: number;
    reason: 'TP' | 'SL' | 'MANUAL';
    pnl?: number; // Pelnas/nuostolis, aktualus tik parduodant
}

// Sąsaja, apibrėžianti atvirą virtualią poziciją
interface VirtualPosition {
    symbol: string;
    amount: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
}

/**
 * Valdo virtualų portfelį, simuliuoja prekybos mokesčius, praslydimą
 * ir tikrina Stop-Loss/Take-Profit sąlygas kiekvienoje naujoje žvakėje.
 */
export class VirtualPortfolio {
    public balance: number;
    private positions: Map<string, VirtualPosition> = new Map();
    private readonly feePercent = 0.001; // 0.1% Binance mokestis
    private readonly slippagePercent = 0.0005; // 0.05% praslydimas

    constructor(initialBalance: number) {
        this.balance = initialBalance;
    }

    public hasOpenPosition(symbol: string): boolean {
        return this.positions.has(symbol);
    }

    public executeBuy(symbol: string, amountUSD: number, candle: Candle, stopLoss: number, takeProfit: number): TradeEvent {
        const priceWithSlippage = candle.close * (1 + this.slippagePercent);
        const amount = amountUSD / priceWithSlippage;
        const cost = amount * priceWithSlippage;
        const fee = cost * this.feePercent;

        if (this.balance < cost + fee) {
            throw new Error("Insufficient virtual balance for BUY operation.");
        }

        this.balance -= (cost + fee);

        this.positions.set(symbol, {
            symbol,
            amount,
            entryPrice: priceWithSlippage,
            stopLoss,
            takeProfit
        });

        return { type: 'BUY', symbol, price: priceWithSlippage, amount, timestamp: candle.timestamp, reason: 'MANUAL' };
    }

    // Metodas, kviečiamas kiekvienoje iteracijoje su nauja žvake
    public updatePrice(symbol: string, candle: Candle): TradeEvent | null {
        if (!this.hasOpenPosition(symbol)) {
            return null;
        }

        const position = this.positions.get(symbol)!;
        let event: TradeEvent | null = null;

        // Patikriname Stop-Loss
        if (candle.low <= position.stopLoss) {
            event = this.executeSell(symbol, candle.timestamp, position.stopLoss, 'SL');
        }
        // Patikriname Take-Profit
        else if (candle.high >= position.takeProfit) {
            event = this.executeSell(symbol, candle.timestamp, position.takeProfit, 'TP');
        }

        return event;
    }

    private executeSell(symbol: string, timestamp: number, price: number, reason: 'TP' | 'SL'): TradeEvent {
        const position = this.positions.get(symbol)!;
        const priceWithSlippage = price * (1 - this.slippagePercent);
        const revenue = position.amount * priceWithSlippage;
        const fee = revenue * this.feePercent;

        this.balance += (revenue - fee);

        const pnl = (priceWithSlippage - position.entryPrice) * position.amount - fee * 2; // Įskaičiuojam ir pirkimo mokestį

        const sellEvent: TradeEvent = {
            type: 'SELL',
            symbol,
            price: priceWithSlippage,
            amount: position.amount,
            timestamp,
            reason,
            pnl
        };

        this.positions.delete(symbol);
        return sellEvent;
    }

    public getPortfolioValue(currentPrice: number, symbol: string): number {
        let value = this.balance;
        if(this.hasOpenPosition(symbol)) {
            const position = this.positions.get(symbol)!;
            value += position.amount * currentPrice;
        }
        return value;
    }
}
