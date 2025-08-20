import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const logFiles = [
    'bot_logs.json',
    'buy_log.json',
    'decision_log.json',
    'missed_opportunities.json',
    'trades_log.json',
];

const initialPortfolio = { balance: 100000, positions: [] };

export async function POST(request: Request) {
    try {
        // Get username from request (assuming it's passed in the body or headers)
        // For now, I'll assume a default or extract from a common source if available.
        // Based on portfolio.ts, the log files are username-specific.
        // I need to ensure the reset targets the correct user's files.
        // For simplicity, I'll assume the request body will contain the username.
        // If not, I'll need to ask the user how the username is passed.
        const { username } = await request.json();

        if (!username) {
            return NextResponse.json({ error: 'Username is required for resetting logs.' }, { status: 400 });
        }

        // Clear log files
        for (const file of logFiles) {
            const filePath = path.join(process.cwd(), file.replace('.json', `_${username}.json`));
            try {
                await fs.writeFile(filePath, '[]', 'utf-8');
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                    console.warn(`Log file not found, creating: ${filePath}`);
                    await fs.writeFile(filePath, '[]', 'utf-8');
                } else {
                    console.error(`Failed to clear log file ${filePath}:`, error);
                    throw error;
                }
            }
        }

        // Reset portfolio.json
        const portfolioFilePath = path.join(process.cwd(), `portfolio_${username}.json`);
        try {
            await fs.writeFile(portfolioFilePath, JSON.stringify(initialPortfolio, null, 2), 'utf-8');
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                console.warn(`Portfolio file not found, creating: ${portfolioFilePath}`);
                await fs.writeFile(portfolioFilePath, JSON.stringify(initialPortfolio, null, 2), 'utf-8');
            } else {
                console.error(`Failed to reset portfolio file ${portfolioFilePath}:`, error);
                throw error;
            }
        }

        return NextResponse.json({ message: 'All logs and portfolio reset successfully.' });
    } catch (error) {
        console.error('Error resetting logs:', error);
        return NextResponse.json({ error: 'Failed to reset logs.' }, { status: 500 });
    }
}
