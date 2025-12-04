// src/routes/orders.ts
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { requireAuth, requireAdmin } from '../middlewares/auth';
import { getPagination, buildPagedResponse } from '../utils/pagination';

const router = Router();

/**
 * Zod 스키마
 */

// 주문 생성 요청 바디
// -> bookId, quantity는 "요청용"으로만 사용하고
// 실제 orders 테이블에는 합계(itemTotal, totalAmount 등)만 저장할 거야.
const createOrderSchema = z.object({
  bookId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(999),
});

// 주문 상태 변경 (관리자용)
const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']),
});

/**
 * 1) 주문 생성
 * POST /orders
 * - 로그인 필요
 * - body: { bookId, quantity }
 */
router.post('/', requireAuth, async (req, res): Promise<any> => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 400,
      code: 'VALIDATION_FAILED',
      message: '요청 데이터가 올바르지 않습니다.',
      details: parsed.error.flatten(),
    });
  }

  const { bookId, quantity } = parsed.data;
  const authUser = (req as any).user as { id: number; role: string };

  try {
    // 1) 도서 존재 여부 확인 (soft delete 고려)
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        deletedAt: null,
      },
    });

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

    // 2) 주문자 정보 (users 테이블에서 가져오기)
    const userEntity = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!userEntity) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 404,
        code: 'USER_NOT_FOUND',
        message: '주문자 정보를 찾을 수 없습니다.',
        details: { userId: authUser.id },
      });
    }

    // 3) 금액 계산
    const unitPrice = Number((book as any).price); // DECIMAL → number
    const itemTotal = unitPrice * quantity;
    const discountTotal = 0;
    const shippingFee = 0;
    const totalAmount = itemTotal - discountTotal + shippingFee;

    // 4) orders 테이블에 "요약 정보"만 저장
    const order = await prisma.order.create({
      data: {
        userId: userEntity.id,
        status: 'PENDING',
        itemTotal,
        discountTotal,
        shippingFee,
        totalAmount,
        customerName: userEntity.name,
        customerEmail: userEntity.email,
        // cancelledAt, createdAt, updatedAt 은 기본값/자동
      },
    });

    return res.status(201).json({
      status: 'CREATED',
      statusCode: 201,
      message: '주문 생성 성공',
      data: {
        id: order.id,
        status: order.status,
        userId: order.userId,
        itemTotal: order.itemTotal,
        discountTotal: order.discountTotal,
        shippingFee: order.shippingFee,
        totalAmount: order.totalAmount,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        createdAt: order.createdAt,
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
});

/**
 * 2) 내 주문 목록 조회
 * GET /orders
 * - 로그인 필요
 */
router.get('/', requireAuth, async (req, res): Promise<any> => {
  const user = (req as any).user as { id: number; role: string };

  const pagination = getPagination(req.query, {
    defaultPage: 0,
    defaultSize: 10,
    maxSize: 50,
    defaultSort: 'createdAt,DESC',
  });

  // sort 해석
  let orderBy: any = { createdAt: 'desc' };
  if (pagination.sort) {
    const [fieldRaw, dirRaw] = pagination.sort.split(/[,:]/);
    const field = (fieldRaw ?? 'createdAt').trim();
    const dir =
      (dirRaw ?? 'DESC').toUpperCase() === 'ASC' ? 'asc' : 'desc';

    const allowedFields = ['createdAt', 'totalAmount'];
    const sortField = allowedFields.includes(field)
      ? field
      : 'createdAt';

    orderBy = { [sortField]: dir };
  }

  try {
    const where = { userId: user.id };

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.order.count({ where }),
    ]);

    const paged = buildPagedResponse(items, total, {
      page: pagination.page,
      size: pagination.size,
      sort: pagination.sort,
    });

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '내 주문 목록 조회 성공',
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
 * 3) 내 주문 상세 조회
 * GET /orders/:id
 * - 로그인 필요
 * - 본인 주문만 조회 가능
 */
router.get('/:id', requireAuth, async (req, res): Promise<any> => {
  const user = (req as any).user as { id: number; role: string };
  const orderId = Number(req.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 400,
      code: 'BAD_REQUEST',
      message: '유효하지 않은 주문 ID입니다.',
      details: { id: req.params.id },
    });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.userId !== user.id) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '해당 주문을 찾을 수 없습니다.',
        details: { id: orderId },
      });
    }

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '주문 상세 조회 성공',
      data: order,
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
 * 4) 내 주문 취소
 * PATCH /orders/:id/cancel
 * - 로그인 필요
 * - 본인 주문만 취소 가능
 */
router.patch('/:id/cancel', requireAuth, async (req, res): Promise<any> => {
  const user = (req as any).user as { id: number; role: string };
  const orderId = Number(req.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      path: req.path,
      status: 400,
      code: 'BAD_REQUEST',
      message: '유효하지 않은 주문 ID입니다.',
      details: { id: req.params.id },
    });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.userId !== user.id) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '해당 주문을 찾을 수 없습니다.',
        details: { id: orderId },
      });
    }

    if (order.status === 'CANCELLED') {
      return res.status(409).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 409,
        code: 'STATE_CONFLICT',
        message: '이미 취소된 주문입니다.',
        details: { id: orderId },
      });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '주문 취소 완료',
      data: updated,
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
 * 5) 관리자 - 전체 주문 조회
 * GET /orders/admin/all
 */
router.get('/admin/all', requireAdmin, async (req, res): Promise<any> => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      status: 'OK',
      statusCode: 200,
      message: '전체 주문 목록 조회 성공',
      data: orders,
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
 * 6) 관리자 - 주문 상태 변경
 * PATCH /orders/:id/status
 */
router.patch(
  '/:id/status',
  requireAdmin,
  async (req, res): Promise<any> => {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 400,
        code: 'BAD_REQUEST',
        message: '유효하지 않은 주문 ID입니다.',
        details: { id: req.params.id },
      });
    }

    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 400,
        code: 'VALIDATION_FAILED',
        message: '요청 데이터가 올바르지 않습니다.',
        details: parsed.error.flatten(),
      });
    }

    try {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: parsed.data.status,
        },
      });

      return res.status(200).json({
        status: 'OK',
        statusCode: 200,
        message: '주문 상태 변경 완료',
        data: updated,
      });
    } catch (err) {
      console.error(err);
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '해당 주문을 찾을 수 없습니다.',
        details: { id: orderId },
      });
    }
  },
);

export default router;
