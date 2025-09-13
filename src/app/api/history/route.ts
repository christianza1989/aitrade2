import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    const { searchParams } = request.nextUrl;
    const symbol = searchParams.get('symbol');
    const outcome = searchParams.get('outcome'); // 'profit' or 'loss'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Prisma.TradeLogWhereInput = { userId: username };

    if (symbol) {
        where.symbol = { contains: symbol, mode: Prisma.QueryMode.insensitive };
    }
    if (outcome === 'profit') {
        where.pnl = { gt: 0 };
    }
    if (outcome === 'loss') {
        where.pnl = { lte: 0 };
    }
    if (startDate && endDate) {
        where.timestamp = {
            gte: new Date(startDate),
            lte: new Date(endDate),
        };
    }

    try {
        const tradeLogs = await prisma.tradeLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
        });
        return NextResponse.json(tradeLogs);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error fetching trade history:", errorMessage);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
