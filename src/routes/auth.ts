// src/routes/auth.ts
import { Request, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  hashToken,
  getJwtExpirationDate,
} from '../utils/security';
import jwt from 'jsonwebtoken';

const JWT_SECRET = (process.env.JWT_SECRET ?? 'dev-secret') as string;
// 리프레시 토큰 요청 스키마
const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

type RefreshJwtPayload = {
  sub?: string | number;
  role?: string;
  type?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
};

const router = Router();

function buildErrorResponse(
  path: string,
  status: number,
  code: string,
  message: string,
  details: any = null,
) {
  return {
    timestamp: new Date().toISOString(),
    path,
    status,
    code,
    message,
    details,
  };
}

function getClientIp(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.ip;
}

async function persistRefreshToken(
  userId: number,
  refreshToken: string,
  req: Request,
) {
  const tokenHash = hashToken(refreshToken);
  const expiresAt =
    getJwtExpirationDate(refreshToken) ??
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: getClientIp(req),
      expiresAt,
    },
  });
}

// 디버그용
router.get('/ping', (req, res) => {
  res.status(200).json({
    status: 'OK',
    statusCode: 200,
    message: 'auth router 살아있음',
    data: null,
  });
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(64),
  name: z.string().min(1).max(50),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /auth/signup
router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      timestamp: new Date().toISOString(),
      path: '/auth/signup',
      status: 422,
      code: 'VALIDATION_FAILED',
      message: '요청 데이터가 올바르지 않습니다.',
      details: parsed.error.flatten(),
    });
  }

  const { email, password, name } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({
        timestamp: new Date().toISOString(),
        path: '/auth/signup',
        status: 409,
        code: 'DUPLICATE_RESOURCE',
        message: '이미 사용 중인 이메일입니다.',
        details: { email },
      });
    }

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashed,
        name,
        role: 'USER',     // 기본은 일반 유저
        status: 'ACTIVE', // 기본은 활성
      },
    });

    return res.status(201).json({
      status: 'CREATED',
      statusCode: 201,
      message: '회원가입 성공',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: '/auth/signup',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 내부 오류가 발생했습니다.',
      details: null,
    });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      timestamp: new Date().toISOString(),
      path: '/auth/login',
      status: 422,
      code: 'VALIDATION_FAILED',
      message: '요청 데이터가 올바르지 않습니다.',
      details: parsed.error.flatten(),
    });
  }

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({
        timestamp: new Date().toISOString(),
        path: '/auth/login',
        status: 401,
        code: 'UNAUTHORIZED',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        details: null,
      });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({
        timestamp: new Date().toISOString(),
        path: '/auth/login',
        status: 401,
        code: 'UNAUTHORIZED',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        details: null,
      });
    }

    // status 체크는 requireAuth 에서 하므로 여기서는 통과시켜도 됨
    const accessToken = signAccessToken(user.id, user.role);
    const refreshToken = signRefreshToken(user.id, user.role);

    await persistRefreshToken(user.id, refreshToken, req);

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '로그인 성공',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: '/auth/login',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 내부 오류가 발생했습니다.',
      details: null,
    });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json(
      buildErrorResponse(
        '/auth/refresh',
        422,
        'VALIDATION_FAILED',
        '?”ì²­ ?°ì´?°ê? ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.',
        parsed.error.flatten(),
      ),
    );
  }

  const { refreshToken } = parsed.data;

  try {
    let payload: RefreshJwtPayload;
    try {
      payload = jwt.verify(refreshToken, JWT_SECRET) as RefreshJwtPayload;
    } catch (err: any) {
      const isExpired = err?.name === 'TokenExpiredError';
      return res.status(401).json(
        buildErrorResponse(
          '/auth/refresh',
          401,
          isExpired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED',
          isExpired
            ? 'Refresh ? í°??ë§Œë£Œ?˜ì—ˆ?µë‹ˆ??'
            : '? í° ?¦ìŠ¤?´ ë§Œë£Œ?˜ì—ˆê²Œ ?ˆìŠµ?ˆë‹¤.',
        ),
      );
    }

    if (!payload || payload.type !== 'refresh') {
      return res.status(401).json(
        buildErrorResponse(
          '/auth/refresh',
          401,
          'UNAUTHORIZED',
          '? í° ì •ë³´ê°€ ?¬ë°”ë¥´ì§€ ?ŠìŠµ?ˆë‹¤.',
        ),
      );
    }

    const userId = Number(payload.sub);
    if (!userId) {
      return res.status(401).json(
        buildErrorResponse(
          '/auth/refresh',
          401,
          'UNAUTHORIZED',
          'Refresh ? í°??ë§Œë£Œ ì •ë³´ê°€ ë¶ˆì™¸?´ë‹¤.',
        ),
      );
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.userId !== userId) {
      return res.status(401).json(
        buildErrorResponse(
          '/auth/refresh',
          401,
          'UNAUTHORIZED',
          'Refresh ? í° ì´ë €ìŠ¤?´ íšê·¼?ìš´?ŠìŠµ?ˆë‹¤.',
        ),
      );
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      await prisma.refreshToken.delete({
        where: { tokenHash },
      }).catch(() => undefined);
      return res.status(401).json(
        buildErrorResponse(
          '/auth/refresh',
          401,
          'TOKEN_EXPIRED',
          'Refresh ? í°??ë§Œë£Œ?˜ì—ˆ?µë‹ˆ??',
        ),
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await prisma.refreshToken.delete({
        where: { tokenHash },
      }).catch(() => undefined);
      return res.status(404).json(
        buildErrorResponse(
          '/auth/refresh',
          404,
          'USER_NOT_FOUND',
          '?¬ìš©?ëŠ” ì •ë³´ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤.',
        ),
      );
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json(
        buildErrorResponse(
          '/auth/refresh',
          403,
          'USER_INACTIVE',
          'ë¹„í™œ?±í™”??ê³„ì •?…ë‹ˆ??',
          { status: user.status },
        ),
      );
    }

    await prisma.refreshToken.delete({
      where: { tokenHash },
    }).catch(() => undefined);

    const accessToken = signAccessToken(user.id, user.role);
    const newRefreshToken = signRefreshToken(user.id, user.role);
    await persistRefreshToken(user.id, newRefreshToken, req);

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '? í° ìž¬ë°œê¸? ?±ê³µ',
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json(
      buildErrorResponse(
        '/auth/refresh',
        500,
        'INTERNAL_SERVER_ERROR',
        '?œë²„ ?´ë? ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.',
      ),
    );
  }
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json(
      buildErrorResponse(
        '/auth/logout',
        422,
        'VALIDATION_FAILED',
        '?”ì²­ ?°ì´?°ê? ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.',
        parsed.error.flatten(),
      ),
    );
  }

  const { refreshToken } = parsed.data;

  try {
    try {
      const payload = jwt.verify(refreshToken, JWT_SECRET) as RefreshJwtPayload;
      if (!payload || payload.type !== 'refresh') {
        return res.status(401).json(
          buildErrorResponse(
            '/auth/logout',
            401,
            'UNAUTHORIZED',
            'Refresh ? í°??ë¥¼ ì•ˆì œì¸ ìƒíƒœë¡œ ì •ìƒ?ê°€ ?†ìŠµ?ˆë‹¤.',
          ),
        );
      }
    } catch (err: any) {
      const isExpired = err?.name === 'TokenExpiredError';
      return res.status(401).json(
        buildErrorResponse(
          '/auth/logout',
          401,
          isExpired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED',
          isExpired
            ? 'Refresh ? í°??ë§Œë£Œ?˜ì—ˆ?µë‹ˆ??'
            : 'Refresh ? í° ìˆ˜ì§‘ì— ì‹¤íŒ¨?˜ì—ˆ?µë‹ˆ??',
        ),
      );
    }

    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.deleteMany({ where: { tokenHash } });

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: 'ë¡œê·¸?¸ì›ƒ ì²˜ë¦¬ ?±ê³µ',
      data: null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json(
      buildErrorResponse(
        '/auth/logout',
        500,
        'INTERNAL_SERVER_ERROR',
        '?œë²„ ?´ë? ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.',
      ),
    );
  }
});

export default router;
