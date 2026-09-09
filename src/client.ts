import {
  APIConnectionError,
  APIError,
  AuthenticationError,
  InternalServerError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
  ValidationError,
  parseErrorEntries,
  type ApiErrorEntry,
} from './errors.js';
import type { HttpCore } from './types/common.js';
import { createLocationMethods } from './resources/locations.js';
import { createListingMethods } from './resources/listings.js';
import { createReviewMethods } from './resources/reviews.js';
import { createPostMethods } from './resources/posts.js';
import { createAnalyticsMethods } from './resources/analytics.js';
import { createPhotoMethods } from './resources/photos.js';
import { createConnectionMethods } from './resources/connections.js';
import { createAccountMethods } from './resources/account.js';

const DEFAULT_BASE_URL = 'https://listingsapi.com';
const DEFAULT_TIMEOUT_MS = 240_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
/**
 * Only these methods are retried. The API has no Idempotency-Key support, so a
 * retried write could duplicate a post or a location; writes are sent once and
 * any 429/5xx surfaces immediately. Mirrors the Python SDK's urllib3
 * `allowed_methods`.
 */
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTH_ERROR_CODES = new Set(['SY90005', 'SY90001']);
const PERMISSION_ERROR_CODES = new Set(['SY90003']);

/**
 * Encode a numeric location ID to base64 format, or return as-is if already encoded.
 */
export function encodeLocationId(idValue: string | number): string {
  if (typeof idValue === 'number') {
    return btoa(`Location:${idValue}`);
  }
  const s = String(idValue).trim();
  if (/^\d+$/.test(s)) {
    return btoa(`Location:${s}`);
  }
  return s;
}

/**
 * Build a URL query string from a params object, skipping undefined/null values.
 */
function buildQueryString(params: Record<string, any>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null,
  );
  if (entries.length === 0) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of entries) {
    searchParams.set(key, String(value));
  }
  return `?${searchParams.toString()}`;
}

/**
 * Read a response body once, returning both the raw text and the parsed JSON.
 *
 * The raw text is what gets attached to errors as `responseBody`, so callers
 * see exactly what the API sent. A non-JSON body (the gateway returns plain
 * text for some 404s) yields `parsed: null` rather than throwing.
 */
async function readResponseBody(
  response: Response,
): Promise<{ bodyText: string; parsed: unknown }> {
  if (typeof (response as any).text === 'function') {
    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch {
      bodyText = '';
    }
    let parsed: unknown = null;
    if (bodyText) {
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        parsed = null;
      }
    }
    return { bodyText, parsed };
  }
  let parsed: unknown = null;
  try {
    parsed = await (response as any).json();
  } catch {
    parsed = null;
  }
  let bodyText = '';
  try {
    bodyText = parsed == null ? '' : JSON.stringify(parsed);
  } catch {
    bodyText = '';
  }
  return { bodyText, parsed };
}

/**
 * Best-effort parse of error entries out of a response body.
 *
 * Handles the three shapes the platform uses: the `errors[]` envelope, the
 * singular `{ error: { code, message, ... } }` object (429s and some 4xx), and
 * a bare `{ message, code }` body. Anything else yields no entries. Mirrors
 * the Python SDK's `_error_entries_from_response`.
 */
function errorEntriesFromBody(parsed: unknown): ApiErrorEntry[] {
  if (!parsed || typeof parsed !== 'object') return [];
  const body = parsed as Record<string, unknown>;
  if (body.errors) return parseErrorEntries(body.errors);
  if (body.error) {
    if (typeof body.error === 'object') return parseErrorEntries([body.error]);
    return parseErrorEntries([{ message: String(body.error) }]);
  }
  if (body.message) {
    return parseErrorEntries([{ code: body.code, message: body.message }]);
  }
  return [];
}

export interface ListingsAPIOptions {
  /** API key. Defaults to the LISTINGSAPI_KEY environment variable. */
  apiKey?: string;
  /** API host. Defaults to https://listingsapi.com. */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Defaults to 240000. */
  timeout?: number;
  /**
   * Automatic retries on 429 and 5xx responses. Defaults to 2.
   *
   * Applies to reads only (GET/HEAD/OPTIONS). Writes are never retried
   * automatically: the API has no idempotency keys, so a retried POST could
   * duplicate a post or a location.
   */
  maxRetries?: number;
}

/**
 * Client for the listingsAPI v4 API.
 *
 * @example
 * ```ts
 * const client = new ListingsAPI(); // reads LISTINGSAPI_KEY from env
 * const locations = await client.fetchAllLocations({ first: 10 });
 * ```
 */
export class ListingsAPI {
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;
  private maxRetries: number;

  constructor(options: ListingsAPIOptions = {}) {
    const apiKey = options.apiKey ?? process.env.LISTINGSAPI_KEY;
    if (!apiKey) {
      throw new AuthenticationError(
        'No API key provided. Set the LISTINGSAPI_KEY environment variable or pass apiKey to new ListingsAPI().',
        { statusCode: 401 },
      );
    }

    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.headers = {
      Authorization: `API ${apiKey}`,
      'Content-Type': 'application/json',
    };

    // Mix in all resource methods
    const http: HttpCore = {
      apiGet: this.apiGet.bind(this),
      apiPost: this.apiPost.bind(this),
      apiDelete: this.apiDelete.bind(this),
      listingsGet: this.listingsGet.bind(this),
      encodeLocationId: encodeLocationId,
    };

    Object.assign(this, createLocationMethods(http));
    Object.assign(this, createListingMethods(http));
    Object.assign(this, createReviewMethods(http));
    Object.assign(this, createPostMethods(http));
    Object.assign(this, createAnalyticsMethods(http));
    Object.assign(this, createPhotoMethods(http));
    Object.assign(this, createConnectionMethods(http));
    Object.assign(this, createAccountMethods(http));
  }

  /**
   * GET request to an account-level API endpoint.
   */
  async apiGet<T = any>(
    path: string,
    params?: Record<string, any>,
  ): Promise<T> {
    const qs = params ? buildQueryString(params) : '';
    return this.request<T>('GET', `${this.baseUrl}/api/v4/${path}${qs}`);
  }

  /**
   * POST request to an account-level API endpoint. Raises for mutation
   * envelopes reporting success=false or errors[].
   */
  async apiPost<T = any>(
    path: string,
    body: Record<string, any>,
  ): Promise<T> {
    const { data, bodyText, status } = await this.requestRaw(
      'POST',
      `${this.baseUrl}/api/v4/${path}`,
      JSON.stringify(body),
    );
    this.raiseForMutationErrors(data, bodyText, status);
    return data as T;
  }

  /**
   * DELETE request to an account-level API endpoint.
   */
  async apiDelete<T = any>(path: string): Promise<T> {
    const { data, bodyText, status } = await this.requestRaw(
      'DELETE',
      `${this.baseUrl}/api/v4/${path}`,
    );
    this.raiseForMutationErrors(data, bodyText, status);
    return data as T;
  }

  /**
   * GET request to a location-scoped API endpoint.
   */
  async listingsGet<T = any>(
    locationId: string | number,
    path: string,
    params?: Record<string, any>,
  ): Promise<T> {
    const encodedId = encodeLocationId(locationId);
    return this.apiGet<T>(`locations/${encodedId}/${path}`, params);
  }

  private async request<T>(
    method: string,
    url: string,
    body?: string,
  ): Promise<T> {
    const { data } = await this.requestRaw(method, url, body);
    return data as T;
  }

  private async requestRaw(
    method: string,
    url: string,
    body?: string,
  ): Promise<{ data: unknown; bodyText: string; status: number }> {
    let lastError: Error | null = null;
    // Reads may be repeated safely; writes are sent exactly once because the
    // API cannot dedupe a retried create.
    const maxRetries = IDEMPOTENT_METHODS.has(method.toUpperCase())
      ? this.maxRetries
      : 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, {
          method,
          headers: this.headers,
          body,
          signal: AbortSignal.timeout(this.timeout),
        });
      } catch (err) {
        lastError = new APIConnectionError(
          `Could not reach the API: ${err instanceof Error ? err.message : String(err)}`,
        );
        if (attempt < maxRetries) continue;
        throw lastError;
      }

      if (RETRYABLE_STATUSES.has(response.status) && attempt < maxRetries) {
        const retryAfter = Number(response.headers?.get?.('Retry-After'));
        const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 500 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      const { bodyText, parsed } = await readResponseBody(response);

      if (!response.ok) {
        throw this.errorForResponse(response, bodyText, parsed);
      }

      const topLevel = parseErrorEntries((parsed as any)?.errors);
      if (topLevel.length > 0) {
        throw this.errorForEntries(topLevel, response.status, bodyText);
      }
      return { data: parsed, bodyText, status: response.status };
    }

    throw lastError ?? new APIConnectionError('Request failed');
  }

  private errorForResponse(
    response: Response,
    bodyText: string,
    parsed: unknown,
  ): APIError {
    const status = response.status;
    const message = `API request failed: ${status}`;
    const errors = errorEntriesFromBody(parsed);
    const options = { statusCode: status, responseBody: bodyText, errors };

    if (status === 401) return new AuthenticationError(message, options);
    if (status === 403) return new PermissionDeniedError(message, options);
    if (status === 404) return new NotFoundError(message, options);
    if (status === 429) {
      return new RateLimitError(message, {
        ...options,
        retryAfter: response.headers?.get?.('Retry-After') ?? null,
      });
    }
    if (status === 400 || status === 422) return new ValidationError(message, options);
    if (status >= 500) return new InternalServerError(message, options);
    return new APIError(message, options);
  }

  private errorForEntries(
    entries: ApiErrorEntry[],
    statusCode: number,
    responseBody: string,
  ): APIError {
    const codes = new Set(entries.map((e) => e.code).filter(Boolean) as string[]);
    const options = {
      statusCode,
      responseBody,
      errors: entries,
    };
    for (const code of codes) {
      if (AUTH_ERROR_CODES.has(code)) return new AuthenticationError('Authentication failed', options);
    }
    for (const code of codes) {
      if (PERMISSION_ERROR_CODES.has(code)) return new PermissionDeniedError('Permission denied', options);
    }
    if (codes.size === 1 && codes.has('RATE_LIMITED')) {
      return new RateLimitError('Rate limit exceeded', options);
    }
    return new APIError('API request failed', options);
  }

  private raiseForMutationErrors(
    data: unknown,
    responseBody: string,
    statusCode: number,
  ): void {
    if (!data || typeof data !== 'object') return;
    const payload = (data as Record<string, any>).data;
    if (!payload || typeof payload !== 'object') return;
    for (const result of Object.values(payload)) {
      if (!result || typeof result !== 'object') continue;
      const entry = result as Record<string, any>;
      const errors = parseErrorEntries(entry.errors);
      if (errors.length > 0 || entry.success === false) {
        throw new ValidationError('API request failed', {
          statusCode,
          responseBody,
          errors: errors.length > 0
            ? errors
            : [{ code: null, message: 'The API reported success=false', context: {} }],
        });
      }
    }
  }
}

// Declare the mixed-in methods on the class for TypeScript
export interface ListingsAPI
  extends ReturnType<typeof createLocationMethods>,
    ReturnType<typeof createListingMethods>,
    ReturnType<typeof createReviewMethods>,
    ReturnType<typeof createPostMethods>,
    ReturnType<typeof createAnalyticsMethods>,
    ReturnType<typeof createPhotoMethods>,
    ReturnType<typeof createConnectionMethods>,
    ReturnType<typeof createAccountMethods> {}
