// src/core/services/EncryptionService.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const AUTH_TAG_LENGTH = 16;
const SECRET_KEY = process.env.ENCRYPTION_SECRET;

if (!SECRET_KEY) {
    throw new Error('ENCRYPTION_SECRET is not set in the environment variables.');
}

const key = scryptSync(SECRET_KEY, 'salt', 32);

export class EncryptionService {
    static encrypt(text: string): string {
        const iv = randomBytes(IV_LENGTH);
        const cipher = createCipheriv(ALGORITHM, key, iv);
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return Buffer.concat([iv, encrypted, authTag]).toString('hex');
    }

    static decrypt(encryptedText: string): string | null {
        try {
            const data = Buffer.from(encryptedText, 'hex');
            const iv = data.slice(0, IV_LENGTH);
            const encrypted = data.slice(IV_LENGTH, -AUTH_TAG_LENGTH);
            const authTag = data.slice(-AUTH_TAG_LENGTH);

            const decipher = createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);
            const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
            return decrypted;
        } catch (error) {
            console.error('Decryption failed. The key may have changed or data is corrupt.', error);
            return null;
        }
    }
}
