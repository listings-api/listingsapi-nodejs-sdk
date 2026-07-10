import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ListingsAPI } from '../../src/client.js';

function mockFetch(responseBody: any) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => responseBody,
    text: async () => JSON.stringify(responseBody),
  } as Response);
}

describe('Account', () => {
  let client: ListingsAPI;

  beforeEach(() => {
    client = new ListingsAPI({ apiKey: 'test-key' });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchPlanSites', () => {
    it('should fetch plan sites', async () => {
      const mockSites = [{ id: 's1', name: 'Google' }];
      const spy = mockFetch({ data: { planSites: mockSites } });

      const result = await client.fetchPlanSites();

      expect(result).toEqual(mockSites);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/plan-sites');
    });

    it('should return empty array when no plan sites', async () => {
      mockFetch({ data: {} });
      const result = await client.fetchPlanSites();
      expect(result).toEqual([]);
    });
  });

  describe('fetchCountries', () => {
    it('should fetch supported countries', async () => {
      const mockCountries = [{ code: 'US', name: 'United States' }];
      const spy = mockFetch({ data: { supportedCountries: mockCountries } });

      const result = await client.fetchCountries();

      expect(result).toEqual(mockCountries);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/countries');
    });

    it('should return empty array when no countries', async () => {
      mockFetch({ data: {} });
      const result = await client.fetchCountries();
      expect(result).toEqual([]);
    });
  });

  describe('fetchSubscriptions', () => {
    it('should fetch active subscriptions', async () => {
      const mockSubs = [{ id: 'sub1', plan: 'Pro' }];
      const spy = mockFetch({ data: { activeSubscriptions: mockSubs } });

      const result = await client.fetchSubscriptions();

      expect(result).toEqual(mockSubs);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/subscriptions');
    });

    it('should return empty array when no subscriptions', async () => {
      mockFetch({ data: {} });
      const result = await client.fetchSubscriptions();
      expect(result).toEqual([]);
    });
  });

});
