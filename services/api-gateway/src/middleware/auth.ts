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
    const secret = process.env.JWT_SECRET ?? 'dev-secret';
    const decoded = jwt.verify(token, secret) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Dev-only helper — generates a test token so you can hit the
// gateway without building a full auth service yet.
// POST /dev/token { "userId": "user-123" } → { token }
export function devTokenRoute(req: Request, res: Response): void {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  const secret = process.env.JWT_SECRET ?? 'dev-secret';
  const token = jwt.sign({ userId }, secret, { expiresIn: '24h' });
  res.json({ token });
}