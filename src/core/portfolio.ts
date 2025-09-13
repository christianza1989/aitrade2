// src/core/portfolio.ts

import { PrismaClient, Prisma } from '@prisma/client';
import { Trade } from './optimizer';
import { MemoryService, MemoryMetadata } from './memory';
import { ISharedContext } from './context';
import { notificationService } from './services/NotificationService';
import { IExecutionService, TradeParams, TradeResult } from './services/ExecutionService';

const prisma = new PrismaClient();

interface AppliedRiskParameters {
    capitalPerTradePercent: number;
    stopLossPercentage: number;
    takeProfitPercentage: number;
    [key: string]: Prisma.JsonValue; // Allow for additional properties, making it compatible with Prisma's Json type
}

// --- NAUJA SĄSAJA ---
interface FeedbackPayload {
    narrative: string;
    context: Record<string, unknown>;
}

interface IStrategyConfig {
    global_settings: {
        username: string;
        bot_version: string;
        trading_mode: 'live' | 'paper';
        base_currency: string;
        enable_auto_improvement: boolean;
        log_level: string;
    };
}

export interface Position {
    symbol: string;
    amount: number;
    entryPrice: number;
    highPrice?: number;
    takeProfitPercent?: number;
    holdCount?: number;         // <--- NAUJAS
    lastHoldPrice?: number;     // <--- NAUJAS
    stopLossPrice?: number;
    highPnlPercent?: number;
    status?: 'scout' | 'confirmed';
    technicals?: Record<string, unknown>; // Added for PositionManager review
    type?: 'long' | 'short';
    appliedRiskParameters?: AppliedRiskParameters;
    initialDecision?: { summary: string; confidence_score: number; [key: string]: Prisma.JsonValue }; // Allow for additional properties
    decisionContext?: any; // Full decision context for logging
    strategy?: string; // pvz., 'main_ai' arba 'scalper'
}

export interface Portfolio {
    balance: number;
    positions: Position[];
}

export class PortfolioService {
    private username: string;
    private mode: 'MAIN' | 'SHADOW';
    private executionService: IExecutionService;
    private memoryService: MemoryService | null = null;
    private feePercent: number = 0.001;

    constructor(username: string, mode: 'MAIN' | 'SHADOW' = 'MAIN', executionService: IExecutionService) {
        if (!username) {
            throw new Error("Username must be provided to PortfolioService.");
        }
        this.username = username;
        this.mode = mode;
        this.executionService = executionService;
        // Atminties servisą naudojame tik pagrindiniam portfeliui
        if (this.mode === 'MAIN') {
            this.memoryService = new MemoryService(this.username);
        }
    }

    private async getConfig(): Promise<IStrategyConfig> {
        // TODO: Refactor getConfig to use Prisma or another configuration source
        return {
            global_settings: {
                username: 'default',
                bot_version: 'unknown',
                trading_mode: 'paper',
                base_currency: 'USDT',
                enable_auto_improvement: false,
                log_level: 'minimal',
            }
        };
    }

    async getPortfolio(): Promise<Portfolio | null> {
        const portfolio = await prisma.portfolio.findFirst({
            where: { userId: this.username, type: this.mode },
            include: { positions: true },
        });

        if (!portfolio) {
            // Jei MAIN portfelio nėra (neturėtų taip būti), sukuriame.
            // Jei SHADOW nėra, tiesiog grąžiname null.
            if (this.mode === 'MAIN') {
                const newPortfolio = await prisma.portfolio.create({
                    data: {
                        userId: this.username,
                        balance: 100000,
                        type: 'MAIN'
                    },
                });
                return { balance: newPortfolio.balance, positions: [] };
            }
            return null;
        }

        return {
            balance: portfolio.balance,
            positions: (portfolio as any).positions.map((p: any) => {
                let initialDecision;
                try {
                    initialDecision = p.initialDecision ? JSON.parse(JSON.stringify(p.initialDecision)) : undefined;
                } catch (e) {
                    console.error('Failed to parse initialDecision for position:', p.id, e);
                    initialDecision = undefined;
                }
                let appliedRiskParameters;
                try {
                    appliedRiskParameters = p.appliedRiskParameters ? JSON.parse(JSON.stringify(p.appliedRiskParameters)) : undefined;
                } catch (e) {
                    console.error('Failed to parse appliedRiskParameters for position:', p.id, e);
                    appliedRiskParameters = undefined;
                }
                return {
                    ...p,
                    initialDecision,
                    appliedRiskParameters,
                };
            }) as Position[],
        };
    }

    async buy(symbol: string, amount: number, price: number, riskParameters: AppliedRiskParameters, decisionContext: any, status: 'scout' | 'confirmed' = 'confirmed', strategy?: string): Promise<void> {
        // Pridėk šį bloką prieš transakciją
        const tradeParams: TradeParams = { userId: this.username, symbol, amount, price, type: 'BUY' };
        const executionResult = await this.executionService.executeTrade(tradeParams);

        if (!executionResult.success) {
            throw new Error(`Execution failed: ${executionResult.error}`);
        }
        // Toliau eina prisma transakcija...

        await prisma.$transaction(async (tx) => {
            const portfolio = await tx.portfolio.findFirst({
                where: { userId: this.username, type: this.mode },
                select: { id: true, balance: true }
            });

            if (!portfolio) throw new Error(`${this.mode} portfolio not found.`);

            const cost = amount * price;
            const fee = cost * 0.001;
            if (portfolio.balance < cost + fee) {
                throw new Error(`Insufficient balance for buy.`);
            }

            await tx.portfolio.update({
                where: { id: portfolio.id },
                data: { balance: { decrement: cost + fee } },
            });

            const existingPosition = await tx.position.findFirst({
                where: { portfolioId: portfolio.id, symbol: symbol },
            });

            if (existingPosition) {
                const totalAmount = existingPosition.amount + amount;
                const newEntryPrice = ((existingPosition.entryPrice * existingPosition.amount) + (price * amount)) / totalAmount;
                await tx.position.update({
                    where: { id: existingPosition.id },
                    data: {
                        amount: totalAmount,
                        entryPrice: newEntryPrice,
                        status: 'confirmed',
                    },
                });
            } else {
                await tx.position.create({
                    data: {
                        portfolioId: portfolio.id,
                        symbol,
                        amount,
                        entryPrice: price,
                        status,
                        appliedRiskParameters: riskParameters,
                        initialDecision: decisionContext,
                        decisionContext: decisionContext,
                        type: 'long',
                        strategy,
                    },
                });
            }
        });
    }

    public async increasePosition(symbol: string, additionalAmountUSD: number, currentPrice: number): Promise<void> {
        await prisma.$transaction(async (tx) => {
            const portfolio = await tx.portfolio.findFirst({
                where: { userId: this.username, type: this.mode },
            });
            if (!portfolio) throw new Error(`${this.mode} portfolio not found.`);

            const position = await tx.position.findFirst({
                where: { portfolioId: portfolio.id, symbol, status: 'scout' },
            });
            if (!position) throw new Error(`Scout position for ${symbol} not found to increase.`);

            const additionalAmount = additionalAmountUSD / currentPrice;
            const cost = additionalAmount * currentPrice;
            const fee = cost * this.feePercent;

            if (portfolio.balance < cost + fee) {
                throw new Error(`Insufficient balance to increase position for ${symbol}.`);
            }

            const totalAmount = position.amount + additionalAmount;
            const newEntryPrice = ((position.entryPrice * position.amount) + (currentPrice * additionalAmount)) / totalAmount;

            await tx.portfolio.update({
                where: { id: portfolio.id },
                data: { balance: { decrement: cost + fee } },
            });

            await tx.position.update({
                where: { id: position.id },
                data: {
                    amount: totalAmount,
                    entryPrice: newEntryPrice,
                    status: 'confirmed',
                },
            });

            console.log(`[${this.username}] Increased position for ${symbol}. New size: ${totalAmount}.`);
        });
    }

    async openShort(symbol: string, amount: number, price: number, riskParameters: AppliedRiskParameters, decisionContext: any, strategy?: string): Promise<void> {
        // Pridėk šį bloką prieš transakciją
        const tradeParams: TradeParams = { userId: this.username, symbol, amount, price, type: 'OPEN_SHORT' };
        const executionResult = await this.executionService.executeTrade(tradeParams);

        if (!executionResult.success) {
            throw new Error(`Execution failed: ${executionResult.error}`);
        }
        // Toliau eina prisma transakcija...

        await prisma.$transaction(async (tx) => {
            const portfolio = await tx.portfolio.findFirst({ where: { userId: this.username, type: this.mode }, select: { id: true, balance: true } });
            if (!portfolio) throw new Error(`${this.mode} portfolio not found.`);

            const positionValue = amount * price;
            const fee = positionValue * 0.001;

            await tx.portfolio.update({
                where: { id: portfolio.id },
                data: { balance: { decrement: fee } }, // Only fee is deducted from collateral
            });

            await tx.position.create({
                data: {
                    portfolioId: portfolio.id,
                    symbol,
                    amount,
                    entryPrice: price,
                    status: 'confirmed',
                    appliedRiskParameters: riskParameters,
                    initialDecision: decisionContext,
                    decisionContext: decisionContext,
                    type: 'short',
                },
            });
        });
    }

    async closeShort(symbol: string, amount: number, price: number, reason: string, context?: ISharedContext, feedbackPayload?: FeedbackPayload): Promise<void> {
        // Pridėk šį bloką prieš transakciją
        const tradeParams: TradeParams = { userId: this.username, symbol, amount, price, type: 'CLOSE_SHORT' };
        const executionResult = await this.executionService.executeTrade(tradeParams);

        if (!executionResult.success) {
            throw new Error(`Execution failed: ${executionResult.error}`);
        }
        // Toliau eina prisma transakcija...

        await prisma.$transaction(async (tx) => {
            const portfolio = await tx.portfolio.findFirst({ where: { userId: this.username, type: this.mode }, select: { id: true } });
            if (!portfolio) throw new Error(`${this.mode} portfolio not found.`);

            const position = await tx.position.findFirst({
                where: { portfolioId: portfolio.id, symbol: symbol, type: 'short' },
            });
            if (!position) throw new Error('Short position not found to close.');

            const initialValue = position.amount * position.entryPrice;
            const closingCost = amount * price;
            const fee = closingCost * 0.001;
            const pnl = initialValue - closingCost - fee;
            const pnlPercent = (position.entryPrice * amount) === 0 ? 0 : (pnl / (position.entryPrice * amount)) * 100;

            // On close, the collateral (initialValue) is freed, and the closing cost is paid.
            // The net effect on balance is the PnL.
            await tx.portfolio.update({
                where: { id: portfolio.id },
                data: { balance: { increment: pnl } },
            });

            let appliedRiskParameters;
            try {
                appliedRiskParameters = position.appliedRiskParameters ? JSON.parse(JSON.stringify(position.appliedRiskParameters)) : undefined;
            } catch (e) {
                console.error('Failed to parse appliedRiskParameters for short position:', position.id, e);
                appliedRiskParameters = undefined;
            }
            const newTradeLog = await tx.tradeLog.create({
                data: {
                    userId: this.username,
                    symbol,
                    amount,
                    entryPrice: position.entryPrice,
                    exitPrice: price,
                    pnl,
                    reason: `[SHORT] ${reason}`,
                    marketContext: context ? { ...context } : undefined,
                    appliedRiskParameters,
                    decisionContext: position.decisionContext || undefined,
                }
            });

            // --- NAUJAS BLOKAS: Žmogaus pamokos įrašymas ---
            if (feedbackPayload && this.memoryService) {
                const memory: MemoryMetadata = {
                    symbol,
                    outcome: pnl > 0 ? 'profit' : 'loss',
                    pnl_percent: pnlPercent,
                    timestamp: new Date().toISOString(),
                    narrative: feedbackPayload.narrative,
                    context: feedbackPayload.context,
                    source: 'HUMAN'
                };
                await this.memoryService.addMemory(memory);
                console.log(`[PortfolioService] Saved HUMAN lesson for ${symbol}.`);
            }
            // --- BLOKO PABAIGA ---

            // --- NAUJAS BLOKAS: Pranešimų kūrimas ---
            try {
                const priority = pnl > 0 ? 'SUCCESS' : 'WARNING';
                const message = `Short position ${symbol} closed with ${pnl > 0 ? 'profit' : 'loss'} of €${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%).`;
                await notificationService.dispatch({
                    userId: this.username,
                    message,
                    priority,
                    link: `/dashboard/history?tradeId=${newTradeLog.id}`,
                });
            } catch (e) {
                console.error(`[PortfolioService] Failed to create notification for short close event, but trade was successful. User: ${this.username}`);
            }
            // --- BLOKO PABAIGA ---

            await tx.position.delete({ where: { id: position.id } });
        });
    }

    async updatePosition(symbol: string, updates: Partial<Position>): Promise<void> {
        await prisma.$transaction(async (tx) => {
            const portfolio = await tx.portfolio.findFirst({
                where: { userId: this.username, type: this.mode },
                select: { id: true }
            });

            if (!portfolio) {
                console.warn(`[PortfolioService] Attempted to update position for a non-existent ${this.mode} portfolio. User: ${this.username}`);
                return;
            }

            const position = await tx.position.findFirst({
                where: { portfolioId: portfolio.id, symbol: symbol },
            });

            if (position) {
                await tx.position.update({
                    where: { id: position.id },
                    data: updates as Prisma.PositionUpdateInput,
                });
            } else {
                console.warn(`[PortfolioService] Attempted to update a non-existent position for symbol: ${symbol}`);
            }
        });
    }

    async sell(symbol: string, amount: number, price: number, reason: string, context?: ISharedContext, feedbackPayload?: FeedbackPayload): Promise<void> {
        // Pridėk šį bloką prieš transakciją
        const tradeParams: TradeParams = { userId: this.username, symbol, amount, price, type: 'SELL' };
        const executionResult = await this.executionService.executeTrade(tradeParams);

        if (!executionResult.success) {
            throw new Error(`Execution failed: ${executionResult.error}`);
        }
        // Toliau eina prisma transakcija...

        await prisma.$transaction(async (tx) => {
            const portfolio = await tx.portfolio.findFirst({
                where: { userId: this.username, type: this.mode },
                select: { id: true }
            });
            if (!portfolio) throw new Error(`${this.mode} portfolio not found.`);

            const position = await tx.position.findFirst({
                where: { portfolioId: portfolio.id, symbol: symbol, type: 'long' },
            });
            if (!position) throw new Error('Position not found to sell.');
            if (position.amount < amount) throw new Error('Insufficient position amount to sell.');

            const revenue = amount * price;
            const fee = revenue * 0.001;
            const pnl = (price - position.entryPrice) * amount - fee;
            const pnlPercent = (position.entryPrice * amount) === 0 ? 0 : (pnl / (position.entryPrice * amount)) * 100;

            await tx.portfolio.update({
                where: { id: portfolio.id },
                data: { balance: { increment: revenue - fee } },
            });

            let appliedRiskParameters;
            try {
                appliedRiskParameters = position.appliedRiskParameters ? JSON.parse(JSON.stringify(position.appliedRiskParameters)) : undefined;
            } catch (e) {
                console.error('Failed to parse appliedRiskParameters for sell position:', position.id, e);
                appliedRiskParameters = undefined;
            }
            const newTradeLog = await tx.tradeLog.create({
                data: {
                    userId: this.username,
                    symbol,
                    amount,
                    entryPrice: position.entryPrice,
                    exitPrice: price,
                    pnl,
                    reason,
                    marketContext: context ? { ...context } : undefined,
                    appliedRiskParameters,
                    decisionContext: position.decisionContext || undefined,
                }
            });

            // --- NAUJAS BLOKAS: Žmogaus pamokos įrašymas ---
            if (feedbackPayload && this.memoryService) {
                const memory: MemoryMetadata = {
                    symbol,
                    outcome: pnl > 0 ? 'profit' : 'loss',
                    pnl_percent: pnlPercent,
                    timestamp: new Date().toISOString(),
                    narrative: feedbackPayload.narrative,
                    context: feedbackPayload.context,
                    source: 'HUMAN'
                };
                await this.memoryService.addMemory(memory);
                console.log(`[PortfolioService] Saved HUMAN lesson for ${symbol}.`);
            }
            // --- BLOKO PABAIGA ---

            // --- NAUJAS BLOKAS: Pranešimų kūrimas ---
            try {
                const priority = pnl > 0 ? 'SUCCESS' : 'WARNING';
                const message = `Position ${symbol} closed with ${pnl > 0 ? 'profit' : 'loss'} of €${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%).`;
                await notificationService.dispatch({
                    userId: this.username,
                    message,
                    priority,
                    link: `/dashboard/history?tradeId=${newTradeLog.id}`,
                });
            } catch (e) {
                console.error(`[PortfolioService] Failed to create notification for sell event, but trade was successful. User: ${this.username}`);
            }
            // --- BLOKO PABAIGA ---

            if (position.amount - amount < 0.00001) {
                await tx.position.delete({ where: { id: position.id } });
            } else {
                await tx.position.update({
                    where: { id: position.id },
                    data: { amount: { decrement: amount } },
                });
            }
        });
    }

    async getTradeLogs(): Promise<Trade[]> {
        const logs = await prisma.tradeLog.findMany({
            where: { userId: this.username },
            orderBy: { timestamp: 'desc' },
        });

        // Map Prisma Decimal to number and JSON to object
        return logs.map(log => {
            let marketContext;
            try {
                marketContext = log.marketContext ? JSON.parse(JSON.stringify(log.marketContext)) : undefined;
            } catch (e) {
                console.error('Failed to parse marketContext for log:', log.id, e);
                marketContext = undefined;
            }
            let appliedRiskParameters;
            try {
                appliedRiskParameters = log.appliedRiskParameters ? JSON.parse(JSON.stringify(log.appliedRiskParameters)) : undefined;
            } catch (e) {
                console.error('Failed to parse appliedRiskParameters for log:', log.id, e);
                appliedRiskParameters = undefined;
            }
            return {
                ...log,
                pnl: Number(log.pnl),
                entryPrice: Number(log.entryPrice),
                exitPrice: Number(log.exitPrice),
                amount: Number(log.amount),
                marketContext,
                appliedRiskParameters,
                timestamp: log.timestamp.toISOString(),
            };
        });
    }
}
