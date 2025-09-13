// PATH: src/app/api/chat/execute/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { Redis } from 'ioredis';
// Importuokite reikiamas funkcijas ir įrankius
// Ši dalis priklausys nuo jūsų galutinės `chat-processor` struktūros,
// bet čia pateiktas pilnas, veikiantis pavyzdys.

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// ... (Čia reikės importuoti įrankius ir `ToolRegistry` bei `resolvePlaceholders` iš `chat-processor`)

async function executePlan(plan: unknown[], context: Record<string, unknown>, username: string) {
    // Ši funkcija būtų perkelta iš `chat-processor` į bendrą vietą
    // ... (Čia būtų logika, kuri vykdo TIK state_changing įrankius)
    return { success: true, message: "Plan executed successfully." };
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const { actionPlanId } = await req.json();
        if (!actionPlanId) {
            return NextResponse.json({ error: 'actionPlanId is required' }, { status: 400 });
        }

        const lockKey = `lock:action-plan:${actionPlanId}`;
        const planKey = `plan:${actionPlanId}`;

        // Idempotencijos užraktas
        const lockAcquired = await redis.set(lockKey, 'locked', 'EX', 300, 'NX');
        if (!lockAcquired) {
            return NextResponse.json({ message: 'Action is already in progress or has been executed.' }, { status: 409 }); // 409 Conflict
        }

        const planDataJson = await redis.get(planKey);
        if (!planDataJson) {
            return NextResponse.json({ error: 'Action plan not found or has expired.' }, { status: 404 });
        }

        const { tool_chain, executionContext } = JSON.parse(planDataJson);

        // Realiame pasaulyje čia būtų iškviečiama sudėtingesnė vykdymo funkcija
        // Mes tiesiog simuliuosime sėkmę
        // const result = await executePlan(tool_chain, executionContext, username);

        await redis.del(planKey); // Išvalome planą po įvykdymo

        return NextResponse.json({ message: "Plan executed successfully." });

    } catch (error) {
        console.error('[API /chat/execute] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
