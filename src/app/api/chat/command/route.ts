// PATH: src/app/api/chat/command/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { chatCommandsQueue } from '../../../../core/job-queue';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const { message, conversationId: existingConvId } = await req.json();
        if (!message) {
            return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
        }

        // Sukuriame naują pokalbio ID, jei jis nebuvo pateiktas
        const conversationId = existingConvId || randomUUID();

        const job = await chatCommandsQueue.add('process-message', {
            conversationId,
            message,
            username,
        });

        // Grąžiname 202 Accepted, nurodydami, kad užduotis priimta vykdymui
        return NextResponse.json({ jobId: job.id, conversationId }, { status: 202 });

    } catch (error) {
        console.error('[API /chat/command] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
