import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD = 'admin123'; // Change this to a secure password

    const existingUser = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });
    if (existingUser) {
        console.log('Admin user already exists.');
        return;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await prisma.user.create({
        data: {
            username: ADMIN_USERNAME,
            password: hashedPassword,
        },
    });

    console.log('Admin user created successfully.');
}

main().catch(e => console.error(e)).finally(async () => await prisma.$disconnect());
