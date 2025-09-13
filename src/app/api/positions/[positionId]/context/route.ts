import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request, { params }: { params: Promise<{ positionId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { positionId } = await params;

    try {
        const position = await prisma.position.findUnique({
            where: { id: positionId },
            select: {
                decisionContext: true,
                portfolio: {
                    select: {
                        userId: true
                    }
                }
            }
        });

        // Saugumo patikrinimas, ar pozicija priklauso prisijungusiam vartotojui
        if (!position || position.portfolio.userId !== session.user.name) {
            return NextResponse.json({ error: 'Position not found or access denied' }, { status: 404 });
        }

        return NextResponse.json(position.decisionContext || {});
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
