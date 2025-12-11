# WSERD Bookstore API

TypeScript 기반 Express + Prisma + MySQL/MariaDB 북스토어 REST API. JWT 인증/인가(USER/ADMIN), 페이지네이션·검색·정렬, Soft Delete, Swagger, Postman, Jest 테스트를 제공합니다.

## 프로젝트 개요
- 문제정의: 서점 도메인(회원/인증/도서/리뷰/주문) 백엔드 API.
- 주요 기능: 회원 가입/로그인/토큰 재발급, 도서/카테고리/작가 CRUD, 리뷰/좋아요, 주문 생성·조회·취소, 관리자 통계, RBAC(USER/ADMIN), 레이트리밋.

## 실행 방법
```bash
# 1) 의존성 설치
npm install

# 2) 환경 변수 준비
cp .env.example .env   # 값 채우기 (DB, JWT 등)

# 3) 마이그레이션 & 시드
npm run prisma:migrate
npm run seed

# 4) 서버 실행
npm run dev            # 개발 (ts-node-dev, 기본 포트 2000)
npm run build && npm start   # 프로덕션

# 5) 테스트
npm test
```

## 환경변수 (.env.example 기준)
| 이름 | 기본값 | 설명 |
| --- | --- | --- |
| NODE_ENV | local | 실행 환경 |
| PORT | 2000 | 앱 포트 |
| DATABASE_URL | mysql://book_user:password@localhost:3306/bookstore | Prisma DB 연결 |
| JWT_SECRET | (필수) | JWT 서명 키 |
| JWT_ALGORITHM | HS256 | JWT 알고리즘 |
| ACCESS_TOKEN_EXPIRE_MINUTES | 30 | Access 만료 |
| REFRESH_TOKEN_EXPIRE_DAYS | 7 | Refresh 만료 |
| CORS_ORIGINS | http://localhost:3000 | 허용 오리진(콤마 구분) |

## 배포 주소 (JCloud)
- Base URL: `http://113.198.66.68:10038`
- Swagger: `http://113.198.66.68:10038/api-docs`
- Health: `http://113.198.66.68:10038/health`
- 프로세스 매니저: PM2 (`pm2 list`, `pm2 save`, `pm2 startup`)

## 인증 플로우
1. `POST /auth/signup` 회원가입
2. `POST /auth/login` → `{ accessToken, refreshToken }`
3. 보호 API 호출 시 `Authorization: Bearer <accessToken>`
4. 만료 시 `POST /auth/refresh` → 새 토큰 쌍
5. 로그아웃 `POST /auth/logout` (refresh 무효화)

## 역할 / 권한표
| 역할 | 주요 접근 |
| --- | --- |
| USER | `/books`, `/categories`, `/authors`, `/books/:id/reviews`, `/orders`(본인) 등 |
| ADMIN | `/admin/users/*`, `/books`(CRUD), `/categories/*`, `/authors/*`, `/orders/admin/all`, `/orders/:id/status`, `/stats/*` |

## 예제 계정
- USER: `user1@example.com / P@ssw0rd!`
- ADMIN: `admin@example.com / P@ssw0rd!`
(시드 기준, DB 재설정 시 달라질 수 있음)

## DB 연결 정보 (테스트/로컬)
- 호스트: `localhost` (배포 시 내부 DB 호스트)
- 포트: `3306`
- DB명: `bookstore`
- 계정: `book_user` (적절한 권한으로 제한)
- 연결 문자열: `mysql://book_user:password@localhost:3306/bookstore`

## 엔드포인트 요약
| 메서드 | 경로 | 설명 | 권한 |
| --- | --- | --- | --- |
| GET | /health | 헬스체크 | 공개 |
| POST | /auth/signup | 회원가입 | 공개 |
| POST | /auth/login | 로그인 | 공개 |
| POST | /auth/refresh | 토큰 재발급 | 공개 |
| POST | /auth/logout | 로그아웃 | 공개 |
| GET | /users/me | 내 정보 조회 | USER |
| PATCH | /users/me | 내 정보 수정 | USER |
| GET | /admin/users | 사용자 목록 | ADMIN |
| PATCH | /admin/users/:id/deactivate | 사용자 비활성화 | ADMIN |
| PATCH | /admin/users/:id/role | 사용자 권한 변경 | ADMIN |
| GET/POST | /books | 도서 목록/생성 | 목록 공개 / 생성 ADMIN |
| GET/PATCH/DELETE | /books/:id | 도서 조회/수정/삭제(soft) | 조회 공개 / 수정·삭제 ADMIN |
| GET/POST | /categories | 카테고리 목록/생성 | 목록 공개 / 생성 ADMIN |
| GET/PATCH/DELETE | /categories/:id | 카테고리 조회/수정/삭제 | 조회 공개 / 수정·삭제 ADMIN |
| GET/POST | /authors | 작가 목록/생성 | 목록 공개 / 생성 ADMIN |
| GET/PATCH/DELETE | /authors/:id | 작가 조회/수정/삭제 | 조회 공개 / 수정·삭제 ADMIN |
| GET/POST | /books/:bookId/reviews | 리뷰 목록/생성 | 목록 공개 / 생성 USER |
| PATCH/DELETE | /reviews/:reviewId | 리뷰 수정/삭제(soft) | 본인(USER) |
| POST/DELETE | /reviews/:reviewId/likes | 리뷰 좋아요/취소 | USER |
| POST | /orders | 주문 생성 | USER |
| GET | /orders | 내 주문 목록 | USER |
| GET | /orders/:id | 내 주문 상세 | USER |
| PATCH | /orders/:id/cancel | 내 주문 취소 | USER |
| GET | /orders/admin/all | 전체 주문 목록 | ADMIN |
| PATCH | /orders/:id/status | 주문 상태 변경 | ADMIN |
| GET | /stats/summary | 요약 통계 | ADMIN |
| GET | /stats/top-books | 인기 도서 | ADMIN |

## 성능/보안 고려사항
- JWT + bcrypt 해시, refresh 토큰 해시/저장.
- 레이트리밋: 글로벌, 인증 경로 별도 제한(`src/middlewares/rateLimit.ts`).
- CORS 허용 도메인 설정 가능(`CORS_ORIGINS`).
- Prisma FK/인덱스 정의, 페이지네이션 + 제한된 sort 필드로 과도한 쿼리 방지.
- Soft delete(`deletedAt`)로 복구 여지 확보.
- 로깅: morgan 요청 요약, 에러 스택 `console.error`.

## 한계와 개선 계획
- CI/CD 파이프라인 미구현 → GitHub Actions, Docker Compose 추가 예정.
- 토큰/세션 관리 UI 없음 → 관리용 API/대시보드 고려.
- Postman 스크립트 추가 검증 확대 여지(더 많은 자동화 테스트).
- 캐싱/메트릭 미구현 → Redis/Prometheus 연계 검토.
