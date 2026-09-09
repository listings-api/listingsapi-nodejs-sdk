import { ValidationError } from '../errors.js';
import type { HttpCore } from '../types/common.js';
import type {
  BulkPublishOptions,
  CreateAnnouncementOptions,
  CreateEventOptions,
  CreateOfferOptions,
  ListPostsOptions,
  PostSite,
} from '../types/posts.js';

const POST_SITES: PostSite[] = ['GOOGLE', 'FACEBOOK'];
const POST_TYPES = ['ANNOUNCEMENT', 'EVENT', 'OFFER', 'COVID19', 'PRODUCT'];
const CTA_TYPES = ['BOOK', 'ORDER', 'SHOP', 'LEARN_MORE', 'SIGN_UP', 'GET_OFFER'];

interface BuildPostBodyOptions {
  postType: string;
  name: string;
  locationIds: Array<string | number>;
  message: string | Partial<Record<PostSite, string>>;
  sites: PostSite[];
  ctaType?: string;
  ctaUrl?: string;
  mediaUrl?: string;
  scheduledDates?: Record<string, any>;
  contextInfo?: Record<string, any>;
  additionalFields?: Record<string, any>;
}

function buildPostBody(http: HttpCore, options: BuildPostBodyOptions): Record<string, any> {
  const {
    postType, name, locationIds, message, sites,
    ctaType, ctaUrl, mediaUrl, scheduledDates, contextInfo, additionalFields,
  } = options;

  const problems: string[] = [];
  if (!name || !name.trim()) problems.push('name is required');
  if (!locationIds || locationIds.length === 0) problems.push('locationIds must not be empty');
  if (!POST_TYPES.includes(postType)) {
    problems.push(`postType must be one of ${POST_TYPES.join(', ')}`);
  }
  const invalidSites = sites.filter((s) => !POST_SITES.includes(s));
  if (sites.length === 0 || invalidSites.length > 0) {
    problems.push(`sites must be a non-empty subset of ${POST_SITES.join(', ')}`);
  }
  if (typeof message === 'object' && message !== null) {
    const missing = sites.filter((s) => !(message[s] ?? '').trim());
    if (missing.length > 0) problems.push(`message missing for sites: ${missing.join(', ')}`);
  } else if (!message || !String(message).trim()) {
    problems.push('message is required');
  }
  if ((ctaType == null) !== (ctaUrl == null)) {
    problems.push('ctaType and ctaUrl must be provided together');
  }
  if (ctaType != null && !CTA_TYPES.includes(ctaType)) {
    problems.push(`ctaType must be one of ${CTA_TYPES.join(', ')}`);
  }
  if (problems.length > 0) {
    throw new ValidationError(`Invalid post: ${problems.join('; ')}`);
  }

  const perSiteMessage: Partial<Record<PostSite, string>> =
    typeof message === 'object' && message !== null
      ? message
      : Object.fromEntries(sites.map((s) => [s, message as string]));

  const body: Record<string, any> = {
    postName: name.trim(),
    locationIds: locationIds.map((id) => http.encodeLocationId(id)),
    postType,
    postSites: [...sites],
    postMessage: sites.map((s) => ({ site: s, message: perSiteMessage[s] })),
  };
  if (ctaType != null) {
    body.postCta = sites.map((s) => ({ site: s, type: ctaType, url: ctaUrl }));
  }
  if (mediaUrl != null) {
    body.postMediaUrl = sites.map((s) => ({ site: s, url: mediaUrl, type: 'IMAGE' }));
  }
  if (scheduledDates != null) body.postScheduledDates = scheduledDates;
  if (contextInfo != null) body.postContextInfo = contextInfo;
  if (additionalFields) Object.assign(body, additionalFields);
  return body;
}

function listParams(
  options: ListPostsOptions = {},
  includeTag = true,
): Record<string, any> {
  const params: Record<string, any> = {};
  if (includeTag) params.tag = options.tag ?? 'all';
  if (options.page != null) params.page = options.page;
  if (options.perPage != null) params.perPage = options.perPage;
  if (options.filters != null) params.filters = JSON.stringify(options.filters);
  if (options.sortFields != null) params.sortFields = JSON.stringify(options.sortFields);
  return params;
}

export function createPostMethods(http: HttpCore) {
  return {
    /**
     * Create a post from a raw field object. Pass the fields flat — they are
     * wrapped in the `input` object the API requires before sending.
     * Prefer createAnnouncement / createEvent / createOffer for validation.
     */
    async createPost(body: Record<string, any>): Promise<any> {
      const data = await http.apiPost('posts', { input: body });
      return data?.data?.createSocialPost ?? {};
    },

    /**
     * Create an ANNOUNCEMENT post: a plain message with optional CTA and media.
     */
    async createAnnouncement(options: CreateAnnouncementOptions): Promise<any> {
      const body = buildPostBody(http, {
        postType: 'ANNOUNCEMENT',
        name: options.name,
        locationIds: options.locationIds,
        message: options.message,
        sites: options.sites ?? ['GOOGLE'],
        ctaType: options.ctaType,
        ctaUrl: options.ctaUrl,
        mediaUrl: options.mediaUrl,
        scheduledDates: options.scheduledDates,
        additionalFields: options.additionalFields,
      });
      const data = await http.apiPost('posts', { input: body });
      return data?.data?.createSocialPost ?? {};
    },

    /**
     * Create an EVENT post with a title and a start/end window.
     * Google requires the event title; startDay/endDay are YYYY-MM-DD dates.
     */
    async createEvent(options: CreateEventOptions): Promise<any> {
      if (!options.title || !options.title.trim()) {
        throw new ValidationError('Invalid post: title is required for events');
      }
      const contextInfo: Record<string, any> = {
        title: options.title,
        startDay: options.startDay,
        endDay: options.endDay,
      };
      if (options.startTime != null) contextInfo.startTime = options.startTime;
      if (options.endTime != null) contextInfo.endTime = options.endTime;
      const body = buildPostBody(http, {
        postType: 'EVENT',
        name: options.name,
        locationIds: options.locationIds,
        message: options.message,
        sites: options.sites ?? ['GOOGLE'],
        ctaType: options.ctaType,
        ctaUrl: options.ctaUrl,
        mediaUrl: options.mediaUrl,
        scheduledDates: options.scheduledDates,
        contextInfo,
        additionalFields: options.additionalFields,
      });
      const data = await http.apiPost('posts', { input: body });
      return data?.data?.createSocialPost ?? {};
    },

    /**
     * Create an OFFER post with a coupon, discount, and terms.
     */
    async createOffer(options: CreateOfferOptions): Promise<any> {
      if (!options.title || !options.title.trim()) {
        throw new ValidationError('Invalid post: title is required for offers');
      }
      const contextInfo: Record<string, any> = { title: options.title };
      if (options.couponCode != null) contextInfo.couponCode = options.couponCode;
      if (options.discount != null) contextInfo.discount = options.discount;
      if (options.redeemUrl != null) contextInfo.redeemUrl = options.redeemUrl;
      if (options.termsConditions != null) contextInfo.termsConditions = options.termsConditions;
      if (options.startDay != null) contextInfo.startDay = options.startDay;
      if (options.endDay != null) contextInfo.endDay = options.endDay;
      const body = buildPostBody(http, {
        postType: 'OFFER',
        name: options.name,
        locationIds: options.locationIds,
        message: options.message,
        sites: options.sites ?? ['GOOGLE'],
        ctaType: options.ctaType,
        ctaUrl: options.ctaUrl,
        mediaUrl: options.mediaUrl,
        scheduledDates: options.scheduledDates,
        contextInfo,
        additionalFields: options.additionalFields,
      });
      const data = await http.apiPost('posts', { input: body });
      return data?.data?.createSocialPost ?? {};
    },

    /**
     * Publish one post across many locations on Google and Facebook in one call.
     * Defaults to both sites; the message (or per-site map) expands to one entry
     * per site, location IDs are encoded automatically, and the payload is
     * validated before any network call.
     *
     * @example
     * ```ts
     * const result = await client.bulkPublish({
     *   name: 'Holiday hours',
     *   locationIds: [16808, 16809],
     *   message: 'Open until 10pm through the holidays!',
     * });
     * ```
     */
    async bulkPublish(options: BulkPublishOptions): Promise<any> {
      const body = buildPostBody(http, {
        postType: options.postType ?? 'ANNOUNCEMENT',
        name: options.name,
        locationIds: options.locationIds,
        message: options.message,
        sites: options.sites ?? [...POST_SITES],
        ctaType: options.ctaType,
        ctaUrl: options.ctaUrl,
        mediaUrl: options.mediaUrl,
        scheduledDates: options.scheduledDates,
        contextInfo: options.contextInfo,
        additionalFields: options.additionalFields,
      });
      const data = await http.apiPost('bulk-posts', { input: body });
      return data?.data?.createSocialPost ?? {};
    },

    /**
     * Get a post with its content, per-site publish status, and analytics.
     */
    async fetchPost(postId: string): Promise<any> {
      const data = await http.apiGet(`posts/${postId}`);
      return data?.data?.socialPostView ?? {};
    },

    /**
     * Delete a post and remove it from every site it was published to.
     */
    async deletePost(postId: string): Promise<any> {
      const path = ['posts', postId].join('/');
      const data = await http.apiDelete(path);
      return data?.data?.deleteSocialPost ?? {};
    },

    /**
     * List post campaigns targeting a location. Offset-paginated.
     *
     * This route rejects a tag — the API errors when one is sent — so
     * `options.tag` is accepted for backwards compatibility and never put on
     * the wire. Use fetchLocationBulkPosts when you need tag filtering.
     */
    async fetchLocationPosts(
      locationId: string | number,
      options: ListPostsOptions = {},
    ): Promise<any> {
      const data = await http.listingsGet(
        locationId,
        'posts',
        listParams(options, false),
      );
      return data?.data?.postsByLocation ?? {};
    },

    /**
     * Get a bulk campaign with per-location publish status and analytics.
     */
    async fetchBulkPost(bulkPostId: string): Promise<any> {
      const data = await http.apiGet(`bulk-posts/${bulkPostId}`);
      return data?.data?.socialPostViewBulk ?? {};
    },

    /**
     * List bulk (multi-location) campaigns that include a location.
     */
    async fetchLocationBulkPosts(
      locationId: string | number,
      options: ListPostsOptions = {},
    ): Promise<any> {
      const data = await http.listingsGet(locationId, 'bulk-posts', listParams(options));
      return data?.data?.rollupSocialPosts ?? {};
    },
  };
}
