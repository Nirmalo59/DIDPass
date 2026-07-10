import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bs58 from 'bs58';

const IPFS_STORAGE_DIR = path.resolve(process.cwd(), 'offchain_ipfs');

/**
 * Simulates uploading an encrypted file to IPFS.
 * It generates a realistic CID based on the file's hash, and saves the file locally.
 */
export async function uploadToIPFSSimulator(encryptedBuffer: Buffer): Promise<string> {
  // Ensure the simulated IPFS directory exists
  if (!fs.existsSync(IPFS_STORAGE_DIR)) {
    fs.mkdirSync(IPFS_STORAGE_DIR, { recursive: true });
  }

  // 1. Generate a SHA-256 hash of the encrypted file
  const hash = crypto.createHash('sha256').update(encryptedBuffer).digest();
  
  // 2. Format it as an IPFS CIDv0 (starts with Qm)
  // Multihash format: 0x12 (sha2-256), 0x20 (length 32)
  const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), hash]);
  const cid = bs58.encode(multihash);

  // 3. Save the encrypted file using the CID as the filename
  const filePath = path.join(IPFS_STORAGE_DIR, cid);
  fs.writeFileSync(filePath, encryptedBuffer);

  return cid;
}

/**
 * Retrieves the encrypted file from the IPFS simulator.
 */
export async function getFromIPFSSimulator(cid: string): Promise<Buffer> {
  const filePath = path.join(IPFS_STORAGE_DIR, cid);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File with CID ${cid} not found on IPFS simulator`);
  }
  return fs.readFileSync(filePath);
}
