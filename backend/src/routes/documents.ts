import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';
import prisma from '../database/sqlite';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import logger from '../utils/audit';
import { encryptFile, decryptFile } from '../utils/crypto';
import { generateMockIPFSCid } from '../utils/ipfs';
import { getContractWithSigner, logEventOnChain } from '../utils/blockchain';

const router = Router();

// Multer storage for temporary unencrypted uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const tempDir = path.join(uploadDir, 'temp');

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|png|jpg|jpeg|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only document files (PDF, images, DOCX) are allowed'));
  },
});

// Helper to get private keys
function getIssuerPrivateKey(walletAddress: string): string {
  const normalized = walletAddress.toLowerCase();
  if (normalized === (process.env.TU_ISSUER_ADDRESS || '').toLowerCase()) {
    return process.env.TU_ISSUER_PRIVATE_KEY || '';
  }
  if (normalized === (process.env.BANK_ISSUER_ADDRESS || '').toLowerCase()) {
    return process.env.BANK_ISSUER_PRIVATE_KEY || '';
  }
  return process.env.ADMIN_PRIVATE_KEY || '';
}

/**
 * POST /api/documents/upload
 * Issuer only: Uploads a document, encrypts it using AES-256-GCM, generates mock IPFS CID,
 * anchors the SHA-256 hash on-chain, and registers in DB.
 */
router.post('/upload', authMiddleware, authorize(['issuer', 'admin']), upload.single('document'), async (req: AuthenticatedRequest, res: Response) => {
  let tempFilePath = '';
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    tempFilePath = req.file.path;
    const documentType = req.body.documentType || 'transcript';
    const issuerAddress = req.user?.walletAddress;

    if (!issuerAddress) {
      return res.status(401).json({ success: false, message: 'Unauthorized issuer' });
    }

    const issuerPrivateKey = getIssuerPrivateKey(issuerAddress);
    if (!issuerPrivateKey) {
      return res.status(500).json({ success: false, message: 'Issuer credentials not configured on server' });
    }

    // Target encrypted path
    const encryptedFilename = `${uuidv4()}.enc`;
    const encryptedDir = path.join(uploadDir, 'encrypted');
    if (!fs.existsSync(encryptedDir)) fs.mkdirSync(encryptedDir, { recursive: true });
    const encryptedFilePath = path.join(encryptedDir, encryptedFilename);

    // Encrypt the file using AES-256-GCM
    logger.info(`🔒 Encrypting file: ${req.file.originalname}`);
    const { sha256Hash, iv, authTag } = await encryptFile(tempFilePath, encryptedFilePath);

    // Generate mock IPFS CID
    const ipfsCid = generateMockIPFSCid(sha256Hash);

    // Anchor Document SHA-256 on blockchain
    logger.info(`🔗 Anchoring document hash ${sha256Hash} on-chain...`);
    const docReg = getContractWithSigner('DocumentProofRegistry', issuerPrivateKey);
    const hashBytes32 = '0x' + sha256Hash;
    const tx = await docReg.registerDocumentProof(
      hashBytes32,
      documentType,
      req.file.originalname,
      ipfsCid
    );
    const receipt = await tx.wait();

    // Log upload in on-chain AuditLedger
    await logEventOnChain(
      5, // DOCUMENT_UPLOADED
      issuerAddress,
      JSON.stringify({ sha256Hash, documentType, ipfsCid }),
      issuerPrivateKey
    );

    // Save metadata in SQLite DB
    const document = await prisma.document.create({
      data: {
        originalName: req.file.originalname,
        storedName: encryptedFilename,
        mimeType: req.file.mimetype,
        sha256Hash,
        encryptedPath: encryptedFilePath,
        iv,
        authTag,
        ipfsCid,
        fileSize: req.file.size,
        documentType,
        uploadedBy: issuerAddress.toLowerCase(),
        txHash: receipt.hash,
      },
    });

    logger.info(`✅ Document registered: ${document.id} | SHA-256: ${sha256Hash}`);

    return res.json({
      success: true,
      message: 'Document successfully encrypted, stored, and anchored on-chain.',
      document: {
        id: document.id,
        originalName: document.originalName,
        sha256Hash: document.sha256Hash,
        ipfsCid: document.ipfsCid,
        txHash: document.txHash,
      },
    });
  } catch (error) {
    logger.error('Failed to upload document:', error);
    return res.status(500).json({ success: false, message: 'Document processing failed' });
  } finally {
    // Delete unencrypted temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
});

/**
 * GET /api/documents/:hash/verify
 * Public: Verifies document integrity against the blockchain anchor hash.
 */
router.get('/:hash/verify', async (req, res) => {
  try {
    const hash = req.params.hash;
    const hashBytes32 = '0x' + hash;

    // Call smart contract verifyDocument
    const docReg = (await prisma.document.findUnique({ where: { sha256Hash: hash } })) 
      ? getContractWithSigner('DocumentProofRegistry', process.env.ADMIN_PRIVATE_KEY || '')
      : null;

    if (!docReg) {
      return res.json({ success: true, verified: false, message: 'No proof registered in off-chain database' });
    }

    const onChainVerified = await docReg.verifyDocument(hashBytes32);
    const dbDoc = await prisma.document.findUnique({
      where: { sha256Hash: hash },
      include: { issuer: true },
    });

    if (onChainVerified && dbDoc) {
      return res.json({
        success: true,
        verified: true,
        message: 'Document integrity successfully verified on-chain!',
        document: {
          originalName: dbDoc.originalName,
          documentType: dbDoc.documentType,
          uploadedBy: dbDoc.issuer.name,
          uploadedAt: dbDoc.uploadedAt,
          ipfsCid: dbDoc.ipfsCid,
          txHash: dbDoc.txHash,
        },
      });
    }

    return res.json({ success: true, verified: false, message: 'Document proof not verified on-chain' });
  } catch (error) {
    logger.error('Failed to verify document:', error);
    return res.status(500).json({ success: false, message: 'Verification error' });
  }
});

/**
 * GET /api/documents/:hash/download
 * Restricted: Decrypts AES-256-GCM file and streams it back.
 * Access allowed only to: (1) Issuer who uploaded it, (2) User holding the matching credential.
 */
router.get('/:hash/download', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const hash = req.params.hash;
    const userWallet = req.user?.walletAddress.toLowerCase();

    if (!userWallet) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const document = await prisma.document.findUnique({
      where: { sha256Hash: hash },
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Check permissions
    let accessGranted = false;

    // 1. Is user the issuer?
    if (document.uploadedBy === userWallet) {
      accessGranted = true;
    } else {
      // 2. Is user the holder of a credential linking this document?
      const credential = await prisma.credential.findFirst({
        where: {
          holderAddress: userWallet,
          documentHash: hash,
          status: 'ACTIVE',
        },
      });
      if (credential) accessGranted = true;
    }

    // Admin role override
    if (req.user?.role === 'admin') {
      accessGranted = true;
    }

    if (!accessGranted) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not have permissions to view this document.' });
    }

    // Decrypt the file
    logger.info(`🔓 Decrypting file for download: ${document.originalName}`);
    const decryptedBuffer = await decryptFile(
      document.encryptedPath,
      document.iv,
      document.authTag
    );

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    return res.send(decryptedBuffer);
  } catch (error) {
    logger.error('Failed to download document:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve document' });
  }
});

export default router;
