import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import prisma from '../database/sqlite';
import logger from '../utils/audit';

const router = Router();

/**
 * GET /api/did/:address
 * Resolves a wallet address to its off-chain DID document.
 */
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const address = req.params.address.toLowerCase();
    const didDoc = await prisma.dIDDocument.findUnique({
      where: { walletAddress: address },
    });

    if (!didDoc) {
      return res.status(404).json({ success: false, message: 'DID Document not found' });
    }

    return res.json({
      success: true,
      didDocument: JSON.parse(didDoc.didDocument),
    });
  } catch (error) {
    logger.error('Failed to resolve DID:', error);
    return res.status(500).json({ success: false, message: 'Failed to resolve DID' });
  }
});

/**
 * POST /api/did/register
 * Saves the off-chain metadata for a registered DID document.
 * The transaction itself is submitted by the client, and the details are recorded here.
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { walletAddress, didUri, documentHash, publicKey, txHash } = req.body;

    if (!walletAddress || !didUri || !documentHash || !publicKey) {
      return res.status(400).json({ success: false, message: 'Missing DID registration parameters' });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Create the standard DID Document structure
    const didDocObj = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: didUri,
      verificationMethod: [
        {
          id: `${didUri}#key-1`,
          type: 'EcdsaSecp256k1RecoveryMethod2020',
          controller: didUri,
          blockchainAccountId: `eip155:31337:${walletAddress}`,
        },
      ],
      authentication: [`${didUri}#key-1`],
      assertionMethod: [`${didUri}#key-1`],
    };

    const didDoc = await prisma.dIDDocument.upsert({
      where: { walletAddress: normalizedAddress },
      update: {
        didUri,
        documentHash,
        publicKey,
        didDocument: JSON.stringify(didDocObj),
        txHash,
      },
      create: {
        walletAddress: normalizedAddress,
        didUri,
        documentHash,
        publicKey,
        didDocument: JSON.stringify(didDocObj),
        txHash,
      },
    });

    logger.info(`🆔 DID registered off-chain for ${normalizedAddress} (URI: ${didUri})`);

    return res.json({ success: true, didDoc });
  } catch (error) {
    logger.error('Failed to register DID Document:', error);
    return res.status(500).json({ success: false, message: 'Failed to register DID' });
  }
});

export default router;
