import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET ?? 'production-secret-jwt-key-foodrush';
    const decoded = jwt.verify(token, secret) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Dev token route — generates JWT token for demo/testing
export function devTokenRoute(req: Request, res: Response): void {
  const { userId } = req.body as { userId?: string };
  const targetUserId = userId ?? 'user-123';

  const secret = process.env.JWT_SECRET ?? 'production-secret-jwt-key-foodrush';
  const token = jwt.sign({ userId: targetUserId }, secret, { expiresIn: '7d' });
  res.json({ token });
}