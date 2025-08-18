import fs from 'fs/promises';
import path from 'path';
import { setTimeout } from 'timers/promises';
import { Trade } from './optimizer';

// DYNAMIC FILE PATHS BASED ON USERNAME
const getPortfolioFilePath = (username: string) => path.join(process.cwd(), `portfolio_${username}.json`);
const getLockFilePath = (username: string) => path.join(process.cwd(), `portfolio_${username}.lock`);
const getTradesLogFilePath = (username: string) => path.join(process.cwd(), `trades_log_${username}.json`);
const getBuyLogFilePath = (username: string) => path.join(process.cwd(), `buy_log_${username}.json`);

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

interface BuyLog extends Position {
    timestamp: string;
}

export class PortfolioService {
    private username: string;

    constructor(username: string) {
        if (!username) {
            throw new Error("Username must be provided to PortfolioService.");
        }
        this.username = username;
    }

    private getFilePaths() {
        return {
            portfolioFilePath: getPortfolioFilePath(this.username),
            lockFilePath: getLockFilePath(this.username),
            tradesLogFilePath: getTradesLogFilePath(this.username),
            buyLogFilePath: getBuyLogFilePath(this.username),
        };
    }

    private async withPortfolio(worker: (portfolio: Portfolio) => Promise<void> | void): Promise<void> {
        const { lockFilePath, portfolioFilePath } = this.getFilePaths();
        console.log(`[PortfolioService] Attempting to acquire lock for ${this.username}...`);
        const lockAcquired = await this.acquireLock(lockFilePath);
        if (!lockAcquired) {
            console.error('[PortfolioService] Failed to acquire portfolio lock.');
            throw new Error('Failed to acquire portfolio lock after multiple retries.');
        }
        console.log('[PortfolioService] Lock acquired.');

        let portfolio: Portfolio;
        try {
            try {
                const data = await fs.readFile(portfolioFilePath, 'utf-8');
                portfolio = JSON.parse(data);
                console.log(`[PortfolioService] Read portfolio for ${this.username}:`, JSON.stringify(portfolio));
            } catch (error) {
                if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
                    console.log(`Portfolio file for ${this.username} not found. Creating a new one.`);
                    portfolio = { balance: 100000, positions: [] };
                } else {
                    console.error("Failed to read or parse portfolio.json:", error);
                    throw new Error("Portfolio file is corrupted or unreadable.");
                }
            }

            await worker(portfolio);

            console.log(`[PortfolioService] Portfolio for ${this.username} after worker:`, JSON.stringify(portfolio));
            await fs.writeFile(portfolioFilePath, JSON.stringify(portfolio, null, 2));
            console.log(`[PortfolioService] Successfully wrote to portfolio for ${this.username}.`);
        } finally {
            await this.releaseLock(lockFilePath);
            console.log(`[PortfolioService] Lock for ${this.username} released.`);
        }
    }

    private async acquireLock(lockFilePath: string, retries = 10, delay = 100): Promise<boolean> {
        for (let i = 0; i < retries; i++) {
            try {
                await fs.writeFile(lockFilePath, process.pid.toString(), { flag: 'wx' });
                return true;
            } catch (error) {
                if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'EEXIST') {
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
            if (error instanceof Error && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
                console.error(`Failed to release portfolio lock for ${this.username}:`, error);
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
            const fee = cost * 0.001; // 0.1% fee
            if (portfolio.balance < cost + fee) {
                throw new Error('Insufficient balance for cost + fee');
            }
            portfolio.balance -= (cost + fee);

            const logEntry = { symbol, amount, entryPrice: price };

            const existingPosition = portfolio.positions.find(p => p.symbol === symbol);
            if (existingPosition) {
                const totalAmount = existingPosition.amount + amount;
                const newEntryPrice = ((existingPosition.entryPrice * existingPosition.amount) + (price * amount)) / totalAmount;
                existingPosition.entryPrice = newEntryPrice;
                existingPosition.amount = totalAmount;
            } else {
                portfolio.positions.push(logEntry);
            }
            
            await this.logBuy(logEntry);
        });
    }

    async logBuy(position: Position): Promise<void> {
        const { buyLogFilePath } = this.getFilePaths();
        const buyLogs = await this.getBuyLogs();
        const logEntry = {
            timestamp: new Date().toISOString(),
            ...position
        };
        buyLogs.push(logEntry);
        await fs.writeFile(buyLogFilePath, JSON.stringify(buyLogs, null, 2));
    }

    async updatePosition(symbol: string, updates: Partial<Position>): Promise<void> {
        await this.withPortfolio((portfolio) => {
            const position = portfolio.positions.find(p => p.symbol === symbol);
            if (position) {
                Object.assign(position, updates);
            } else {
                // We no longer throw an error, just log it.
                // This prevents crashes if the frontend has a stale view of the portfolio.
                console.warn(`Position with symbol ${symbol} not found for update. It might have been sold.`);
            }
        });
    }

    async sell(symbol: string, amount: number, price: number, fullAnalysis: Record<string, unknown>): Promise<void> {
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
            const fee = revenue * 0.001; // 0.1% fee
            const pnl = (price - position.entryPrice) * amount - fee;
            portfolio.balance += (revenue - fee);

            const tradeLog: Trade = {
                symbol,
                amount,
                entryPrice: position.entryPrice,
                exitPrice: price,
                pnl,
                timestamp: new Date().toISOString(),
                reason: (fullAnalysis.reason as string) || 'Unknown',
            };

            const { tradesLogFilePath } = this.getFilePaths();
            const tradeLogs = await this.getTradeLogs();
            tradeLogs.push(tradeLog);
            await fs.writeFile(tradesLogFilePath, JSON.stringify(tradeLogs, null, 2));

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

    async getBuyLogs(): Promise<BuyLog[]> {
        const { buyLogFilePath } = this.getFilePaths();
        try {
            const data = await fs.readFile(buyLogFilePath, 'utf-8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }
}
