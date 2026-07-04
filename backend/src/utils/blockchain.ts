import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import logger from './audit';

dotenv.config();

const providerUrl = process.env.HARDHAT_NETWORK_URL || 'http://127.0.0.1:8545';
export const provider = new ethers.JsonRpcProvider(providerUrl);

// Helper to load contract ABI & address
function loadContract(name: string) {
  const filePath = path.join(__dirname, '../contracts', `${name}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Contract artifact not found at ${filePath}. Make sure to run deployment script first.`);
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return {
    address: data.address,
    abi: data.abi,
    instance: new ethers.Contract(data.address, data.abi, provider),
  };
}

// Interfaces
export interface ContractConfig {
  address: string;
  abi: any[];
  instance: ethers.Contract;
}

// Define variables for contracts
let IssuerRegistry: ContractConfig;
let DIDRegistry: ContractConfig;
let CredentialRegistry: ContractConfig;
let DocumentProofRegistry: ContractConfig;
let RevocationRegistry: ContractConfig;
let AuditHashLedger: ContractConfig;

try {
  IssuerRegistry = loadContract('IssuerRegistry');
  DIDRegistry = loadContract('DIDRegistry');
  CredentialRegistry = loadContract('CredentialRegistry');
  DocumentProofRegistry = loadContract('DocumentProofRegistry');
  RevocationRegistry = loadContract('RevocationRegistry');
  AuditHashLedger = loadContract('AuditHashLedger');
} catch (error) {
  logger.warn(`⚠️ Blockchain utilities initialized with missing contracts. Run deploy.js to generate ABIs. Error: ${(error as Error).message}`);
}

// Signers
export const adminSigner = process.env.ADMIN_PRIVATE_KEY 
  ? new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider) 
  : null;

export const tuSigner = process.env.TU_ISSUER_PRIVATE_KEY 
  ? new ethers.Wallet(process.env.TU_ISSUER_PRIVATE_KEY, provider) 
  : null;

export const bankSigner = process.env.BANK_ISSUER_PRIVATE_KEY 
  ? new ethers.Wallet(process.env.BANK_ISSUER_PRIVATE_KEY, provider) 
  : null;

/**
 * Gets a contract instance connected to a specific signer.
 */
export function getContractWithSigner(contractName: string, walletPrivateKey: string): ethers.Contract {
  const loaded = loadContract(contractName);
  const signer = new ethers.Wallet(walletPrivateKey, provider);
  return loaded.instance.connect(signer) as ethers.Contract;
}

/**
 * Verifies Check 1: Does the credential exist?
 */
export async function checkCredentialExists(credentialHash: string): Promise<boolean> {
  try {
    const credReg = loadContract('CredentialRegistry').instance;
    return await credReg.credentialExists(credentialHash);
  } catch (error) {
    logger.error('Error checking credential existence on-chain:', error);
    return false;
  }
}

/**
 * Verifies Check 2: Did the correct, approved issuer issue it?
 */
export async function checkIssuerApproved(issuerAddress: string): Promise<boolean> {
  try {
    const issuerReg = loadContract('IssuerRegistry').instance;
    return await issuerReg.isApprovedIssuer(issuerAddress);
  } catch (error) {
    logger.error('Error checking issuer status on-chain:', error);
    return false;
  }
}

/**
 * Verifies Check 3: Has it been revoked?
 */
export async function checkCredentialRevoked(credentialHash: string): Promise<boolean> {
  try {
    const revokeReg = loadContract('RevocationRegistry').instance;
    return await revokeReg.isRevoked(credentialHash);
  } catch (error) {
    logger.error('Error checking credential revocation on-chain:', error);
    return false;
  }
}

/**
 * Verifies Check 4: Has it expired?
 */
export async function checkCredentialExpired(credentialHash: string): Promise<boolean> {
  try {
    const credReg = loadContract('CredentialRegistry').instance;
    return await credReg.isExpired(credentialHash);
  } catch (error) {
    logger.error('Error checking credential expiry on-chain:', error);
    return true; // Assume expired on error for security
  }
}

/**
 * Writes an event to the on-chain AuditHashLedger.
 */
export async function logEventOnChain(
  actionType: number,
  actor: string,
  metadata: string,
  signerPrivateKey: string
): Promise<string> {
  try {
    const auditLedger = getContractWithSigner('AuditHashLedger', signerPrivateKey);
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create event hash
    const eventHash = ethers.solidityPackedKeccak256(
      ['uint8', 'address', 'uint256', 'string'],
      [actionType, actor, timestamp, metadata]
    );

    const tx = await auditLedger.logEvent(eventHash, actionType, actor, metadata);
    const receipt = await tx.wait();
    logger.info(`📝 Audit event logged on-chain in tx: ${receipt.hash}`);
    return receipt.hash;
  } catch (error) {
    logger.error('Failed to log audit event on-chain:', error);
    return '';
  }
}

export {
  IssuerRegistry,
  DIDRegistry,
  CredentialRegistry,
  DocumentProofRegistry,
  RevocationRegistry,
  AuditHashLedger,
};
