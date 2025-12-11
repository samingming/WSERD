import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const commonErrorResponses = {
  400: { $ref: '#/components/responses/BadRequest' },
  401: { $ref: '#/components/responses/Unauthorized' },
  403: { $ref: '#/components/responses/Forbidden' },
  404: { $ref: '#/components/responses/NotFound' },
  422: { $ref: '#/components/responses/ValidationFailed' },
  500: { $ref: '#/components/responses/InternalError' },
};

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'WSERD Bookstore API',
    version: '1.0.0',
    description:
      'Bookstore REST API with JWT auth (USER/ADMIN), pagination/search/sort, and soft delete. All routes below reflect the current implementation.',
  },
  servers: [
    {
      url: '/',
      description: 'Current server',
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
    responses: {
      BadRequest: {
        description: '400 Bad Request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
            example: {
              timestamp: '2025-03-05T12:00:00Z',
              path: '/example',
              status: 400,
              code: 'BAD_REQUEST',
              message: 'Request is malformed or missing required parameters.',
              details: { field: 'value' },
            },
          },
        },
      },
      Unauthorized: {
        description: '401 Unauthorized',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
            example: {
              timestamp: '2025-03-05T12:00:00Z',
              path: '/auth/refresh',
              status: 401,
              code: 'UNAUTHORIZED',
              message: 'Access token is missing or invalid.',
              details: null,
            },
          },
        },
      },
      Forbidden: {
        description: '403 Forbidden',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
            example: {
              timestamp: '2025-03-05T12:00:00Z',
              path: '/admin/users',
              status: 403,
              code: 'FORBIDDEN',
              message: 'You do not have permission to access this resource.',
              details: null,
            },
          },
        },
      },
      NotFound: {
        description: '404 Not Found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
            example: {
              timestamp: '2025-03-05T12:00:00Z',
              path: '/books/999',
              status: 404,
              code: 'RESOURCE_NOT_FOUND',
              message: 'The requested resource was not found.',
              details: { id: 999 },
            },
          },
        },
      },
      ValidationFailed: {
        description: '422 Unprocessable Entity',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
            example: {
              timestamp: '2025-03-05T12:00:00Z',
              path: '/books',
              status: 422,
              code: 'VALIDATION_FAILED',
              message: 'Request validation failed.',
              details: { title: ['Required'] },
            },
          },
        },
      },
      InternalError: {
        description: '500 Internal Server Error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
            example: {
              timestamp: '2025-03-05T12:00:00Z',
              path: '/books',
              status: 500,
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Unexpected server error.',
              details: null,
            },
          },
        },
      },
    },    schemas: {
      ApiError: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          path: { type: 'string' },
          status: { type: 'integer' },
          code: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'object' },
        },
      },
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
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', example: 'USER' },
          status: { type: 'string', example: 'ACTIVE' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
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
          isbn13: { type: 'string' },
          price: { type: 'number' },
          stock: { type: 'integer' },
          languageCode: { type: 'string' },
          pageCount: { type: 'integer' },
          coverUrl: { type: 'string' },
          publishedAt: { type: 'string', format: 'date-time' },
          deletedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
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
          commentCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          deletedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          status: { type: 'string', example: 'PENDING' },
          userId: { type: 'integer', nullable: true },
          itemTotal: { type: 'number' },
          discountTotal: { type: 'number' },
          shippingFee: { type: 'number' },
          totalAmount: { type: 'number' },
          customerName: { type: 'string' },
          customerEmail: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
    },
  },
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Admin' },
    { name: 'Books' },
    { name: 'Categories' },
    { name: 'Authors' },
    { name: 'Reviews' },
    { name: 'Orders' },
    { name: 'Stats' },
    { name: 'Debug' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          ...commonErrorResponses,
          200: { description: 'OK' },
        },
      },
    },

    // ---------- Auth ----------
    '/auth/ping': {
      get: {
        tags: ['Auth'],
        summary: 'Ping auth router',
        responses: {
          ...commonErrorResponses, 200: { description: 'OK' } },
      },
    },
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'User signup',
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
          ...commonErrorResponses,
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          409: { description: 'DUPLICATE_RESOURCE' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
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
          ...commonErrorResponses,
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          ...commonErrorResponses,
          200: { description: 'New tokens', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout and revoke refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          ...commonErrorResponses,
          200: { description: 'Logged out' },
        },
      },
    },

    // ---------- Users ----------
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get my profile',
        security: [{ bearerAuth: [] }],
        responses: {
          ...commonErrorResponses,
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update my profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          ...commonErrorResponses,
          200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
        },
      },
    },

    // ---------- Admin ----------
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'keyword', in: 'query', schema: { type: 'string' }, description: 'search email/name' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'size', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'sort', in: 'query', schema: { type: 'string', example: 'createdAt,DESC' } },
        ],
        responses: {
          ...commonErrorResponses,
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/PageMeta' } } } },
        },
      },
    },
    '/admin/users/{id}/deactivate': {
      patch: {
        tags: ['Admin'],
        summary: 'Deactivate user',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          ...commonErrorResponses,
          200: { description: 'Deactivated' },
        },
      },
    },
    '/admin/users/{id}/role': {
      patch: {
        tags: ['Admin'],
        summary: 'Change user role',
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
                required: ['role'],
                properties: { role: { type: 'string', enum: ['USER', 'ADMIN'] } },
              },
            },
          },
        },
        responses: {
          ...commonErrorResponses,
          200: { description: 'Updated' },
        },
      },
    },

    // ---------- Books ----------
    '/books': {
      get: {
        tags: ['Books'],
        summary: 'List books (search/sort/pagination)',
        parameters: [
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'size', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'sort', in: 'query', schema: { type: 'string', example: 'createdAt,DESC' } },
        ],
        responses: {
          ...commonErrorResponses, 200: { description: 'OK' } },
      },
      post: {
        tags: ['Books'],
        summary: 'Create book (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'price', 'stock'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  isbn13: { type: 'string' },
                  price: { type: 'number' },
                  stock: { type: 'integer' },
                  languageCode: { type: 'string' },
                  pageCount: { type: 'integer' },
                  coverUrl: { type: 'string' },
                  publishedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          ...commonErrorResponses,
          201: { description: 'Created' },
        },
      },
    },
    '/books/{id}': {
      get: {
        tags: ['Books'],
        summary: 'Get book detail',
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'integer' } } ],
        responses: {
          ...commonErrorResponses,
          200: { description: 'OK' },
        },
      },
      patch: {
        tags: ['Books'],
        summary: 'Update book (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'integer' } } ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Book' } } },
        },
        responses: {
          ...commonErrorResponses,
          200: { description: 'Updated' },
        },
      },
      delete: {
        tags: ['Books'],
        summary: 'Soft delete book (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'integer' } } ],
        responses: {
          ...commonErrorResponses,
          200: { description: 'Deleted' },
        },
      },
    },

    // ---------- Categories ----------
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List categories',
        parameters: [
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
          { name: 'parentId', in: 'query', schema: { type: 'string', example: 'root' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'size', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'sort', in: 'query', schema: { type: 'string', example: 'name,ASC' } },
        ],
        responses: {
          ...commonErrorResponses, 200: { description: 'OK' } },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create category (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } },
        },
        responses: {
          ...commonErrorResponses, 201: { description: 'Created' } },
      },
    },
    '/categories/{id}': {
      get: {
        tags: ['Categories'],
        summary: 'Get category detail',
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'integer' } } ],
        responses: {
          ...commonErrorResponses, 200: { description: 'OK' } },
      },
      patch: {
        tags: ['Categories'],
        summary: 'Update category (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'integer' } } ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } },
        },
        responses: {
          ...commonErrorResponses, 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Delete category (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'integer' } } ],
        responses: {
          ...commonErrorResponses, 200: { description: 'Deleted' }, 409: { description: 'STATE_CONFLICT' } },
      },
    },

    // ---------- Authors ----------
    '/authors': {
      get: {
        tags: ['Authors'],
        summary: 'List authors',
        parameters: [
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'size', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'sort', in: 'query', schema: { type: 'string', example: 'name,ASC' } },
        ],
        responses: {
          ...commonErrorResponses, 200: { description: 'OK' } },
      },
      post: {
        tags: ['Authors'],
        summary: 'Create author (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, bio: { type: 'string' } } } } },
        },
        responses: {
          ...commonErrorResponses, 201: { description: 'Created' } },
      },
    },
    '/authors/{id}': {
      get: {
        tags: ['Authors'],
        summary: 'Get author detail',
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'integer' } } ],
        responses: {
          ...commonErrorResponses, 200: { description: 'OK' } },
      },
      patch: {
        tags: ['Authors'],
        summary: 'Update author (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'integer' } } ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, bio: { type: 'string' } } } } },
        },
        responses: {
          ...commonErrorResponses, 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Authors'],
        summary: 'Delete author (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'integer' } } ],
        responses: {
          ...commonErrorResponses, 200: { description: 'Deleted' }, 409: { description: 'STATE_CONFLICT' } },
      },
    },

    // ---------- Reviews ----------
    '/books/{bookId}/reviews': {
      get: {
        tags: ['Reviews'],
        summary: 'List reviews for a book',
        parameters: [
          { name: 'bookId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'size', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'sort', in: 'query', schema: { type: 'string', example: 'latest' } },
        ],
        responses: {
          ...commonErrorResponses, 200: { description: 'OK' } },
      },
      post: {
        tags: ['Reviews'],
        summary: 'Create review (auth)',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'bookId', in: 'path', required: true, schema: { type: 'integer' } } ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['body', 'rating'], properties: { title: { type: 'string' }, body: { type: 'string' }, rating: { type: 'integer', minimum: 1, maximum: 5 } } } } },
        },
        responses: {
          ...commonErrorResponses, 201: { description: 'Created' } },
      },
    },
    '/reviews/{reviewId}': {
      patch: {
        tags: ['Reviews'],
        summary: 'Update review (owner)',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'reviewId', in: 'path', required: true, schema: { type: 'integer' } } ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' }, rating: { type: 'integer', minimum: 1, maximum: 5 } } } } },
        },
        responses: {
          ...commonErrorResponses, 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Reviews'],
        summary: 'Delete review (owner, soft)',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'reviewId', in: 'path', required: true, schema: { type: 'integer' } } ],
        responses: {
          ...commonErrorResponses, 200: { description: 'Deleted' } },
      },
    },
    '/reviews/{reviewId}/likes': {
      post: {
        tags: ['Reviews'],
        summary: 'Like a review',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'reviewId', in: 'path', required: true, schema: { type: 'integer' } } ],
        responses: {
          ...commonErrorResponses, 201: { description: 'Liked' }, 409: { description: 'DUPLICATE_RESOURCE' } },
      },
      delete: {
        tags: ['Reviews'],
        summary: 'Unlike a review',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'reviewId', in: 'path', required: true, schema: { type: 'integer' } } ],
        responses: {
          ...commonErrorResponses, 204: { description: 'Removed' } },
      },
    },

    // ---------- Orders ----------
    '/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Create order',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['bookId', 'quantity'], properties: { bookId: { type: 'integer' }, quantity: { type: 'integer', minimum: 1 } } } } },
        },
        responses: {
          ...commonErrorResponses, 201: { description: 'Created' } },
      },
      get: {
        tags: ['Orders'],
        summary: 'List my orders',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'size', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'sort', in: 'query', schema: { type: 'string', example: 'createdAt,DESC' } },
        ],
        responses: {
          ...commonErrorResponses, 200: { description: 'OK' } },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get my order detail',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'integer' } } ],
        responses: {
          ...commonErrorResponses, 200: { description: 'OK' } },
      },
    },
    '/orders/{id}/cancel': {
      patch: {
        tags: ['Orders'],
        summary: 'Cancel my order',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'integer' } } ],
        responses: {
          ...commonErrorResponses, 200: { description: 'Cancelled' } },
      },
    },
    '/orders/admin/all': {
      get: {
        tags: ['Orders'],
        summary: 'List all orders (admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          ...commonErrorResponses, 200: { description: 'OK' } },
      },
    },
    '/orders/{id}/status': {
      patch: {
        tags: ['Orders'],
        summary: 'Update order status (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'integer' } } ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['PENDING', 'PAID', 'CANCELLED'] } } } } },
        },
        responses: {
          ...commonErrorResponses, 200: { description: 'Updated' } },
      },
    },

    // ---------- Stats ----------
    '/stats/summary': {
      get: {
        tags: ['Stats'],
        summary: 'Summary counters (admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          ...commonErrorResponses, 200: { description: 'OK' } },
      },
    },
    '/stats/top-books': {
      get: {
        tags: ['Stats'],
        summary: 'Top books by review count (admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          ...commonErrorResponses, 200: { description: 'OK' } },
      },
    },

    // ---------- Debug ----------
    '/debug/users': {
      get: {
        tags: ['Debug'],
        summary: 'List all users (debug only)',
        responses: {
          ...commonErrorResponses, 200: { description: 'OK' } },
      },
    },
  },
};

export function setupSwagger(app: Express) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}




