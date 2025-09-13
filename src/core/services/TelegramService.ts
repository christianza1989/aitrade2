import { PrismaClient } from '@prisma/client';
import { chatCommandsQueue } from '../job-queue';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

class TelegramService {
    public async handleUpdate(update: any): Promise<void> {
        const message = update.message;
        if (!message || !message.text) return;

        const chatId = message.chat.id.toString();
        const text = message.text;

        // 1. Patikriname, ar tai susiejimo komanda
        if (text.startsWith('/start ')) {
            const token = text.split(' ')[1];
            const user = await prisma.user.findUnique({ where: { telegramLinkToken: token } });
            if (user) {
                await prisma.user.update({
                    where: { username: user.username },
                    data: { telegramChatId: chatId, telegramLinkToken: null },
                });
                await this.sendMessage(chatId, "✅ Your Lucid Hive account has been successfully linked!");
            } else {
                await this.sendMessage(chatId, "❌ Invalid or expired link token.");
            }
            return;
        }

        // 2. Jei tai ne komanda, apdorojame kaip pokalbio žinutę
        const user = await prisma.user.findUnique({ where: { telegramChatId: chatId } });
        if (user) {
            const conversationId = `telegram-${chatId}`;
            await chatCommandsQueue.add('process-message', {
                conversationId,
                message: text,
                username: user.username,
                replyChannel: 'telegram', // Nurodome atsakymo kanalą
                replyTo: chatId,
            });
        } else {
            await this.sendMessage(chatId, "Your account is not linked. Please link it via the settings page in the web app.");
        }
    }

    public async sendMessage(chatId: string, text: string, extraOptions: object = {}): Promise<void> {
        try {
            const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', ...extraOptions }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error("[TelegramService] Failed to send message:", errorData);
            }
        } catch (error) {
            console.error("[TelegramService] Network error while sending message:", error);
        }
    }
}

export const telegramService = new TelegramService();
