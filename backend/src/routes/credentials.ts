import { Router, Response } from 'express';
import { ethers } from 'ethers';
import prisma from '../database/sqlite';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import logger from '../utils/audit';
import { getContractWithSigner, logEventOnChain } from '../utils/blockchain';
import { sendEmail, formatCredentialEmail } from '../utils/email';

const router = Router();

// Get private keys for issuing based on wallet address
function getIssuerPrivateKey(walletAddress: string): string {
  const normalized = walletAddress.toLowerCase();
  if (normalized === (process.env.TU_ISSUER_ADDRESS || '').toLowerCase()) {
    return process.env.TU_ISSUER_PRIVATE_KEY || '';
  }
  if (normalized === (process.env.BANK_ISSUER_ADDRESS || '').toLowerCase()) {
    return process.env.BANK_ISSUER_PRIVATE_KEY || '';
  }
  // Default to admin private key for testing, or fail
  return process.env.ADMIN_PRIVATE_KEY || '';
}

/**
 * POST /api/credentials/issue
 * Issuer only: Issues a new verifiable credential on-chain and notifies the holder.
 */
router.post('/issue', authMiddleware, authorize(['issuer', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { holderAddress, holderName, holderEmail, credentialType, metadata, expiresAt, documentHash, encryptedFilePath, ipfsCid } = req.body;
    const issuerAddress = req.user?.walletAddress;

    if (!holderAddress || !holderName || !credentialType || !issuerAddress) {
      return res.status(400).json({ success: false, message: 'Missing required credential fields' });
    }

    const issuerPrivateKey = getIssuerPrivateKey(issuerAddress);
    if (!issuerPrivateKey) {
      return res.status(400).json({ success: false, message: 'Issuer private key not configured on backend' });
    }

    const expiryTimestamp = expiresAt ? Math.floor(new Date(expiresAt).getTime() / 1000) : 0;

    // Generate unique credential hash
    const credentialHash = ethers.solidityPackedKeccak256(
      ['address', 'address', 'string', 'uint256'],
      [holderAddress, issuerAddress, credentialType, Date.now()]
    );

    logger.info(`✍️ Issuing credential on-chain. Hash: ${credentialHash}`);

    // Call CredentialRegistry contract
    const credReg = getContractWithSigner('CredentialRegistry', issuerPrivateKey);
    const tx = await credReg.issueCredential(
      holderAddress,
      credentialHash,
      credentialType,
      holderName,
      expiryTimestamp
    );
    const receipt = await tx.wait();

    // Log the action on the on-chain AuditLedger
    const auditTxHash = await logEventOnChain(
      0, // CREDENTIAL_ISSUED enum value
      issuerAddress,
      JSON.stringify({ holderAddress, credentialType, credentialHash }),
      issuerPrivateKey
    );

    // Save to off-chain SQLite database
    const credential = await prisma.credential.create({
      data: {
        credentialHash,
        holderAddress: holderAddress.toLowerCase(),
        holderName,
        holderEmail,
        issuerAddress: issuerAddress.toLowerCase(),
        credentialType,
        documentHash,
        encryptedFilePath,
        ipfsCid,
        status: 'PENDING', // starts as pending until claimed
        txHash: receipt.hash,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        metadata: JSON.stringify(metadata || {}),
      },
    });

    // Send email to holder with claim link
    if (holderEmail) {
      const claimLink = `${process.env.FRONTEND_DIDPASS_URL}/holder?claim=${credentialHash}`;
      const emailHtml = formatCredentialEmail(holderName, credentialType, claimLink, credentialHash);
      
      await sendEmail({
        to: holderEmail,
        subject: '🛡️ Your DIDPass Digital Credential has been Issued!',
        html: emailHtml,
      });
    }

    return res.json({
      success: true,
      message: 'Credential successfully issued and anchored on-chain.',
      credential,
    });
  } catch (error) {
    logger.error('Failed to issue credential:', error);
    return res.status(500).json({ success: false, message: 'Issuance failed. Please verify issuer wallet and node connectivity.' });
  }
});

/**
 * GET /api/credentials/wallet/:address
 * Returns all credentials belonging to a specific wallet address.
 */
router.get('/wallet/:address', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const credentials = await prisma.credential.findMany({
      where: { holderAddress: address },
      include: { issuer: true },
      orderBy: { issuedAt: 'desc' },
    });
    return res.json({ success: true, credentials });
  } catch (error) {
    logger.error('Failed to fetch credentials for wallet:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch credentials' });
  }
});

/**
 * GET /api/credentials/pending/:address
 * Returns only pending credentials for a wallet.
 */
router.get('/pending/:address', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const credentials = await prisma.credential.findMany({
      where: { holderAddress: address, status: 'PENDING' },
      include: { issuer: true },
    });
    return res.json({ success: true, credentials });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch pending credentials' });
  }
});

/**
 * POST /api/credentials/claim
 * Claims a pending credential, changing status to ACTIVE.
 */
router.post('/claim', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { credentialHash } = req.body;
    const walletAddress = req.user?.walletAddress;

    if (!credentialHash || !walletAddress) {
      return res.status(400).json({ success: false, message: 'Missing credentialHash or wallet' });
    }

    const credential = await prisma.credential.findUnique({
      where: { credentialHash },
    });

    if (!credential || credential.holderAddress !== walletAddress.toLowerCase()) {
      return res.status(404).json({ success: false, message: 'Credential not found or unauthorized' });
    }

    const updated = await prisma.credential.update({
      where: { credentialHash },
      data: {
        status: 'ACTIVE',
        claimedAt: new Date(),
      },
    });

    logger.info(`👤 Holder ${walletAddress} claimed credential ${credentialHash}`);

    return res.json({ success: true, credential: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to claim credential' });
  }
});

/**
 * POST /api/credentials/revoke
 * Issuer only: Revokes an issued credential on-chain and updates off-chain status.
 */
router.post('/revoke', authMiddleware, authorize(['issuer', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { credentialHash, reason } = req.body;
    const issuerAddress = req.user?.walletAddress;

    if (!credentialHash || !reason || !issuerAddress) {
      return res.status(400).json({ success: false, message: 'credentialHash and reason required' });
    }

    const credential = await prisma.credential.findUnique({ where: { credentialHash } });
    if (!credential) {
      return res.status(404).json({ success: false, message: 'Credential not found' });
    }

    if (credential.issuerAddress !== issuerAddress.toLowerCase() && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the original issuer can revoke this credential' });
    }

    const issuerPrivateKey = getIssuerPrivateKey(issuerAddress);
    if (!issuerPrivateKey) {
      return res.status(400).json({ success: false, message: 'Issuer private key not configured' });
    }

    logger.info(`🚫 Revoking credential on-chain. Hash: ${credentialHash}`);

    // Call RevocationRegistry contract
    const revokeReg = getContractWithSigner('RevocationRegistry', issuerPrivateKey);
    const tx = await revokeReg.revokeCredential(credentialHash, reason);
    await tx.wait();

    // Log the revocation on AuditHashLedger
    await logEventOnChain(
      2, // CREDENTIAL_REVOKED
      issuerAddress,
      JSON.stringify({ credentialHash, reason }),
      issuerPrivateKey
    );

    // Update database status
    const updated = await prisma.credential.update({
      where: { credentialHash },
      data: { status: 'REVOKED' },
    });

    return res.json({
      success: true,
      message: 'Credential revoked successfully.',
      credential: updated,
    });
  } catch (error) {
    logger.error('Failed to revoke credential:', error);
    return res.status(500).json({ success: false, message: 'Revocation failed.' });
  }
});

export default router;
