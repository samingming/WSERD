# WSERD Bookstore API

통합 온라인 서점 업무 흐름(회원, 인증, 도서, 리뷰, 주문, 통계)을 다루는 TypeScript 기반 Express API 서버입니다. Prisma ORM으로 MySQL/MariaDB 스키마와 대량 시드 데이터를 관리하며, JWT 인증·인가, 표준화된 에러 응답, Swagger 문서, Postman/HTTP 테스트 시나리오, 자동화 테스트(Jest)를 포함합니다.

## 주요 기능
- **리소스 8종**: Auth, Users, Books, Reviews, Orders, Categories, Authors, Admin/Stats.
- **JWT 인증 & RBAC**: Access/Refresh 토큰 발급, USER/ADMIN 권한 확인, rate limiting.
- **검색·페이지네이션**: 공통 페이지네이션 유틸을 통해 목록 API 전반에 적용.
- **입력 검증 & 에러 포맷**: Zod 기반 DTO 검증과 통일된 오류 응답 스키마.
- **DB 관리**: Prisma 마이그레이션 + 200건 이상 시드 데이터, Decimal 컬럼 처리.
- **테스트/문서화**: Jest로 20개 이상 자동화 테스트, Swagger UI(`/api-docs`), VS Code REST(`test.http`) 및 Postman 내보내기 가이드.

## 기술 스택
| 구분 | 사용 기술 |
| --- | --- |
| 언어/런타임 | Node.js 20+, TypeScript 5 |
| 서버 | Express 5, Morgan, CORS, express-rate-limit |
| 인증/보안 | jsonwebtoken, bcryptjs, dotenv |
| DB | MySQL/MariaDB, Prisma ORM, @faker-js/faker(시드) |
| 문서/도구 | Swagger UI, Jest + Supertest, Postman, VS Code REST Client |

## 프로젝트 구조
```
├─ src/                # Express 앱, 라우트, 미들웨어, 유틸
├─ prisma/             # schema.prisma, migrations/, seed.ts
├─ docs/               # api-design.md, db-schema.md, architecture.md
├─ tests/              # Jest + Supertest 시나리오
├─ postman/            # Postman 컬렉션(내보내기 가이드)
├─ test.http           # REST Client용 시나리오
└─ README.md
```

## 실행 방법
1. **환경 변수 구성**
   ```bash
   cp .env.example .env          # 값 채우기
   ```
2. **의존성 설치**
   ```bash
   npm install
   ```
3. **DB 준비**
   - MySQL/MariaDB 10.5+ 인스턴스 실행
   - `.env`의 `DATABASE_URL` (예: `mysql://book_user:password@localhost:3306/bookstore`)과 일치하도록 계정/DB 생성
4. **마이그레이션 & 시드**
   ```bash
   npm run prisma:migrate
   npm run seed
   ```
5. **로컬 서버 실행**
   ```bash
   npm run dev      # ts-node-dev, http://localhost:2000
   # 또는 빌드 후 실행
   npm run build && npm start
   ```
6. **자동화 테스트**
   ```bash
   npm test
   ```

### npm 스크립트 요약
| 스크립트 | 설명 |
| --- | --- |
| `npm run dev` | ts-node-dev로 개발 서버 실행 |
| `npm run build` / `npm start` | TypeScript 컴파일 후 dist 서버 실행 |
| `npm run prisma:migrate` | `prisma migrate dev` (스키마 반영) |
| `npm run prisma:generate` | Prisma Client 재생성 |
| `npm run seed` | `prisma db seed` (기본 데이터 200건+ 투입) |
| `npm test` | Jest + Supertest 스위트 실행 |

## 환경 변수
| 이름 | 기본값 | 설명 |
| --- | --- | --- |
| `NODE_ENV` | `local` | 런타임 환경 표시 |
| `PORT` | `2000` | Express 서버 포트 |
| `DATABASE_URL` | `mysql://book_user:password@localhost:3306/bookstore` | Prisma 연결 문자열 |
| `JWT_SECRET` | _(필수)_ | Access/Refresh 토큰 서명 키 |
| `JWT_ALGORITHM` | `HS256` | 토큰 서명 알고리즘 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access 토큰 만료 (분) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh 토큰 만료 (일) |
| `CORS_ORIGINS` | `http://localhost:3000` | 허용 오리진 목록(콤마 구분) |

## 데이터베이스 & 마이그레이션
- Prisma 스키마: `prisma/schema.prisma`
- 마이그레이션 기록: `prisma/migrations/`
- 시드 스크립트: `prisma/seed.ts` (관리자/일반 계정, 200권 이상의 도서, 리뷰·주문 데이터 생성)
- Decimal/MariaDB 어댑터: `src/db/prisma.ts`에서 `PrismaMariaDb` 사용
- 샘플 접속 명령
  ```bash
  mysql -h localhost -P 3306 -u book_user -p bookstore
  ```

## 배포 (JCloud)
- 인스턴스에 Node.js 20+, PM2/systemd 설치 후 빌드 산출물 배포
- `.env`에 JCloud DB 및 `HOST=<public-ip>`, `PORT=<redirected-port>` 설정
- **기본 엔드포인트** (예: `http://113.198.xx.xx:10251`)
  - Health: `GET /health`
  - Swagger UI: `GET /api-docs`
  - API Root: `http://<host>:<port>`
- PM2 예시
  ```bash
  pm2 start npm --name wserd -- start
  pm2 save && pm2 startup
  ```
- 포트 포워딩/방화벽 규칙은 JCloud 문서를 참고하여 `PORT=2000` 또는 제공된 포트로 매핑합니다.

## 인증 플로우
1. `POST /auth/signup`으로 계정 생성
2. `POST /auth/login` → `{ accessToken, refreshToken }`
3. 보호 라우트 호출 시 `Authorization: Bearer <accessToken>`
4. 토큰 만료 시 `POST /auth/refresh`로 새 Access/Refresh 토큰 발급(기존 Refresh 토큰은 회수)
5. `POST /auth/logout`으로 서버 측 Refresh 토큰을 삭제하여 세션 종료

## 역할/권한
| 역할 | 설명 | 접근 가능 API 예시 |
| --- | --- | --- |
| `USER` | 기본 회원 | `/books`, `/categories`, `/authors`, `/books/:id`, `/books/:id/reviews`, `/reviews/:id`, `/orders` 등 개인 정보/리뷰/주문 |
| `ADMIN` | 운영자 | `/admin/users`, `/admin/users/:id/*`, `/books`(생성/수정/삭제), `/categories/*`, `/authors/*`, `/orders/admin/all`, `/stats/*` |

## 엔드포인트 요약
| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/health` | 서버 상태 확인 (버전·시간 포함) | - |
| GET | `/debug/users` | 시드 계정 확인용 디버그 | - |
| POST | `/auth/signup` | 회원가입 | - |
| POST | `/auth/login` | 로그인(Access/Refresh) | - |
| GET | `/auth/ping` | Auth 라우터 헬스 | - |
| GET | `/users/me` | 내 프로필 조회 | Bearer |
| GET | `/admin/users` | 전체 사용자 목록 (검색/정렬) | ADMIN |
| PATCH | `/admin/users/:id/deactivate` | 사용자 비활성화 | ADMIN |
| PATCH | `/admin/users/:id/role` | 사용자 Role 변경 | ADMIN |
| GET | `/books` | 도서 목록 (검색/정렬/페이지네이션) | - |
| POST | `/books` | 도서 생성 | ADMIN |
| GET | `/books/:id` | 도서 상세 | - |
| PATCH | `/books/:id` | 도서 수정 | ADMIN |
| DELETE | `/books/:id` | 도서 삭제 (soft) | ADMIN |
| GET | `/books/:bookId/reviews` | 특정 도서 리뷰 목록 | - |
| POST | `/books/:bookId/reviews` | 리뷰 작성 | Bearer |
| GET | `/categories` | 카테고리 목록 (검색/필터/페이지네이션) | - |
| POST | `/categories` | 카테고리 생성 | ADMIN |
| GET | `/categories/:id` | 카테고리 상세 | - |
| PATCH | `/categories/:id` | 카테고리 수정 | ADMIN |
| DELETE | `/categories/:id` | 카테고리 삭제 | ADMIN |
| GET | `/authors` | 작가 목록 (검색/페이지네이션) | - |
| POST | `/authors` | 작가 생성 | ADMIN |
| GET | `/authors/:id` | 작가 상세 | - |
| PATCH | `/authors/:id` | 작가 수정 | ADMIN |
| DELETE | `/authors/:id` | 작가 삭제 | ADMIN |
| PATCH | `/reviews/:reviewId` | 내 리뷰 수정 | Bearer |
| DELETE | `/reviews/:reviewId` | 내 리뷰 삭제(soft) | Bearer |
| POST | `/reviews/:reviewId/likes` | 리뷰 좋아요 | Bearer |
| DELETE | `/reviews/:reviewId/likes` | 리뷰 좋아요 취소 | Bearer |
| POST | `/orders` | 주문 생성 | Bearer |
| GET | `/orders` | 내 주문 목록 | Bearer |
| GET | `/orders/:id` | 내 주문 상세 | Bearer |
| PATCH | `/orders/:id/cancel` | 내 주문 취소 | Bearer |
| GET | `/orders/admin/all` | 전체 주문 조회 | ADMIN |
| PATCH | `/orders/:id/status` | 주문 상태 변경 | ADMIN |
| GET | `/stats/summary` | 통계 요약(사용자/도서/리뷰/주문 수) | ADMIN |
| GET | `/stats/top-books` | 리뷰 수 기준 Top 5 도서 | ADMIN |

## Swagger & Postman
- Swagger UI: `http://<host>:<port>/api-docs`
- OpenAPI 스펙은 `src/docs/swagger.ts`에서 동적으로 정의
- Postman 사용 시 VS Code REST 스크립트(`test.http`)를 `Import → Raw Text`로 붙여넣어 컬렉션으로 생성하거나, Workspace의 요청을 `postman/` 폴더로 내보낼 수 있습니다.

## 테스트 & 품질
- `tests/` 디렉터리에 Auth/Books/Orders/Users/Health 스위트가 위치하며 총 20+ 케이스를 제공
- `tests/helpers.ts`에서 시드된 USER/ADMIN으로 로그인 후 Bearer 토큰을 재사용
- Jest `--runInBand` 실행으로 Prisma 커넥션 충돌을 방지하며, `tests/setup.ts`에서 테스트 종료 후 disconnect 처리

## 보안·성능 고려 사항
- 비밀번호 Bcrypt 해시 저장
- Refresh 토큰은 SHA-256 해시로 저장하고 재발급/로그아웃 시 회수
- 전역 및 인증 전용 rate limit (`src/middlewares/rateLimit.ts`)
- CORS 제한 (`src/app.ts`)
- Soft delete (`deletedAt`)로 데이터 복구 가능
- Prisma 모델에 이메일/조인 칼럼 인덱스 적용
- 로깅: morgan 기본 + 확장 포맷 두 가지 등록

## 알려진 한계 & 향후 개선
1. Users 리소스의 자기 정보 수정·삭제, 추가 관리자 통계 등 엔드포인트 확장
2. Refresh 토큰/세션을 디바이스별로 관리·조회할 수 있는 UI/관리 API
3. Postman 컬렉션(JSON)과 README 내 링크 연동
4. CI/CD (GitHub Actions) 및 Docker Compose(DB+앱) 템플릿
5. 캐싱/메트릭 지표로 인기 도서·에러율 추적

## 참고 문서
- `docs/api-design.md` – 과제 1 API 설계 요약과 현재 구현 차이
- `docs/db-schema.md` – 핵심 테이블 및 관계 정리, Prisma 명령어
- `docs/architecture.md` – 계층 구조 및 모듈 의존성
