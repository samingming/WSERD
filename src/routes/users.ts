// src/routes/users.ts
import { Router } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest, requireAuth } from '../middlewares/auth';
import { z } from 'zod';

const router = Router();

// GET /users/me
router.get('/me', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  return res.status(200).json({
    status: 'OK',
    statusCode: 200,
    message: '내 정보 조회 성공',
    data: user,
  });
});

// PATCH /users/me
router.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    name: z.string().min(1).max(50),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      timestamp: new Date().toISOString(),
      path: '/users/me',
      status: 422,
      code: 'VALIDATION_FAILED',
      message: '이름을 올바르게 입력해 주세요.',
      details: parsed.error.flatten(),
    });
  }

  const userId = req.user!.id;

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name: parsed.data.name },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '프로필이 수정되었습니다.',
      data: updated,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: '/users/me',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '사용자 정보를 수정하지 못했습니다.',
      details: null,
    });
  }
});

export default router;
