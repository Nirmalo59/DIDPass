import { Router, Response } from 'express';
import prisma from '../database/sqlite';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import logger from '../utils/audit';

const router = Router();

/**
 * GET /api/issuers
 * Lists all approved issuers in the system.
 */
router.get('/', async (req, res) => {
  try {
    const issuers = await prisma.issuer.findMany({
      where: { isApproved: true },
      orderBy: { registeredAt: 'desc' }
    });
    return res.json({ success: true, issuers });
  } catch (error) {
    logger.error('Error fetching issuers:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch issuers' });
  }
});

/**
 * POST /api/issuers/register
 * Admin only: registers a new approved issuer (synchronizes with smart contract deployment).
 */
router.post('/register', authMiddleware, authorize(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { walletAddress, name, type, logoEmoji, email, website } = req.body;

    if (!walletAddress || !name || !type) {
      return res.status(400).json({ success: false, message: 'walletAddress, name, and type are required' });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Create or update approved issuer
    const issuer = await prisma.issuer.upsert({
      where: { walletAddress: normalizedAddress },
      update: {
        name,
        type,
        logoEmoji: logoEmoji || '🏛️',
        email,
        website,
        isApproved: true,
      },
      create: {
        walletAddress: normalizedAddress,
        name,
        type,
        logoEmoji: logoEmoji || '🏛️',
        email,
        website,
        isApproved: true,
      },
    });

    logger.info(`🏛️ New issuer registered by admin: ${name} (${normalizedAddress})`);

    return res.json({ success: true, issuer });
  } catch (error) {
    logger.error('Error registering issuer:', error);
    return res.status(500).json({ success: false, message: 'Failed to register issuer' });
  }
});

export default router;
