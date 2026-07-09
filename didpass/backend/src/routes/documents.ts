import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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

// In a real app, this would be an environment variable containing the Issuer's private key.
// Here we use Hardhat's default Account #0 as the "Issuer".
const ISSUER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Provider connected to the local Hardhat node
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const wallet = new ethers.Wallet(ISSUER_PRIVATE_KEY, provider);

/**
 * Route: POST /api/documents/issue
 * Desc: Hashes an uploaded document and anchors it on the blockchain.
 */
router.post('/issue', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No document uploaded' });
    }

    if (!registryAddress) {
      return res.status(500).json({ message: 'Smart contract not deployed' });
    }

    // 1. Calculate SHA-256 Hash of the raw file buffer
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const bytes32Hash = '0x' + hash;

    // 2. Connect to Smart Contract
    const contract = new ethers.Contract(registryAddress, abi, wallet);

    // 3. Send transaction to issue document
    const tx = await contract.issueDocument(bytes32Hash);
    await tx.wait(); // Wait for it to be mined

    res.json({
      message: 'Document issued successfully on the blockchain!',
      documentHash: bytes32Hash,
      transactionHash: tx.hash
    });
  } catch (err: any) {
    if (err.message.includes('Document already exists')) {
      return res.status(400).json({ message: 'This exact document has already been issued.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error during issuance' });
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

    // 1. Calculate SHA-256 Hash of the provided file
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const bytes32Hash = '0x' + hash;

    // 2. Connect to Smart Contract (Read-only, no wallet needed)
    const contract = new ethers.Contract(registryAddress, abi, provider);

    // 3. Query the blockchain
    try {
      const result = await contract.verifyDocument(bytes32Hash);
      const issuer = result[0];
      const timestamp = new Date(Number(result[1]) * 1000).toLocaleString();
      const isValid = result[2];

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
        return res.json({
          authentic: false,
          documentHash: bytes32Hash,
          message: 'Document not found on the blockchain. It may be forged or altered.'
        });
      }
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

export default router;
