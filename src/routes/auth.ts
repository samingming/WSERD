// src/routes/auth.ts
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
} from '../utils/security';
import jwt from 'jsonwebtoken';

const JWT_SECRET = (process.env.JWT_SECRET ?? 'dev-secret') as string;
// 리프레시 토큰 요청 스키마
const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const router = Router();

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
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      path: '/auth/signup',
      status: 400,
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
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      path: '/auth/login',
      status: 400,
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

export default router;
