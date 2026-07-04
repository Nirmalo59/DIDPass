import { Router, Response } from 'express';
import prisma from '../database/sqlite';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

/**
 * GET /api/audit/logs
 * Admin only: returns all platform logs from SQLite, ordered by newest first.
 */
router.get('/logs', authMiddleware, authorize(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100, // limit to last 100 entries
    });
    return res.json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

export default router;
