// scripts/encrypt_existing_keys.ts
import { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../src/core/services/EncryptionService'; // Kelias gali skirtis

const prisma = new PrismaClient();

async function main() {
    console.log('Starting encryption of existing API keys...');
    const keysToEncrypt = await prisma.apiKey.findMany();
    let encryptedCount = 0;

    for (const apiKey of keysToEncrypt) {
        // Tikriname, ar raktas jau nėra užšifruotas (šifruotas tekstas yra ilgesnis)
        if (apiKey.key.length < 100) {
            const encryptedKey = EncryptionService.encrypt(apiKey.key);
            await prisma.apiKey.update({
                where: { id: apiKey.id },
                data: { key: encryptedKey },
            });
            encryptedCount++;
            console.log(`Encrypted key for user ${apiKey.userId}, key name: ${apiKey.name}`);
        }
    }
    console.log(`Encryption complete. Total keys encrypted: ${encryptedCount}`);
}

main().catch(e => console.error(e)).finally(async () => await prisma.$disconnect());
