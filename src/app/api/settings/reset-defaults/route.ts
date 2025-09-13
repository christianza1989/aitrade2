// src/app/api/settings/reset-defaults/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

const defaultsPath = path.join(process.cwd(), 'strategy_config_defaults.json');

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        // Nuskaitome VIENINTELIO etaloninio failo turinį
        const defaults = JSON.parse(await fs.readFile(defaultsPath, 'utf-8'));

        // Personalizuojame numatytąją konfigūraciją vartotojo vardu
        defaults.global_settings.username = username;

        // Atnaujiname TIK vartotojo strategijos konfigūraciją duomenų bazėje
        await prisma.userConfiguration.update({
            where: { userId: username },
            data: {
                strategyConfig: defaults,
            },
        });

        console.log(`[SETTINGS RESET] Settings for user '${username}' have been reset to defaults.`);
        return NextResponse.json({ success: true, message: 'Settings have been reset to optimal defaults.' });

    } catch (error) {
        console.error(`[SETTINGS RESET] Failed to reset settings to defaults for user ${username}:`, error);
        return NextResponse.json({ success: false, error: 'Failed to reset settings.' }, { status: 500 });
    }
}
