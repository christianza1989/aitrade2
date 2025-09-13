import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return NextResponse.json({ error: 'Username already exists.' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Naudojame transakciją, kad užtikrintume vientisumą
        await prisma.$transaction(async (tx) => {
            // 1. Sukuriam vartotoją
            const user = await tx.user.create({
                data: { username, password: hashedPassword },
            });

            // 2. Nuskaitom etaloninę konfigūraciją iš duomenų bazės
            const templateConfig = await tx.userConfiguration.findUnique({
                where: { userId: 'admin' },
            });

            if (!templateConfig) {
                throw new Error("Default configuration template not found. Please seed the database.");
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const defaultConfig = templateConfig.strategyConfig as Record<string, any>; // Use flexible config object
            if (defaultConfig.global_settings) {
                defaultConfig.global_settings.username = username; // Personalizuojam
            }

            // 3. Sukuriam vartotojo konfigūracijos įrašą
            await tx.userConfiguration.create({
                data: {
                    userId: user.username,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    strategyConfig: defaultConfig as any,
                },
            });

            // 4. Sukuriam pagrindinį portfelį
            await tx.portfolio.create({
                data: {
                    userId: user.username,
                    balance: 100000,
                    type: 'MAIN' as const,
                },
            });
        });

        return NextResponse.json({ message: 'User registered successfully.' }, { status: 201 });
    } catch (error) {
        console.error('[Register API Error]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
