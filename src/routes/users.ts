// src/routes/users.ts
import { Router } from 'express';
import { AuthRequest, requireAuth } from '../middlewares/auth';

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

export default router;
