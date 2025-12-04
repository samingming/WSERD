// src/routes/stats.ts
import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAdmin } from '../middlewares/auth';

const router = Router();

/**
 * GET /stats/summary
 * - 관리자 전용
 * - 유저 수, 도서 수, 리뷰 수, 주문 수 간단 집계
 */
router.get('/summary', requireAdmin, async (req, res): Promise<any> => {
  try {
    const [userCount, bookCount, reviewCount, orderCount] = await Promise.all([
      prisma.user.count(),
      prisma.book.count({ where: { deletedAt: null } }),
      prisma.review.count({ where: { deletedAt: null } }),
      prisma.order.count(),
    ]);

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '요약 통계 조회 성공',
      data: {
        users: userCount,
        books: bookCount,
        reviews: reviewCount,
        orders: orderCount,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      path: '/stats/summary',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 내부 오류가 발생했습니다.',
      details: null,
    });
  }
});

/**
 * GET /stats/top-books
 * - 관리자 전용
 * - 리뷰 개수 기준 상위 5개 도서
 */
router.get('/top-books', requireAdmin, async (req, res): Promise<any> => {
  try {
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

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '인기 도서(리뷰 수 기준) 조회 성공',
      data: books.map((b) => ({
        id: b.id,
        title: b.title,
        reviewCount: b._count.reviews,
        price: b.price,
        createdAt: b.createdAt,
      })),
    });
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
