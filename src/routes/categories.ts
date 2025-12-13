// src/routes/categories.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { requireAdmin } from '../middlewares/auth';
import { getPagination, buildPagedResponse } from '../utils/pagination';
import { buildCacheKey, cache } from '../utils/cache';

const router = Router();

const CATEGORY_LIST_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CATEGORY_CACHE_PREFIX = 'categories:list';

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.number().int().positive().nullable().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

function handleWriteError(err: unknown, path: string, res: Response) {
  console.error(err);
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    return res.status(409).json({
      timestamp: new Date().toISOString(),
      path,
      status: 409,
      code: 'DUPLICATE_RESOURCE',
      message: 'Category name already exists.',
      details: null,
    });
  }

  return res.status(500).json({
    timestamp: new Date().toISOString(),
    path,
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: '서버 오류로 카테고리를 처리하지 못했습니다.',
    details: null,
  });
}

function parseCategoryId(raw: string, path: string, res: Response) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({
      timestamp: new Date().toISOString(),
      path,
      status: 400,
      code: 'BAD_REQUEST',
      message: '유효한 카테고리 ID가 필요합니다.',
      details: { id: raw },
    });
    return null;
  }
  return id;
}

router.post('/', requireAdmin, async (req, res) => {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      timestamp: new Date().toISOString(),
      path: '/categories',
      status: 422,
      code: 'VALIDATION_FAILED',
      message: '카테고리 요청 본문이 올바르지 않습니다.',
      details: parsed.error.flatten(),
    });
  }

  const { name, parentId } = parsed.data;

  try {
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        return res.status(404).json({
          timestamp: new Date().toISOString(),
          path: '/categories',
          status: 404,
          code: 'RESOURCE_NOT_FOUND',
          message: '부모 카테고리를 찾을 수 없습니다.',
          details: { parentId },
        });
      }
    }

    const created = await prisma.category.create({
      data: {
        name,
        parentId: parentId ?? null,
      },
    });

    cache.invalidatePrefix(CATEGORY_CACHE_PREFIX);

    return res.status(201).json({
      status: 'CREATED',
      statusCode: 201,
      message: '카테고리가 생성되었습니다.',
      data: created,
    });
  } catch (err) {
    return handleWriteError(err, '/categories', res);
  }
});

router.get('/', async (req, res) => {
  const { keyword, parentId } = req.query as {
    keyword?: string;
    parentId?: string;
  };

  const pagination = getPagination(req.query, {
    defaultPage: 0,
    defaultSize: 10,
    maxSize: 50,
    defaultSort: 'name,ASC',
  });

  let orderBy: any = { name: 'asc' };
  if (pagination.sort) {
    const [fieldRaw, dirRaw] = pagination.sort.split(/[,:]/);
    const field = (fieldRaw ?? 'name').trim();
    const dir =
      (dirRaw ?? 'ASC').toUpperCase() === 'DESC' ? 'desc' : 'asc';
    const allowed = ['name', 'createdAt'];
    orderBy = { [allowed.includes(field) ? field : 'name']: dir };
  }

  const where: any = {};
  if (keyword && keyword.trim().length > 0) {
    where.name = { contains: keyword.trim() };
  }

  if (parentId !== undefined) {
    if (parentId === 'null' || parentId === 'root') {
      where.parentId = null;
    } else {
      const parsedParent = Number(parentId);
      if (!Number.isInteger(parsedParent) || parsedParent <= 0) {
        return res.status(400).json({
          timestamp: new Date().toISOString(),
          path: '/categories',
          status: 400,
          code: 'INVALID_QUERY_PARAM',
          message: 'parentId query is invalid.',
          details: { parentId },
        });
      }
      where.parentId = parsedParent;
    }
  }

  try {
    const cacheKey = buildCacheKey(CATEGORY_CACHE_PREFIX, {
      keyword,
      parentId,
      sort: pagination.sort,
      page: pagination.page,
      size: pagination.size,
    });
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const [items, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.category.count({ where }),
    ]);

    const paged = buildPagedResponse(items, total, {
      page: pagination.page,
      size: pagination.size,
      sort: pagination.sort,
    });

    const responseBody = {
      status: 'OK',
      statusCode: 200,
      message: 'Category list fetched successfully.',
      data: paged,
    };

    cache.set(cacheKey, responseBody, CATEGORY_LIST_CACHE_TTL);

    return res.status(200).json(responseBody);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: '/categories',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch category list.',
      details: null,
    });
  }
});
router.get('/:id', async (req, res) => {
  const id = parseCategoryId(req.params.id, req.path, res);
  if (id === null) return;

  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        children: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            bookCategories: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '카테고리를 찾을 수 없습니다.',
        details: { id },
      });
    }

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '카테고리 상세 조회에 성공했습니다.',
      data: {
        id: category.id,
        name: category.name,
        parent: category.parent,
        childCategories: category.children,
        bookCount: category._count.bookCategories,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '카테고리를 조회하지 못했습니다.',
      details: null,
    });
  }
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const id = parseCategoryId(req.params.id, req.path, res);
  if (id === null) return;

  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 422,
      code: 'VALIDATION_FAILED',
      message: '카테고리 요청 본문이 올바르지 않습니다.',
      details: parsed.error.flatten(),
    });
  }

  const { name, parentId } = parsed.data;

  try {
    if (parentId !== undefined) {
      if (parentId === id) {
        return res.status(400).json({
          timestamp: new Date().toISOString(),
          path: req.path,
          status: 400,
          code: 'BAD_REQUEST',
          message: '카테고리는 자기 자신을 부모로 설정할 수 없습니다.',
          details: { parentId },
        });
      }
      if (parentId) {
        const parent = await prisma.category.findUnique({ where: { id: parentId } });
        if (!parent) {
          return res.status(404).json({
            timestamp: new Date().toISOString(),
            path: req.path,
            status: 404,
            code: 'RESOURCE_NOT_FOUND',
            message: '부모 카테고리를 찾을 수 없습니다.',
            details: { parentId },
          });
        }
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name ?? undefined,
        parentId:
          parentId !== undefined
            ? parentId ?? null
            : undefined,
      },
    });

    cache.invalidatePrefix(CATEGORY_CACHE_PREFIX);

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '카테고리가 수정되었습니다.',
      data: updated,
    });
  } catch (err) {
    return handleWriteError(err, req.path, res);
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const id = parseCategoryId(req.params.id, req.path, res);
  if (id === null) return;

  try {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '카테고리를 찾을 수 없습니다.',
        details: { id },
      });
    }

    const [childrenCount, bookCount] = await Promise.all([
      prisma.category.count({ where: { parentId: id } }),
      prisma.bookCategory.count({ where: { categoryId: id } }),
    ]);

    if (childrenCount > 0 || bookCount > 0) {
      return res.status(409).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 409,
        code: 'STATE_CONFLICT',
        message: '하위 분류나 도서가 연결된 카테고리는 삭제할 수 없습니다.',
        details: { childrenCount, bookCount },
      });
    }

    await prisma.category.delete({ where: { id } });

    cache.invalidatePrefix(CATEGORY_CACHE_PREFIX);

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '카테고리가 삭제되었습니다.',
      data: { id },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '카테고리를 삭제하지 못했습니다.',
      details: null,
    });
  }
});

export default router;
