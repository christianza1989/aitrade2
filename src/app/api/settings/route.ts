// src/app/api/settings/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function getUserConfiguration(username: string) {
    const config = await prisma.userConfiguration.findUnique({
        where: { userId: username },
    });

    if (!config) {
        // Ši logika turėtų būti sinchronizuota su registracijos logika
        // Registracijos metu sukuriama numatytoji konfigūracija
        return null;
    }
    return config;
}

// GET metodas dabar grąžina tik vieną konfigūracijos objektą
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const userConfig = await getUserConfiguration(username);
        if (!userConfig) {
            return NextResponse.json({ error: 'Configuration not found for user.' }, { status: 404 });
        }

        return NextResponse.json(userConfig.strategyConfig);

    } catch (error) {
        console.error(`Failed to read settings for user ${username}:`, error);
        return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 });
    }
}

// POST metodas dabar išsaugo viską į strategyConfig
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const settingsToSave = await request.json();

        await prisma.userConfiguration.update({
            where: { userId: username },
            data: {
                strategyConfig: settingsToSave,
                // shadowConfig lauką paliekame nepaliestą, jį ateityje bus galima naudoti tikram shadow-mode
            },
        });

        // Anuliuoti Redis cache
        const cacheKey = `config:${username}`;
        await redis.del(cacheKey);

        return NextResponse.json({ message: 'Settings saved successfully' });
    } catch (error) {
        console.error(`Failed to save settings for user ${username}:`, error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
