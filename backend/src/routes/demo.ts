import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import prisma from '../database/sqlite';
import { getContractWithSigner } from '../utils/blockchain';
import logger from '../utils/audit';

const router = Router();

// TU Issuer address from Hardhat accounts[1]
const TU_ISSUER_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const TU_ISSUER_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

/**
 * POST /api/demo/issue-me
 * 
 * No-auth demo endpoint. Issues a real on-chain "student_id" credential
 * to any requesting wallet address so anyone can test the full SSO flow.
 * 
 * In production this would be gated — only real issuers can call /api/credentials/issue.
 * This endpoint exists solely for local demo / testing purposes.
 */
router.post('/issue-me', async (req: Request, res: Response) => {
  try {
    const { walletAddress, holderName, holderEmail } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'walletAddress is required' });
    }

    // Validate wallet address format
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid Ethereum wallet address' });
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const name = holderName?.trim() || 'Demo Student';
    const email = holderEmail?.trim() || '';

    // Check if credential already exists and is ACTIVE for this wallet
    const existingActive = await prisma.credential.findFirst({
      where: {
        holderAddress: normalizedAddress,
        credentialType: 'student_id',
        status: 'ACTIVE',
      },
    });

    if (existingActive) {
      return res.json({
        success: true,
        alreadyExists: true,
        message: 'You already have an active Student ID credential. You can log in to the University Portal now!',
        credential: existingActive,
      });
    }

    // Ensure the TU issuer exists in SQLite
    await prisma.issuer.upsert({
      where: { walletAddress: TU_ISSUER_ADDRESS.toLowerCase() },
      update: {},
      create: {
        walletAddress: TU_ISSUER_ADDRESS.toLowerCase(),
        name: 'Tribhuvan University',
        type: 'university',
        logoEmoji: '🏛️',
        email: 'admin@tu.edu.np',
        website: 'https://tu.edu.np',
        isApproved: true,
      },
    });

    // Generate unique credential hash
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
    const credentialHash = ethers.solidityPackedKeccak256(
      ['address', 'address', 'string', 'uint256'],
      [walletAddress, TU_ISSUER_ADDRESS, 'student_id', Date.now()]
    );

    logger.info(`🎓 Demo: Issuing student_id credential to ${walletAddress}. Hash: ${credentialHash}`);

    // Issue on-chain via CredentialRegistry using TU signer
    const credReg = getContractWithSigner('CredentialRegistry', TU_ISSUER_PRIVATE_KEY);
    const tx = await credReg.issueCredential(
      walletAddress,
      credentialHash,
      'student_id',
      name,
      expiry
    );
    const receipt = await tx.wait();

    // Generate a unique student ID
    const studentId = 'TU-DEMO-' + Math.floor(1000 + Math.random() * 9000);

    // Save to SQLite — status ACTIVE immediately (auto-claimed for demo)
    const credential = await prisma.credential.create({
      data: {
        credentialHash,
        holderAddress: normalizedAddress,
        holderName: name,
        holderEmail: email || null,
        issuerAddress: TU_ISSUER_ADDRESS.toLowerCase(),
        credentialType: 'student_id',
        status: 'ACTIVE',      // immediately active — no claim step needed for demo
        txHash: receipt.hash,
        expiresAt: new Date(expiry * 1000),
        claimedAt: new Date(),
        metadata: JSON.stringify({
          studentId,
          course: 'B.Sc. Computer Science',
          semester: '8th Semester',
          isDemo: true,
        }),
      },
    });

    logger.info(`✅ Demo credential issued and active for ${normalizedAddress}`);

    return res.json({
      success: true,
      message: `🎓 Student ID credential issued on-chain! You can now log in to the University Portal using your wallet.`,
      credential,
      txHash: receipt.hash,
      studentId,
    });

  } catch (error: any) {
    logger.error('Demo issue-me failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to issue demo credential: ' + (error?.message || 'Unknown error'),
    });
  }
});

/**
 * GET /api/demo/status/:address
 * Quick check: does this wallet have an active credential?
 */
router.get('/status/:address', async (req: Request, res: Response) => {
  try {
    const address = req.params.address.toLowerCase();
    const credential = await prisma.credential.findFirst({
      where: { holderAddress: address, credentialType: 'student_id', status: 'ACTIVE' },
    });
    return res.json({
      success: true,
      hasCredential: !!credential,
      credential: credential || null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Status check failed' });
  }
});

export default router;
