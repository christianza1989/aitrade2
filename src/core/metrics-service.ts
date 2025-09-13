// src/core/metrics-service.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AgentMetrics {
    agentName: string;
    successCount: number;
    errorCount: number;
    totalResponseTime: number; // Changed from bigint to number to match Prisma schema
    lastActivity: Date;
}

class AgentMetricsService {
    private static instance: AgentMetricsService;
    
    // Konstruktorius dabar tuščias, nes nebeskaitome iš failo
    private constructor() {}

    public static getInstance(): AgentMetricsService {
        if (!AgentMetricsService.instance) {
            AgentMetricsService.instance = new AgentMetricsService();
        }
        return AgentMetricsService.instance;
    }

    private async ensureAgent(agentName: string): Promise<void> {
        const existing = await prisma.agentMetric.findUnique({
            where: { agentName },
        });
        if (!existing) {
            await prisma.agentMetric.create({
                data: { agentName },
            });
        }
    }

    public async recordSuccess(agentName: string, responseTime: number): Promise<void> {
        await prisma.agentMetric.upsert({
            where: { agentName },
            update: {
                successCount: { increment: 1 },
                totalResponseTime: { increment: responseTime },
                lastActivity: new Date(),
            },
            create: {
                agentName,
                successCount: 1,
                totalResponseTime: responseTime,
            },
        });
    }

    public async recordError(agentName: string): Promise<void> {
        await prisma.agentMetric.upsert({
            where: { agentName },
            update: {
                errorCount: { increment: 1 },
                lastActivity: new Date(),
            },
            create: {
                agentName,
                errorCount: 1,
            },
        });
    }

    public async getMetrics(): Promise<Record<string, AgentMetrics>> {
        const metricsList = await prisma.agentMetric.findMany();
        const metricsMap: Record<string, AgentMetrics> = {};
        for (const metric of metricsList) {
            metricsMap[metric.agentName] = {
                ...metric,
                totalResponseTime: Number(metric.totalResponseTime), // Convert bigint to number
            };
        }
        return metricsMap;
    }
}

export const agentMetricsService = AgentMetricsService.getInstance();
