import { PrismaClient, NotificationPriority, User } from '@prisma/client';
import { telegramService } from './TelegramService';

const prisma = new PrismaClient();

interface NotificationPayload {
    userId: string;
    message: string;
    priority: NotificationPriority;
    link?: string;
}

class NotificationService {
    public async dispatch(payload: NotificationPayload): Promise<void> {
        // 1. Įrašome į DB
        const notification = await prisma.notification.create({ data: payload });

        // 2. Gauname vartotojo nustatymus
        const user = await prisma.user.findUnique({
            where: { username: payload.userId },
            include: { configuration: true },
        });

        if (!user) return;

        // 3. Siunčiame į Telegram, jei reikia
        if (user.telegramChatId) {
            // Čia ateityje bus patikrinimas pagal vartotojo nustatymus
            // Kol kas siunčiame visus kritinius pranešimus
            if (payload.priority === 'CRITICAL' || payload.priority === 'WARNING') {
                 await telegramService.sendMessage(user.telegramChatId, `🚨 ${payload.priority}: ${payload.message}`);
            }
        }
    }
}
export const notificationService = new NotificationService();
