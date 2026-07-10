import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListingsAPI } from '../../src/client.js';

describe('Reviews', () => {
  let client: ListingsAPI;

  beforeEach(() => {
    client = new ListingsAPI({ apiKey: 'test-key' });
    vi.restoreAllMocks();
  });

  it('fetchInteractions returns paginated response', async () => {
    const mockResponse = {
      data: {
        interactions: {
          edges: [
            { node: { id: 'r1', content: 'Great!', rating: 5 }, cursor: 'c1' },
            { node: { id: 'r2', content: 'Good', rating: 4 }, cursor: 'c2' },
          ],
          pageInfo: { hasNextPage: false, hasPreviousPage: false },
          totalCount: 2,
        },
      },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
    } as Response);

    const result = await client.fetchInteractions('loc1', { first: 10 });
    expect(result).toHaveProperty('success', true);
    const paginated = result as any;
    expect(paginated.interactions).toHaveLength(2);
    expect(paginated.interactions[0].id).toBe('r1');
    expect(paginated.pageInfo.hasNextPage).toBe(false);
    expect(paginated.pageInfo.startCursor).toBe('c1');
    expect(paginated.pageInfo.endCursor).toBe('c2');
    expect(paginated.totalCount).toBe(2);
  });

  it('fetchInteractions with filters passes correct query params', async () => {
    const mockResponse = {
      data: {
        interactions: {
          edges: [],
          pageInfo: { hasNextPage: false, hasPreviousPage: false },
        },
      },
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
    } as Response);

    await client.fetchInteractions('loc1', {
      first: 5,
      siteUrls: ['maps.google.com'],
      ratingFilters: [4, 5],
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      category: 'Review',
    });

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('siteUrls=%5B%22maps.google.com%22%5D');
    expect(calledUrl).toContain('ratingFilters=%5B4%2C5%5D');
    expect(calledUrl).toContain('startDate=2024-01-01');
    expect(calledUrl).toContain('endDate=2024-06-30');
    expect(calledUrl).toContain('category=Review');
  });

  it('fetchInteractions with fetchAll auto-paginates', async () => {
    const page1 = {
      data: {
        interactions: {
          edges: [
            { node: { id: 'r1' }, cursor: 'c1' },
          ],
          pageInfo: { hasNextPage: true, hasPreviousPage: false },
        },
      },
    };
    const page2 = {
      data: {
        interactions: {
          edges: [
            { node: { id: 'r2' }, cursor: 'c2' },
          ],
          pageInfo: { hasNextPage: false, hasPreviousPage: true },
        },
      },
    };
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => page1,
        status: 200,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => page2,
        status: 200,
      } as Response);

    const result = await client.fetchInteractions('loc1', { fetchAll: true, pageSize: 1 });
    expect(Array.isArray(result)).toBe(true);
    const items = result as any[];
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe('r1');
    expect(items[1].id).toBe('r2');
  });

  it('fetchReviewSettings returns settings object', async () => {
    const mockResponse = {
      data: {
        interactionsSetting: { sites: ['google', 'yelp'] },
      },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
    } as Response);

    const result = await client.fetchReviewSettings('loc1');
    expect(result).toEqual({ sites: ['google', 'yelp'] });
  });

  it('fetchReviewAnalyticsOverview returns analytics', async () => {
    const mockResponse = {
      data: {
        interactionsAnalyticsStats: { totalReviews: 50, avgRating: 4.2 },
      },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
    } as Response);

    const result = await client.fetchReviewAnalyticsOverview('loc1', {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });
    expect(result).toEqual({ totalReviews: 50, avgRating: 4.2 });
  });

  it('fetchReviewAnalyticsTimeline returns chart data', async () => {
    const mockResponse = {
      data: {
        interactionsChartData: { timeline: [{ date: '2024-01', count: 10 }] },
      },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
    } as Response);

    const result = await client.fetchReviewAnalyticsTimeline('loc1');
    expect(result).toHaveProperty('timeline');
  });

  it('fetchReviewAnalyticsSitesStats returns site stats', async () => {
    const mockResponse = {
      data: {
        interactionsSitesStats: { google: { count: 30 }, yelp: { count: 20 } },
      },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
    } as Response);

    const result = await client.fetchReviewAnalyticsSitesStats('loc1');
    expect(result).toHaveProperty('google');
    expect(result).toHaveProperty('yelp');
  });

  it('fetchReviewSiteConfig returns config array', async () => {
    const mockResponse = {
      data: {
        interactionSiteConfig: [{ name: 'google', url: 'maps.google.com' }],
      },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
    } as Response);

    const result = await client.fetchReviewSiteConfig();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('google');
  });

  it('fetchReviewDetails returns details by IDs', async () => {
    const mockResponse = {
      data: {
        interactionDetails: { id1: { content: 'Great!' }, id2: { content: 'Good' } },
      },
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
    } as Response);

    const result = await client.fetchReviewDetails(['id1', 'id2']);
    expect(result).toHaveProperty('id1');
    expect(result).toHaveProperty('id2');

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('interactionIds=');
  });

  it('fetchReviewDetails returns empty for empty input', async () => {
    const result = await client.fetchReviewDetails([]);
    expect(result).toEqual({});
  });

  it('fetchReviewPhrases returns phrase list', async () => {
    const mockResponse = {
      data: {
        newReviewPhrases: [
          { phrase: 'great food', count: 15, sentiment: 'positive' },
        ],
      },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
    } as Response);

    const result = await client.fetchReviewPhrases({
      locationIds: ['loc1'],
      startDate: '2024-01-01',
      endDate: '2024-06-30',
    });
    expect(result).toHaveLength(1);
    expect(result[0].phrase).toBe('great food');
  });

  it('fetchReviewPhrases returns empty for empty locationIds', async () => {
    const result = await client.fetchReviewPhrases({ locationIds: [] });
    expect(result).toEqual([]);
  });

  it('respondToReview posts reply', async () => {
    const mockResponse = {
      data: {
        respondToInteraction: { success: true },
      },
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
    } as Response);

    const result = await client.respondToReview('interaction-123', 'Thank you!');
    expect(result).toEqual({ success: true });

    const calledOptions = fetchSpy.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(calledOptions.body as string);
    expect(body.interactionId).toBe('interaction-123');
    expect(body.responseContent).toBe('Thank you!');
  });

  it('editReviewResponse edits existing reply', async () => {
    const mockResponse = {
      data: {
        editResponse: { success: true },
      },
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
    } as Response);

    const result = await client.editReviewResponse('rev-1', 'resp-1', 'Updated reply');
    expect(result).toEqual({ success: true });

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.reviewId).toBe('rev-1');
    expect(body.responseId).toBe('resp-1');
    expect(body.responseContent).toBe('Updated reply');
  });

  it('archiveReviewResponse archives a reply', async () => {
    const mockResponse = {
      data: {
        archiveResponse: { success: true },
      },
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
    } as Response);

    const result = await client.archiveReviewResponse('resp-1');
    expect(result).toEqual({ success: true });

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.responseId).toBe('resp-1');
  });

  it('editReviewSettings updates site URLs', async () => {
    const mockResponse = {
      data: {
        editInteractionsSetting: { success: true },
      },
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
    } as Response);

    const result = await client.editReviewSettings(16808, [
      { name: 'trulia.com', url: 'https://trulia.com/biz/...' },
    ]);
    expect(result).toEqual({ success: true });

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.siteUrls).toHaveLength(1);
    expect(body.siteUrls[0].name).toBe('trulia.com');
    expect(body.locationId).toBeTruthy();
  });
});
