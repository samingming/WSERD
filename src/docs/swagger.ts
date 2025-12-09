// src/docs/swagger.ts
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'WSERD Bookstore API',
    version: '1.0.0',
    description:
      '웹서비스 응용 과제용 Bookstore REST API.\n\nJWT 인증, RBAC, 페이지네이션, 검색/정렬, 시드 데이터, JCloud 배포 등을 포함합니다.',
  },
  servers: [
    {
      url: '/',
    description: 'Current server'
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      // 공통 페이징 응답
      PageMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 0 },
          size: { type: 'integer', example: 10 },
          totalElements: { type: 'integer', example: 125 },
          totalPages: { type: 'integer', example: 13 },
          sort: { type: 'string', example: 'createdAt,DESC' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          path: { type: 'string', example: '/auth/login' },
          status: { type: 'integer', example: 400 },
          code: { type: 'string', example: 'VALIDATION_FAILED' },
          message: { type: 'string', example: '요청 데이터가 올바르지 않습니다.' },
          details: { type: 'object' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', example: 'USER' },
          status: { type: 'string', example: 'ACTIVE' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          parentId: { type: 'integer', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Author: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          bio: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Book: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string' },
          isbn13: { type: 'string', example: '9781234567890' },
          price: { type: 'number', example: 15000 },
          stock: { type: 'integer', example: 10 },
          languageCode: { type: 'string', example: 'ko' },
          pageCount: { type: 'integer', example: 320 },
          coverUrl: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Review: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          bookId: { type: 'integer' },
          userId: { type: 'integer' },
          title: { type: 'string' },
          body: { type: 'string' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          likeCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          status: { type: 'string', example: 'PENDING' },
          userId: { type: 'integer', nullable: true },
          itemTotal: { type: 'number', example: 26000 },
          discountTotal: { type: 'number', example: 0 },
          shippingFee: { type: 'number', example: 3000 },
          totalAmount: { type: 'number', example: 29000 },
          customerName: { type: 'string' },
          customerEmail: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  tags: [
    { name: 'Health', description: '헬스 체크' },
    { name: 'Auth', description: '회원가입/로그인/JWT/리프레시' },
    { name: 'Users', description: '내 정보 조회/수정' },
    { name: 'Admin', description: '관리자용 통계/유저 관리' },
    { name: 'Books', description: '도서 CRUD 및 검색/정렬/페이지네이션' },
    { name: 'Reviews', description: '리뷰 작성/조회/수정/삭제/좋아요' },
    { name: 'Orders', description: '주문 생성/조회/취소' },
  ],
  paths: {
    // ---------- Health ----------
    '/health': {
      get: {
        tags: ['Health'],
        summary: '헬스 체크',
        responses: {
          200: {
            description: '서버 정상 동작',
          },
        },
      },
    },

    // ---------- Auth ----------
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: '회원가입',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8, maxLength: 64 },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '회원가입 성공' },
          400: { description: 'VALIDATION_FAILED', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          409: { description: 'DUPLICATE_RESOURCE', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          500: { description: 'INTERNAL_SERVER_ERROR' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: '로그인',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: '로그인 성공',
          },
          400: { description: 'VALIDATION_FAILED' },
          401: { description: 'UNAUTHORIZED / TOKEN_EXPIRED' },
          500: { description: 'INTERNAL_SERVER_ERROR' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Access Token 재발급',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: '토큰 재발급 성공' },
          401: { description: 'UNAUTHORIZED / TOKEN_EXPIRED' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: '로그아웃 (서버 측 토큰 무효화 시나리오용)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: '로그아웃 처리' },
        },
      },
    },

    // ---------- Users ----------
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: '내 정보 조회',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: '성공',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    statusCode: { type: 'integer' },
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { description: 'UNAUTHORIZED' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: '내 정보 수정 (이름 변경 등)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '수정 성공' },
          401: { description: 'UNAUTHORIZED' },
          404: { description: 'RESOURCE_NOT_FOUND (프로젝트 구현 선택사항)' },
        },
      },
    },

    // ---------- Admin ----------
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: '전체 유저 목록 (ADMIN 전용)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: '성공',
          },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN (ADMIN 아님)' },
        },
      },
    },
    '/admin/users/{id}/deactivate': {
      patch: {
        tags: ['Admin'],
        summary: '특정 유저 비활성화',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: { description: '비활성화 성공' },
          400: { description: 'BAD_REQUEST (자기 자신 비활성화 등)' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN' },
          404: { description: 'USER_NOT_FOUND' },
        },
      },
    },
    '/admin/users/{id}/role': {
      patch: {
        tags: ['Admin'],
        summary: '유저 Role 변경',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', example: 'ADMIN' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '변경 성공' },
          400: { description: 'VALIDATION_FAILED' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN' },
          404: { description: 'USER_NOT_FOUND' },
        },
      },
    },

    // ---------- Books ----------
    '/books': {
      get: {
        tags: ['Books'],
        summary: '도서 목록 조회 (검색/정렬/페이지네이션)',
        parameters: [
          {
            name: 'keyword',
            in: 'query',
            schema: { type: 'string' },
            description: '제목/설명 검색 키워드',
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 0 },
          },
          {
            name: 'size',
            in: 'query',
            schema: { type: 'integer', default: 20 },
          },
          {
            name: 'sort',
            in: 'query',
            schema: { type: 'string', example: 'createdAt,DESC' },
          },
        ],
        responses: {
          200: {
            description: '성공',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    content: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Book' },
                    },
                    page: { $ref: '#/components/schemas/PageMeta' },
                  },
                },
              },
            },
          },
          400: { description: 'INVALID_QUERY_PARAM' },
        },
      },
      post: {
        tags: ['Books'],
        summary: '도서 생성 (ADMIN)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'isbn13', 'price', 'stock'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  isbn13: { type: 'string' },
                  price: { type: 'number' },
                  stock: { type: 'integer' },
                  languageCode: { type: 'string' },
                  pageCount: { type: 'integer' },
                  coverUrl: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '도서 생성 성공' },
          400: { description: 'VALIDATION_FAILED' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN' },
        },
      },
    },
    '/books/{id}': {
      get: {
        tags: ['Books'],
        summary: '도서 상세 조회',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: {
            description: '성공',
          },
          404: { description: 'RESOURCE_NOT_FOUND' },
        },
      },
      patch: {
        tags: ['Books'],
        summary: '도서 수정 (ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  price: { type: 'number' },
                  stock: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '수정 성공' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN' },
          404: { description: 'RESOURCE_NOT_FOUND' },
        },
      },
      delete: {
        tags: ['Books'],
        summary: '도서 삭제 (soft delete, ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: { description: '삭제(soft) 성공' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN' },
          404: { description: 'RESOURCE_NOT_FOUND' },
        },
      },
    },

    // ---------- Categories ----------
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: '카테고리 목록 조회',
        parameters: [
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
          {
            name: 'parentId',
            in: 'query',
            schema: { type: 'string', example: 'root' },
            description: 'root/null = 상위 없음, 숫자는 상위 ID',
          },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'size', in: 'query', schema: { type: 'integer', default: 10 } },
          {
            name: 'sort',
            in: 'query',
            schema: { type: 'string', example: 'name,ASC' },
          },
        ],
        responses: {
          200: {
            description: '조회 성공',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    content: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Category' },
                    },
                    page: { type: 'integer', example: 0 },
                    size: { type: 'integer', example: 10 },
                    totalElements: { type: 'integer', example: 1 },
                    totalPages: { type: 'integer', example: 1 },
                    sort: { type: 'string', example: 'name,ASC' },
                  },
                },
              },
            },
          },
          400: { description: 'INVALID_QUERY_PARAM' },
        },
      },
      post: {
        tags: ['Categories'],
        summary: '카테고리 생성 (ADMIN)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  parentId: { type: 'integer', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '생성 성공' },
          400: { description: 'VALIDATION_FAILED' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN' },
          404: { description: 'RESOURCE_NOT_FOUND (부모 없음)' },
        },
      },
    },
    '/categories/{id}': {
      get: {
        tags: ['Categories'],
        summary: '카테고리 상세 조회',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: '조회 성공' },
          404: { description: 'RESOURCE_NOT_FOUND' },
        },
      },
      patch: {
        tags: ['Categories'],
        summary: '카테고리 수정 (ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  parentId: { type: 'integer', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '수정 성공' },
          400: { description: 'VALIDATION_FAILED / BAD_REQUEST' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN' },
          404: { description: 'RESOURCE_NOT_FOUND' },
        },
      },
      delete: {
        tags: ['Categories'],
        summary: '카테고리 삭제 (ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: '삭제 성공' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN' },
          404: { description: 'RESOURCE_NOT_FOUND' },
          409: { description: 'STATE_CONFLICT (연결 데이터 있음)' },
        },
      },
    },

    // ---------- Authors ----------
    '/authors': {
      get: {
        tags: ['Authors'],
        summary: '작가 목록 조회',
        parameters: [
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'size', in: 'query', schema: { type: 'integer', default: 10 } },
          {
            name: 'sort',
            in: 'query',
            schema: { type: 'string', example: 'name,ASC' },
          },
        ],
        responses: {
          200: {
            description: '조회 성공',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    content: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Author' },
                    },
                    page: { type: 'integer', example: 0 },
                    size: { type: 'integer', example: 10 },
                    totalElements: { type: 'integer', example: 1 },
                    totalPages: { type: 'integer', example: 1 },
                    sort: { type: 'string', example: 'name,ASC' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Authors'],
        summary: '작가 생성 (ADMIN)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  bio: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '생성 성공' },
          400: { description: 'VALIDATION_FAILED' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN' },
        },
      },
    },
    '/authors/{id}': {
      get: {
        tags: ['Authors'],
        summary: '작가 상세 조회',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: '조회 성공' },
          404: { description: 'RESOURCE_NOT_FOUND' },
        },
      },
      patch: {
        tags: ['Authors'],
        summary: '작가 수정 (ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  bio: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '수정 성공' },
          400: { description: 'VALIDATION_FAILED' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN' },
          404: { description: 'RESOURCE_NOT_FOUND' },
        },
      },
      delete: {
        tags: ['Authors'],
        summary: '작가 삭제 (ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: '삭제 성공' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN' },
          404: { description: 'RESOURCE_NOT_FOUND' },
          409: { description: 'STATE_CONFLICT (연결된 도서)' },
        },
      },
    },

    // ---------- Reviews ----------
    '/books/{bookId}/reviews': {
      get: {
        tags: ['Reviews'],
        summary: '도서별 리뷰 목록 조회',
        parameters: [
          { name: 'bookId', in: 'path', required: true, schema: { type: 'integer' } },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 0 },
          },
          {
            name: 'size',
            in: 'query',
            schema: { type: 'integer', default: 10 },
          },
          {
            name: 'sort',
            in: 'query',
            schema: { type: 'string', example: 'latest' },
            description: 'latest 또는 likes:desc',
          },
        ],
        responses: {
          200: { description: '성공' },
          404: { description: 'RESOURCE_NOT_FOUND (도서 없음)' },
        },
      },
      post: {
        tags: ['Reviews'],
        summary: '특정 도서에 리뷰 작성',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'bookId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'body', 'rating'],
                properties: {
                  title: { type: 'string' },
                  body: { type: 'string' },
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '리뷰 작성 성공' },
          400: { description: 'VALIDATION_FAILED' },
          401: { description: 'UNAUTHORIZED' },
          404: { description: 'RESOURCE_NOT_FOUND (도서 없음)' },
        },
      },
    },
    '/reviews/{id}': {
      patch: {
        tags: ['Reviews'],
        summary: '내 리뷰 수정',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  body: { type: 'string' },
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '수정 성공' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN (본인 아님)' },
          404: { description: 'RESOURCE_NOT_FOUND' },
        },
      },
      delete: {
        tags: ['Reviews'],
        summary: '내 리뷰 삭제 (soft delete)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: '삭제 성공' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN' },
          404: { description: 'RESOURCE_NOT_FOUND' },
        },
      },
    },
    '/reviews/{id}/likes': {
      post: {
        tags: ['Reviews'],
        summary: '리뷰 좋아요',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          201: { description: '좋아요 추가' },
          401: { description: 'UNAUTHORIZED' },
          404: { description: 'RESOURCE_NOT_FOUND' },
          409: { description: 'DUPLICATE_RESOURCE (이미 좋아요됨)' },
        },
      },
      delete: {
        tags: ['Reviews'],
        summary: '리뷰 좋아요 취소',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: '좋아요 취소' },
          401: { description: 'UNAUTHORIZED' },
          404: { description: 'RESOURCE_NOT_FOUND' },
        },
      },
    },

    // ---------- Orders ----------
    '/orders': {
      post: {
        tags: ['Orders'],
        summary: '주문 생성',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['bookId', 'quantity'],
                properties: {
                  bookId: { type: 'integer' },
                  quantity: { type: 'integer', minimum: 1 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '주문 생성 성공' },
          400: { description: '검증 실패 / 재고 부족 등' },
          401: { description: 'UNAUTHORIZED' },
          404: { description: '도서 없음' },
          409: { description: 'STATE_CONFLICT' },
        },
      },
      get: {
        tags: ['Orders'],
        summary: '내 주문 목록 조회',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'size', in: 'query', schema: { type: 'integer', default: 10 } },
          {
            name: 'sort',
            in: 'query',
            schema: { type: 'string', example: 'createdAt,DESC' },
          },
        ],
        responses: {
          200: { description: '성공' },
          401: { description: 'UNAUTHORIZED' },
        },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: '주문 상세 조회 (내 주문만)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: '성공' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN (다른 사람 주문)' },
          404: { description: 'RESOURCE_NOT_FOUND' },
        },
      },
    },
    '/orders/{id}/cancel': {
      patch: {
        tags: ['Orders'],
        summary: '주문 취소 (본인 주문만)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: '취소 성공' },
          400: { description: 'STATE_CONFLICT (이미 취소/배송중 등)' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN' },
          404: { description: 'RESOURCE_NOT_FOUND' },
        },
      },
    },
    '/orders/admin/all': {
      get: {
        tags: ['Orders'],
        summary: '전체 주문 목록 (ADMIN 전용)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'size', in: 'query', schema: { type: 'integer', default: 10 } },
          {
            name: 'sort',
            in: 'query',
            schema: { type: 'string', example: 'createdAt,DESC' },
          },
        ],
        responses: {
          200: { description: '성공' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN' },
        },
      },
    },
    '/orders/{id}/status': {
      patch: {
        tags: ['Orders'],
        summary: '주문 상태 변경 (ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    example: 'PAID',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '상태 변경 성공' },
          400: { description: 'VALIDATION_FAILED / STATE_CONFLICT' },
          401: { description: 'UNAUTHORIZED' },
          403: { description: 'FORBIDDEN' },
          404: { description: 'RESOURCE_NOT_FOUND' },
        },
      },
    },
  },
};

/** Express 앱에 Swagger UI 연결 */
export function setupSwagger(app: Express) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
