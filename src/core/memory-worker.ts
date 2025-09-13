import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { AgentService } from './agent-service';
import { InsightAnalyst } from './agents';
import { MemoryService } from './memory';
import { Redis } from 'ioredis';
import { z } from 'zod';

const supportingDataSchema = z.object({
    chart_type: z.enum(["bar", "pie", "line"]),
    chart_data: z.object({
        labels: z.array(z.string()),
        datasets: z.array(z.object({
            label: z.string(),
            data: z.array(z.number()),
        })),
    }),
    analyzed_memory_ids: z.array(z.string().uuid()),
});

const prisma = new PrismaClient();
const agentService = new AgentService();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const MIN_MEMORY_THRESHOLD = 20;
const INSIGHT_COOLDOWN_SECONDS = 24 * 60 * 60; // 24 valandos

export default async function (job: Job) {
    const { username } = job.data;
    console.log(`[MemoryWorker] Starting memory analysis for user: ${username}`);

    const cooldownKey = `insight-cooldown:${username}`;
    if (await redis.get(cooldownKey)) {
        console.log(`[MemoryWorker] Insight for user ${username} is on cooldown. Skipping.`);
        return;
    }

    const memoryService = new MemoryService(username);
    const allMemories = await memoryService.recallMemories("all user history", 100); // Gauname iki 100 įrašų

    if (allMemories.length < MIN_MEMORY_THRESHOLD) {
        console.log(`[MemoryWorker] Not enough memories (${allMemories.length}) for user ${username}. Skipping.`);
        return;
    }

    // ČIA ATEITYJE BUS PRIDĖTA GREITA KIEKYBINĖ SQL ANALIZĖ
    // Kol kas, jei praėjo slenkstį, visada kviečiame AI analizę.

    const insightAgent = new InsightAnalyst(agentService);
    const previouslySharedInsights = (await memoryService.recallMemories("previously shared insights", 10, 'AI')).map(m => m.narrative);

    const result = await insightAgent.analyze(allMemories, previouslySharedInsights);

    if (result?.response?.insight_found) {
        const insight = result.response;
        console.log(`[MemoryWorker] Found new insight for ${username}: ${insight.title}`);

        // Griežta validacija
        const validation = supportingDataSchema.safeParse(insight.supporting_data);
        const validSupportingData = validation.success ? insight.supporting_data : null;

        // Įrašome įžvalgą į atmintį, kad išvengtume pasikartojimų
        const memoryRecord = await memoryService.addMemory({
            symbol: 'SYSTEM',
            outcome: 'dialogue_summary',
            pnl_percent: 0,
            timestamp: new Date().toISOString(),
            narrative: insight.title as string,
            source: 'AI',
            context: {
                summary: insight.summary_for_user,
                suggestion: insight.suggestion,
                supporting_data: validSupportingData, // Išsaugome validuotus duomenis arba null
                suggested_tool_chain: insight.suggested_tool_chain
            }
        });

        // Siunčiame proaktyvų pranešimą per Redis Pub/Sub
        const channel = `user-notifications:${username}`;
        const payload = JSON.stringify({
            type: 'proactive_insight',
            message: insight.summary_for_user,
            data: {
                ...insight,
                insightId: memoryRecord // Perduodame ID
            }
        });
        await redis.publish(channel, payload);

        await redis.set(cooldownKey, 'true', 'EX', INSIGHT_COOLDOWN_SECONDS);
    } else {
         console.log(`[MemoryWorker] No new insights found for ${username}.`);
    }
};
