import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

/**
 * Middleware to restrict route access by role.
 * Roles: 'admin', 'issuer', 'holder'
 */
export function authorize(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(430).json({ 
        success: false, 
        message: `Forbidden: Access restricted. Required role(s): [${roles.join(', ')}]. Your role: ${req.user.role}`
      });
    }

    next();
  };
}
