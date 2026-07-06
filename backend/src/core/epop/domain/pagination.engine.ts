import { EpopPaginatedResult, EpopPaginationParams } from '@agroerp/shared';

export function normalizePagination(params?: EpopPaginationParams): { page: number; pageSize: number; skip: number } {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, params?.pageSize ?? 25));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  nextCursor?: string,
): EpopPaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    nextCursor,
  };
}
