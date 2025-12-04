// src/routes/reviews.ts
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middlewares/auth';

const router = Router();

/**
 * Zod 스키마들
 */

// 리뷰 생성/수정 공통 스키마
const reviewBodySchema = z.object({
  title: z.string().max(100).optional(),
  body: z.string().min(1),
  rating: z.number().int().min(1).max(5),
});

// 리뷰 목록 조회 쿼리 (정렬, 페이지네이션)
const reviewListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => {
      const n = v === undefined ? 0 : parseInt(v, 10);
      if (Number.isNaN(n) || n < 0) return 0;
      return n;
    }),
  size: z
    .string()
    .optional()
    .transform((v) => {
      const n = v === undefined ? 10 : parseInt(v, 10);
      if (Number.isNaN(n) || n <= 0) return 10;
      if (n > 50) return 50;
      return n;
    }),
  sort: z
    .string()
    .optional()
    .transform((v) => v ?? 'latest'), // latest | likes:desc
});

/**
 * 1) 특정 도서에 대한 리뷰 작성
 * POST /books/:bookId/reviews
 * JWT 필요
 */
router.post(
  '/books/:bookId/reviews',
  requireAuth,
  async (req, res): Promise<any> => {
    const user = (req as any).user;
    const bookId = Number(req.params.bookId);

    if (!Number.isInteger(bookId) || bookId <= 0) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 400,
        code: 'BAD_REQUEST',
        message: '유효하지 않은 도서 ID입니다.',
        details: { bookId: req.params.bookId },
      });
    }

    const parsed = reviewBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 400,
        code: 'VALIDATION_FAILED',
        message: '리뷰 데이터가 올바르지 않습니다.',
        details: parsed.error.flatten(),
      });
    }

    const { title, body, rating } = parsed.data;

    try {
      // 도서 존재 여부 확인
      const book = await prisma.book.findUnique({ where: { id: bookId } });
      if (!book) {
        return res.status(404).json({
          timestamp: new Date().toISOString(),
          path: req.path,
          status: 404,
          code: 'RESOURCE_NOT_FOUND',
          message: '해당 도서를 찾을 수 없습니다.',
          details: { bookId },
        });
      }

      const review = await prisma.review.create({
        data: {
          bookId,
          userId: user.id,
          title: title ?? null,
          body,
          rating,
        },
      });

      return res.status(201).json({
        status: 'Created',
        statusCode: 201,
        message: '리뷰가 성공적으로 작성되었습니다.',
        data: {
          id: review.id,
          bookId: review.bookId,
          userId: review.userId,
          title: review.title,
          body: review.body,
          rating: review.rating,
          likeCount: review.likeCount,
          commentCount: review.commentCount,
          createdAt: review.createdAt,
        },
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
  },
);

/**
 * 2) 특정 도서의 리뷰 목록 조회
 * GET /books/:bookId/reviews?sort=&page=&size=
 * sort: latest | likes:desc
 */
router.get(
  '/books/:bookId/reviews',
  async (req, res): Promise<any> => {
    const bookId = Number(req.params.bookId);

    if (!Number.isInteger(bookId) || bookId <= 0) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 400,
        code: 'BAD_REQUEST',
        message: '유효하지 않은 도서 ID입니다.',
        details: { bookId: req.params.bookId },
      });
    }

    const parsedQuery = reviewListQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 400,
        code: 'INVALID_QUERY_PARAM',
        message: '쿼리 파라미터가 올바르지 않습니다.',
        details: parsedQuery.error.flatten(),
      });
    }

    const { page, size, sort } = parsedQuery.data;
    const skip = page * size;
    const take = size;

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'likes:desc') {
      orderBy = { likeCount: 'desc' };
    }

    try {
      const [items, totalItems] = await Promise.all([
        prisma.review.findMany({
          where: {
            bookId,
            deletedAt: null,
          },
          orderBy,
          skip,
          take,
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.review.count({
          where: {
            bookId,
            deletedAt: null,
          },
        }),
      ]);

      const totalPages = Math.ceil(totalItems / size);

      return res.status(200).json({
        status: 'OK',
        statusCode: 200,
        message: '리뷰 목록 성공',
        data: {
          items: items.map((r) => ({
            id: r.id,
            bookId: r.bookId,
            userId: r.userId,
            userName: r.user.name,
            title: r.title,
            body: r.body,
            rating: r.rating,
            likeCount: r.likeCount,
            commentCount: r.commentCount,
            createdAt: r.createdAt,
          })),
          meta: {
            totalItems,
            totalPages,
            currentPage: page,
            itemsPerPage: size,
          },
        },
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
  },
);

/**
 * 3) 리뷰 수정
 * PATCH /reviews/:reviewId
 * 본인 리뷰만 수정 가능
 */
router.patch(
  '/reviews/:reviewId',
  requireAuth,
  async (req, res): Promise<any> => {
    const user = (req as any).user;
    const reviewId = Number(req.params.reviewId);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 400,
        code: 'BAD_REQUEST',
        message: '유효하지 않은 리뷰 ID입니다.',
        details: { reviewId: req.params.reviewId },
      });
    }

    const parsed = reviewBodySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 400,
        code: 'VALIDATION_FAILED',
        message: '리뷰 데이터가 올바르지 않습니다.',
        details: parsed.error.flatten(),
      });
    }

    try {
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!review || review.deletedAt) {
        return res.status(404).json({
          timestamp: new Date().toISOString(),
          path: req.path,
          status: 404,
          code: 'RESOURCE_NOT_FOUND',
          message: '리뷰를 찾을 수 없습니다.',
          details: { reviewId },
        });
      }

      if (review.userId !== user.id) {
        return res.status(403).json({
          status: 'Forbidden',
          statusCode: 403,
          message: '본인이 작성한 리뷰만 수정할 수 있습니다.',
        });
      }

      const updated = await prisma.review.update({
        where: { id: reviewId },
        data: {
          title: parsed.data.title ?? review.title,
          body: parsed.data.body ?? review.body,
          rating: parsed.data.rating ?? review.rating,
        },
      });

      return res.status(200).json({
        status: 'OK',
        statusCode: 200,
        message: '리뷰가 수정되었습니다.',
        data: {
          reviewId: updated.id,
          rating: updated.rating,
          body: updated.body,
        },
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
  },
);

/**
 * 4) 리뷰 삭제 (Soft Delete)
 * DELETE /reviews/:reviewId
 * 본인 리뷰만 삭제 가능
 */
router.delete(
  '/reviews/:reviewId',
  requireAuth,
  async (req, res): Promise<any> => {
    const user = (req as any).user;
    const reviewId = Number(req.params.reviewId);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 400,
        code: 'BAD_REQUEST',
        message: '유효하지 않은 리뷰 ID입니다.',
        details: { reviewId: req.params.reviewId },
      });
    }

    try {
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!review || review.deletedAt) {
        return res.status(404).json({
          timestamp: new Date().toISOString(),
          path: req.path,
          status: 404,
          code: 'RESOURCE_NOT_FOUND',
          message: '리뷰를 찾을 수 없습니다.',
          details: { reviewId },
        });
      }

      if (review.userId !== user.id) {
        return res.status(403).json({
          status: 'Forbidden',
          statusCode: 403,
          message: '본인이 작성한 리뷰만 삭제할 수 있습니다.',
        });
      }

      await prisma.review.update({
        where: { id: reviewId },
        data: {
          deletedAt: new Date(),
        },
      });

      return res.status(200).json({
        status: 'OK',
        statusCode: 200,
        message: '리뷰가 삭제되었습니다.',
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
  },
);

/**
 * 5) 리뷰 좋아요 등록
 * POST /reviews/:reviewId/likes
 */
router.post(
  '/reviews/:reviewId/likes',
  requireAuth,
  async (req, res): Promise<any> => {
    const user = (req as any).user;
    const reviewId = Number(req.params.reviewId);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 400,
        code: 'BAD_REQUEST',
        message: '유효하지 않은 리뷰 ID입니다.',
        details: { reviewId: req.params.reviewId },
      });
    }

    try {
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!review || review.deletedAt) {
        return res.status(404).json({
          timestamp: new Date().toISOString(),
          path: req.path,
          status: 404,
          code: 'RESOURCE_NOT_FOUND',
          message: '리뷰를 찾을 수 없습니다.',
          details: { reviewId },
        });
      }

      await prisma.$transaction(async (tx) => {
        // 중복 좋아요 방지
        const existing = await tx.reviewLike.findUnique({
          where: {
            reviewId_userId: {
              reviewId,
              userId: user.id,
            },
          },
        });

        if (!existing) {
          await tx.reviewLike.create({
            data: {
              reviewId,
              userId: user.id,
            },
          });

          await tx.review.update({
            where: { id: reviewId },
            data: {
              likeCount: {
                increment: 1,
              },
            },
          });
        }
      });

      return res.status(201).json({
        status: 'Created',
        statusCode: 201,
        message: '리뷰 좋아요가 등록되었습니다.',
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
  },
);

/**
 * 6) 리뷰 좋아요 취소
 * DELETE /reviews/:reviewId/likes
 */
router.delete(
  '/reviews/:reviewId/likes',
  requireAuth,
  async (req, res): Promise<any> => {
    const user = (req as any).user;
    const reviewId = Number(req.params.reviewId);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 400,
        code: 'BAD_REQUEST',
        message: '유효하지 않은 리뷰 ID입니다.',
        details: { reviewId: req.params.reviewId },
      });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.reviewLike.findUnique({
          where: {
            reviewId_userId: {
              reviewId,
              userId: user.id,
            },
          },
        });

        if (!existing) {
          // 이미 좋아요 안 되어 있으면 그냥 204
          return;
        }

        await tx.reviewLike.delete({
          where: {
            reviewId_userId: {
              reviewId,
              userId: user.id,
            },
          },
        });

        await tx.review.update({
          where: { id: reviewId },
          data: {
            likeCount: {
              decrement: 1,
            },
          },
        });
      });

      return res.status(204).send();
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
  },
);

export default router;
