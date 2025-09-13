// src/app/api/memory/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; // TEISINGAI
import { PrismaClient } from '@prisma/client';
import { MemoryService } from '@/core/memory'; // TEISINGAI

interface TradeMemoryWhereClause {
    userId: string;
    outcome?: string;
    symbol?: string;
    narrative?: {
        contains: string;
        mode: 'insensitive';
    };
    source?: 'AI' | 'HUMAN'; // NAUJAS
}

const prisma = new PrismaClient();

// GET metodas: Gauti ir filtruoti atminties įrašus
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const outcome = searchParams.get('outcome');
    const symbol = searchParams.get('symbol');
    const narrativeQuery = searchParams.get('narrativeQuery');
    const source = searchParams.get('source') as 'AI' | 'HUMAN' | null; // NAUJAS

    const skip = (page - 1) * limit;

    const whereClause: TradeMemoryWhereClause = { userId: username };
    if (outcome) {
        whereClause.outcome = outcome;
    }
    if (symbol) {
        whereClause.symbol = symbol;
    }
    if (narrativeQuery) {
        whereClause.narrative = {
            contains: narrativeQuery,
            mode: 'insensitive', // Case-insensitive search
        };
    }
    if (source) {
        whereClause.source = source;
    }

    try {
        const memories = await prisma.tradeMemory.findMany({
            where: whereClause,
            orderBy: { timestamp: 'desc' },
            skip,
            take: limit,
        });
        const total = await prisma.tradeMemory.count({ where: whereClause });

        return NextResponse.json({
            data: memories,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("[API /memory GET] Error fetching memories:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST metodas: Atlikti semantinę paiešką
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const body = await req.json();
        const { query, count = 3 } = body;
        
        if (!query) {
            return NextResponse.json({ error: 'Query is required for semantic search' }, { status: 400 });
        }

        // Panaudojame egzistuojantį MemoryService semantinei paieškai
        const memoryService = new MemoryService(username);
        const results = await memoryService.recallMemories(query, count);

        return NextResponse.json({ data: results });

    } catch (error) {
        console.error("[API /memory POST] Error during semantic recall:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
