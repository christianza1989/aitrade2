// src/app/api/bot/status/route.ts

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { PrismaClient, Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

const prisma = new PrismaClient();

async function getBotStatus(username: string): Promise<'active' | 'inactive'> {
    try {
        const config = await prisma.userConfiguration.findUnique({
            where: { userId: username },
            select: { strategyConfig: true }
        });
        const strategyConfig = config?.strategyConfig as any;
        return strategyConfig?.global_settings?.botStatus === 'active' ? 'active' : 'inactive';
    } catch {
        return 'inactive';
    }
}

async function setBotStatus(username: string, status: 'active' | 'inactive'): Promise<void> {
    const userConfig = await prisma.userConfiguration.findUnique({
        where: { userId: username },
    });

    if (userConfig) {
        const strategyConfig = userConfig.strategyConfig as Prisma.JsonObject;
        strategyConfig['global_settings'] = {
            ...(strategyConfig['global_settings'] as Prisma.JsonObject),
            botStatus: status,
        };

        await prisma.userConfiguration.update({
            where: { userId: username },
            data: { strategyConfig },
        });
    }
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const status = await getBotStatus(session.user.name);
    return NextResponse.json({ status });
}

const statusSchema = z.object({
    status: z.enum(['active', 'inactive']),
});

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { status } = statusSchema.parse(body);
        await setBotStatus(session.user.name, status);
        return NextResponse.json({ success: true, status });
    } catch (error) {
        if (error instanceof z.ZodError) {
            const validationError = fromZodError(error);
            return NextResponse.json({ success: false, error: validationError.message }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }
}
