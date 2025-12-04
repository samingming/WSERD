// src/middlewares/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface AuthUserPayload {
  id: number;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | string;
}

export interface AuthRequest extends Request {
  user?: AuthUserPayload;
}

function extractToken(req: Request): string | null {
  const auth = req.headers['authorization'];
  if (!auth) return null;
  const [type, token] = auth.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 401,
        code: 'UNAUTHORIZED',
        message: '인증 토큰이 필요합니다.',
        details: null,
      });
    }

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err: any) {
      const isExpired = err?.name === 'TokenExpiredError';
      return res.status(401).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 401,
        code: isExpired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED',
        message: isExpired
          ? '토큰이 만료되었습니다.'
          : '유효하지 않은 토큰입니다.',
        details: null,
      });
    }

    const userId = Number(payload.sub);
    if (!userId) {
      return res.status(401).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 401,
        code: 'UNAUTHORIZED',
        message: '토큰에 유효한 사용자 정보가 없습니다.',
        details: null,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 404,
        code: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.',
        details: null,
      });
    }

    // 🔥 여기서 status 체크: ACTIVE만 통과
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 403,
        code: 'USER_INACTIVE',
        message: '비활성화된 계정입니다.',
        details: { status: user.status },
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'USER' | 'ADMIN',
      status: user.status as any,
    };

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '인증 처리 중 오류가 발생했습니다.',
      details: null,
    });
  }
}

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  await requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 403,
        code: 'FORBIDDEN',
        message: '관리자 권한이 필요합니다.',
        details: null,
      });
    }
    next();
  });
}
