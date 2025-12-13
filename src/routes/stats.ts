// src/routes/stats.ts
import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAdmin } from '../middlewares/auth';
import { buildCacheKey, cache } from '../utils/cache';

const router = Router();
const STATS_CACHE_TTL = 60 * 1000; // 1 minute
const STATS_CACHE_PREFIX = 'stats';

/**
 * GET /stats/summary
 * - 관리자 전용
 * - 유저 수, 도서 수, 리뷰 수, 주문 수 간단 집계
 */
router.get('/summary', requireAdmin, async (req, res): Promise<any> => {
  try {
    const cacheKey = buildCacheKey(STATS_CACHE_PREFIX, 'summary');
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const [userCount, bookCount, reviewCount, orderCount] = await Promise.all([
      prisma.user.count(),
      prisma.book.count({ where: { deletedAt: null } }),
      prisma.review.count({ where: { deletedAt: null } }),
      prisma.order.count(),
    ]);

    const responseBody = {
      status: 'OK',
      statusCode: 200,
      message: '?? ?? ?? ??',
      data: {
        users: userCount,
        books: bookCount,
        reviews: reviewCount,
        orders: orderCount,
      },
    };

    cache.set(cacheKey, responseBody, STATS_CACHE_TTL);

    return res.status(200).json(responseBody);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: '/stats/summary',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '?? ??? ??????.',
      details: null,
    });
  }
});

router.get('/top-books', requireAdmin, async (req, res): Promise<any> => {
  try {
    const cacheKey = buildCacheKey(STATS_CACHE_PREFIX, 'top-books');
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const books = await prisma.book.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: {
        reviews: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    const responseBody = {
      status: 'OK',
      statusCode: 200,
      message: '인기 도서(리뷰 수 기준) 조회 성공',
      data: books.map((b: any) => ({
        id: b.id,
        title: b.title,
        reviewCount: b._count.reviews,
        price: b.price,
        createdAt: b.createdAt,
      })),
    };

    cache.set(cacheKey, responseBody, STATS_CACHE_TTL);

    return res.status(200).json(responseBody);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: '/stats/top-books',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 내부 오류가 발생했습니다.',
      details: null,
    });
  }
});

export default router;
