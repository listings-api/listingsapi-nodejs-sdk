import type { HttpCore } from '../types/common.js';
import type { GoogleAnalytics, BingAnalytics, FacebookAnalytics } from '../types/analytics.js';

export function createAnalyticsMethods(http: HttpCore) {
  return {
    /**
     * Get Google (GMB) profile analytics for a location.
     */
    async fetchGoogleAnalytics(
      locationId: string | number,
      options?: { fromDate?: string; toDate?: string },
    ): Promise<GoogleAnalytics> {
      const params: Record<string, string> = {};
      if (options?.fromDate) params.fromDate = options.fromDate;
      if (options?.toDate) params.toDate = options.toDate;
      const data = await http.listingsGet(locationId, 'google-analytics', params);
      return (data as any)?.data?.googleInsights ?? {};
    },

    /**
     * Get Bing profile analytics for a location.
     */
    async fetchBingAnalytics(
      locationId: string | number,
      options?: { fromDate?: string; toDate?: string },
    ): Promise<BingAnalytics> {
      const params: Record<string, string> = {};
      if (options?.fromDate) params.fromDate = options.fromDate;
      if (options?.toDate) params.toDate = options.toDate;
      const data = await http.listingsGet(locationId, 'bing-analytics', params);
      return (data as any)?.data?.bingInsights ?? {};
    },

    /**
     * Get Facebook page analytics for a location.
     */
    async fetchFacebookAnalytics(
      locationId: string | number,
      options?: { fromDate?: string; toDate?: string },
    ): Promise<FacebookAnalytics> {
      const params: Record<string, string> = {};
      if (options?.fromDate) params.fromDate = options.fromDate;
      if (options?.toDate) params.toDate = options.toDate;
      const data = await http.listingsGet(locationId, 'facebook-analytics', params);
      return (data as any)?.data?.facebookInsights ?? {};
    },
  };
}
