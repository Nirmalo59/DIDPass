import crypto from 'crypto';
import fs from 'fs';

// Get the encryption key from env (must be 32 bytes / 64 hex characters)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '4a8f3c1d9b2e7f5a4a8f3c1d9b2e7f5a4a8f3c1d9b2e7f5a4a8f3c1d9b2e7f5a';
const IV_LENGTH = 12; // For GCM, 12 bytes is the standard

/**
 * Calculates the SHA-256 hash of a buffer.
 */
export function calculateSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Calculates the SHA-256 hash of a file.
 */
export function calculateFileSHA256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Encrypts a buffer using AES-256-GCM.
 */
export function encryptBuffer(buffer: Buffer): { encrypted: Buffer; iv: string; authTag: string } {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypts a buffer using AES-256-GCM.
 */
export function decryptBuffer(encryptedBuffer: Buffer, ivHex: string, authTagHex: string): Buffer {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}

/**
 * Encrypts a file and saves it to the target path.
 */
export async function encryptFile(sourcePath: string, targetPath: string): Promise<{ sha256Hash: string; iv: string; authTag: string }> {
  const fileContent = fs.readFileSync(sourcePath);
  const sha256Hash = calculateSHA256(fileContent);
  const { encrypted, iv, authTag } = encryptBuffer(fileContent);
  
  fs.writeFileSync(targetPath, encrypted);
  return { sha256Hash, iv, authTag };
}

/**
 * Decrypts a file and returns its content buffer.
 */
export async function decryptFile(sourcePath: string, ivHex: string, authTagHex: string): Promise<Buffer> {
  const encryptedContent = fs.readFileSync(sourcePath);
  return decryptBuffer(encryptedContent, ivHex, authTagHex);
}
