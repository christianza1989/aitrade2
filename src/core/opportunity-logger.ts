// src/core/opportunity-logger.ts
import fs from 'fs/promises';
import path from 'path';

const missedOpportunitiesPath = path.join(process.cwd(), 'missed_opportunities.json');

export interface MissedOpportunity {
    timestamp: string;
    symbol: string;
    reason: string; // e.g., "AVOID decision by RiskManager"
    confidenceScore?: number;
    finalSummary?: string;
}

export class OpportunityLogger {
    public async getLogs(): Promise<MissedOpportunity[]> {
        try {
            const data = await fs.readFile(missedOpportunitiesPath, 'utf-8');
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
            await fs.writeFile(missedOpportunitiesPath, JSON.stringify(trimmedLogs, null, 2));
        } catch (error) {
            console.error("Failed to log missed opportunity:", error);
        }
    }
}
