// src/routes/admin.ts
import { Router } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest, requireAdmin } from '../middlewares/auth';
import { getPagination, buildPagedResponse } from '../utils/pagination';

const router = Router();

/**
 * GET /admin/users
 * - 전체 유저 목록 조회 (ADMIN 전용)
 */
router.get('/users', requireAdmin, async (req, res): Promise<any> => {
  const { keyword } = req.query as { keyword?: string };

  const pagination = getPagination(req.query, {
    defaultPage: 0,
    defaultSize: 10,
    maxSize: 50,
    defaultSort: 'createdAt,DESC',
  });

  let orderBy: any = { createdAt: 'desc' };
  if (pagination.sort) {
    const [fieldRaw, dirRaw] = pagination.sort.split(/[,:]/);
    const field = (fieldRaw ?? 'createdAt').trim();
    const dir =
      (dirRaw ?? 'DESC').toUpperCase() === 'ASC' ? 'asc' : 'desc';

    const allowedFields = ['createdAt', 'email', 'name'];
    const sortField = allowedFields.includes(field)
      ? field
      : 'createdAt';

    orderBy = { [sortField]: dir };
  }

  const where: any = {};

  if (keyword && keyword.trim().length > 0) {
    const kw = keyword.trim();
    where.OR = [
      { email: { contains: kw } },
      { name: { contains: kw } },
    ];
  }

  try {
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const paged = buildPagedResponse(items, total, {
      page: pagination.page,
      size: pagination.size,
      sort: pagination.sort,
    });

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '전체 유저 목록 조회 성공',
      data: paged,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 내부 오류가 발생했습니다.',
      details: null,
    });
  }
});

/**
 * PATCH /admin/users/:id/deactivate
 * - 유저 계정 비활성화 (status = 'INACTIVE')
 */
router.patch(
  '/users/:id/deactivate',
  requireAdmin,
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 400,
        code: 'BAD_REQUEST',
        message: '유효하지 않은 사용자 ID입니다.',
        details: { id: req.params.id },
      });
    }

    // 자기 자신 비활성화 방지 (선택사항이지만 편한 체크)
    if (req.user && req.user.id === id) {
      return res.status(403).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 403,
        code: 'FORBIDDEN',
        message: '자기 자신은 비활성화할 수 없습니다.',
        details: { id },
      });
    }

    try {
      const updated = await prisma.user.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });

      return res.status(200).json({
        status: 'OK',
        statusCode: 200,
        message: '사용자 비활성화 성공',
        data: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          role: updated.role,
          status: updated.status,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 404,
        code: 'USER_NOT_FOUND',
        message: '해당 ID의 사용자를 찾을 수 없습니다.',
        details: { id },
      });
    }
  },
);

/**
 * PATCH /admin/users/:id/role
 * - 유저 권한 변경 (USER <-> ADMIN)
 */
router.patch('/users/:id/role', requireAdmin, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { role } = req.body as { role?: string };

  if (Number.isNaN(id) || !role) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 400,
      code: 'BAD_REQUEST',
      message: 'ID와 role이 모두 필요합니다.',
      details: { id: req.params.id, role },
    });
  }

  if (!['USER', 'ADMIN'].includes(role)) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 400,
      code: 'INVALID_ROLE',
      message: 'role은 USER 또는 ADMIN 이어야 합니다.',
      details: { role },
    });
  }

  // 자기 자신 role 변경은 허용(선택적으로 막아도 됨)

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { role },
    });

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '사용자 권한 변경 성공',
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 404,
      code: 'USER_NOT_FOUND',
      message: '해당 ID의 사용자를 찾을 수 없습니다.',
      details: { id },
    });
  }
});

export default router;
