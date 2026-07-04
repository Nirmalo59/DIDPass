import crypto from 'crypto';

/**
 * Generates a mock IPFS CIDv0 (starts with Qm) based on file hash or content.
 */
export function generateMockIPFSCid(hashOrContent: string): string {
  // IPFS CIDs usually start with Qm (CIDv0) and are 46 characters long.
  // We can hash the input and encode it to base58 or just format it.
  const hash = crypto.createHash('sha256').update(hashOrContent).digest('hex');
  const buffer = Buffer.concat([Buffer.from([0x12, 0x20]), Buffer.from(hash, 'hex')]);
  
  // Custom base58 implementation since we want to avoid extra npm packages
  return 'Qm' + buffer.toString('hex').slice(0, 44);
}
