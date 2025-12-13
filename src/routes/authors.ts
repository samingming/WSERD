// src/routes/authors.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { requireAdmin } from '../middlewares/auth';
import { getPagination, buildPagedResponse } from '../utils/pagination';

const router = Router();

const createAuthorSchema = z.object({
  name: z.string().min(2).max(120),
  bio: z.string().max(4000).optional(),
});

const updateAuthorSchema = createAuthorSchema.partial();

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
      message: 'Author already exists with the same name.',
      details: null,
    });
  }

  return res.status(500).json({
    timestamp: new Date().toISOString(),
    path,
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: '서버 오류로 작가 정보를 처리하지 못했습니다.',
    details: null,
  });
}

function parseAuthorId(raw: string, path: string, res: Response) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({
      timestamp: new Date().toISOString(),
      path,
      status: 400,
      code: 'BAD_REQUEST',
      message: '유효한 작가 ID가 필요합니다.',
      details: { id: raw },
    });
    return null;
  }
  return id;
}

router.post('/', requireAdmin, async (req, res) => {
  const parsed = createAuthorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      timestamp: new Date().toISOString(),
      path: '/authors',
      status: 422,
      code: 'VALIDATION_FAILED',
      message: '작가 요청 본문이 올바르지 않습니다.',
      details: parsed.error.flatten(),
    });
  }

  try {
    const created = await prisma.author.create({
      data: {
        name: parsed.data.name,
        bio: parsed.data.bio ?? null,
      },
    });

    return res.status(201).json({
      status: 'CREATED',
      statusCode: 201,
      message: '작가가 생성되었습니다.',
      data: created,
    });
  } catch (err) {
    return handleWriteError(err, '/authors', res);
  }
});

router.get('/', async (req, res) => {
  const { keyword } = req.query as { keyword?: string };
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
    const kw = keyword.trim();
    where.OR = [
      { name: { contains: kw } },
      { bio: { contains: kw } },
    ];
  }

  try {
    const [items, total] = await Promise.all([
      prisma.author.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
        include: {
          _count: { select: { bookAuthors: true } },
        },
      }),
      prisma.author.count({ where }),
    ]);

    const paged = buildPagedResponse(items, total, {
      page: pagination.page,
      size: pagination.size,
      sort: pagination.sort,
    });

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '작가 목록 조회에 성공했습니다.',
      data: paged,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: '/authors',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '작가 목록을 조회하지 못했습니다.',
      details: null,
    });
  }
});

router.get('/:id', async (req, res) => {
  const id = parseAuthorId(req.params.id, req.path, res);
  if (id === null) return;

  try {
    const author = await prisma.author.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookAuthors: true },
        },
      },
    });

    if (!author) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '작가를 찾을 수 없습니다.',
        details: { id },
      });
    }

    const books = await prisma.bookAuthor.findMany({
      where: { authorId: id },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            price: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '작가 상세 조회에 성공했습니다.',
      data: {
        id: author.id,
        name: author.name,
        bio: author.bio,
        bookCount: author._count.bookAuthors,
        createdAt: author.createdAt,
        updatedAt: author.updatedAt,
        latestBooks: books
          .filter((item: any) => !!item.book)
          .map((item: any) => ({
            id: item.book.id,
            title: item.book.title,
            price: item.book.price,
            linkedAt: item.createdAt,
          })),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '작가를 조회하지 못했습니다.',
      details: null,
    });
  }
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const id = parseAuthorId(req.params.id, req.path, res);
  if (id === null) return;

  const parsed = updateAuthorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 422,
      code: 'VALIDATION_FAILED',
      message: '작가 요청 본문이 올바르지 않습니다.',
      details: parsed.error.flatten(),
    });
  }

  try {
    const updated = await prisma.author.update({
      where: { id },
      data: {
        name: parsed.data.name ?? undefined,
        bio: parsed.data.bio ?? undefined,
      },
    });

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '작가 정보가 수정되었습니다.',
      data: updated,
    });
  } catch (err) {
    return handleWriteError(err, req.path, res);
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const id = parseAuthorId(req.params.id, req.path, res);
  if (id === null) return;

  try {
    const author = await prisma.author.findUnique({ where: { id } });
    if (!author) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '작가를 찾을 수 없습니다.',
        details: { id },
      });
    }

    const linkedCount = await prisma.bookAuthor.count({ where: { authorId: id } });
    if (linkedCount > 0) {
      return res.status(409).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 409,
        code: 'STATE_CONFLICT',
        message: '도서에 연결된 작가는 삭제할 수 없습니다.',
        details: { linkedBookCount: linkedCount },
      });
    }

    await prisma.author.delete({ where: { id } });

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '작가가 삭제되었습니다.',
      data: { id },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '작가를 삭제하지 못했습니다.',
      details: null,
    });
  }
});

export default router;
