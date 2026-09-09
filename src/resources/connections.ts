import type { HttpCore } from '../types/common.js';
import type {
  OAuthConnectUrl,
  ConnectedAccountFolder,
  ConnectedAccountDetails,
} from '../types/connections.js';

export function createConnectionMethods(http: HttpCore) {
  return {
    /**
     * Get a URL to connect a Google or Facebook profile to a location.
     */
    async getOauthConnectUrl(
      locationId: string | number,
      site: string,
      successUrl: string,
      errorUrl: string,
    ): Promise<OAuthConnectUrl> {
      const data = await http.apiPost('locations/oauth_connect_url', {
        input: {
          locationId: http.encodeLocationId(locationId),
          site: site.toUpperCase(),
          successUrl,
          errorUrl,
        },
      });
      return (data as any)?.data?.createConnectUrl ?? {};
    },

    /**
     * Disconnect a Google or Facebook profile from a location.
     */
    async oauthDisconnect(
      locationId: string | number,
      site: string,
    ): Promise<Record<string, any>> {
      const data = await http.apiPost('locations/oauth-disconnect', {
        input: {
          locationId: http.encodeLocationId(locationId),
          site: site.toUpperCase(),
        },
      });
      return (data as any)?.data?.disconnectConnectedAccountsLocations ?? {};
    },

    /**
     * Get a URL to connect a Google account for bulk use across locations.
     */
    async connectGoogleAccount(
      successUrl: string,
      errorUrl: string,
    ): Promise<Record<string, any>> {
      const data = await http.apiPost('connected-accounts/connect-google', {
        input: { successUrl, errorUrl },
      });
      return (data as any)?.data?.bulkConnectLinkForGoogle ?? {};
    },

    /**
     * Get a URL to connect a Facebook account for bulk use across locations.
     */
    async connectFacebookAccount(
      successUrl: string,
      errorUrl: string,
    ): Promise<Record<string, any>> {
      const data = await http.apiPost('connected-accounts/connect-facebook', {
        input: { successUrl, errorUrl },
      });
      return (data as any)?.data?.bulkConnectLinkForFacebook ?? {};
    },

    /**
     * Disconnect a Google connected account (bulk).
     */
    async disconnectGoogleAccount(
      connectedAccountId: string,
    ): Promise<Record<string, any>> {
      const data = await http.apiPost('connected-accounts/disconnect-google', {
        input: { connectedAccountId },
      });
      return (data as any)?.data?.gmbBulkDisconnect ?? {};
    },

    /**
     * Disconnect a Facebook connected account (bulk).
     */
    async disconnectFacebookAccount(
      connectedAccountId: string,
    ): Promise<Record<string, any>> {
      const data = await http.apiPost('connected-accounts/disconnect-facebook', {
        input: { connectedAccountId },
      });
      return (data as any)?.data?.fbBulkDisconnect ?? {};
    },

    /**
     * Get connected third-party accounts with optional filters.
     */
    async fetchConnectedAccounts(options?: {
      publisher?: string;
      status?: string;
      page?: number;
      perPage?: number;
    }): Promise<Record<string, any>> {
      const params: Record<string, any> = {};
      if (options?.publisher !== undefined) params.publisher = options.publisher;
      if (options?.status !== undefined) params.status = options.status;
      if (options?.page !== undefined) params.page = options.page;
      if (options?.perPage !== undefined) params.perPage = options.perPage;
      const data = await http.apiGet('connected-accounts', params);
      return (data as any)?.data?.connectedAccountsInfo ?? {};
    },

    /**
     * Get detailed information about a specific connected account.
     */
    async fetchConnectedAccountDetails(
      connectedAccountId: string,
    ): Promise<ConnectedAccountDetails> {
      const data = await http.apiGet(
        `connected-accounts/${connectedAccountId}/details`,
      );
      return (data as any)?.data?.connectedAccountDetails ?? {};
    },

    /**
     * Get folders (business groups) under a connected Google account.
     */
    async fetchConnectedAccountFolders(
      connectedAccountId: string,
      options?: { folderName?: string },
    ): Promise<ConnectedAccountFolder[]> {
      const params: Record<string, string> = {};
      if (options?.folderName) params.folderName = options.folderName;
      const data = await http.apiGet(
        `connected-accounts/${connectedAccountId}/folders`,
        params,
      );
      return (data as any)?.data?.getFoldersUnderGoogleAccount ?? [];
    },

    /**
     * Get listings the connected Google/Facebook account has access to.
     */
    async fetchConnectedAccountListings(
      connectedAccountId: string,
      options?: {
        locationInfo?: string;
        page?: number;
        perPage?: number;
      },
    ): Promise<Record<string, any>> {
      const payload: Record<string, any> = { connectedAccountId };
      if (options?.locationInfo !== undefined) payload.locationInfo = options.locationInfo;
      if (options?.page !== undefined) payload.page = options.page;
      if (options?.perPage !== undefined) payload.perPage = options.perPage;
      const data = await http.apiPost(
        'connected-accounts/connected-account-listings',
        payload,
      );
      return (data as any)?.data?.connectedAccountListings ?? {};
    },

    /**
     * Get suggested matches between a connected account's listings and listingsAPI locations.
     */
    async fetchConnectionSuggestions(
      connectedAccountId: string,
      options?: { page?: number; perPage?: number },
    ): Promise<Record<string, any>> {
      const params: Record<string, any> = {};
      if (options?.page !== undefined) params.page = options.page;
      if (options?.perPage !== undefined) params.perPage = options.perPage;
      const data = await http.apiGet(
        `connected-accounts/${connectedAccountId}/connection-suggestions`,
        params,
      );
      return (data as any)?.data?.connectionSuggestionsForAccount ?? {};
    },

    /**
     * Trigger matching of Google/Facebook profile locations to listingsAPI locations.
     */
    async triggerConnectedAccountMatches(
      connectedAccountIds: string[],
    ): Promise<Record<string, any>> {
      const data = await http.apiPost('connected-accounts/trigger-matches', {
        input: { connectedAccountIds },
      });
      return (data as any)?.data?.connectedAccountsTriggerMatches ?? {};
    },

    /**
     * Confirm suggested matches between connected account listings and listingsAPI locations.
     */
    async confirmConnectedAccountMatches(
      matchRecordIds: string[],
    ): Promise<Record<string, any>> {
      const data = await http.apiPost('connected-accounts/confirm-matches', {
        input: { matchRecordIds },
      });
      return (data as any)?.data?.confirmConnectMatches ?? {};
    },

    /**
     * Link a listingsAPI location to a listing from a connected Google/Facebook account.
     */
    async connectListing(
      locationId: string | number,
      connectedAccountListingId: string,
      connectedAccountId: string,
    ): Promise<Record<string, any>> {
      const data = await http.apiPost('connected-accounts/connect-listing', {
        input: {
          locationId: http.encodeLocationId(locationId),
          connectedAccountListingId,
          connectedAccountId,
        },
      });
      return (data as any)?.data?.connectListing ?? {};
    },

    /**
     * Unlink a location from its Google or Facebook listing.
     */
    async disconnectListing(
      locationId: string | number,
      site: string,
    ): Promise<Record<string, any>> {
      const data = await http.apiPost('connected-accounts/disconnect-listing', {
        input: {
          locationId: http.encodeLocationId(locationId),
          site: site.toUpperCase(),
        },
      });
      return (data as any)?.data?.disconnectConnectedAccountsLocations ?? {};
    },

    /**
     * Create a Google Business Profile listing for an existing listingsAPI location.
     */
    async createGmbListing(
      locationId: string | number,
      connectedAccountId: string,
      options?: { folderId?: string },
    ): Promise<Record<string, any>> {
      const payload: Record<string, any> = {
        locationId: http.encodeLocationId(locationId),
        connectedAccountId,
      };
      if (options?.folderId) payload.folderId = options.folderId;
      const data = await http.apiPost('locations/create/gmb-listing', {
        input: payload,
      });
      return (data as any)?.data?.createGmbListingForLocation ?? {};
    },
  };
}
