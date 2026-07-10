export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
  total?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pageInfo: PageInfo;
  totalCount?: number;
  raw: any;
}

export interface PaginationOptions {
  first?: number;
  after?: string;
  before?: string;
  last?: number;
  fetchAll?: boolean;
  pageSize?: number;
}

export interface HttpCore {
  apiGet<T = any>(path: string, params?: Record<string, any>): Promise<T>;
  apiPost<T = any>(path: string, body: Record<string, any>): Promise<T>;
  apiDelete<T = any>(path: string): Promise<T>;
  listingsGet<T = any>(
    locationId: string | number,
    path: string,
    params?: Record<string, any>,
  ): Promise<T>;
  encodeLocationId(id: string | number): string;
}
