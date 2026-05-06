/**
 * Pagination Utilities — StayEg
 *
 * Provides consistent pagination for all list API endpoints.
 * Supports offset-based pagination with page/limit params.
 */

import { NextRequest, NextResponse } from 'next/server';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Extract pagination params from request URL query string.
 * Validates and clamps values to reasonable ranges.
 */
export function getPaginationParams(request: NextRequest): PaginationParams {
  const { searchParams } = new URL(request.url);

  let page = parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10);
  let limit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10);

  // Clamp values
  if (isNaN(page) || page < 1) page = DEFAULT_PAGE;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Build a paginated response object.
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasMore: params.page < totalPages,
    },
  };
}

/**
 * Apply Supabase range-based pagination to a query builder.
 * Usage: query.range(params.offset, params.offset + params.limit - 1)
 */
export function applyPaginationRange(params: PaginationParams): { from: number; to: number } {
  return {
    from: params.offset,
    to: params.offset + params.limit - 1,
  };
}
