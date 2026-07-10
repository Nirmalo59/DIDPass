import { Router } from 'express';
import Log from '../models/Log';

const router = Router();

// GET /api/logs
// Fetch the latest 50 logs, sorted by newest first
router.get('/', async (req, res) => {
  try {
    const logs = await Log.find().sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Server error fetching logs' });
  }
});

export default router;
