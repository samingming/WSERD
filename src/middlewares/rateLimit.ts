// src/middlewares/rateLimit.ts
import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

function build429Json(path: string) {
  return {
    timestamp: new Date().toISOString(),
    path,
    status: 429,
    code: 'TOO_MANY_REQUESTS',
    message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
    details: null,
  };
}

// 전역 기본 레이트리밋 (예: 1분에 100요청)
export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 100,            // 1분 동안 IP당 100요청
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json(build429Json(req.path));
  },
});

// 인증/로그인 전용 레이트리밋 (조금 더 빡세게)
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10,             // 1분에 10번만 시도 가능
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json(build429Json(req.path));
  },
});
