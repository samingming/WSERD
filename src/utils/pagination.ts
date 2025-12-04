// src/utils/pagination.ts

export interface PaginationParams {
  page: number;
  size: number;
  skip: number;
  take: number;
  sort?: string | null;
}

/**
 * 쿼리스트링에서 page, size, sort를 파싱해서
 * 공통으로 쓸 수 있는 페이지네이션 정보로 변환해주는 함수
 *
 * - page: 0 기반
 * - size: 기본값/최대값 제한
 * - sort: 문자열 그대로 보관 (각 라우트에서 해석해서 orderBy로 변환)
 */
export function getPagination(
  query: any,
  options?: {
    defaultPage?: number;
    defaultSize?: number;
    maxSize?: number;
    defaultSort?: string | null;
  },
): PaginationParams {
  const defaultPage = options?.defaultPage ?? 0;
  const defaultSize = options?.defaultSize ?? 20;
  const maxSize = options?.maxSize ?? 50;
  const defaultSort = options?.defaultSort ?? null;

  let page = Number(query.page ?? defaultPage);
  if (!Number.isFinite(page) || page < 0) page = defaultPage;

  let size = Number(query.size ?? defaultSize);
  if (!Number.isFinite(size) || size <= 0) size = defaultSize;
  if (size > maxSize) size = maxSize;

  const skip = page * size;
  const take = size;

  const sortRaw = (query.sort as string | undefined) ?? defaultSort;

  return {
    page,
    size,
    skip,
    take,
    sort: sortRaw,
  };
}

/**
 * 공통 페이지네이션 응답 형태
 *
 * {
 *   content: [...]
 *   page: 0,
 *   size: 20,
 *   totalElements: 153,
 *   totalPages: 8,
 *   sort: "createdAt,DESC"
 * }
 */
export function buildPagedResponse<T>(
  content: T[],
  totalElements: number,
  meta: { page: number; size: number; sort?: string | null },
) {
  const size = meta.size || 1;
  const totalPages =
    totalElements === 0 ? 0 : Math.ceil(totalElements / size);

  return {
    content,
    page: meta.page,
    size: meta.size,
    totalElements,
    totalPages,
    sort: meta.sort ?? null,
  };
}
