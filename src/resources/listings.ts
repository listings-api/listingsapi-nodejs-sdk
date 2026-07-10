import type { HttpCore } from '../types/common.js';
import type { Listing, VoiceListing, DuplicateListing } from '../types/listings.js';

export function createListingMethods(http: HttpCore) {
  return {
    /**
     * Get premium (directory) listings for a location (Google, Yelp, etc.).
     */
    async fetchPremiumListings(
      locationId: string | number,
    ): Promise<Listing[]> {
      const data = await http.listingsGet(locationId, 'listings/premium');
      return data?.data?.listingsForLocation ?? [];
    },

    /**
     * Get voice assistant listings for a location (Google, Alexa, Siri, etc.).
     */
    async fetchVoiceListings(
      locationId: string | number,
    ): Promise<VoiceListing[]> {
      const data = await http.listingsGet(locationId, 'voice-assistants');
      return data?.data?.voiceAssistantsForLocation ?? [];
    },

    /**
     * Get duplicate listings detected for a location.
     */
    async fetchDuplicateListings(
      locationId: string | number,
    ): Promise<DuplicateListing[]> {
      const data = await http.listingsGet(locationId, 'listings/duplicates');
      return data?.data?.duplicateListingsForLocation ?? [];
    },

    /**
     * Get a rollup of duplicate listings across all locations,
     * with optional tag filter and pagination.
     */
    async fetchAllDuplicateListings(options?: {
      tag?: string;
      page?: number;
    }): Promise<any> {
      const params: Record<string, any> = {};
      if (options?.tag !== undefined) params.tag = options.tag;
      if (options?.page !== undefined) params.page = options.page;

      const data = await http.apiGet('locations/listings/duplicates', params);
      return data?.data?.duplicateListingsRollup ?? {};
    },

    /**
     * Mark one or more listing items as duplicate for a location.
     */
    async markListingsAsDuplicate(
      locationId: string | number,
      listingItemIds: string[],
    ): Promise<any> {
      const data = await http.apiPost('locations/listings/mark-as-duplicate', {
        input: {
          locationId: http.encodeLocationId(locationId),
          listingItemIds,
        },
      });
      return data?.data?.markAsDuplicate ?? {};
    },

    /**
     * Clear duplicate status for listing items.
     */
    async markListingsAsNotDuplicate(
      locationId: string | number,
      listingItemIds: string[],
    ): Promise<any> {
      const data = await http.apiPost(
        'locations/listings/mark-as-not-duplicate',
        {
          input: {
            locationId: http.encodeLocationId(locationId),
            listingItemIds,
          },
        },
      );
      return data?.data?.markAsNotDuplicate ?? {};
    },
  };
}
