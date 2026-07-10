export type PostSite = 'GOOGLE' | 'FACEBOOK';

export type PostType = 'ANNOUNCEMENT' | 'EVENT' | 'OFFER' | 'COVID19' | 'PRODUCT';

export type PostCtaType = 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'GET_OFFER';

export interface PostScheduledDates {
  startDatetime?: string;
  endDatetime?: string;
  removalSites?: PostSite[];
}

interface CreatePostBaseOptions {
  /** Internal campaign name (not shown to customers). */
  name: string;
  /** Locations to publish to (numeric or base64 IDs). */
  locationIds: Array<string | number>;
  /** Post body for every site, or a per-site map. */
  message: string | Partial<Record<PostSite, string>>;
  /** Target sites. */
  sites?: PostSite[];
  /** Call-to-action button type; requires ctaUrl. */
  ctaType?: PostCtaType;
  /** Destination for the CTA button. */
  ctaUrl?: string;
  /** Public image URL attached on every site. */
  mediaUrl?: string;
  /** When to publish/expire the post itself. */
  scheduledDates?: PostScheduledDates;
  /** Extra flat camelCase fields merged as-is. */
  additionalFields?: Record<string, any>;
}

export interface CreateAnnouncementOptions extends CreatePostBaseOptions {}

export interface CreateEventOptions extends CreatePostBaseOptions {
  /** Event title (required by Google). */
  title: string;
  /** Event start date, YYYY-MM-DD. */
  startDay: string;
  /** Event end date, YYYY-MM-DD. */
  endDay: string;
  /** Display time like "10:00am". */
  startTime?: string;
  /** Display time like "6:00pm". */
  endTime?: string;
}

export interface CreateOfferOptions extends CreatePostBaseOptions {
  /** Offer title. */
  title: string;
  couponCode?: string;
  discount?: string;
  redeemUrl?: string;
  termsConditions?: string;
  /** Offer validity start, YYYY-MM-DD. */
  startDay?: string;
  /** Offer validity end, YYYY-MM-DD. */
  endDay?: string;
}

export interface BulkPublishOptions extends CreatePostBaseOptions {
  /** Defaults to ANNOUNCEMENT. */
  postType?: PostType;
  /** Event/offer details when postType needs them. */
  contextInfo?: Record<string, any>;
}

export interface ListPostsOptions {
  /** Segment to pull posts from; defaults to "all". */
  tag?: string;
  /** 1-based page number. */
  page?: number;
  perPage?: number;
  /** SocialPostFiltersInput fields (JSON-encoded automatically). */
  filters?: Record<string, any>;
  /** Sort object like { field: "created_at", order: "Descending" }. */
  sortFields?: Record<string, any>;
}
