// src/routes/books.ts
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { getPagination, buildPagedResponse } from '../utils/pagination';
import { AuthRequest, requireAdmin } from '../middlewares/auth';

const router = Router();

// 생성용 스키마
const createBookSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  isbn13: z.string().max(13).optional(),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  languageCode: z.string().max(10).optional(),
  pageCount: z.number().int().positive().optional(),
  coverUrl: z.string().url().optional(),
  publishedAt: z.string().datetime().optional(),
});

// 수정용 스키마 (부분 업데이트)
const updateBookSchema = createBookSchema.partial();

/**
 * POST /books
 * - 도서 생성 (ADMIN 전용)
 */
router.post('/', requireAdmin, async (req: AuthRequest, res) => {
  const parsed = createBookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      timestamp: new Date().toISOString(),
      path: '/books',
      status: 422,
      code: 'VALIDATION_FAILED',
      message: '요청 데이터가 올바르지 않습니다.',
      details: parsed.error.flatten(),
    });
  }

  const data = parsed.data;

  try {
    const book = await prisma.book.create({
      data: {
        title: data.title,
        description: data.description,
        isbn13: data.isbn13,
        price: data.price,
        stock: data.stock,
        languageCode: data.languageCode,
        pageCount: data.pageCount,
        coverUrl: data.coverUrl,
        publishedAt: data.publishedAt
          ? new Date(data.publishedAt)
          : undefined,
      },
    });

    return res.status(201).json({
      status: 'CREATED',
      statusCode: 201,
      message: '도서 생성 성공',
      data: book,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: '/books',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '도서 생성 중 오류가 발생했습니다.',
      details: null,
    });
  }
});

/**
 * GET /books
 * - 도서 목록 조회 (검색 + 정렬 + 페이지네이션)
 * - query:
 *   - keyword: 제목/설명 검색
 *   - minPrice, maxPrice
 *   - sort: createdAt,DESC | price,ASC ...
 *   - page, size
 */
router.get('/', async (req, res): Promise<any> => {
  const { keyword } = req.query as { keyword?: string };

  // 공통 페이지네이션 파싱
  const pagination = getPagination(req.query, {
    defaultPage: 0,
    defaultSize: 10,
    maxSize: 50,
    defaultSort: 'createdAt,DESC',
  });

  // sort 문자열 해석
  let orderBy: any = { createdAt: 'desc' }; // 기본값
  if (pagination.sort) {
    const [fieldRaw, dirRaw] = pagination.sort.split(/[,:]/);
    const field = (fieldRaw ?? 'createdAt').trim();
    const dir =
      (dirRaw ?? 'DESC').toUpperCase() === 'ASC' ? 'asc' : 'desc';

    // 허용된 정렬 필드만 사용
    const allowedFields = ['createdAt', 'title', 'price'];
    const sortField = allowedFields.includes(field)
      ? field
      : 'createdAt';

    orderBy = { [sortField]: dir };
  }

  const where: any = {
    deletedAt: null,
  };

  if (keyword && keyword.trim().length > 0) {
    where.OR = [
      {
        title: {
          contains: keyword,
        },
      },
      {
        description: {
          contains: keyword,
        },
      },
    ];
  }

  try {
    const [items, total] = await Promise.all([
      prisma.book.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.book.count({ where }),
    ]);

    const paged = buildPagedResponse(items, total, {
      page: pagination.page,
      size: pagination.size,
      sort: pagination.sort,
    });

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '도서 목록 조회 성공',
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
 * GET /books/:id
 * - 도서 상세 조회
 */
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 400,
      code: 'BAD_REQUEST',
      message: '유효하지 않은 도서 ID입니다.',
      details: { id: req.params.id },
    });
  }

  try {
    const book = await prisma.book.findUnique({
      where: { id },
    });

    if (!book || book.deletedAt) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '해당 도서를 찾을 수 없습니다.',
        details: { id },
      });
    }

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '도서 상세 조회 성공',
      data: book,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '도서 상세 조회 중 오류가 발생했습니다.',
      details: null,
    });
  }
});

/**
 * PATCH /books/:id
 * - 도서 수정 (ADMIN 전용)
 */
router.patch('/:id', requireAdmin, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 400,
      code: 'BAD_REQUEST',
      message: '유효하지 않은 도서 ID입니다.',
      details: { id: req.params.id },
    });
  }

  const parsed = updateBookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 422,
      code: 'VALIDATION_FAILED',
      message: '요청 데이터가 올바르지 않습니다.',
      details: parsed.error.flatten(),
    });
  }

  const data = parsed.data;

  try {
    const book = await prisma.book.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        isbn13: data.isbn13,
        price: data.price,
        stock: data.stock,
        languageCode: data.languageCode,
        pageCount: data.pageCount,
        coverUrl: data.coverUrl,
        publishedAt: data.publishedAt
          ? new Date(data.publishedAt)
          : undefined,
      },
    });

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '도서 수정 성공',
      data: book,
    });
  } catch (err) {
    console.error(err);
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
      message: '해당 도서를 찾을 수 없습니다.',
      details: { id },
    });
  }
});

/**
 * DELETE /books/:id
 * - 도서 삭제 (ADMIN 전용)
 * - 여기서는 soft delete 예시로 deletedAt 세팅
 */
router.delete('/:id', requireAdmin, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 400,
      code: 'BAD_REQUEST',
      message: '유효하지 않은 도서 ID입니다.',
      details: { id: req.params.id },
    });
  }

  try {
    const book = await prisma.book.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '도서 삭제(비활성화) 성공',
      data: {
        id: book.id,
        title: book.title,
        deletedAt: book.deletedAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
      message: '해당 도서를 찾을 수 없습니다.',
      details: { id },
    });
  }
});

export default router;
