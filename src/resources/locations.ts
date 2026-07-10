import type { HttpCore, PageInfo, PaginationOptions } from '../types/common.js';
import type { Location, CreateLocationInput, UpdateLocationInput } from '../types/locations.js';

export interface LocationPaginatedResponse {
  success: boolean;
  locations: Location[];
  pageInfo: PageInfo;
  raw: any;
}

export function createLocationMethods(http: HttpCore) {
  /**
   * Parse edges/pageInfo from a GraphQL-style paginated response.
   */
  function parsePaginatedLocations(
    container: any,
  ): { locations: Location[]; pageInfo: PageInfo } {
    const edges: any[] = container?.edges ?? [];
    const rawPageInfo = container?.pageInfo ?? {};

    const locations: Location[] = edges.map((e: any) => e.node);
    const startCursor = edges.length > 0 ? edges[0].cursor : null;
    const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;

    return {
      locations,
      pageInfo: {
        hasNextPage: rawPageInfo.hasNextPage ?? false,
        hasPreviousPage: rawPageInfo.hasPreviousPage ?? false,
        startCursor,
        endCursor,
        ...(rawPageInfo.total !== undefined ? { total: rawPageInfo.total } : {}),
      },
    };
  }

  /**
   * Build pagination query params from options.
   */
  function paginationParams(
    options?: PaginationOptions,
  ): Record<string, any> {
    const params: Record<string, any> = {};
    if (!options) return params;
    if (options.first !== undefined) params.first = options.first;
    if (options.after !== undefined) params.after = options.after;
    if (options.before !== undefined) params.before = options.before;
    if (options.last !== undefined) params.last = options.last;
    return params;
  }

  async function fetchLocationsPage(
    options?: PaginationOptions,
  ): Promise<LocationPaginatedResponse> {
    const params = paginationParams(options);
    const data = await http.apiGet('locations', params);
    const allLocations = data?.data?.allLocations ?? {};
    const { locations, pageInfo } = parsePaginatedLocations(allLocations);

    return {
      success: true,
      locations,
      pageInfo,
      raw: data,
    };
  }

  async function fetchAllLocationsPaginated(
    pageSize: number = 100,
  ): Promise<Location[]> {
    const allNodes: Location[] = [];
    let after: string | undefined;

    while (true) {
      const page = await fetchLocationsPage({ first: pageSize, after });
      allNodes.push(...page.locations);
      if (!page.pageInfo.hasNextPage) break;
      after = page.pageInfo.endCursor ?? undefined;
      if (!after) break;
    }

    return allNodes;
  }

  return {
    /**
     * Get locations for the account, with optional pagination or fetch-all.
     *
     * When fetchAll is true, returns a flat array of all locations.
     * Otherwise returns a paginated response with locations, pageInfo, and raw data.
     */
    async fetchAllLocations(
      options?: PaginationOptions,
    ): Promise<LocationPaginatedResponse | Location[]> {
      if (options?.fetchAll) {
        return fetchAllLocationsPaginated(options.pageSize ?? 100);
      }
      return fetchLocationsPage(options);
    },

    /**
     * Get locations by a list of IDs. Accepts numeric or base64-encoded IDs.
     */
    async fetchLocationsByIds(
      locationIds: (string | number)[],
    ): Promise<Location[]> {
      if (!locationIds || locationIds.length === 0) return [];
      const encodedIds = locationIds.map((id) => http.encodeLocationId(id));
      const data = await http.apiGet('locations-by-ids', {
        ids: JSON.stringify(encodedIds),
      });
      return data?.data?.getLocationsByIds ?? [];
    },

    /**
     * Get locations that match the given store codes.
     */
    async fetchLocationsByStoreCodes(
      storeCodes: string[],
    ): Promise<Location[]> {
      if (!storeCodes || storeCodes.length === 0) return [];
      const data = await http.apiGet('locations-by-store-codes', {
        storeCodes: JSON.stringify(storeCodes),
      });
      return data?.data?.getLocationsByStoreCodes ?? [];
    },

    /**
     * Search locations by keyword (name, address, or store ID).
     */
    async searchLocations(
      query: string,
      options?: PaginationOptions & { fields?: string[] },
    ): Promise<LocationPaginatedResponse | Location[]> {
      if (options?.fetchAll) {
        const allNodes: Location[] = [];
        let after: string | undefined;
        const pageSize = options.pageSize ?? 100;

        while (true) {
          const params: Record<string, any> = {
            query,
            first: pageSize,
            ...paginationParams({ after }),
          };
          if (options.fields) {
            params.fields = JSON.stringify(options.fields);
          }

          const data = await http.apiGet('locations/search', params);
          const searchResult = data?.data?.searchLocations ?? {};
          const { locations, pageInfo } = parsePaginatedLocations(searchResult);
          allNodes.push(...locations);

          if (!pageInfo.hasNextPage) break;
          after = pageInfo.endCursor ?? undefined;
          if (!after) break;
        }

        return allNodes;
      }

      const params: Record<string, any> = {
        query,
        ...paginationParams(options),
      };
      if (options?.fields) {
        params.fields = JSON.stringify(options.fields);
      }

      const data = await http.apiGet('locations/search', params);
      const searchResult = data?.data?.searchLocations ?? {};
      const { locations, pageInfo } = parsePaginatedLocations(searchResult);

      return {
        success: true,
        locations,
        pageInfo,
        raw: data,
      };
    },

    /**
     * Create a new location.
     */
    async createLocation(input: CreateLocationInput): Promise<any> {
      const data = await http.apiPost('locations', { input });
      return data?.data?.createLocation ?? {};
    },

    /**
     * Update a location. Pass id plus any fields to change.
     */
    async updateLocation(input: UpdateLocationInput): Promise<any> {
      const encoded = {
        ...input,
        id: http.encodeLocationId(input.id),
      };
      const data = await http.apiPost('locations/update', { input: encoded });
      return data?.data?.updateLocation ?? {};
    },

    /**
     * Archive one or more locations.
     */
    async archiveLocations(
      locationIds: (string | number)[],
    ): Promise<any> {
      const encodedIds = locationIds.map((id) => http.encodeLocationId(id));
      const data = await http.apiPost('locations/archive', {
        input: { locationIds: encodedIds },
      });
      return data?.data?.archiveLocations ?? {};
    },

    /**
     * Cancel scheduled archival for the given locations.
     */
    async cancelArchiveLocations(
      locationIds: (string | number)[],
      selectionType: string,
      changedBy: string,
    ): Promise<any> {
      const encodedIds = locationIds.map((id) => http.encodeLocationId(id));
      const data = await http.apiPost('locations/cancel_archive', {
        input: {
          locationIds: encodedIds,
          selectionType,
          changedBy,
        },
      });
      return data?.data?.cancelLocationsArchive ?? {};
    },
  };
}
