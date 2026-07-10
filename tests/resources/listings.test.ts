import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListingsAPI } from '../../src/client.js';

function mockFetch(body: any, ok = true, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response);
}

describe('Listings', () => {
  let client: ListingsAPI;

  beforeEach(() => {
    client = new ListingsAPI({ apiKey: 'test-key' });
    vi.restoreAllMocks();
  });

  describe('fetchPremiumListings', () => {
    it('returns premium listings for a location', async () => {
      const mockListings = [
        { id: 'l1', site: 'google', syncStatus: 'synced' },
        { id: 'l2', site: 'yelp', syncStatus: 'pending' },
      ];
      const mockResponse = {
        data: { listingsForLocation: mockListings },
      };

      mockFetch(mockResponse);

      const result = await client.fetchPremiumListings(16808);
      expect(result).toHaveLength(2);
      expect(result[0].site).toBe('google');
      expect(result[1].syncStatus).toBe('pending');

      const callUrl = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(callUrl).toContain('/api/v4/locations/');
      expect(callUrl).toContain('/listings/premium');
    });

    it('returns empty array when no listings', async () => {
      mockFetch({ data: { listingsForLocation: null } });

      const result = await client.fetchPremiumListings(16808);
      expect(result).toEqual([]);
    });
  });

  describe('fetchVoiceListings', () => {
    it('returns voice assistant listings', async () => {
      const mockListings = [
        { name: 'Google Assistant', voiceIdentifier: 'ga-123', syncStatus: 'synced' },
      ];
      const mockResponse = {
        data: { voiceAssistantsForLocation: mockListings },
      };

      mockFetch(mockResponse);

      const result = await client.fetchVoiceListings(16808);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Google Assistant');

      const callUrl = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(callUrl).toContain('/voice-assistants');
    });

    it('returns empty array when no voice listings', async () => {
      mockFetch({ data: {} });

      const result = await client.fetchVoiceListings(16808);
      expect(result).toEqual([]);
    });
  });

  describe('fetchDuplicateListings', () => {
    it('returns duplicate listings for a location', async () => {
      const mockListings = [
        { id: 'd1', site: 'google', listingUrl: 'https://google.com/...' },
      ];
      const mockResponse = {
        data: { duplicateListingsForLocation: mockListings },
      };

      mockFetch(mockResponse);

      const result = await client.fetchDuplicateListings(16808);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('d1');

      const callUrl = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(callUrl).toContain('/listings/duplicates');
    });

    it('returns empty array when no duplicates', async () => {
      mockFetch({ data: { duplicateListingsForLocation: null } });

      const result = await client.fetchDuplicateListings(16808);
      expect(result).toEqual([]);
    });
  });

  describe('fetchAllDuplicateListings', () => {
    it('returns duplicate listings rollup', async () => {
      const mockRollup = {
        totalDuplicates: 15,
        locations: [{ id: 'loc1', duplicateCount: 3 }],
      };
      const mockResponse = {
        data: { duplicateListingsRollup: mockRollup },
      };

      mockFetch(mockResponse);

      const result = await client.fetchAllDuplicateListings();
      expect(result.totalDuplicates).toBe(15);

      const callUrl = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(callUrl).toContain('/api/v4/locations/listings/duplicates');
    });

    it('passes tag and page params', async () => {
      mockFetch({ data: { duplicateListingsRollup: {} } });

      await client.fetchAllDuplicateListings({ tag: 'recent', page: 2 });

      const callUrl = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(callUrl).toContain('tag=recent');
      expect(callUrl).toContain('page=2');
    });

    it('returns empty object when no data', async () => {
      mockFetch({ data: {} });

      const result = await client.fetchAllDuplicateListings();
      expect(result).toEqual({});
    });
  });

  describe('markListingsAsDuplicate', () => {
    it('posts mark-as-duplicate with encoded location ID', async () => {
      const mockResponse = {
        data: {
          markAsDuplicate: { success: true },
        },
      };

      mockFetch(mockResponse);

      const result = await client.markListingsAsDuplicate(16808, [
        'TGlzdGluZ0l0ZW06MzMzMjkzOA==',
      ]);
      expect(result.success).toBe(true);

      const [url, options] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toContain('/api/v4/locations/listings/mark-as-duplicate');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.input.locationId).toBe(btoa('Location:16808'));
      expect(body.input.listingItemIds).toEqual([
        'TGlzdGluZ0l0ZW06MzMzMjkzOA==',
      ]);
    });
  });

  describe('markListingsAsNotDuplicate', () => {
    it('posts mark-as-not-duplicate with encoded location ID', async () => {
      const mockResponse = {
        data: {
          markAsNotDuplicate: { success: true },
        },
      };

      mockFetch(mockResponse);

      const result = await client.markListingsAsNotDuplicate(16808, [
        'TGlzdGluZ0l0ZW06MzMzMjkzOA==',
      ]);
      expect(result.success).toBe(true);

      const [url, options] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toContain(
        '/api/v4/locations/listings/mark-as-not-duplicate',
      );
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.input.locationId).toBe(btoa('Location:16808'));
      expect(body.input.listingItemIds).toEqual([
        'TGlzdGluZ0l0ZW06MzMzMjkzOA==',
      ]);
    });

    it('returns empty object on null response data', async () => {
      mockFetch({ data: { markAsNotDuplicate: null } });

      const result = await client.markListingsAsNotDuplicate(16808, ['id1']);
      expect(result).toEqual({});
    });
  });

  describe('error handling', () => {
    it('throws APIError on non-2xx for listings endpoint', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
        text: async () => '{"error":"Not found"}',
      } as Response);

      await expect(client.fetchPremiumListings(99999)).rejects.toThrow(
        'API request failed: 404',
      );
    });

    it('throws APIError on non-2xx for POST endpoints', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ error: 'Validation failed' }),
        text: async () => '{"error":"Validation failed"}',
      } as Response);

      await expect(
        client.markListingsAsDuplicate(16808, ['id1']),
      ).rejects.toThrow('API request failed: 422');
    });
  });
});
