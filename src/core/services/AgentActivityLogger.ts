import { Redis } from 'ioredis';
import { AgentActivityStatus } from '@prisma/client';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface LogData {
    cycleId: string;
    username: string;
    agentName: string;
    status: AgentActivityStatus;
    payload?: any;
    flowTo?: string; // Kam skirtas duomenu srautas
}

export class AgentActivityLogger {
    public async log(data: LogData): Promise<void> {
        const streamKey = `agent_activity_stream:${data.username}`;
        const entry = {
            cycleId: data.cycleId,
            timestamp: new Date().toISOString(),
            agentName: data.agentName,
            status: data.status,
            ...(data.payload && { payload: JSON.stringify(data.payload) }),
            ...(data.flowTo && { flowTo: data.flowTo }),
        };

        try {
            const args = Object.entries(entry).flat() as string[];
            await redis.xadd(streamKey, '*', ...args);
            // Nustatome stream'o galiojimo laiką (pvz., 24 valandos)
            await redis.expire(streamKey, 60 * 60 * 24);
        } catch (error) {
            console.error(`[AgentActivityLogger] Failed to log activity to Redis for user ${data.username}:`, error);
        }
    }
}
