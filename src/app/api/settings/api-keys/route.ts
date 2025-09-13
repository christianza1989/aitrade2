// src/app/api/settings/api-keys/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../../../../core/services/EncryptionService';

const prisma = new PrismaClient();

// GET metodas: Gauti visus vartotojo raktus (be pilno rakto)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKeys = await prisma.apiKey.findMany({
        where: { userId: session.user.name },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, isActive: true, key: true } // Saugumo sumetimais grąžiname tik dalį rakto
    });

    const safeApiKeys = apiKeys.map(k => {
        const decryptedKey = EncryptionService.decrypt(k.key);
        return {
            ...k,
            key: decryptedKey ? `...${decryptedKey.slice(-4)}` : 'DECRYPTION_ERROR'
        };
    });

    return NextResponse.json(safeApiKeys);
}

// POST metodas: Išsaugoti naują raktų sąrašą
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const username = session.user.name;
    const newKeys: { name: string, key: string }[] = await request.json();

    // Validacija
    if (!Array.isArray(newKeys) || newKeys.some(k => !k.name || !k.key)) {
        return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
        // Ištriname senus raktus
        await tx.apiKey.deleteMany({ where: { userId: username } });

        // Įrašome naujus raktus
        if (newKeys.length > 0) {
            await tx.apiKey.createMany({
                data: newKeys.map(k => ({
                    name: k.name,
                    key: EncryptionService.encrypt(k.key), // UŽŠIFRAVIMAS
                    userId: username
                }))
            });

            // Pirmą raktą sąraše padarome aktyviu
            const firstKey = await tx.apiKey.findFirst({ where: { userId: username }, orderBy: { createdAt: 'asc' } });
            if (firstKey) {
                await tx.apiKey.update({
                    where: { id: firstKey.id },
                    data: { isActive: true }
                });
            }
        }
    });

    return NextResponse.json({ success: true, message: 'API keys updated successfully.' });
}

// PUT metodas: Nustatyti aktyvų raktą
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const username = session.user.name;
    const { keyIdToActivate } = await request.json();

    if (!keyIdToActivate) {
        return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
        // Deaktyvuojame visus vartotojo raktus
        await tx.apiKey.updateMany({
            where: { userId: username },
            data: { isActive: false }
        });

        // Aktyvuojame pasirinktą raktą
        await tx.apiKey.update({
            where: { id: keyIdToActivate },
            data: { isActive: true }
        });
    });

    return NextResponse.json({ success: true, message: 'Active API key updated.' });
}
