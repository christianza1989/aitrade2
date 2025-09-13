// src/core/memory.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Prisma, PrismaClient } from '@prisma/client';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEYS?.split(',')[0] || '');
const prisma = new PrismaClient();

export interface MemoryMetadata {
    symbol: string;
    outcome: 'profit' | 'loss' | 'missed_opportunity' | 'dialogue_summary';
    pnl_percent: number;
    timestamp: string;
    narrative: string;
    source?: 'AI' | 'HUMAN'; // NAUJAS
    context?: Record<string, unknown>; // NAUJAS
}

export class MemoryService {
    private embeddingModel: any;
    private username: string;

    constructor(username: string) {
        this.embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
        if (!username) {
            throw new Error("Username must be provided to MemoryService.");
        }
        this.username = username;
    }

    private async createEmbedding(text: string): Promise<number[]> {
        try {
            const result = await this.embeddingModel.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            console.error("[GeminiEmbedding] Failed to create embedding:", error);
            return Array(768).fill(0); // Return a zero-vector on failure
        }
    }

    public async addMemory(metadata: MemoryMetadata): Promise<string | null> {
        try {
            const embedding = await this.createEmbedding(metadata.narrative);
            const embeddingString = `[${embedding.join(',')}]`;

            // --- MODIFIKUOTA DALIS ---
            const source = metadata.source || 'AI';
            const context = metadata.context ? JSON.stringify(metadata.context) : null;

            const result = await prisma.$queryRaw<{ id: string }[]>`
                INSERT INTO "TradeMemory" (id, "timestamp", symbol, outcome, pnl_percent, narrative, embedding, "userId", source, context)
                VALUES (gen_random_uuid(), ${new Date().toISOString()}::timestamp, ${metadata.symbol}, ${metadata.outcome}, ${metadata.pnl_percent}, ${metadata.narrative}, ${embeddingString}::vector, ${this.username}, ${source}::"Source", ${context}::jsonb)
                RETURNING id
            `;
            // --- PABAIGA ---

            const insertedId = result[0]?.id || null;
            console.log(`[MemoryService] Added new ${source} memory for ${metadata.symbol} for user ${this.username}. ID: ${insertedId}`);
            return insertedId;
        } catch (error) {
            console.error(`[MemoryService] Error adding memory for user ${this.username}:`, error);
            return null;
        }
    }

    // --- MODIFIKUOTAS METODAS ---
    public async recallMemories(situation: string, count: number = 3, source?: 'AI' | 'HUMAN'): Promise<any[]> { // Pakeistas grąžinamas tipas į any[]
        try {
            const queryEmbedding = await this.createEmbedding(situation);
            if (!queryEmbedding || queryEmbedding.every(v => v === 0)) {
                return [];
            }
            const embeddingString = `[${queryEmbedding.join(',')}]`;

            const whereClauses = [Prisma.sql`"userId" = ${this.username}`];
            if (source) {
                whereClauses.push(Prisma.sql`source = ${source}::"Source"`);
            }

            const similarMemories: Array<Record<string, unknown>> = await prisma.$queryRaw`
                SELECT
                    id,
                    "timestamp",
                    symbol,
                    outcome,
                    pnl_percent,
                    narrative,
                    context, -- Pridedame context lauką
                    1 - (embedding <=> ${embeddingString}::vector) as similarity
                FROM "TradeMemory"
                WHERE ${Prisma.join(whereClauses, ' AND ')}
                ORDER BY similarity DESC
                LIMIT ${count}
            `;

            return similarMemories.map(mem => ({
                ...mem,
                timestamp: (mem.timestamp as Date).toISOString(),
            }));
        } catch (error) {
            console.error(`[MemoryService] Error recalling memories for user ${this.username}:`, error);
            return [];
        }
    }
}
