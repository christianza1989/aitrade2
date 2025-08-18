// src/core/opportunity-logger.ts
import fs from 'fs/promises';
import path from 'path';

const getMissedOpportunitiesPath = (username: string) => path.join(process.cwd(), `missed_opportunities_${username}.json`);

export interface MissedOpportunity {
    timestamp: string;
    symbol: string;
    reason: string; // e.g., "AVOID decision by RiskManager"
    confidenceScore?: number;
    finalSummary?: string;
}

export class OpportunityLogger {
    private username: string;

    constructor(username: string) {
        if (!username) {
            throw new Error("Username must be provided to OpportunityLogger.");
        }
        this.username = username;
    }

    private getFilePath(): string {
        return getMissedOpportunitiesPath(this.username);
    }

    public async getLogs(): Promise<MissedOpportunity[]> {
        try {
            const data = await fs.readFile(this.getFilePath(), 'utf-8');
            return JSON.parse(data);
        } catch {
            // If file doesn't exist or is invalid, start with an empty array
            return [];
        }
    }

    async log(opportunity: Omit<MissedOpportunity, 'timestamp'>): Promise<void> {
        try {
            const logs = await this.getLogs();
            const newLog: MissedOpportunity = {
                timestamp: new Date().toISOString(),
                ...opportunity,
            };
            logs.push(newLog);
            // Keep the log from growing indefinitely
            const trimmedLogs = logs.slice(-500); 
            await fs.writeFile(this.getFilePath(), JSON.stringify(trimmedLogs, null, 2));
        } catch (error) {
            console.error("Failed to log missed opportunity:", error);
        }
    }
}
