import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ListingsAPI } from '../../src/client.js';

function mockFetch(responseBody: any) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => responseBody,
    text: async () => JSON.stringify(responseBody),
  } as Response);
}

describe('Analytics', () => {
  let client: ListingsAPI;

  beforeEach(() => {
    client = new ListingsAPI({ apiKey: 'test-key' });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchGoogleAnalytics', () => {
    it('should fetch Google analytics for a location', async () => {
      const mockInsights = { views: 100, searches: 50 };
      const spy = mockFetch({ data: { googleInsights: mockInsights } });

      const result = await client.fetchGoogleAnalytics(16808);

      expect(result).toEqual(mockInsights);
      expect(spy).toHaveBeenCalledOnce();
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/google-analytics');
    });

    it('should pass date range params', async () => {
      const spy = mockFetch({ data: { googleInsights: {} } });

      await client.fetchGoogleAnalytics(16808, {
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      });

      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('fromDate=2024-01-01');
      expect(url).toContain('toDate=2024-01-31');
    });

    it('should return empty object when no data', async () => {
      mockFetch({ data: {} });

      const result = await client.fetchGoogleAnalytics(16808);
      expect(result).toEqual({});
    });
  });

  describe('fetchBingAnalytics', () => {
    it('should fetch Bing analytics for a location', async () => {
      const mockInsights = { impressions: 200 };
      const spy = mockFetch({ data: { bingInsights: mockInsights } });

      const result = await client.fetchBingAnalytics(16808);

      expect(result).toEqual(mockInsights);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/bing-analytics');
    });

    it('should pass date range params', async () => {
      const spy = mockFetch({ data: { bingInsights: {} } });

      await client.fetchBingAnalytics(16808, {
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      });

      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('fromDate=2024-01-01');
      expect(url).toContain('toDate=2024-01-31');
    });

    it('should return empty object when no data', async () => {
      mockFetch({ data: {} });

      const result = await client.fetchBingAnalytics(16808);
      expect(result).toEqual({});
    });
  });

  describe('fetchFacebookAnalytics', () => {
    it('should fetch Facebook analytics for a location', async () => {
      const mockInsights = { likes: 300, reach: 1000 };
      const spy = mockFetch({ data: { facebookInsights: mockInsights } });

      const result = await client.fetchFacebookAnalytics(16808);

      expect(result).toEqual(mockInsights);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/facebook-analytics');
    });

    it('should pass date range params', async () => {
      const spy = mockFetch({ data: { facebookInsights: {} } });

      await client.fetchFacebookAnalytics(16808, {
        fromDate: '2024-06-01',
        toDate: '2024-06-30',
      });

      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('fromDate=2024-06-01');
      expect(url).toContain('toDate=2024-06-30');
    });

    it('should return empty object when no data', async () => {
      mockFetch({ data: {} });

      const result = await client.fetchFacebookAnalytics(16808);
      expect(result).toEqual({});
    });
  });
});
