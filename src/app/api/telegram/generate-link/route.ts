import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = randomBytes(16).toString('hex');
    await prisma.user.update({
        where: { username: session.user.name },
        data: { telegramLinkToken: token },
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    const linkCommand = `/start ${token}`;
    const linkUrl = `https://t.me/${botUsername}?start=${token}`;

    return NextResponse.json({ linkCommand, linkUrl });
}
