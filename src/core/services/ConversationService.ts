// src/core/services/ConversationService.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const HISTORY_LENGTH = 10; // Išsaugosime 5 poras (vartotojas + AI)
const HISTORY_TTL_SECONDS = 60 * 30; // 30 minučių

export type ChatMessage = {
    sender: 'user' | 'ai';
    message: string;
};

export class ConversationService {
    public async getHistory(conversationId: string): Promise<ChatMessage[]> {
        const key = `chat-history:${conversationId}`;
        const historyJson = await redis.lrange(key, 0, HISTORY_LENGTH - 1);
        return historyJson.map(item => JSON.parse(item) as ChatMessage).reverse(); // Reikia apversti, nes lrange gauna nuo naujausio
    }

    public async addToHistory(conversationId: string, message: ChatMessage): Promise<void> {
        const key = `chat-history:${conversationId}`;
        await redis.lpush(key, JSON.stringify(message));
        await redis.ltrim(key, 0, HISTORY_LENGTH - 1);
        await redis.expire(key, HISTORY_TTL_SECONDS);
    }
}
