import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ListingsAPI } from '../../src/client.js';

function mockFetch(responseBody: any) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => responseBody,
    text: async () => JSON.stringify(responseBody),
  } as Response);
}

describe('Photos', () => {
  let client: ListingsAPI;

  beforeEach(() => {
    client = new ListingsAPI({ apiKey: 'test-key' });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchLocationPhotos', () => {
    it('should fetch photos for a location', async () => {
      const mockPhotos = [{ id: 'p1', url: 'https://example.com/photo.jpg' }];
      const spy = mockFetch({ data: { mediaFilesOfLocation: mockPhotos } });

      const result = await client.fetchLocationPhotos(16808);

      expect(result).toEqual(mockPhotos);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/photos');
    });

    it('should return empty array when no photos', async () => {
      mockFetch({ data: {} });

      const result = await client.fetchLocationPhotos(16808);
      expect(result).toEqual([]);
    });
  });

  describe('addLocationPhotos', () => {
    it('should add photos to a location', async () => {
      const mockResult = { success: true };
      const spy = mockFetch({ data: { addLocationPhotos: mockResult } });

      const photos = [{ photo: 'https://example.com/logo.png', type: 'LOGO' as const }];
      const result = await client.addLocationPhotos(16808, photos);

      expect(result).toEqual(mockResult);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/locations/photos');
      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.input.locationId).toBe(btoa('Location:16808'));
      expect(body.input.photos).toEqual(photos);
    });

    it('should return empty object when no data', async () => {
      mockFetch({ data: {} });

      const result = await client.addLocationPhotos(16808, []);
      expect(result).toEqual({});
    });
  });

  describe('removeLocationPhotos', () => {
    it('should remove photos from a location', async () => {
      const mockResult = { success: true };
      const spy = mockFetch({ data: { removeLocationPhotos: mockResult } });

      const photoIds = ['TG9jYXRpb25QaG90bzoxMjI2MA=='];
      const result = await client.removeLocationPhotos(16808, photoIds);

      expect(result).toEqual(mockResult);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/locations/photos/remove');
      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.input.locationId).toBe(btoa('Location:16808'));
      expect(body.input.photoIds).toEqual(photoIds);
    });
  });

  describe('starLocationPhotos', () => {
    it('should star photos for a location', async () => {
      const mockResult = { success: true };
      const spy = mockFetch({ data: { starUnstarLocationPhotos: mockResult } });

      const mediaIds = ['TWVkaWFGaWxlOjg4MjY5Nw=='];
      const result = await client.starLocationPhotos(16808, mediaIds, true);

      expect(result).toEqual(mockResult);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/locations/photos/star');
      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.input.locationId).toBe(btoa('Location:16808'));
      expect(body.input.mediaIds).toEqual(mediaIds);
      expect(body.input.starred).toBe(true);
    });

    it('should unstar photos for a location', async () => {
      const spy = mockFetch({ data: { starUnstarLocationPhotos: { success: true } } });

      const mediaIds = ['TWVkaWFGaWxlOjg4MjY5Nw=='];
      await client.starLocationPhotos(16808, mediaIds, false);

      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.input.starred).toBe(false);
    });
  });

  describe('fetchPhotoUploadStatus', () => {
    it('should fetch photo upload status by request ID', async () => {
      const mockStatus = { status: 'completed', total: 5, processed: 5 };
      const spy = mockFetch({ data: { bulkImageProcessingStatus: mockStatus } });

      const result = await client.fetchPhotoUploadStatus('req-abc123');

      expect(result).toEqual(mockStatus);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/locations/photos/requests/req-abc123');
    });

    it('should return empty object when no data', async () => {
      mockFetch({ data: {} });

      const result = await client.fetchPhotoUploadStatus('req-abc123');
      expect(result).toEqual({});
    });
  });
});
