// src/app/api/reset-logs/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    // Svarbu: Apsauga! Užtikriname, kad tik prisijungęs vartotojas gali atlikti šį veiksmą.
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        // Viską darome vienoje atominėje operacijoje. Jei bent viena dalis nepavyks,
        // visi pakeitimai bus atšaukti, užtikrinant duomenų vientisumą.
        await prisma.$transaction(async (tx) => {
            // 1. Išvalome visus susijusius log'us ir atmintį
            await tx.tradeLog.deleteMany({ where: { userId: username } });
            await tx.decisionLog.deleteMany({ where: { userId: username } });
            await tx.missedOpportunity.deleteMany({ where: { userId: username } });
            await tx.tradeMemory.deleteMany({ where: { userId: username } });

            // 2. Atstatome portfelį
            const portfolio = await tx.portfolio.findFirst({ where: { userId: username, type: 'MAIN' } });

            if (portfolio) {
                // Ištriname visas atidarytas pozicijas
                await tx.position.deleteMany({ where: { portfolioId: portfolio.id } });

                // Atstatome balansą į pradinę sumą
                await tx.portfolio.update({
                    where: { id: portfolio.id },
                    data: { balance: 100000 },
                });
            } else {
                // Jei vartotojas kažkaip neturi portfelio, sukuriame naują
                await tx.portfolio.create({
                    data: { userId: username, balance: 100000, type: 'MAIN' },
                });
            }
        });

        console.log(`[DB RESET] All data for user '${username}' has been successfully reset.`);
        return NextResponse.json({ success: true, message: `All logs and portfolio for user '${username}' have been reset.` });

    } catch (error) {
        console.error(`[DB RESET] Critical error while resetting data for user '${username}':`, error);
        return NextResponse.json({ success: false, error: 'Failed to reset logs and portfolio.' }, { status: 500 });
    }
}
