import type { HttpCore, PaginationOptions } from '../types/common.js';
import type {
  InteractionFilters,
  Interaction,
  InteractionResponse,
  ReviewSettings,
  ReviewAnalytics,
  ReviewSiteConfig,
  ReviewDetails,
  ReviewPhrase,
  ReviewSiteUrl,
  ReviewPhrasesOptions,
} from '../types/reviews.js';

export function createReviewMethods(http: HttpCore) {
  /**
   * Fetch a single page of interactions (reviews) for a location.
   */
  async function fetchInteractionsPage(
    locationId: string | number,
    options: PaginationOptions & InteractionFilters = {},
  ): Promise<InteractionResponse> {
    const params: Record<string, any> = {};
    if (options.first !== undefined) params.first = options.first;
    if (options.after !== undefined) params.after = options.after;
    if (options.before !== undefined) params.before = options.before;
    if (options.last !== undefined) params.last = options.last;
    if (options.startDate !== undefined) params.startDate = options.startDate;
    if (options.endDate !== undefined) params.endDate = options.endDate;
    if (options.category !== undefined) params.category = options.category;
    if (options.siteUrls !== undefined) params.siteUrls = JSON.stringify(options.siteUrls);
    if (options.ratingFilters !== undefined) params.ratingFilters = JSON.stringify(options.ratingFilters);

    const data = await http.listingsGet<any>(locationId, 'reviews', params);
    const interactionsData = data?.data?.interactions ?? {};
    const edges = interactionsData.edges ?? [];
    const pageInfo = interactionsData.pageInfo ?? {};
    const interactions = edges.map((e: any) => e.node);
    const startCursor = edges.length > 0 ? edges[0].cursor : null;
    const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;

    return {
      success: true,
      interactions,
      pageInfo: {
        hasNextPage: pageInfo.hasNextPage ?? false,
        hasPreviousPage: pageInfo.hasPreviousPage ?? false,
        startCursor,
        endCursor,
      },
      totalCount: interactionsData.totalCount,
      raw: data,
    };
  }

  /**
   * Auto-paginate all interactions for a location.
   */
  async function fetchAllInteractions(
    locationId: string | number,
    options: InteractionFilters & { pageSize?: number } = {},
  ): Promise<Interaction[]> {
    const allNodes: Interaction[] = [];
    let afterCursor: string | undefined;
    const pageSize = options.pageSize ?? 100;

    while (true) {
      const page = await fetchInteractionsPage(locationId, {
        ...options,
        first: pageSize,
        after: afterCursor,
      });
      allNodes.push(...page.interactions);
      if (!page.pageInfo.hasNextPage || page.interactions.length === 0) break;
      afterCursor = page.pageInfo.endCursor ?? undefined;
      if (!afterCursor) break;
    }

    return allNodes;
  }

  /**
   * Get reviews/interactions for a location with pagination and filters.
   * When fetchAll is true, returns a flat array of all interactions.
   * Otherwise returns a paginated response object.
   */
  function fetchInteractions(
    locationId: string | number,
    options: PaginationOptions & InteractionFilters & { fetchAll: true },
  ): Promise<Interaction[]>;
  function fetchInteractions(
    locationId: string | number,
    options?: PaginationOptions & InteractionFilters & { fetchAll?: false },
  ): Promise<InteractionResponse>;
  function fetchInteractions(
    locationId: string | number,
    options?: PaginationOptions & InteractionFilters,
  ): Promise<InteractionResponse | Interaction[]>;
  async function fetchInteractions(
    locationId: string | number,
    options: PaginationOptions & InteractionFilters = {},
  ): Promise<InteractionResponse | Interaction[]> {
    if (options.fetchAll) {
      return fetchAllInteractions(locationId, {
        ...options,
        pageSize: options.pageSize,
      });
    }
    return fetchInteractionsPage(locationId, options);
  }

  return {
    fetchInteractions,

    /**
     * Get review source settings for a location.
     */
    async fetchReviewSettings(locationId: string | number): Promise<ReviewSettings> {
      const data = await http.listingsGet<any>(locationId, 'reviews/settings');
      return data?.data?.interactionsSetting ?? {};
    },

    /**
     * Get overall review analytics for a location.
     */
    async fetchReviewAnalyticsOverview(
      locationId: string | number,
      options: { startDate?: string; endDate?: string } = {},
    ): Promise<ReviewAnalytics> {
      const params: Record<string, any> = {};
      if (options.startDate !== undefined) params.startDate = options.startDate;
      if (options.endDate !== undefined) params.endDate = options.endDate;
      const data = await http.listingsGet<any>(locationId, 'review-analytics-overview', params);
      return data?.data?.interactionsAnalyticsStats ?? {};
    },

    /**
     * Get review analytics over time for a location.
     */
    async fetchReviewAnalyticsTimeline(
      locationId: string | number,
      options: { startDate?: string; endDate?: string } = {},
    ): Promise<ReviewAnalytics> {
      const params: Record<string, any> = {};
      if (options.startDate !== undefined) params.startDate = options.startDate;
      if (options.endDate !== undefined) params.endDate = options.endDate;
      const data = await http.listingsGet<any>(locationId, 'review-analytics-timeline', params);
      return data?.data?.interactionsChartData ?? {};
    },

    /**
     * Get review analytics broken down by site for a location.
     */
    async fetchReviewAnalyticsSitesStats(
      locationId: string | number,
      options: { startDate?: string; endDate?: string } = {},
    ): Promise<ReviewAnalytics> {
      const params: Record<string, any> = {};
      if (options.startDate !== undefined) params.startDate = options.startDate;
      if (options.endDate !== undefined) params.endDate = options.endDate;
      const data = await http.listingsGet<any>(locationId, 'review-analytics-sites-stats', params);
      return data?.data?.interactionsSitesStats ?? {};
    },

    /**
     * Get eligible review sources and site config for the account.
     */
    async fetchReviewSiteConfig(): Promise<ReviewSiteConfig[]> {
      const data = await http.apiGet<any>('reviews/site-config');
      return data?.data?.interactionSiteConfig ?? [];
    },

    /**
     * Get detailed information for specific reviews by interaction IDs.
     */
    async fetchReviewDetails(interactionIds: string[]): Promise<ReviewDetails> {
      if (interactionIds.length === 0) return {};
      const params = { interactionIds: JSON.stringify(interactionIds) };
      const data = await http.apiGet<any>('reviewDetails', params);
      return data?.data?.interactionDetails ?? {};
    },

    /**
     * Get review phrase analysis for given locations.
     */
    async fetchReviewPhrases(options: ReviewPhrasesOptions): Promise<ReviewPhrase[]> {
      if (options.locationIds.length === 0) return [];
      const params: Record<string, any> = {
        locationIds: JSON.stringify(options.locationIds),
      };
      if (options.siteUrls !== undefined) params.siteUrls = JSON.stringify(options.siteUrls);
      if (options.startDate !== undefined) params.startDate = options.startDate;
      if (options.endDate !== undefined) params.endDate = options.endDate;
      const data = await http.apiGet<any>('review-phrases', params);
      return data?.data?.newReviewPhrases ?? [];
    },

    /**
     * Post a reply to a review/interaction.
     */
    async respondToReview(
      interactionId: string,
      responseContent: string,
    ): Promise<Record<string, any>> {
      const data = await http.apiPost<any>('locations/reviews/respond', {
        interactionId,
        responseContent,
      });
      return data?.data?.respondToInteraction ?? {};
    },

    /**
     * Edit an existing reply to a review.
     */
    async editReviewResponse(
      reviewId: string,
      responseId: string,
      responseContent: string,
    ): Promise<Record<string, any>> {
      const data = await http.apiPost<any>('locations/reviews/respond/edit', {
        reviewId,
        responseId,
        responseContent,
      });
      return data?.data?.editResponse ?? {};
    },

    /**
     * Archive (hide) a reply to a review.
     */
    async archiveReviewResponse(responseId: string): Promise<Record<string, any>> {
      const data = await http.apiPost<any>('locations/reviews/respond/archive', {
        responseId,
      });
      return data?.data?.archiveResponse ?? {};
    },

    /**
     * Set or update review source URLs for a location.
     */
    async editReviewSettings(
      locationId: string | number,
      siteUrls: ReviewSiteUrl[],
    ): Promise<Record<string, any>> {
      const data = await http.apiPost<any>('locations/reviews/settings/edit', {
        locationId: http.encodeLocationId(locationId),
        siteUrls,
      });
      return data?.data?.editInteractionsSetting ?? {};
    },
  };
}
