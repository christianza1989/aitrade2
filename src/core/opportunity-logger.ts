// src/core/opportunity-logger.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export interface MissedOpportunity {
    id: string;
    timestamp: string;
    symbol: string;
    priceChangePercent: number; // Added this field
    reason: string; // e.g., "AVOID decision by RiskManager"
    confidenceScore: number | null;
    finalSummary: string | null;
    userId: string;
}

export class OpportunityLogger {
    private username: string;

    constructor(username: string) {
        if (!username) {
            throw new Error("Username must be provided to OpportunityLogger.");
        }
        this.username = username;
    }

    public async getLogs(): Promise<MissedOpportunity[]> {
        try {
            const logs = await prisma.missedOpportunity.findMany({
                where: { userId: this.username },
                orderBy: { timestamp: 'desc' },
                take: 200,
            });

            return logs.map(log => ({
                ...log,
                timestamp: log.timestamp.toISOString(),
            }));
        } catch (error) {
            console.error(`[OpportunityLogger] Failed to get logs for user ${this.username}:`, error);
            return [];
        }
    }

    async log(opportunity: Omit<MissedOpportunity, 'timestamp'>): Promise<void> {
        try {
            await prisma.missedOpportunity.create({
                data: {
                    ...opportunity,
                    userId: this.username,
                },
            });
        } catch (error)
        {
            console.error(`[OpportunityLogger] Failed to log opportunity for user ${this.username}:`, error);
        }
    }
}
