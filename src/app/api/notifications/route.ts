import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const notifications = await prisma.notification.findMany({
        where: { userId: session.user.name },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    const unreadCount = await prisma.notification.count({
        where: { userId: session.user.name, isRead: false },
    });

    return NextResponse.json({ notifications, unreadCount });
}
