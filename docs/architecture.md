# WSERD Bookstore - Architecture Overview

## 1. Layered View
```
Incoming HTTP
   ↓
Express App (src/app.ts)
   ├─ Global middlewares (cors, json body, morgan, rate limits)
   ├─ Routers (/auth, /users, /admin, /books, /reviews, /orders, /stats, /debug)
   └─ Swagger UI (/api-docs)
        ↓
Prisma Client (src/db/prisma.ts, PrismaMariaDb adapter)
        ↓
MySQL / MariaDB
```

## 2. Key Modules
- **app.ts** – bootstraps Express, registers logging, rate limits, health check, and Swagger
- **routes/** – domain routers (auth/users/admin/books/reviews/orders/stats/debug) composed of Zod validation → Prisma calls → standardized responses
- **middlewares/auth.ts** – JWT verification, RBAC, active-status check
- **middlewares/rateLimit.ts** – global limiter + stronger limiter for `/auth/*`
- **utils/pagination.ts** – shared pagination builder for list APIs
- **utils/security.ts** – password hashing, JWT helpers, SHA-256 token hashing, expiry helpers
- **db/prisma.ts** – Prisma client with MariaDB adapter, loaded via `DATABASE_URL`
- **tests/** – Jest + Supertest API suites with `tests/setup.ts` disconnect hook

## 3. Request Flow Example (Book Creation)
1. `POST /books` → `requireAdmin` validates JWT & role
2. `routes/books.ts` validates body with Zod
3. Prisma `book.create` writes to DB
4. Success → `201` JSON response; errors → standardized error payload

## 4. AuthN/AuthZ & Sessions
- Access/Refresh tokens share the same `JWT_SECRET`, lifetimes set via env (`ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`)
- `requireAuth` extracts `Authorization` header, verifies token, checks DB user + status
- `requireAdmin` wraps `requireAuth` and enforces `role === 'ADMIN'`
- Refresh tokens are stored as SHA-256 hashes in `RefreshToken` table with userAgent/IP metadata
- `/auth/refresh` rotates tokens: verifies JWT, compares hash, deletes old entry, stores new hash
- `/auth/logout` deletes the hash so the refresh token becomes unusable

## 5. Logging & Monitoring
- `morgan('dev')` + custom format (`:method :url :status :res[content-length] - :response-time ms`)
- Console logs for Prisma/JWT errors; can be piped to PM2/systemd logs in production

## 6. Deployment Notes
- Target platform: JCloud VM (Node.js 20+)
- Steps: copy build + `.env`, run migrations/seeds, `npm run build`, manage via PM2 (`pm2 start npm --name wserd -- start`)
- Keep DB credentials in `.env` only; open firewall/port forwarding for the exposed API port (default 2000)
- Use `GET /health` for monitoring probes; add PM2 startup for persistence

## 7. Development Workflow
1. `npm run dev` – rapid API iteration with ts-node-dev
2. Prisma schema changes → `npm run prisma:migrate`
3. `npm run seed` – reseed sample data when needed
4. `npm test` – Jest regression tests (runs serially with `--runInBand`)
5. Update Swagger docs + README/docs, then push to GitHub/Classroom

## 8. Future Improvements
- Device-aware session management (list + revoke refresh tokens)
- Dedicated service layer / CQRS to isolate business logic from routers
- Docker Compose for app+DB and GitHub Actions CI pipeline
- Structured logging (Winston/Pino) and OpenTelemetry tracing
