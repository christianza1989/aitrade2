// src/core/opportunity-scanner.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface Opportunity {
    id: string;
    symbol: string;
    priceChangePercent: number;
    timestamp: Date;
    status: 'detected' | 'analyzing' | 'bought' | 'ignored' | 'sold' | 'held';
}

export class OpportunityScanner {
    private static instance: OpportunityScanner;

    // Konstruktorius dabar tuščias
    private constructor() {}

    public static getInstance(): OpportunityScanner {
        if (!OpportunityScanner.instance) {
            OpportunityScanner.instance = new OpportunityScanner();
        }
        return OpportunityScanner.instance;
    }

    public async addOpportunity(opportunity: Omit<Opportunity, 'id' | 'timestamp' | 'status'>): Promise<void> {
        try {
            await prisma.opportunity.create({
                data: {
                    symbol: opportunity.symbol,
                    priceChangePercent: opportunity.priceChangePercent,
                    status: 'detected',
                },
            });
        } catch (error) {
            console.error("[OpportunityScanner] Failed to add opportunity to DB:", error);
        }
    }

    public async getOpportunities(): Promise<Opportunity[]> {
        try {
            const opportunities = await prisma.opportunity.findMany({
                orderBy: {
                    timestamp: 'desc',
                },
                take: 20, // Apribojame įrašų skaičių
            });
            return opportunities as Opportunity[];
        } catch (error) {
            console.error("[OpportunityScanner] Failed to get opportunities from DB:", error);
            return [];
        }
    }

    public async updateOpportunityStatus(symbol: string, status: Opportunity['status']): Promise<void> {
        try {
            // Atnaujiname naujausią įrašą su šiuo simboliu
            const latestOpportunity = await prisma.opportunity.findFirst({
                where: { symbol },
                orderBy: { timestamp: 'desc' },
            });

            if (latestOpportunity) {
                await prisma.opportunity.update({
                    where: { id: latestOpportunity.id },
                    data: { status },
                });
            }
        } catch (error) {
            console.error(`[OpportunityScanner] Failed to update status for ${symbol} in DB:`, error);
        }
    }
}
