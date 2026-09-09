import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListingsAPI, encodeLocationId } from '../src/client.js';
import { APIError, AuthenticationError, RateLimitError, ValidationError } from '../src/errors.js';

describe('encodeLocationId', () => {
  it('encodes numeric ID to base64', () => {
    const encoded = encodeLocationId(16808);
    expect(encoded).toBe(btoa('Location:16808'));
  });

  it('encodes string digit ID to base64', () => {
    const encoded = encodeLocationId('16808');
    expect(encoded).toBe(btoa('Location:16808'));
  });

  it('returns already-encoded string as-is', () => {
    const alreadyEncoded = btoa('Location:16808');
    expect(encodeLocationId(alreadyEncoded)).toBe(alreadyEncoded);
  });

  it('returns non-digit string as-is', () => {
    expect(encodeLocationId('abc123')).toBe('abc123');
  });

  it('trims whitespace from string IDs', () => {
    const encoded = encodeLocationId(' 16808 ');
    expect(encoded).toBe(btoa('Location:16808'));
  });
});

describe('ListingsAPI', () => {
  let client: ListingsAPI;

  beforeEach(() => {
    client = new ListingsAPI({ apiKey: 'test-api-key' });
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('uses default base URL', () => {
      const c = new ListingsAPI({ apiKey: 'key' });
      // Verify by making a request and checking the URL
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
        status: 200,
      } as Response);

      c.apiGet('test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://listingsapi.com/api/v4/test',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('uses custom base URL and strips trailing slash', () => {
      const c = new ListingsAPI({
        apiKey: 'key',
        baseUrl: 'https://custom.api.com/',
      });

      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
        status: 200,
      } as Response);

      c.apiGet('test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.api.com/api/v4/test',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('sets correct authorization header', () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        status: 200,
      } as Response);

      client.apiGet('test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'API test-api-key',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });
  });

  describe('apiGet', () => {
    it('makes GET request to correct URL', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'ok' }),
        status: 200,
      } as Response);

      const result = await client.apiGet('locations');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://listingsapi.com/api/v4/locations',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual({ result: 'ok' });
    });

    it('appends query params', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        status: 200,
      } as Response);

      await client.apiGet('locations', { first: 10, after: 'cursor1' });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('first=10');
      expect(url).toContain('after=cursor1');
    });

    it('skips undefined/null params', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        status: 200,
      } as Response);

      await client.apiGet('locations', {
        first: 10,
        after: undefined,
        before: null,
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('first=10');
      expect(url).not.toContain('after');
      expect(url).not.toContain('before');
    });

    it('throws APIError on non-2xx response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => '{"error": "Unauthorized"}',
      } as Response);

      await expect(client.apiGet('locations')).rejects.toThrow(APIError);

      try {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => '{"error": "Unauthorized"}',
        } as Response);
        await client.apiGet('locations');
      } catch (e) {
        const err = e as APIError;
        expect(err.statusCode).toBe(401);
        expect(err.responseBody).toBe('{"error": "Unauthorized"}');
      }
    });

    it('throws APIError on 404', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      } as Response);

      await expect(client.apiGet('nonexistent')).rejects.toThrow(APIError);
    });

    it('throws APIError on 500', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      await expect(new ListingsAPI({ apiKey: 'test-key', maxRetries: 0 }).apiGet('locations')).rejects.toThrow(APIError);
    });
  });

  describe('apiPost', () => {
    it('makes POST request with JSON body', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { createLocation: { success: true } } }),
        status: 200,
      } as Response);

      const body = { input: { name: 'Test Store' } };
      const result = await client.apiPost('locations', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://listingsapi.com/api/v4/locations',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        }),
      );
      expect(result.data.createLocation.success).toBe(true);
    });

    it('throws APIError on non-2xx POST response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => '{"errors": ["Validation failed"]}',
      } as Response);

      await expect(
        client.apiPost('locations', { input: {} }),
      ).rejects.toThrow(APIError);
    });
  });

  describe('listingsGet', () => {
    it('makes GET request to location-scoped URL', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { listingsForLocation: [] } }),
        status: 200,
      } as Response);

      await client.listingsGet(16808, 'listings/premium');

      const url = mockFetch.mock.calls[0][0] as string;
      const encodedId = btoa('Location:16808');
      expect(url).toBe(
        `https://listingsapi.com/api/v4/locations/${encodedId}/listings/premium`,
      );
    });

    it('passes query params for location-scoped GET', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        status: 200,
      } as Response);

      await client.listingsGet('abc123', 'reviews', {
        startDate: '2024-01-01',
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('startDate=2024-01-01');
    });

    it('throws APIError on non-2xx response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Location not found',
      } as Response);

      await expect(
        client.listingsGet(99999, 'listings/premium'),
      ).rejects.toThrow(APIError);
    });
  });

  describe('mixed-in methods exist', () => {
    it('has location methods', () => {
      expect(typeof client.fetchAllLocations).toBe('function');
      expect(typeof client.createLocation).toBe('function');
    });

    it('has listing methods', () => {
      expect(typeof client.fetchPremiumListings).toBe('function');
    });

    it('has review methods', () => {
      expect(typeof client.fetchInteractions).toBe('function');
      expect(typeof client.respondToReview).toBe('function');
    });

    it('has post methods', () => {
      expect(typeof client.bulkPublish).toBe('function');
      expect(typeof client.createAnnouncement).toBe('function');
      expect(typeof client.fetchPost).toBe('function');
    });

    it('does not expose off-product resources', () => {
      for (const removed of [
        'fetchKeywords',
        'fetchFoldersFlat',
        'fetchUsers',
        'createGridReport',
        'fetchCampaigns',
        'fetchTags',
        'activateLocations',
        'fetchAdditionalListings',
        'fetchAiListings',
      ]) {
        expect((client as any)[removed]).toBeUndefined();
      }
    });

    it('has connection methods', () => {
      expect(typeof client.fetchConnectedAccounts).toBe('function');
    });

    it('has account methods', () => {
      expect(typeof client.fetchPlanSites).toBe('function');
    });
  });
});

describe('APIError', () => {
  it('includes status code and response body', () => {
    const err = new APIError('Request failed', {
      statusCode: 401,
      responseBody: '{"error": "bad key"}',
    });
    expect(err.statusCode).toBe(401);
    expect(err.responseBody).toBe('{"error": "bad key"}');
    expect(err.message).toContain('Request failed');
    expect(err.message).toContain('{"error": "bad key"}');
    expect(err.name).toBe('APIError');
  });

  it('works without response body', () => {
    const err = new APIError('Network error');
    expect(err.statusCode).toBeNull();
    expect(err.responseBody).toBeNull();
    expect(err.message).toBe('Network error');
  });
});


describe('payload-level error handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockJson(body: any, status = 200) {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: status < 400,
      status,
      headers: { get: () => null },
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as unknown as Response);
  }

  it('maps top-level SY90005 errors on HTTP 200 to AuthenticationError', async () => {
    mockJson({ errors: [{ message: 'Invalid Token', context: {}, code: 'SY90005' }] });
    const client = new ListingsAPI({ apiKey: 'bad-key' });
    let caught: any;
    try {
      await client.fetchPlanSites();
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AuthenticationError);
    expect(caught.code).toBe('SY90005');
    expect(caught.statusCode).toBe(200);
  });

  it('raises ValidationError when a mutation reports success=false', async () => {
    mockJson({ data: { createLocation: { success: false, errors: null } } });
    const client = new ListingsAPI({ apiKey: 'test-key' });
    await expect(client.createLocation({ name: 'Acme' })).rejects.toThrow(ValidationError);
  });

  it('reads LISTINGSAPI_KEY from the environment', () => {
    process.env.LISTINGSAPI_KEY = 'env-key';
    try {
      expect(() => new ListingsAPI()).not.toThrow();
    } finally {
      delete process.env.LISTINGSAPI_KEY;
    }
  });

  it('throws AuthenticationError without a key', () => {
    delete process.env.LISTINGSAPI_KEY;
    expect(() => new ListingsAPI()).toThrow(AuthenticationError);
  });

  it('retries 429 responses and succeeds', async () => {
    const rateLimited = {
      ok: false,
      status: 429,
      headers: { get: (h: string) => (h === 'Retry-After' ? '0.001' : null) },
      json: async () => ({}),
      text: async () => 'rate limited',
    } as unknown as Response;
    const success = {
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ data: { planSites: [] } }),
      text: async () => '{}',
    } as unknown as Response;
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(rateLimited)
      .mockResolvedValueOnce(rateLimited)
      .mockResolvedValueOnce(success);
    const client = new ListingsAPI({ apiKey: 'test-key' });
    await client.fetchPlanSites();
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('surfaces RateLimitError with retryAfter when retries are exhausted', async () => {
    const rateLimited = {
      ok: false,
      status: 429,
      headers: { get: (h: string) => (h === 'Retry-After' ? '7' : null) },
      json: async () => ({}),
      text: async () => 'rate limited',
    } as unknown as Response;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(rateLimited);
    const client = new ListingsAPI({ apiKey: 'test-key', maxRetries: 0 });
    let caught: any;
    try {
      await client.fetchPlanSites();
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RateLimitError);
    expect(caught.retryAfter).toBe(7);
  });
});


describe('error body parsing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockError(status: number, bodyText: string, retryAfter: string | null = null) {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status,
      headers: { get: (h: string) => (h === 'Retry-After' ? retryAfter : null) },
      text: async () => bodyText,
    } as unknown as Response);
  }

  it('parses the top-level errors[] shape on a 4xx', async () => {
    const body = JSON.stringify({
      errors: [
        { code: 'SY10005', message: 'name is required', context: { field: 'name' } },
        { code: 'SY10006', message: 'city is required' },
      ],
    });
    mockError(400, body);
    const client = new ListingsAPI({ apiKey: 'test-key' });
    let caught: any;
    try {
      await client.apiPost('locations', { input: {} });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ValidationError);
    expect(caught.code).toBe('SY10005');
    expect(caught.errors).toHaveLength(2);
    expect(caught.errors[0].context).toEqual({ field: 'name' });
    expect(caught.errors[1].message).toBe('city is required');
    expect(caught.responseBody).toBe(body);
    expect(caught.message).toContain('SY10005: name is required');
  });

  it('parses the singular error{} shape the gateway uses for 429', async () => {
    const body = JSON.stringify({
      error: {
        code: 'RATE_LIMITED',
        message: 'Request exceeded the minute limit. Retry after 3s.',
        retry_after_seconds: 3,
        limiting_window: 'minute',
      },
    });
    mockError(429, body, '3');
    const client = new ListingsAPI({ apiKey: 'test-key', maxRetries: 0 });
    let caught: any;
    try {
      await client.apiGet('plan-sites');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RateLimitError);
    expect(caught.code).toBe('RATE_LIMITED');
    expect(caught.retryAfter).toBe(3);
    expect(caught.responseBody).toBe(body);
  });

  it('parses the singular error{} shape on a 4xx', async () => {
    const body = JSON.stringify({
      error: { code: 'unknown_sub_category', message: 'No matching subcategory' },
    });
    mockError(422, body);
    const client = new ListingsAPI({ apiKey: 'test-key' });
    let caught: any;
    try {
      await client.apiPost('locations', { input: {} });
    } catch (err) {
      caught = err;
    }
    expect(caught.code).toBe('unknown_sub_category');
    expect(caught.errors[0].message).toBe('No matching subcategory');
    expect(caught.responseBody).toBe(body);
  });

  it('parses a bare {message, code} body on a 401', async () => {
    const body = JSON.stringify({ message: 'SY90005: Invalid Token' });
    mockError(401, body);
    const client = new ListingsAPI({ apiKey: 'bad-key' });
    let caught: any;
    try {
      await client.apiGet('plan-sites');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AuthenticationError);
    expect(caught.code).toBe('SY90005');
    expect(caught.errors[0].message).toBe('Invalid Token');
    expect(caught.responseBody).toBe(body);
  });

  it('yields no entries but keeps the raw body for a non-JSON error', async () => {
    mockError(404, '404 Not Found');
    const client = new ListingsAPI({ apiKey: 'test-key' });
    let caught: any;
    try {
      await client.apiGet('nope');
    } catch (err) {
      caught = err;
    }
    expect(caught.errors).toEqual([]);
    expect(caught.code).toBeNull();
    expect(caught.responseBody).toBe('404 Not Found');
  });

  it('attaches the raw body when a top-level errors[] arrives on HTTP 200', async () => {
    const body = JSON.stringify({
      data: null,
      errors: [{ message: 'SY90005: Invalid Token' }],
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => body,
    } as unknown as Response);
    const client = new ListingsAPI({ apiKey: 'bad-key' });
    let caught: any;
    try {
      await client.apiGet('plan-sites');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AuthenticationError);
    expect(caught.code).toBe('SY90005');
    // the raw body, not a re-serialized {errors: [...]}
    expect(caught.responseBody).toBe(body);
  });

  it('attaches the raw body when a mutation reports success=false', async () => {
    const body = JSON.stringify({
      data: {
        createSocialPost: {
          success: false,
          errors: [{ code: 'SY20001', message: 'Image URL unreachable' }],
        },
      },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => body,
    } as unknown as Response);
    const client = new ListingsAPI({ apiKey: 'test-key' });
    let caught: any;
    try {
      await client.bulkPublish({ name: 'x', locationIds: [1], message: 'hi' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ValidationError);
    expect(caught.code).toBe('SY20001');
    expect(caught.responseBody).toBe(body);
    expect(caught.statusCode).toBe(200);
  });
});

describe('retry policy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Retry-After keeps the backoff sub-millisecond so the suite stays fast.
  const serverError = {
    ok: false,
    status: 500,
    headers: { get: (h: string) => (h === 'Retry-After' ? '0.001' : null) },
    text: async () => 'boom',
  } as unknown as Response;

  it('does not retry a POST on a 5xx', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(serverError);
    const client = new ListingsAPI({ apiKey: 'test-key', maxRetries: 3 });
    await expect(client.apiPost('locations', { input: {} })).rejects.toThrow(APIError);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not retry a DELETE on a 5xx', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(serverError);
    const client = new ListingsAPI({ apiKey: 'test-key', maxRetries: 3 });
    await expect(client.apiDelete('posts/abc')).rejects.toThrow(APIError);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not retry a POST on a network error', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('socket hang up'));
    const client = new ListingsAPI({ apiKey: 'test-key', maxRetries: 3 });
    await expect(client.apiPost('locations', { input: {} })).rejects.toThrow(
      /Could not reach the API/,
    );
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('retries a GET on a 5xx up to maxRetries', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(serverError);
    const client = new ListingsAPI({ apiKey: 'test-key', maxRetries: 2 });
    await expect(client.apiGet('plan-sites')).rejects.toThrow(APIError);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('retries a GET on a network error', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('socket hang up'));
    const client = new ListingsAPI({ apiKey: 'test-key', maxRetries: 2 });
    await expect(client.apiGet('plan-sites')).rejects.toThrow(
      /Could not reach the API/,
    );
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('maxRetries stays honoured for reads', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(serverError);
    const client = new ListingsAPI({ apiKey: 'test-key', maxRetries: 0 });
    await expect(client.apiGet('plan-sites')).rejects.toThrow(APIError);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
