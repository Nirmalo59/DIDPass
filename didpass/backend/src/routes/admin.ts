import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Log from '../models/Log';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-coursework-only';

// Middleware to protect admin routes
const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Apply middleware to all admin routes
router.use(adminAuth);

// GET /api/admin/users - List all users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await User.find({}, '-nonce').sort({ createdAt: -1 }); // Don't return nonces
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id/suspend - Toggle suspend status
router.put('/users/:id/suspend', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'ADMIN') return res.status(400).json({ message: 'Cannot suspend an admin' });

    user.status = user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    await user.save();

    await Log.create({
      endpoint: req.originalUrl,
      action: user.status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
      details: `Admin changed status of ${user.walletAddress} to ${user.status}`,
      status: 'SUCCESS',
      ipAddress: req.ip
    });

    res.json({ message: `User status changed to ${user.status}`, user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

// DELETE /api/admin/users/:id - Delete a user
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'ADMIN') return res.status(400).json({ message: 'Cannot delete an admin' });

    await User.findByIdAndDelete(req.params.id);

    await Log.create({
      endpoint: req.originalUrl,
      action: 'USER_DELETED',
      details: `Admin deleted user ${user.walletAddress}`,
      status: 'SUCCESS',
      ipAddress: req.ip
    });

    res.json({ message: 'User successfully deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

export default router;
