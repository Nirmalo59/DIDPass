import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'didpass-super-secret-jwt-key-CHANGE-IN-PRODUCTION-2024';

export interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
    role: string; // 'admin' | 'issuer' | 'holder'
    institutionId?: string;
  };
}

/**
 * Middleware to authenticate requests using JWT tokens.
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedRequest['user'];
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
}
