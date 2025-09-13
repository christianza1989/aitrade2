import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const { tourName, status } = await req.json();
        if (!tourName || status === undefined) { // Pakeista, kad priimtų bet kokį statusą
            return NextResponse.json({ error: 'tourName and status are required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { username },
            select: { onboardingState: true },
        });

        const currentState = (user?.onboardingState as object) || {};
        const newState = { ...currentState, [tourName]: status };

        await prisma.user.update({
            where: { username },
            data: { onboardingState: newState },
        });

        return NextResponse.json({ success: true, onboardingState: newState });
    } catch (error) {
        console.error('[Update Onboarding API Error]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
