import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import Log from '../models/Log';
import { encryptFile, decryptFile } from '../utils/crypto';
import { uploadToIPFSSimulator, getFromIPFSSimulator } from '../utils/ipfs';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Shared secret for tokens (In real life, this is in .env)
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-coursework-only';

// Since the backend might run differently, we resolve the address safely
let registryAddress = "";
try {
  const addressPath = path.resolve(__dirname, '../contractAddress.json');
  const data = fs.readFileSync(addressPath, 'utf8');
  registryAddress = JSON.parse(data).DocumentRegistry;
} catch (e) {
  console.log("Could not load contract address. Did you run deploy.cjs?");
}

// ABI for the smart contract
const abi = [
  "function issueDocument(bytes32 documentHash) external",
  "function verifyDocument(bytes32 documentHash) external view returns (address issuer, uint256 timestamp, bool isValid)",
  "function revokeDocument(bytes32 documentHash) external"
];

// Hardhat's default Account #0 Private Key
const ISSUER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Server AES Master Key
const AES_MASTER_KEY = process.env.AES_MASTER_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Provider connected to the local Hardhat node
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const wallet = new ethers.Wallet(ISSUER_PRIVATE_KEY, provider);

/**
 * Route: POST /api/documents/issue
 * Desc: Hashes, encrypts, IPFS, blockchain anchor, and generates Magic Link.
 */
router.post('/issue', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No document uploaded' });
    }
    if (!registryAddress) {
      return res.status(500).json({ message: 'Smart contract not deployed' });
    }
    
    await Log.create({ endpoint: req.originalUrl, action: 'DOCUMENT_UPLOADED', details: `File ${req.file.originalname} received for issuance`, status: 'INFO', ipAddress: req.ip });

    console.log(`\n[+] New Issuance Request: ${req.file.originalname}`);
    console.log(`[~] Generating SHA-256 hash for document...`);
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const bytes32Hash = '0x' + hash;
    console.log(`[✓] SHA-256 Hash Generated: ${bytes32Hash}`);
    await Log.create({ endpoint: req.originalUrl, action: 'HASH_GENERATED', details: `Generated SHA-256: ${bytes32Hash}`, status: 'SUCCESS', ipAddress: req.ip });

    console.log(`[~] Encrypting document using AES-256-GCM algorithm...`);
    const { iv, authTag, ciphertext } = encryptFile(req.file.buffer, AES_MASTER_KEY);
    const fullEncryptedBuffer = Buffer.concat([iv, authTag, ciphertext]);
    console.log(`[✓] Document successfully encrypted via AES-256-GCM.`);
    await Log.create({ endpoint: req.originalUrl, action: 'FILE_ENCRYPTED', details: `File encrypted using AES-256-GCM.`, status: 'SUCCESS', ipAddress: req.ip });

    const cid = await uploadToIPFSSimulator(fullEncryptedBuffer);
    await Log.create({ endpoint: req.originalUrl, action: 'IPFS_UPLOAD', details: `Pinned to IPFS. CID: ${cid}`, status: 'SUCCESS', ipAddress: req.ip });

    const contract = new ethers.Contract(registryAddress, abi, wallet);
    await Log.create({ endpoint: req.originalUrl, action: 'BLOCKCHAIN_TX_SENT', details: `Sending transaction to anchor hash`, status: 'PENDING', ipAddress: req.ip, walletAddress: wallet.address });
    
    const tx = await contract.issueDocument(bytes32Hash);
    await tx.wait();
    
    await Log.create({ 
      endpoint: req.originalUrl,
      action: 'DOCUMENT_ISSUED', 
      details: `Document anchored to blockchain`, 
      status: 'SUCCESS', 
      transactionHash: tx.hash,
      walletAddress: wallet.address,
      ipAddress: req.ip 
    });

    // Generate 10-Minute Magic Link Token
    const downloadToken = jwt.sign(
      { cid, originalName: req.file.originalname },
      JWT_SECRET,
      { expiresIn: '10m' }
    );
    
    // In a real email, this link would point to the frontend, which would fetch the backend.
    // To make it simple for the user to download instantly, we provide the backend API link.
    const magicLink = `http://127.0.0.1:5555/api/documents/download?token=${downloadToken}`;

    res.json({
      message: 'Document issued successfully!',
      documentHash: bytes32Hash,
      transactionHash: tx.hash,
      magicLink: magicLink
    });
  } catch (err: any) {
    if (err.message.includes('Document already exists')) {
      await Log.create({ endpoint: req.originalUrl, action: 'ISSUANCE_FAILED', details: `Document already exists in registry`, status: 'FAILED', ipAddress: req.ip });
      return res.status(400).json({ message: 'This exact document has already been issued.' });
    }
    console.error(err);
    await Log.create({ endpoint: req.originalUrl, action: 'ISSUANCE_ERROR', details: err.message || 'Server error', status: 'FAILED', ipAddress: req.ip });
    res.status(500).json({ message: 'Server error during issuance' });
  }
});

/**
 * Route: GET /api/documents/download
 * Desc: Validates Magic Link token, decrypts file, and forces download.
 */
router.get('/download', async (req, res) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).send("Magic Link token is missing.");
    }

    // 1. Verify token (will throw if expired > 10m)
    const decoded = jwt.verify(token, JWT_SECRET) as { cid: string, originalName: string };
    
    await Log.create({ endpoint: req.originalUrl, action: 'MAGIC_LINK_ACCESSED', details: `User accessing file via Magic Link. CID: ${decoded.cid}`, status: 'INFO', ipAddress: req.ip });

    // 2. Fetch from IPFS Simulator
    const encryptedBuffer = await getFromIPFSSimulator(decoded.cid);

    // 3. Slice the buffer back into IV, AuthTag, and Ciphertext
    // Remember: IV is 12 bytes, AuthTag is 16 bytes, rest is Ciphertext
    const iv = encryptedBuffer.subarray(0, 12);
    const authTag = encryptedBuffer.subarray(12, 28);
    const ciphertext = encryptedBuffer.subarray(28);

    // 4. Decrypt the file
    const rawBuffer = decryptFile(ciphertext, iv, authTag, AES_MASTER_KEY);

    await Log.create({ endpoint: req.originalUrl, action: 'FILE_DECRYPTED', details: `File successfully decrypted for download.`, status: 'SUCCESS', ipAddress: req.ip });

    // 5. Send file as attachment
    res.setHeader('Content-Disposition', `attachment; filename="${decoded.originalName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(rawBuffer);

  } catch (err: any) {
    let errorMsg = "Failed to download document.";
    if (err.name === 'TokenExpiredError') {
      errorMsg = "This Magic Link has expired. Links are only valid for 10 minutes.";
    }
    await Log.create({ endpoint: req.originalUrl, action: 'DOWNLOAD_FAILED', details: err.message, status: 'FAILED', ipAddress: req.ip });
    res.status(400).send(errorMsg);
  }
});

/**
 * Route: POST /api/documents/verify
 * Desc: Hashes an uploaded document and checks its status on the blockchain.
 */
router.post('/verify', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No document uploaded' });
    }
    if (!registryAddress) {
      return res.status(500).json({ message: 'Smart contract not deployed' });
    }
    
    await Log.create({ endpoint: req.originalUrl, action: 'VERIFICATION_STARTED', details: `File ${req.file.originalname} received for verification`, status: 'INFO', ipAddress: req.ip });

    console.log(`\n[+] New Verification Request: ${req.file.originalname}`);
    console.log(`[~] Generating SHA-256 hash for the uploaded verification document...`);
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const bytes32Hash = '0x' + hash;
    console.log(`[✓] Target SHA-256 Hash Generated: ${bytes32Hash}`);
    await Log.create({ endpoint: req.originalUrl, action: 'HASH_GENERATED', details: `Generated SHA-256 for verification: ${bytes32Hash}`, status: 'SUCCESS', ipAddress: req.ip });

    const contract = new ethers.Contract(registryAddress, abi, provider);

    try {
      console.log(`[~] Comparing target hash against DocumentRegistry Smart Contract on Blockchain...`);
      await Log.create({ endpoint: req.originalUrl, action: 'BLOCKCHAIN_QUERY', details: `Querying registry for hash ${bytes32Hash}`, status: 'INFO', ipAddress: req.ip });
      
      const result = await contract.verifyDocument(bytes32Hash);
      const issuer = result[0];
      const timestamp = new Date(Number(result[1]) * 1000).toLocaleString();
      const isValid = result[2];
      
      console.log(`[✓] Blockchain response received!`);
      console.log(`    -> Authentic: YES`);
      console.log(`    -> Issued By: ${issuer}`);
      console.log(`    -> Timestamp: ${timestamp}`);
      
      await Log.create({ 
        endpoint: req.originalUrl,
        action: 'VERIFICATION_SUCCESS', 
        details: `Document is authentic. Issued by ${issuer}`, 
        status: 'SUCCESS', 
        ipAddress: req.ip 
      });

      res.json({
        authentic: true,
        isValid,
        documentHash: bytes32Hash,
        issuer,
        timestamp,
        message: 'Document is authentic and verified on the blockchain!'
      });
    } catch (err: any) {
      if (err.message.includes('Document not found')) {
        console.log(`[X] Blockchain response received!`);
        console.log(`    -> Authentic: NO`);
        console.log(`    -> Reason: Hash not found in DocumentRegistry (Potential Forgery)`);
        await Log.create({ 
          endpoint: req.originalUrl,
          action: 'VERIFICATION_FAILED', 
          details: `Document not found in registry (Possible forgery detected) for hash ${bytes32Hash}`, 
          status: 'FAILED', 
          ipAddress: req.ip 
        });
        return res.json({
          authentic: false,
          documentHash: bytes32Hash,
          message: 'Document not found on the blockchain. It may be forged or altered.'
        });
      }
      throw err;
    }
  } catch (err: any) {
    console.error(err);
    await Log.create({ endpoint: req.originalUrl, action: 'VERIFICATION_ERROR', details: err.message || 'Server error', status: 'FAILED', ipAddress: req.ip });
    res.status(500).json({ message: 'Server error during verification' });
  }
});

export default router;
