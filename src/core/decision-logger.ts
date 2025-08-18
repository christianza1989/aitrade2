import fs from 'fs/promises';
import path from 'path';

const getDecisionLogPath = (username: string) => path.join(process.cwd(), `decision_log_${username}.json`);

export interface DecisionLogEntry {
    symbol: string;
    decision: 'SELL_NOW' | 'HOLD_AND_INCREASE_TP';
    pnlPercent: number;
    currentPrice: number;
    newTakeProfitPercent?: number;
    justification: string;
    timestamp: string;
}

export class DecisionLogger {
    private username: string;

    constructor(username: string) {
        if (!username) {
            throw new Error("Username must be provided to DecisionLogger.");
        }
        this.username = username;
    }

    private getFilePath(): string {
        return getDecisionLogPath(this.username);
    }

    public async log(entry: Omit<DecisionLogEntry, 'timestamp'>): Promise<void> {
        const logFilePath = this.getFilePath();
        let logs: DecisionLogEntry[] = [];
        try {
            const data = await fs.readFile(logFilePath, 'utf-8');
            logs = JSON.parse(data);
        } catch (error) {
            // File might not exist yet, which is fine.
        }

        const newLog: DecisionLogEntry = {
            ...entry,
            timestamp: new Date().toISOString(),
        };

        logs.unshift(newLog); // Add to the beginning
        await fs.writeFile(logFilePath, JSON.stringify(logs, null, 2));
    }

    public async getLogs(): Promise<DecisionLogEntry[]> {
        try {
            const data = await fs.readFile(this.getFilePath(), 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }
}
