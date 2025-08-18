import fs from 'fs/promises';
import path from 'path';
import { setTimeout } from 'timers/promises';
import { Trade } from './optimizer';

const portfolioFilePath = path.join(process.cwd(), 'portfolio.json');
const lockFilePath = path.join(process.cwd(), 'portfolio.lock');
const tradesLogFilePath = path.join(process.cwd(), 'trades_log.json');
const buyLogFilePath = path.join(process.cwd(), 'buy_log.json');

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
    private async withPortfolio(worker: (portfolio: Portfolio) => Promise<void> | void): Promise<void> {
        console.log('[PortfolioService] Attempting to acquire lock...');
        const lockAcquired = await this.acquireLock();
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
                console.log('[PortfolioService] Read portfolio:', JSON.stringify(portfolio));
            } catch (error) {
                if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
                    console.log('Portfolio file not found. Creating a new one.');
                    portfolio = { balance: 100000, positions: [] };
                } else {
                    console.error("Failed to read or parse portfolio.json:", error);
                    throw new Error("Portfolio file is corrupted or unreadable.");
                }
            }

            await worker(portfolio);

            console.log('[PortfolioService] Portfolio after worker:', JSON.stringify(portfolio));
            await fs.writeFile(portfolioFilePath, JSON.stringify(portfolio, null, 2));
            console.log('[PortfolioService] Successfully wrote to portfolio.json.');
        } finally {
            await this.releaseLock();
            console.log('[PortfolioService] Lock released.');
        }
    }

    private async acquireLock(retries = 10, delay = 100): Promise<boolean> {
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

    private async releaseLock(): Promise<void> {
        try {
            await fs.unlink(lockFilePath);
        } catch (error) {
            if (error instanceof Error && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
                console.error('Failed to release portfolio lock:', error);
            }
        }
    }

    async getPortfolio(): Promise<Portfolio> {
        // This is now a safe, read-only operation for display purposes.
        // It doesn't use the lock to prevent blocking the UI, but it might be slightly stale.
        // All mutation operations MUST use withPortfolio.
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
        // This is a non-critical log, so it doesn't need the portfolio lock.
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

            const tradeLogs = await this.getTradeLogs();
            tradeLogs.push(tradeLog);
            await fs.writeFile(tradesLogFilePath, JSON.stringify(tradeLogs, null, 2));

            portfolio.positions.splice(positionIndex, 1);
        });
    }

    async getTradeLogs(): Promise<Trade[]> {
        try {
            const data = await fs.readFile(tradesLogFilePath, 'utf-8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    async getBuyLogs(): Promise<BuyLog[]> {
        try {
            const data = await fs.readFile(buyLogFilePath, 'utf-8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }
}
