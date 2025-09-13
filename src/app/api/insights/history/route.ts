import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const insights = await prisma.tradeMemory.findMany({
            where: {
                userId: username,
                outcome: 'dialogue_summary',
                // Papildomas filtras, kad nerodytų sistemos konfigūracijos pakeitimų
                NOT: {
                    symbol: 'SYSTEM_CONFIG',
                },
            },
            orderBy: {
                timestamp: 'desc',
            },
            select: {
                id: true, // insightId
                timestamp: true,
                narrative: true, // Tai yra įžvalgos pavadinimas
                context: true, // Čia yra summary ir kiti duomenys
            },
            take: 50, // Apribojame įrašų skaičių
        });

        // Išfiltruojame ir formatuojame atsakymą
        const formattedInsights = insights.map(insight => {
            const context = insight.context as { summary_for_user?: string } | null;
            return {
                insightId: insight.id,
                timestamp: insight.timestamp,
                title: insight.narrative,
                summary: context?.summary_for_user || 'No summary available.'
            };
        });

        return NextResponse.json(formattedInsights);
    } catch (error) {
        console.error('[API /insights/history] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
