import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DecisionLogEntry {
    timestamp: string;
    symbol: string;
    decision: 'BUY' | 'SELL' | 'HOLD' | 'AVOID' | 'INCREASE_POSITION' | 'CLOSE_SCOUT';
    reason: string;
    pnlPercent?: number | null;
    price?: number | null;
    newTakeProfitPercent?: number | null;
    marketContext?: {
        regime: string;
        regimeScore: number;
        sentiment: string;
        sentimentScore: number;
    };
}

export class DecisionLogger {
    private username: string;

    constructor(username: string) {
        if (!username) {
            throw new Error("Username must be provided to DecisionLogger.");
        }
        this.username = username;
    }

    public async log(entry: Omit<DecisionLogEntry, 'timestamp'>): Promise<void> {
        try {
            await prisma.decisionLog.create({
                data: {
                    ...entry,
                    userId: this.username,
                },
            });
        } catch (error) {
            console.error(`[DecisionLogger] Failed to log decision for user ${this.username}:`, error);
        }
    }

    public async getLogs(): Promise<DecisionLogEntry[]> {
        try {
            const logs = await prisma.decisionLog.findMany({
                where: { userId: this.username },
                orderBy: { timestamp: 'desc' },
                take: 200, // Apribojame įrašų skaičių, kad neapkrautume sistemos
            });

            // Užtikriname, kad formatas atitiktų sąsają
            return logs.map(log => ({
                ...log,
                timestamp: log.timestamp.toISOString(),
                decision: log.decision as DecisionLogEntry['decision'], // Explicitly cast to the literal type
                // Konvertuojame JSON laukus, jei reikia
                marketContext: log.marketContext ? JSON.parse(JSON.stringify(log.marketContext)) : undefined,
            }));
        } catch (error) {
            console.error(`[DecisionLogger] Failed to get logs for user ${this.username}:`, error);
            return [];
        }
    }
}
