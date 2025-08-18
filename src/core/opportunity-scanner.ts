import fs from 'fs/promises';
import path from 'path';

const opportunitiesLogPath = path.join(process.cwd(), 'opportunities.json');

export interface Opportunity {
    symbol: string;
    priceChangePercent: number;
    timestamp: string;
    status: 'detected' | 'analyzing' | 'bought' | 'ignored';
}

export class OpportunityScanner {
    private static instance: OpportunityScanner;
    private opportunities: Opportunity[] = [];

    private constructor() {
        this.loadOpportunities();
    }

    public static getInstance(): OpportunityScanner {
        if (!OpportunityScanner.instance) {
            OpportunityScanner.instance = new OpportunityScanner();
        }
        return OpportunityScanner.instance;
    }

    private async loadOpportunities(): Promise<void> {
        try {
            const data = await fs.readFile(opportunitiesLogPath, 'utf-8');
            this.opportunities = JSON.parse(data);
        } catch (error) {
            // File might not exist yet, which is fine.
            this.opportunities = [];
        }
    }

    private async saveOpportunities(): Promise<void> {
        await fs.writeFile(opportunitiesLogPath, JSON.stringify(this.opportunities, null, 2));
    }

    public async addOpportunity(opportunity: Omit<Opportunity, 'timestamp' | 'status'>): Promise<void> {
        const newOpportunity: Opportunity = {
            ...opportunity,
            timestamp: new Date().toISOString(),
            status: 'detected',
        };
        this.opportunities.unshift(newOpportunity); // Add to the beginning of the array
        await this.saveOpportunities();
    }

    public getOpportunities(): Opportunity[] {
        return this.opportunities;
    }

    public async updateOpportunityStatus(symbol: string, status: Opportunity['status']): Promise<void> {
        const opportunity = this.opportunities.find(o => o.symbol === symbol);
        if (opportunity) {
            opportunity.status = status;
            await this.saveOpportunities();
        }
    }
}
