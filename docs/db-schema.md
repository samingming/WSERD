# WSERD Bookstore – DB Schema Summary

Prisma 스키마(`prisma/schema.prisma`)를 기반으로 핵심 테이블과 관계를 정리했습니다.

## 1. 주요 테이블
| 테이블 | 설명 | 비고 |
| --- | --- | --- |
| `User` | 회원 계정 | `role`(USER/ADMIN), `status`(ACTIVE/INACTIVE), soft delete(`deletedAt`) |
| `RefreshToken` | Refresh 토큰 저장소 | `tokenHash` 유니크, userAgent/IP/만료일 기록 |
| `Book` | 도서 메타데이터 | Decimal 가격, soft delete |
| `Review` | 도서 리뷰 | `likeCount`, `commentCount` 캐시 필드 |
| `ReviewLike` | 리뷰 좋아요 N:M | `(reviewId, userId)` 유니크 |
| `Order` | 주문 마스터 | 금액 합계 필드, `status=PENDING/PAID/CANCELLED` |
| `OrderItem` | 주문 상세 | 현재 단일 품목이지만 확장 대비 |
| `Author`, `Category` | 추가 도메인 리소스 | 향후 API 확장용 (현재는 관계 정의만) |
| `BookAuthor`, `BookCategory` | 도서-저자/카테고리 연결 | 복합 PK |

## 2. 관계 개요
- `User` 1 ─ * `Review`, `ReviewLike`, `Order`
- `Book` 1 ─ * `Review`, `OrderItem`
- `Review` 1 ─ * `ReviewLike`
- `Order` 1 ─ * `OrderItem`
- `Book` 1 ─ * `BookAuthor` ─ * `Author`
- `Book` 1 ─ * `BookCategory` ─ * `Category`

## 3. 인덱스 & 제약
- 고유 제약: `User.email`, `RefreshToken.token_hash`, `BookAuthor(book_id, author_id)` 등
- 보조 인덱스: `Review.bookId`, `Review.userId`, `Comment.reviewId`, `Order.userId`
- Soft delete 컬럼(`deletedAt`)은 애플리케이션에서 필터링 (예: Books 목록)

## 4. Prisma 설정
- Client 생성: `npm run prisma:generate`
- 마이그레이션: `npm run prisma:migrate`
- 시드: `npm run seed` (Prisma `seed.ts` 실행)
- `src/db/prisma.ts`는 `PrismaMariaDb` 어댑터로 MariaDB 10.5+ 호환

## 5. 시드 데이터
- `prisma/seed.ts`에서 다음을 생성
  - 관리자 `admin@example.com / P@ssw0rd!`
  - 사용자 `user1@example.com / P@ssw0rd!`
  - Faker 기반 도서 200권+, 리뷰/리뷰 좋아요, 주문/주문 아이템 샘플

## 6. 운영 팁
- 개발/배포 DB는 분리하고 `.env`는 Git에 포함하지 않습니다.
- Decimal 컬럼은 `Number()`로 변환하여 JSON 응답(`orders.ts`, `books.ts` 참고)
- 대량 시드는 `prisma.book.createMany` + faker로 1~2초 내 완료
- DB 접속 예시
  ```bash
  mysql -h localhost -P 3306 -u book_user -p bookstore
  ```
