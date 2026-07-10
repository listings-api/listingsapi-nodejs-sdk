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

describe('Locations', () => {
  let client: ListingsAPI;

  beforeEach(() => {
    client = new ListingsAPI({ apiKey: 'test-key' });
    vi.restoreAllMocks();
  });

  describe('fetchAllLocations', () => {
    it('returns paginated response for a single page', async () => {
      const mockResponse = {
        data: {
          allLocations: {
            edges: [
              { node: { id: 'loc1', name: 'Store 1' }, cursor: 'cursor1' },
              { node: { id: 'loc2', name: 'Store 2' }, cursor: 'cursor2' },
            ],
            pageInfo: { hasNextPage: false, hasPreviousPage: false },
          },
        },
      };

      mockFetch(mockResponse);

      const result = await client.fetchAllLocations({ first: 10 });

      // Should be a paginated response, not an array
      expect(Array.isArray(result)).toBe(false);
      const paginated = result as any;
      expect(paginated.success).toBe(true);
      expect(paginated.locations).toHaveLength(2);
      expect(paginated.locations[0].id).toBe('loc1');
      expect(paginated.locations[1].name).toBe('Store 2');
      expect(paginated.pageInfo.hasNextPage).toBe(false);
      expect(paginated.pageInfo.hasPreviousPage).toBe(false);
      expect(paginated.pageInfo.startCursor).toBe('cursor1');
      expect(paginated.pageInfo.endCursor).toBe('cursor2');
      expect(paginated.raw).toEqual(mockResponse);

      // Verify fetch was called with correct URL and params
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const callUrl = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(callUrl).toContain('/api/v4/locations');
      expect(callUrl).toContain('first=10');
    });

    it('returns empty locations when no edges', async () => {
      const mockResponse = {
        data: {
          allLocations: {
            edges: [],
            pageInfo: { hasNextPage: false, hasPreviousPage: false },
          },
        },
      };

      mockFetch(mockResponse);

      const result = (await client.fetchAllLocations()) as any;
      expect(result.success).toBe(true);
      expect(result.locations).toHaveLength(0);
      expect(result.pageInfo.startCursor).toBeNull();
      expect(result.pageInfo.endCursor).toBeNull();
    });

    it('auto-paginates when fetchAll is true', async () => {
      const page1 = {
        data: {
          allLocations: {
            edges: [
              { node: { id: 'loc1', name: 'Store 1' }, cursor: 'c1' },
              { node: { id: 'loc2', name: 'Store 2' }, cursor: 'c2' },
            ],
            pageInfo: { hasNextPage: true, hasPreviousPage: false },
          },
        },
      };
      const page2 = {
        data: {
          allLocations: {
            edges: [
              { node: { id: 'loc3', name: 'Store 3' }, cursor: 'c3' },
            ],
            pageInfo: { hasNextPage: false, hasPreviousPage: true },
          },
        },
      };

      const spy = vi.spyOn(globalThis, 'fetch');
      spy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => page1,
        text: async () => JSON.stringify(page1),
      } as Response);
      spy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => page2,
        text: async () => JSON.stringify(page2),
      } as Response);

      const result = await client.fetchAllLocations({
        fetchAll: true,
        pageSize: 2,
      });

      expect(Array.isArray(result)).toBe(true);
      const locations = result as any[];
      expect(locations).toHaveLength(3);
      expect(locations[0].id).toBe('loc1');
      expect(locations[2].id).toBe('loc3');

      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      // Second call should have after=c2
      const secondUrl = spy.mock.calls[1][0] as string;
      expect(secondUrl).toContain('after=c2');
    });

    it('passes pagination params correctly', async () => {
      const mockResponse = {
        data: {
          allLocations: {
            edges: [],
            pageInfo: { hasNextPage: false, hasPreviousPage: false },
          },
        },
      };

      mockFetch(mockResponse);

      await client.fetchAllLocations({
        first: 5,
        after: 'cursorABC',
      });

      const callUrl = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(callUrl).toContain('first=5');
      expect(callUrl).toContain('after=cursorABC');
    });
  });

  describe('fetchLocationsByIds', () => {
    it('returns locations for given IDs', async () => {
      const mockLocations = [
        { id: 'loc1', name: 'Store 1' },
        { id: 'loc2', name: 'Store 2' },
      ];
      const mockResponse = {
        data: { getLocationsByIds: mockLocations },
      };

      mockFetch(mockResponse);

      const result = await client.fetchLocationsByIds([16808, 16749]);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Store 1');

      const callUrl = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(callUrl).toContain('/api/v4/locations-by-ids');
      expect(callUrl).toContain('ids=');
    });

    it('returns empty array for empty input', async () => {
      const spy = vi.spyOn(globalThis, 'fetch');
      const result = await client.fetchLocationsByIds([]);
      expect(result).toEqual([]);
      expect(spy).not.toHaveBeenCalled();
    });

    it('encodes numeric IDs to base64', async () => {
      const mockResponse = {
        data: { getLocationsByIds: [] },
      };

      mockFetch(mockResponse);

      await client.fetchLocationsByIds([12345]);

      const callUrl = (globalThis.fetch as any).mock.calls[0][0] as string;
      // The encoded ID for Location:12345 should be in the URL
      const expectedEncoded = btoa('Location:12345');
      expect(decodeURIComponent(callUrl)).toContain(expectedEncoded);
    });
  });

  describe('fetchLocationsByStoreCodes', () => {
    it('returns locations for given store codes', async () => {
      const mockLocations = [{ id: 'loc1', storeId: 'STORE01' }];
      const mockResponse = {
        data: { getLocationsByStoreCodes: mockLocations },
      };

      mockFetch(mockResponse);

      const result = await client.fetchLocationsByStoreCodes([
        'STORE01',
        'STORE02',
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].storeId).toBe('STORE01');

      const callUrl = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(callUrl).toContain('/api/v4/locations-by-store-codes');
      expect(callUrl).toContain('storeCodes=');
    });

    it('returns empty array for empty input', async () => {
      const spy = vi.spyOn(globalThis, 'fetch');
      const result = await client.fetchLocationsByStoreCodes([]);
      expect(result).toEqual([]);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('searchLocations', () => {
    it('returns paginated search results', async () => {
      const mockResponse = {
        data: {
          searchLocations: {
            edges: [
              { node: { id: 'loc1', name: 'Cafe A' }, cursor: 'sc1' },
            ],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              total: 1,
            },
          },
        },
      };

      mockFetch(mockResponse);

      const result = (await client.searchLocations('cafe', {
        first: 20,
      })) as any;
      expect(result.success).toBe(true);
      expect(result.locations).toHaveLength(1);
      expect(result.locations[0].name).toBe('Cafe A');
      expect(result.pageInfo.total).toBe(1);

      const callUrl = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(callUrl).toContain('/api/v4/locations/search');
      expect(callUrl).toContain('query=cafe');
      expect(callUrl).toContain('first=20');
    });

    it('passes fields parameter as JSON', async () => {
      const mockResponse = {
        data: {
          searchLocations: {
            edges: [],
            pageInfo: { hasNextPage: false, hasPreviousPage: false },
          },
        },
      };

      mockFetch(mockResponse);

      await client.searchLocations('test', {
        fields: ['name', 'store_id'],
        first: 10,
      });

      const callUrl = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(callUrl).toContain('fields=');
    });

    it('auto-paginates with fetchAll', async () => {
      const page1 = {
        data: {
          searchLocations: {
            edges: [{ node: { id: 'loc1' }, cursor: 'c1' }],
            pageInfo: { hasNextPage: true, hasPreviousPage: false },
          },
        },
      };
      const page2 = {
        data: {
          searchLocations: {
            edges: [{ node: { id: 'loc2' }, cursor: 'c2' }],
            pageInfo: { hasNextPage: false, hasPreviousPage: true },
          },
        },
      };

      const spy = vi.spyOn(globalThis, 'fetch');
      spy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => page1,
        text: async () => JSON.stringify(page1),
      } as Response);
      spy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => page2,
        text: async () => JSON.stringify(page2),
      } as Response);

      const result = await client.searchLocations('test', {
        fetchAll: true,
        pageSize: 1,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });
  });

  describe('createLocation', () => {
    it('posts location data and returns created location', async () => {
      const mockResponse = {
        data: {
          createLocation: {
            location: { id: 'new-loc', name: 'Acme Inc' },
            success: true,
            errors: [],
          },
        },
      };

      mockFetch(mockResponse);

      const result = await client.createLocation({
        name: 'Acme Inc',
        storeId: 'ACME01',
        street: '123 Main St',
        city: 'NYC',
        stateIso: 'NY',
        postalCode: '10001',
        countryIso: 'US',
        phone: '5551234567',
      });

      expect(result.success).toBe(true);
      expect(result.location.name).toBe('Acme Inc');

      // Verify POST was made correctly
      const [url, options] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toContain('/api/v4/locations');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.input.name).toBe('Acme Inc');
      expect(body.input.storeId).toBe('ACME01');
    });
  });

  describe('updateLocation', () => {
    it('encodes location ID and posts update', async () => {
      const mockResponse = {
        data: {
          updateLocation: {
            location: { id: 'enc-id', phone: '5559876543' },
            success: true,
          },
        },
      };

      mockFetch(mockResponse);

      const result = await client.updateLocation({
        id: 16808,
        phone: '5559876543',
      });

      expect(result.success).toBe(true);

      const [url, options] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toContain('/api/v4/locations/update');
      const body = JSON.parse(options.body);
      // ID should be base64-encoded
      expect(body.input.id).toBe(btoa('Location:16808'));
    });
  });

  describe('archiveLocations', () => {
    it('encodes IDs and posts archive request', async () => {
      const mockResponse = {
        data: {
          archiveLocations: { success: true },
        },
      };

      mockFetch(mockResponse);

      const result = await client.archiveLocations([16808]);

      expect(result.success).toBe(true);

      const [, options] = (globalThis.fetch as any).mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.input.locationIds).toEqual([btoa('Location:16808')]);
    });
  });

  describe('cancelArchiveLocations', () => {
    it('posts cancel archive with selectionType and changedBy', async () => {
      const mockResponse = {
        data: {
          cancelLocationsArchive: { success: true },
        },
      };

      mockFetch(mockResponse);

      const result = await client.cancelArchiveLocations(
        ['TG9jYXRpb246ODQ3NzM='],
        'SELECTED_ITEMS',
        'admin@example.com',
      );

      expect(result.success).toBe(true);

      const [, options] = (globalThis.fetch as any).mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.input.selectionType).toBe('SELECTED_ITEMS');
      expect(body.input.changedBy).toBe('admin@example.com');
    });
  });

  describe('error handling', () => {
    it('throws APIError on non-2xx response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
        text: async () => '{"error":"Unauthorized"}',
      } as Response);

      await expect(client.fetchAllLocations({ first: 10 })).rejects.toThrow(
        'API request failed: 401',
      );
    });

    it('throws APIError on server error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
        text: async () => '{"error":"Internal server error"}',
      } as Response);

      await expect(
        new ListingsAPI({ apiKey: 'test-key', maxRetries: 0 }).fetchLocationsByIds([123]),
      ).rejects.toThrow('API request failed: 500');
    });
  });
});
