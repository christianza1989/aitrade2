import { NextResponse } from 'next/server';
import { Redis } from 'ioredis';
import { AgentService } from '../../../../core/agent-service';
import { AIAgent } from '../../../../core/agents';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const agentService = new AgentService();

class HelpAgent extends AIAgent {
    constructor() {
        super('HelpAgent', agentService);
    }
    async explain(topic: string) {
        const prompt = `Explain the concept of "${topic}" in simple terms for a crypto trader, in one short paragraph. Your output must be a JSON object: {"explanation": "..."}`;
        return this.safeGenerate(prompt);
    }
}

export async function GET(req: Request, { params }: { params: Promise<{ topicId: string }> }) {
    const { topicId } = await params;
    const cacheKey = `help-topic:${topicId}`;
    const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dienų

    try {
        // 1. Patikrink Redis podėlį
        const cachedExplanation = await redis.get(cacheKey);
        if (cachedExplanation) {
            return NextResponse.json({ explanation: cachedExplanation });
        }

        // 2. Jei podėlyje nėra, kviesk AI
        const helpAgent = new HelpAgent();
        const result = await helpAgent.explain(topicId.replace('-', ' '));
        const explanation = result?.response?.explanation as string || "Sorry, I couldn't generate an explanation for this topic.";

        // 3. Išsaugok į podėlį ir grąžink
        await redis.set(cacheKey, explanation, 'EX', TTL_SECONDS);

        return NextResponse.json({ explanation });
    } catch (error) {
        console.error(`[API /help] Error fetching explanation for ${topicId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
