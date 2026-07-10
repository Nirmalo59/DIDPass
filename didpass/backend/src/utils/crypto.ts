import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a raw buffer using AES-256-GCM.
 * @param buffer The raw file buffer
 * @param masterKey Hex string of 32 bytes (64 chars)
 * @returns An object containing the IV, Auth Tag, and Ciphertext (all as Buffers)
 */
export function encryptFile(buffer: Buffer, masterKey: string): { iv: Buffer, authTag: Buffer, ciphertext: Buffer } {
  const key = Buffer.from(masterKey, 'hex');
  if (key.length !== 32) {
    throw new Error('Invalid AES master key length. Must be 32 bytes.');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return { iv, authTag, ciphertext };
}

/**
 * Decrypts an AES-256-GCM encrypted file.
 */
export function decryptFile(ciphertext: Buffer, iv: Buffer, authTag: Buffer, masterKey: string): Buffer {
  const key = Buffer.from(masterKey, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted;
}
