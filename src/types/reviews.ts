export interface InteractionFilters {
  siteUrls?: string[];
  startDate?: string;
  endDate?: string;
  category?: string;
  ratingFilters?: number[];
}

export interface Interaction {
  id: string;
  content?: string;
  rating?: number;
  siteName?: string;
  siteUrl?: string;
  reviewerName?: string;
  publishedAt?: string;
  category?: string;
  responses?: any[];
  [key: string]: any;
}

export interface InteractionEdge {
  node: Interaction;
  cursor: string;
}

export interface InteractionPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface InteractionsData {
  edges: InteractionEdge[];
  pageInfo: InteractionPageInfo;
  totalCount?: number;
}

export interface InteractionResponse {
  success: boolean;
  interactions: Interaction[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount?: number;
  raw: any;
  [key: string]: any;
}

export interface ReviewSettings {
  [key: string]: any;
}

export interface ReviewAnalytics {
  [key: string]: any;
}

export interface ReviewSiteConfig {
  [key: string]: any;
}

export interface ReviewDetails {
  [key: string]: any;
}

export interface ReviewPhrase {
  phrase?: string;
  count?: number;
  sentiment?: string;
  [key: string]: any;
}

export interface ReviewSiteUrl {
  name: string;
  url: string;
  [key: string]: any;
}

export interface RespondToReviewInput {
  interactionId: string;
  responseContent: string;
}

export interface EditReviewResponseInput {
  reviewId: string;
  responseId: string;
  responseContent: string;
}

export interface ReviewPhrasesOptions {
  locationIds: string[];
  siteUrls?: string[];
  startDate?: string;
  endDate?: string;
}
