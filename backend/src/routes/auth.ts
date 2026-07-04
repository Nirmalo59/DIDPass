import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../database/sqlite';
import logger from '../utils/audit';
import {
  checkCredentialExists,
  checkIssuerApproved,
  checkCredentialRevoked,
  checkCredentialExpired
} from '../utils/blockchain';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'didpass-super-secret-jwt-key-CHANGE-IN-PRODUCTION-2024';

/**
 * Helper to recover EIP-712 typed data signer address.
 */
function recoverSigner(domain: any, types: any, value: any, signature: string): string {
  // Eethers v6 verifyTypedData
  return ethers.verifyTypedData(domain, types, value, signature);
}

/**
 * POST /api/auth/challenge
 * Generates a challenge nonce for EIP-712 signature authentication.
 */
router.post('/challenge', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'Wallet address required' });
    }

    const wallet = walletAddress.toLowerCase();
    const nonce = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Save nonce in DB
    await prisma.nonce.create({
      data: {
        nonce,
        wallet,
        expiresAt,
      },
    });

    const didRegistryAddress = process.env.DID_REGISTRY_ADDRESS || ethers.ZeroAddress;

    // EIP-712 structure
    const domain = {
      name: 'DIDPass',
      version: '1',
      chainId: 31337,
      verifyingContract: didRegistryAddress,
    };

    const types = {
      LoginChallenge: [
        { name: 'message', type: 'string' },
        { name: 'nonce', type: 'string' },
        { name: 'wallet', type: 'address' },
      ],
    };

    const value = {
      message: 'Sign this challenge to prove identity ownership on DIDPass',
      nonce,
      wallet: walletAddress,
    };

    logger.info(`🔑 Challenge issued for wallet: ${walletAddress} (Nonce: ${nonce})`);

    return res.json({
      success: true,
      challenge: {
        domain,
        types,
        value,
      },
    });
  } catch (error) {
    logger.error('Error generating challenge:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/auth/verify
 * Verifies EIP-712 signature + performs the 4-check blockchain verification if requested.
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, nonce, credentialType, clientId, redirectUri } = req.body;

    if (!walletAddress || !signature || !nonce) {
      return res.status(400).json({ success: false, message: 'Missing verification parameters' });
    }

    const wallet = walletAddress.toLowerCase();

    // 1. Verify nonce
    const storedNonce = await prisma.nonce.findUnique({ where: { nonce } });
    if (!storedNonce || storedNonce.wallet !== wallet || storedNonce.used || storedNonce.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'Invalid, used, or expired challenge nonce' });
    }

    // Mark nonce as used
    await prisma.nonce.update({
      where: { nonce },
      data: { used: true },
    });

    // 2. Re-create EIP-712 parameters for signature recovery
    const didRegistryAddress = process.env.DID_REGISTRY_ADDRESS || ethers.ZeroAddress;
    const domain = {
      name: 'DIDPass',
      version: '1',
      chainId: 31337,
      verifyingContract: didRegistryAddress,
    };

    const types = {
      LoginChallenge: [
        { name: 'message', type: 'string' },
        { name: 'nonce', type: 'string' },
        { name: 'wallet', type: 'address' },
      ],
    };

    const value = {
      message: 'Sign this challenge to prove identity ownership on DIDPass',
      nonce,
      wallet: walletAddress,
    };

    // Recover address from signature
    const recoveredAddress = recoverSigner(domain, types, value, signature);
    if (recoveredAddress.toLowerCase() !== wallet) {
      return res.status(401).json({ success: false, message: 'Signature verification failed' });
    }

    // Determine platform role
    let role = 'holder';
    
    // Check if admin (the deployer contract owner)
    if (wallet === (process.env.ADMIN_WALLET_ADDRESS || '').toLowerCase()) {
      role = 'admin';
    } else {
      // Check if approved issuer on-chain
      const isApproved = await checkIssuerApproved(walletAddress);
      if (isApproved) {
        role = 'issuer';
      }
    }

    let holderName = 'DIDPass User';

    // 3. SSO flow with Verifier Request checks (The 4-Check Flow)
    if (clientId && credentialType) {
      logger.info(`🔍 SSO Authentication triggered for Client: ${clientId}, Type: ${credentialType}, Wallet: ${walletAddress}`);

      // Query database for user's credential details
      const credential = await prisma.credential.findFirst({
        where: {
          holderAddress: wallet,
          credentialType,
        },
        orderBy: { issuedAt: 'desc' },
      });

      if (!credential) {
        return res.status(403).json({
          success: false,
          message: `Verification failed: No credential of type '${credentialType}' found for wallet.`,
        });
      }

      holderName = credential.holderName;
      const credHash = credential.credentialHash;

      // ─── THE 4-CHECK VERIFICATION ENGINE ───
      // Check 1: Does the credential exist?
      const check1 = await checkCredentialExists(credHash);
      if (!check1) {
        return res.status(403).json({ success: false, message: 'Verification failed: Credential hash not found on-chain.' });
      }

      // Check 2: Was it issued by a valid, approved issuer?
      const check2 = await checkIssuerApproved(credential.issuerAddress);
      if (!check2) {
        return res.status(403).json({ success: false, message: 'Verification failed: Credential issuer is not currently approved.' });
      }

      // Check 3: Has it been revoked?
      const check3 = await checkCredentialRevoked(credHash);
      if (check3) {
        return res.status(403).json({ success: false, message: 'Verification failed: This credential has been revoked by the issuer.' });
      }

      // Check 4: Has it expired?
      const check4 = await checkCredentialExpired(credHash);
      if (check4) {
        return res.status(403).json({ success: false, message: 'Verification failed: This credential has expired.' });
      }

      logger.info(`✅ 4-Check Verification Passed for ${walletAddress}. Generating authorization token.`);
      
      // Update credential status to active if it passed
      await prisma.credential.update({
        where: { id: credential.id },
        data: { status: 'ACTIVE' },
      });
    }

    // 4. Generate JWT
    const token = jwt.sign(
      { walletAddress, role, holderName },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Logging audit trail
    await prisma.auditLog.create({
      data: {
        eventHash: ethers.solidityPackedKeccak256(['string', 'address', 'uint256'], ['LOGIN', walletAddress, Date.now()]),
        actionType: 'LOGIN_SUCCESS',
        actor: walletAddress,
        details: JSON.stringify({ role, clientId, credentialType }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // SSO Redirect response
    if (redirectUri) {
      const redirectUrl = `${redirectUri}?token=${token}&success=true&walletAddress=${walletAddress}&holderName=${encodeURIComponent(holderName)}`;
      return res.json({
        success: true,
        redirect: redirectUrl,
        token,
        role,
      });
    }

    return res.json({
      success: true,
      token,
      role,
      walletAddress,
      holderName,
    });
  } catch (error) {
    logger.error('Authentication verification failed:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/auth/verify-token
 * Validates a JWT token and returns the payload.
 */
router.get('/verify-token', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ success: true, user: decoded });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

export default router;
