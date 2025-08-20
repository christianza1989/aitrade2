// src/core/portfolio.ts

import fs from 'fs/promises';
import path from 'path';
import { setTimeout } from 'timers/promises';
import { Trade } from './optimizer';
import { MemoryService } from './memory';
import { ISharedContext } from './context';

// This function now generates filenames based on the mode (main or shadow)
const getSuffixedPath = (baseName: string, username: string, mode: 'main' | 'shadow') => {
    const suffix = mode === 'shadow' ? `_shadow_${username}.json` : `_${username}.json`;
    return path.join(process.cwd(), baseName.replace('.json', suffix));
};

interface Position {
    symbol: string;
    amount: number;
    entryPrice: number;
    highPrice?: number;
    takeProfitPercent?: number;
    holdCount?: number;
    stopLossPrice?: number;
    highPnlPercent?: number;
}

interface Portfolio {
    balance: number;
    positions: Position[];
}

export class PortfolioService {
    private username: string;
    private mode: 'main' | 'shadow';
    private memoryService: MemoryService;

    constructor(username: string, mode: 'main' | 'shadow' = 'main') {
        if (!username) {
            throw new Error("Username must be provided to PortfolioService.");
        }
        this.username = username;
        this.mode = mode;
        // Memory service is only used for the main portfolio to avoid learning from untested strategies
        if (this.mode === 'main') {
            this.memoryService = MemoryService.getInstance();
        }
    }

    private getFilePaths() {
        return {
            portfolioFilePath: getSuffixedPath('portfolio.json', this.username, this.mode),
            lockFilePath: getSuffixedPath('portfolio.lock', this.username, this.mode),
            tradesLogFilePath: getSuffixedPath('trades_log.json', this.username, this.mode),
        };
    }

    private async withPortfolio(worker: (portfolio: Portfolio) => Promise<void> | void): Promise<void> {
        const { lockFilePath, portfolioFilePath } = this.getFilePaths();
        const lockAcquired = await this.acquireLock(lockFilePath);
        if (!lockAcquired) {
            throw new Error(`Failed to acquire ${this.mode} portfolio lock after multiple retries.`);
        }

        let portfolio: Portfolio;
        try {
            try {
                const data = await fs.readFile(portfolioFilePath, 'utf-8');
                portfolio = JSON.parse(data);
            } catch (error) {
                portfolio = { balance: 100000, positions: [] };
            }

            await worker(portfolio);
            await fs.writeFile(portfolioFilePath, JSON.stringify(portfolio, null, 2));
        } finally {
            await this.releaseLock(lockFilePath);
        }
    }
    
    private async acquireLock(lockFilePath: string, retries = 20, delay = 200): Promise<boolean> {
        for (let i = 0; i < retries; i++) {
            try {
                await fs.writeFile(lockFilePath, process.pid.toString(), { flag: 'wx' });
                return true;
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
                    await setTimeout(delay);
                } else {
                    throw error;
                }
            }
        }
        return false;
    }
    
    private async releaseLock(lockFilePath: string): Promise<void> {
        try {
            await fs.unlink(lockFilePath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                console.error(`Failed to release ${this.mode} portfolio lock for ${this.username}:`, error);
            }
        }
    }

    async getPortfolio(): Promise<Portfolio> {
        const { portfolioFilePath } = this.getFilePaths();
        try {
            const data = await fs.readFile(portfolioFilePath, 'utf-8');
            return JSON.parse(data);
        } catch {
            return { balance: 100000, positions: [] };
        }
    }

    async buy(symbol: string, amount: number, price: number): Promise<void> {
        await this.withPortfolio(async (portfolio) => {
            const cost = amount * price;
            const fee = cost * 0.001;
            if (portfolio.balance < cost + fee) {
                throw new Error('Insufficient balance for cost + fee');
            }
            portfolio.balance -= (cost + fee);

            const newPosition: Position = { symbol, amount, entryPrice: price, highPrice: price };
            
            const existingPosition = portfolio.positions.find(p => p.symbol === symbol);
            if (existingPosition) {
                const totalAmount = existingPosition.amount + amount;
                const newEntryPrice = ((existingPosition.entryPrice * existingPosition.amount) + (price * amount)) / totalAmount;
                existingPosition.entryPrice = newEntryPrice;
                existingPosition.amount = totalAmount;
            } else {
                portfolio.positions.push(newPosition);
            }
        });
    }

    async updatePosition(symbol: string, updates: Partial<Position>): Promise<void> {
        await this.withPortfolio((portfolio) => {
            const position = portfolio.positions.find(p => p.symbol === symbol);
            if (position) {
                Object.assign(position, updates);
            }
        });
    }

    async sell(symbol: string, amount: number, price: number, reason: string, context: ISharedContext): Promise<void> {
        await this.withPortfolio(async (portfolio) => {
            const positionIndex = portfolio.positions.findIndex(p => p.symbol === symbol);
            if (positionIndex === -1) {
                throw new Error('Position not found to sell.');
            }
            const position = portfolio.positions[positionIndex];
            if (position.amount < amount) {
                throw new Error('Insufficient position amount to sell.');
            }

            const revenue = amount * price;
            const fee = revenue * 0.001;
            const pnl = (price - position.entryPrice) * amount - fee;
            const pnlPercent = (pnl / (position.entryPrice * amount)) * 100;
            portfolio.balance += (revenue - fee);

            const tradeLog: Trade = {
                symbol, amount, entryPrice: position.entryPrice, exitPrice: price, pnl,
                timestamp: new Date().toISOString(), reason
            };
            const { tradesLogFilePath } = this.getFilePaths();
            const tradeLogs = await this.getTradeLogs();
            tradeLogs.push(tradeLog);
            await fs.writeFile(tradesLogFilePath, JSON.stringify(tradeLogs, null, 2));

            if (this.mode === 'main' && this.memoryService) {
                const outcome = pnl >= 0 ? 'profit' : 'loss';
                const narrative = `Sold ${amount.toFixed(4)} ${symbol} with a ${pnlPercent.toFixed(2)}% ${outcome}. ` +
                                  `The sale was triggered by: ${reason}. ` +
                                  `Market conditions at the time were: Regime=${context.marketRegime} (Score: ${context.regimeScore.toFixed(1)}), ` +
                                  `Sentiment=${context.sentiment} (Score: ${context.sentimentScore.toFixed(2)}).`;

                await this.memoryService.addMemory({
                    symbol,
                    outcome,
                    pnl_percent: pnlPercent,
                    timestamp: new Date().toISOString(),
                    narrative
                });
            }

            portfolio.positions.splice(positionIndex, 1);
        });
    }

    async getTradeLogs(): Promise<Trade[]> {
        const { tradesLogFilePath } = this.getFilePaths();
        try {
            const data = await fs.readFile(tradesLogFilePath, 'utf-8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }
}