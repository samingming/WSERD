// src/routes/debug.ts
import { Router } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

// GET /debug/users
router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
  });

  return res.status(200).json({
    status: 'OK',
    statusCode: 200,
    message: '유저 목록 조회 성공 (디버그용)',
    data: users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
    })),
  });
});

export default router;
