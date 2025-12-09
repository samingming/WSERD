# WSERD Bookstore - API Design Snapshot

과제 1의 설계를 기반으로 실제 구현된 엔드포인트와 상태를 정리했습니다. 자세한 스키마는 `src/docs/swagger.ts`에서 확인할 수 있습니다.

## 1. 인증 (Auth)
| 메서드 | 경로 | 설명 | 인증 | 비고 |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/signup` | 회원가입 | - | 이메일 중복 검사, bcrypt 해시 |
| `POST` | `/auth/login` | Access/Refresh 토큰 발급 | - | JWT + RBAC |
| `POST` | `/auth/refresh` | Access/Refresh 재발급 | Refresh 토큰(body) | RefreshToken 테이블에서 SHA-256 해시 비교 후 회전 |
| `POST` | `/auth/logout` | Refresh 토큰 무효화 | Refresh 토큰(body) | 토큰 해시 삭제로 세션 종료 |
| `GET` | `/auth/ping` | 라우터 헬스 체크 | - | 테스트용 |

## 2. 사용자 (Users)
| 메서드 | 경로 | 설명 | 인증 | 상태 |
| --- | --- | --- | --- | --- |
| `GET` | `/users/me` | 내 프로필 조회 | Bearer | 구현 완료 |
| `PATCH` | `/users/me` | 내 정보 수정 | Bearer | Swagger 정의만 존재 (구현 예정) |

## 3. 관리자 (Admin)
| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| `GET` | `/admin/users` | 사용자 목록 (검색/정렬/페이지네이션) | ADMIN |
| `PATCH` | `/admin/users/:id/deactivate` | 사용자 비활성화 | ADMIN |
| `PATCH` | `/admin/users/:id/role` | Role 변경 (USER/ADMIN) | ADMIN |
| *추가 예정* | `/admin/users/:id/reset-password` 등 | |

## 4. 도서 (Books)
| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| `GET` | `/books` | 목록 (keyword, 가격, sort, pagination) | - |
| `GET` | `/books/:id` | 상세 조회 | - |
| `POST` | `/books` | 생성 | ADMIN |
| `PATCH` | `/books/:id` | 수정 | ADMIN |
| `DELETE` | `/books/:id` | soft delete | ADMIN |

## 5. 리뷰 (Reviews)
| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| `POST` | `/books/:bookId/reviews` | 리뷰 작성 | USER |
| `GET` | `/books/:bookId/reviews` | 특정 도서 리뷰 목록 | - |
| `PATCH` | `/reviews/:reviewId` | 내 리뷰 수정 | USER |
| `DELETE` | `/reviews/:reviewId` | 내 리뷰 삭제(soft) | USER |
| `POST` | `/reviews/:reviewId/likes` | 리뷰 좋아요 | USER |
| `DELETE` | `/reviews/:reviewId/likes` | 리뷰 좋아요 취소 | USER |
| *향후* | `/reviews/:reviewId/comments` | 댓글/대댓글 | USER |

## 6. 주문 (Orders)
| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| `POST` | `/orders` | 주문 생성 | USER |
| `GET` | `/orders` | 내 주문 목록 | USER |
| `GET` | `/orders/:id` | 내 주문 상세 | USER |
| `PATCH` | `/orders/:id/cancel` | 주문 취소 | USER |
| `GET` | `/orders/admin/all` | 전체 주문 조회 | ADMIN |
| `PATCH` | `/orders/:id/status` | 주문 상태 변경 | ADMIN |
| *향후* | `/orders/:id/items` | 다중 품목 | |

## 7. 통계 (Stats)
| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| `GET` | `/stats/summary` | 사용자/도서/리뷰/주문 집계 | ADMIN |
| `GET` | `/stats/top-books` | 리뷰 수 Top 5 도서 | ADMIN |
| *추가 제안* | `/stats/daily`, `/stats/top-users` | |

## 8. 지원 기능
- **Health**: `GET /health` – 버전/시간 포함한 상태 확인
- **Debug**: `GET /debug/users` – 시드 계정 확인용
- **Swagger**: `GET /api-docs` – OpenAPI 문서

## 9. 에러 규격
- 모든 오류는 `{ timestamp, path, status, code, message, details }` 형식
- 정의된 코드 예: `BAD_REQUEST`, `VALIDATION_FAILED`, `INVALID_QUERY_PARAM`, `UNAUTHORIZED`, `TOKEN_EXPIRED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `USER_NOT_FOUND`, `DUPLICATE_RESOURCE`, `STATE_CONFLICT`, `TOO_MANY_REQUESTS`, `INTERNAL_SERVER_ERROR`
- Swagger 각 엔드포인트에 401/403/404/500 응답 예시 제공

## 10. 향후 보완
1. `/users/me` PATCH/DELETE 등 사용자 관리 기능 확장
2. 관리자 통계/리포트 API 추가 (30개 초과 엔드포인트 유지)
3. 리뷰 댓글, 주문 품목 등 서브 리소스 세분화
4. Postman 컬렉션 Pre-request/Test 스크립트 강화
5. Swagger와 실제 구현 사이의 변경점을 자동 검증하는 CI 추가
