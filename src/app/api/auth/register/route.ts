import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';

const usersFilePath = path.join(process.cwd(), 'users.json');
const getPortfolioFilePath = (username: string) => path.join(process.cwd(), `portfolio_${username}.json`);

async function getUsers() {
    try {
        const data = await fs.readFile(usersFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        const users = await getUsers();

        if (users[username]) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        users[username] = { password: hashedPassword };

        await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));

        // Create a new portfolio for the user
        const portfolioFilePath = getPortfolioFilePath(username);
        const initialPortfolio = {
            balance: 100000,
            positions: [],
        };
        await fs.writeFile(portfolioFilePath, JSON.stringify(initialPortfolio, null, 2));

        return NextResponse.json({ message: 'User registered successfully' }, { status: 201 });

    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
