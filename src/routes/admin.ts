// src/routes/admin.ts
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { AuthRequest, requireAdmin } from '../middlewares/auth';
import { getPagination, buildPagedResponse } from '../utils/pagination';

const router = Router();

const listQuerySchema = z.object({
  keyword: z.string().optional(),
  page: z.coerce.number().int().nonnegative().default(0),
  size: z.coerce.number().int().positive().max(50).default(10),
  sort: z.string().optional(),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const roleBodySchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

/**
 * GET /admin/users
 * - 전체 사용자 목록 조회 (ADMIN 전용)
 */
router.get('/users', requireAdmin, async (req, res): Promise<any> => {
  const parsedQuery = listQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(422).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 422,
      code: 'INVALID_QUERY_PARAM',
      message: 'query 파라미터가 올바르지 않습니다.',
      details: parsedQuery.error.flatten(),
    });
  }

  const { keyword, page, size, sort } = parsedQuery.data;

  const pagination = getPagination(
    { page, size, sort },
    {
      defaultPage: 0,
      defaultSize: 10,
      maxSize: 50,
      defaultSort: 'createdAt,DESC',
    },
  );

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
      message: '전체 사용자 목록 조회 성공',
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
 * - 사용자 계정 비활성화 (status = 'INACTIVE')
 */
router.patch(
  '/users/:id/deactivate',
  requireAdmin,
  async (req: AuthRequest, res) => {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(422).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 422,
        code: 'VALIDATION_FAILED',
        message: '유효하지 않은 사용자 ID입니다.',
        details: parsedParams.error.flatten(),
      });
    }
    const { id } = parsedParams.data;

    if (req.user && req.user.id === id) {
      return res.status(403).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 403,
        code: 'FORBIDDEN',
        message: '자기 자신을 비활성화할 수 없습니다.',
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
 * - 사용자 권한 변경(USER <-> ADMIN)
 */
router.patch('/users/:id/role', requireAdmin, async (req: AuthRequest, res) => {
  const parsedParams = idParamSchema.safeParse(req.params);
  const parsedBody = roleBodySchema.safeParse(req.body);

  if (!parsedParams.success || !parsedBody.success) {
    return res.status(422).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 422,
      code: 'VALIDATION_FAILED',
      message: '유효하지 않은 요청입니다.',
      details: {
        params: parsedParams.success ? undefined : parsedParams.error.flatten(),
        body: parsedBody.success ? undefined : parsedBody.error.flatten(),
      },
    });
  }

  const { id } = parsedParams.data;
  const { role } = parsedBody.data;

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
