// src/core/memory.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChromaClient, Collection, IEmbeddingFunction } from 'chromadb';

const client = new ChromaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEYS?.split(',')[0] || '');

// Interface for the data we want to store along with the vector
export interface MemoryMetadata {
    symbol: string;
    outcome: 'profit' | 'loss' | 'missed_opportunity';
    pnl_percent: number;
    timestamp: string;
    narrative: string; // The textual summary of the event
}

// Custom embedding function wrapper for ChromaDB that uses Gemini
class GeminiEmbeddingFunction implements IEmbeddingFunction {
    private model: any;

    constructor() {
        this.model = genAI.getGenerativeModel({ model: "embedding-001" });
    }

    public async generate(texts: string[]): Promise<number[][]> {
        const result = await this.model.batchEmbedContents({
            requests: texts.map(text => ({ model: "models/embedding-001", content: { parts: [{ text }] } }))
        });
        return result.embeddings.map(e => e.values);
    }
}

export class MemoryService {
    private static instance: MemoryService;
    private collection: Collection | null = null;
    private embeddingFunction: GeminiEmbeddingFunction;

    private constructor() {
        this.embeddingFunction = new GeminiEmbeddingFunction();
        this.initialize();
    }

    public static getInstance(): MemoryService {
        if (!MemoryService.instance) {
            MemoryService.instance = new MemoryService();
        }
        return MemoryService.instance;
    }

    private async initialize(): Promise<void> {
        try {
            // THE FIX IS HERE: We explicitly provide our custom Gemini embedding function.
            // This tells ChromaDB not to look for its default, missing one.
            this.collection = await client.getOrCreateCollection({ 
                name: "trade_memories",
                embeddingFunction: this.embeddingFunction
            });
            console.log("[MemoryService] ChromaDB collection 'trade_memories' loaded/created successfully.");
        } catch (error) {
            console.error("[MemoryService] Failed to initialize ChromaDB collection:", error);
        }
    }
    
    // This method is no longer needed as the collection handles embedding automatically
    // private async createEmbedding(text: string): Promise<number[]> { ... }

    public async addMemory(metadata: MemoryMetadata): Promise<void> {
        if (!this.collection) {
            console.error("[MemoryService] Collection not initialized. Cannot add memory.");
            return;
        }

        try {
            const id = `${metadata.symbol}_${metadata.timestamp}`;

            // Now we provide the text directly, and the collection uses the function we provided.
            await this.collection.add({
                ids: [id],
                metadatas: [metadata],
                documents: [metadata.narrative] // Provide the text to be embedded
            });

            console.log(`[MemoryService] Added new memory: ${id}`);
        } catch (error) {
            console.error("[MemoryService] Error adding memory to ChromaDB:", error);
        }
    }

    public async recallMemories(situation: string, count: number = 3): Promise<MemoryMetadata[]> {
        if (!this.collection || (await this.collection.count()) === 0) {
            return [];
        }

        try {
            // We now query by text, and the collection handles the embedding for the query.
            const results = await this.collection.query({
                queryTexts: [situation],
                nResults: count,
            });

            return (results.metadatas[0] as MemoryMetadata[]) || [];
        } catch (error) {
            console.error("[MemoryService] Error recalling memories from ChromaDB:", error);
            return [];
        }
    }
}