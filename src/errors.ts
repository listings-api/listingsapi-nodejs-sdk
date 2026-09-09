export interface ApiErrorEntry {
  code: string | null;
  message: string;
  context: Record<string, unknown>;
}

/**
 * Base class for every error thrown by the listingsAPI SDK.
 */
export class ListingsAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Thrown when the API reports a failure.
 *
 * Covers both non-2xx HTTP responses and error payloads the API returns with
 * HTTP 200 (the platform reports auth and validation failures in an errors[]
 * body; mutations report success=false plus errors[]).
 */
export class APIError extends ListingsAPIError {
  statusCode: number | null;
  responseBody: string | null;
  /** First platform error code (e.g. "SY10005"), when the API sent one. */
  code: string | null;
  /** Every error entry, normalized to { code, message, context }. */
  errors: ApiErrorEntry[];

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      responseBody?: string;
      errors?: ApiErrorEntry[];
    },
  ) {
    const errors = options?.errors ?? [];
    const detail = errors
      .map((e) => (e.code ? `${e.code}: ${e.message}` : e.message))
      .join('; ');
    let full = message;
    if (detail) full = `${message} - ${detail}`;
    else if (options?.responseBody) full = `${message} - ${options.responseBody}`;
    super(full);
    this.statusCode = options?.statusCode ?? null;
    this.responseBody = options?.responseBody ?? null;
    this.errors = errors;
    this.code = errors.length > 0 ? errors[0].code : null;
  }
}

/** 401 or invalid-token error payloads. */
export class AuthenticationError extends APIError {}

/** 403 or permission error payloads. */
export class PermissionDeniedError extends APIError {}

/** 404 — resource not found. */
export class NotFoundError extends APIError {}

/** 400/422, or mutations returning success=false / errors[]. */
export class ValidationError extends APIError {}

/** 429 — rate limited. Check retryAfter for backoff. */
export class RateLimitError extends APIError {
  /** Seconds to wait before retrying (from the Retry-After header), or null. */
  retryAfter: number | null;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      responseBody?: string;
      errors?: ApiErrorEntry[];
      retryAfter?: string | null;
    },
  ) {
    super(message, options);
    const raw = options?.retryAfter;
    this.retryAfter = raw != null && raw !== '' ? Number(raw) : null;
    if (Number.isNaN(this.retryAfter)) this.retryAfter = null;
  }
}

/** 5xx — server-side error, safe to retry. */
export class InternalServerError extends APIError {}

/** Network failure or timeout. The outcome is unknown: a timed-out write may still have been applied, so read back before repeating it. */
export class APIConnectionError extends ListingsAPIError {}

const CODE_PREFIX_RE = /^\s*(SY\d+)\s*:\s*([\s\S]*)$/;

/**
 * Split a leading `SYxxxxx:` error code out of a message.
 *
 * The platform embeds error codes as a message prefix ("SY90005: Invalid
 * Token") rather than as a separate field. Returns the code plus the message
 * with the prefix stripped, or `[null, message]` when there is no prefix.
 */
function splitCodePrefix(message: string): [string | null, string] {
  const match = message.match(CODE_PREFIX_RE);
  if (match) return [match[1], match[2].trim()];
  return [null, message];
}

export function parseErrorEntries(raw: unknown): ApiErrorEntry[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((item) => {
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      let code = typeof o.code === 'string' && o.code ? o.code : null;
      let message =
        typeof o.message === 'string' ? o.message : JSON.stringify(item);
      if (!code) [code, message] = splitCodePrefix(message);
      return {
        code,
        message,
        context: (o.context as Record<string, unknown>) ?? {},
      };
    }
    const [code, message] = splitCodePrefix(String(item));
    return { code, message, context: {} };
  });
}
