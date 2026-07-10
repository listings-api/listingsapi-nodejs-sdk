import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListingsAPI } from '../../src/client.js';
import { ValidationError } from '../../src/errors.js';

function mockFetch(body: any, ok = true, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok,
    status,
    headers: { get: () => null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response);
}

const CREATE_POST_OK = {
  data: {
    createSocialPost: {
      success: true,
      errors: [],
      socialPost: { id: 'U29jaWFsUG9zdDo0NDEyMg==', status: 'INPROGRESS' },
    },
  },
};

const BULK_POST_OK = {
  data: {
    createBulkSocialPost: {
      success: true,
      errors: [],
      socialPost: { id: 'QnVsa1Bvc3Q6OTk=', status: 'INPROGRESS' },
    },
  },
};

describe('Posts', () => {
  let client: ListingsAPI;

  beforeEach(() => {
    client = new ListingsAPI({ apiKey: 'test-key' });
    vi.restoreAllMocks();
  });

  describe('createAnnouncement', () => {
    it('builds a flat body with per-site entries', async () => {
      const spy = mockFetch(CREATE_POST_OK);
      const result = await client.createAnnouncement({
        name: 'Grand Opening',
        locationIds: [1800289],
        message: 'We are now open!',
        sites: ['GOOGLE'],
        ctaType: 'LEARN_MORE',
        ctaUrl: 'https://example.com/opening',
        mediaUrl: 'https://cdn.example.com/opening.jpg',
      });
      expect(result.success).toBe(true);
      const sent = JSON.parse(spy.mock.calls[0][1]!.body as string);
      expect(sent.input).toBeUndefined();
      expect(sent.postName).toBe('Grand Opening');
      expect(sent.postType).toBe('ANNOUNCEMENT');
      expect(sent.postSites).toEqual(['GOOGLE']);
      expect(sent.locationIds).toEqual(['TG9jYXRpb246MTgwMDI4OQ==']);
      expect(sent.postMessage).toEqual([{ site: 'GOOGLE', message: 'We are now open!' }]);
      expect(sent.postCta).toEqual([
        { site: 'GOOGLE', type: 'LEARN_MORE', url: 'https://example.com/opening' },
      ]);
      expect(sent.postMediaUrl).toEqual([
        { site: 'GOOGLE', url: 'https://cdn.example.com/opening.jpg', type: 'IMAGE' },
      ]);
    });
  });

  describe('bulkPublish', () => {
    it('defaults to Google and Facebook', async () => {
      const spy = mockFetch(BULK_POST_OK);
      const result = await client.bulkPublish({
        name: 'Holiday hours',
        locationIds: [16808, 'TG9jYXRpb246MTY4MDk='],
        message: 'Open late through the holidays!',
      });
      expect(result.success).toBe(true);
      expect(spy.mock.calls[0][0]).toContain('/api/v4/bulk-posts');
      const sent = JSON.parse(spy.mock.calls[0][1]!.body as string);
      expect(sent.postSites).toEqual(['GOOGLE', 'FACEBOOK']);
      expect(sent.postMessage).toHaveLength(2);
      expect(sent.locationIds[1]).toBe('TG9jYXRpb246MTY4MDk=');
    });

    it('supports per-site messages', async () => {
      const spy = mockFetch(BULK_POST_OK);
      await client.bulkPublish({
        name: 'Summer menu',
        locationIds: [16808],
        message: { GOOGLE: 'New summer menu!', FACEBOOK: 'Swing by for the summer menu.' },
      });
      const sent = JSON.parse(spy.mock.calls[0][1]!.body as string);
      const bySite = Object.fromEntries(
        sent.postMessage.map((e: any) => [e.site, e.message]),
      );
      expect(bySite.GOOGLE).toBe('New summer menu!');
      expect(bySite.FACEBOOK).toBe('Swing by for the summer menu.');
    });

    it('validates before any network call', async () => {
      const spy = vi.spyOn(globalThis, 'fetch');
      await expect(
        client.bulkPublish({
          name: 'x',
          locationIds: [],
          message: '',
          sites: ['TWITTER' as any],
        }),
      ).rejects.toThrow(ValidationError);
      expect(spy).not.toHaveBeenCalled();
    });

    it('fails when a targeted site has no message', async () => {
      await expect(
        client.bulkPublish({
          name: 'x',
          locationIds: [1],
          message: { GOOGLE: 'hi' },
        }),
      ).rejects.toThrow(/FACEBOOK/);
    });

    it('requires ctaType and ctaUrl together', async () => {
      await expect(
        client.bulkPublish({
          name: 'x',
          locationIds: [1],
          message: 'hi',
          ctaType: 'LEARN_MORE',
        }),
      ).rejects.toThrow(/ctaType and ctaUrl/);
    });

    it('raises ValidationError with the platform code on API failure', async () => {
      mockFetch({
        data: {
          createBulkSocialPost: {
            success: false,
            errors: [{ code: 'SY20001', message: 'Image URL unreachable' }],
          },
        },
      });
      let caught: any;
      try {
        await client.bulkPublish({ name: 'x', locationIds: [1], message: 'hi' });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(ValidationError);
      expect(caught.code).toBe('SY20001');
    });
  });

  describe('createEvent', () => {
    it('requires a title', async () => {
      await expect(
        client.createEvent({
          name: 'x',
          locationIds: [1],
          message: 'hi',
          title: '',
          startDay: '2026-08-01',
          endDay: '2026-08-02',
        }),
      ).rejects.toThrow(/title/);
    });

    it('sends event context info', async () => {
      const spy = mockFetch(CREATE_POST_OK);
      await client.createEvent({
        name: 'Live music',
        locationIds: [16808],
        message: 'Join us Friday!',
        title: 'Jazz Night',
        startDay: '2026-08-01',
        endDay: '2026-08-01',
        startTime: '7:00pm',
        endTime: '10:00pm',
      });
      const sent = JSON.parse(spy.mock.calls[0][1]!.body as string);
      expect(sent.postType).toBe('EVENT');
      expect(sent.postContextInfo).toEqual({
        title: 'Jazz Night',
        startDay: '2026-08-01',
        endDay: '2026-08-01',
        startTime: '7:00pm',
        endTime: '10:00pm',
      });
    });
  });

  describe('createOffer', () => {
    it('sends offer context info', async () => {
      const spy = mockFetch(CREATE_POST_OK);
      await client.createOffer({
        name: 'Summer sale',
        locationIds: [16808],
        message: '20% off all week!',
        title: 'Summer Sale',
        couponCode: 'SUMMER20',
        discount: '20%',
        redeemUrl: 'https://example.com/sale',
        startDay: '2026-08-01',
        endDay: '2026-08-07',
      });
      const sent = JSON.parse(spy.mock.calls[0][1]!.body as string);
      expect(sent.postType).toBe('OFFER');
      expect(sent.postContextInfo.couponCode).toBe('SUMMER20');
      expect(sent.postContextInfo.title).toBe('Summer Sale');
    });
  });

  describe('reads and delete', () => {
    it('fetchPost unwraps socialPostView', async () => {
      mockFetch({ data: { socialPostView: { socialPostId: 'abc' } } });
      const post = await client.fetchPost('abc');
      expect(post.socialPostId).toBe('abc');
    });

    it('fetchBulkPost unwraps socialPostViewBulk', async () => {
      mockFetch({ data: { socialPostViewBulk: { socialPostId: 'bulk1' } } });
      const post = await client.fetchBulkPost('bulk1');
      expect(post.socialPostId).toBe('bulk1');
    });

    it('fetchLocationPosts defaults tag=all and encodes the location', async () => {
      const spy = mockFetch({
        data: { rollupSocialPosts: { records: [{ id: 'p1' }], pageInfo: { totalRecords: 1 } } },
      });
      const result = await client.fetchLocationPosts(16808, { page: 1, perPage: 10 });
      expect(result.records[0].id).toBe('p1');
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/locations/TG9jYXRpb246MTY4MDg=/posts');
      expect(url).toContain('tag=all');
      expect(url).toContain('page=1');
    });

    it('deletePost issues DELETE and unwraps the payload', async () => {
      const spy = mockFetch({
        data: { deleteSocialPost: { success: true, socialPostId: 'abc' } },
      });
      const result = await client.deletePost('abc');
      expect(result.success).toBe(true);
      expect(spy.mock.calls[0][1]!.method).toBe('DELETE');
    });
  });
});
