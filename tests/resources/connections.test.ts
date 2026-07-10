import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ListingsAPI } from '../../src/client.js';

function mockFetch(responseBody: any) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => responseBody,
    text: async () => JSON.stringify(responseBody),
  } as Response);
}

describe('Connections', () => {
  let client: ListingsAPI;

  beforeEach(() => {
    client = new ListingsAPI({ apiKey: 'test-key' });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getOauthConnectUrl', () => {
    it('should get oauth connect URL with encoded location ID', async () => {
      const mockResult = { url: 'https://connect.example.com' };
      const spy = mockFetch({ data: { connectUrl: mockResult } });

      const result = await client.getOauthConnectUrl(
        16808, 'GOOGLE', 'https://ok.com', 'https://err.com',
      );

      expect(result).toEqual(mockResult);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/locations/oauth_connect_url');
      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.input.locationId).toBe(btoa('Location:16808'));
      expect(body.input.site).toBe('GOOGLE');
      expect(body.input.successUrl).toBe('https://ok.com');
      expect(body.input.errorUrl).toBe('https://err.com');
    });

    it('should return empty object when no data', async () => {
      mockFetch({ data: {} });
      const result = await client.getOauthConnectUrl(16808, 'GOOGLE', 'ok', 'err');
      expect(result).toEqual({});
    });
  });

  describe('oauthDisconnect', () => {
    it('should disconnect oauth for a location', async () => {
      const mockResult = { success: true };
      const spy = mockFetch({ data: { disconnectConnectedAccountsLocations: mockResult } });

      const result = await client.oauthDisconnect(16808, 'FACEBOOK');

      expect(result).toEqual(mockResult);
      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.input.locationId).toBe(btoa('Location:16808'));
      expect(body.input.site).toBe('FACEBOOK');
    });
  });

  describe('connectGoogleAccount', () => {
    it('should get bulk Google connect URL', async () => {
      const mockResult = { url: 'https://google.connect.com' };
      const spy = mockFetch({ data: { bulkConnectLinkForGoogle: mockResult } });

      const result = await client.connectGoogleAccount('https://ok.com', 'https://err.com');

      expect(result).toEqual(mockResult);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/connected-accounts/connect-google');
      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.input.successUrl).toBe('https://ok.com');
      expect(body.input.errorUrl).toBe('https://err.com');
    });
  });

  describe('connectFacebookAccount', () => {
    it('should get bulk Facebook connect URL', async () => {
      const mockResult = { url: 'https://facebook.connect.com' };
      const spy = mockFetch({ data: { bulkConnectLinkForFacebook: mockResult } });

      const result = await client.connectFacebookAccount('https://ok.com', 'https://err.com');

      expect(result).toEqual(mockResult);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/connected-accounts/connect-facebook');
    });
  });

  describe('disconnectGoogleAccount', () => {
    it('should disconnect a Google connected account', async () => {
      const mockResult = { success: true };
      const spy = mockFetch({ data: { gmbBulkDisconnect: mockResult } });

      const result = await client.disconnectGoogleAccount('acc-123');

      expect(result).toEqual(mockResult);
      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.input.connectedAccountId).toBe('acc-123');
    });
  });

  describe('disconnectFacebookAccount', () => {
    it('should disconnect a Facebook connected account', async () => {
      const mockResult = { success: true };
      const spy = mockFetch({ data: { fbBulkDisconnect: mockResult } });

      const result = await client.disconnectFacebookAccount('acc-456');

      expect(result).toEqual(mockResult);
      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.input.connectedAccountId).toBe('acc-456');
    });
  });

  describe('fetchConnectedAccounts', () => {
    it('should fetch connected accounts with filters', async () => {
      const mockResult = { accounts: [{ id: 'a1' }] };
      const spy = mockFetch({ data: { connectedAccountsInfo: mockResult } });

      const result = await client.fetchConnectedAccounts({
        publisher: 'google', page: 1, perPage: 50,
      });

      expect(result).toEqual(mockResult);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/connected-accounts');
      expect(url).toContain('publisher=google');
      expect(url).toContain('page=1');
      expect(url).toContain('perPage=50');
    });

    it('should fetch connected accounts without filters', async () => {
      mockFetch({ data: { connectedAccountsInfo: {} } });
      const result = await client.fetchConnectedAccounts();
      expect(result).toEqual({});
    });
  });

  describe('fetchConnectedAccountDetails', () => {
    it('should fetch details of a connected account', async () => {
      const mockResult = { id: 'a1', email: 'test@gmail.com' };
      const spy = mockFetch({ data: { connectedAccountDetails: mockResult } });

      const result = await client.fetchConnectedAccountDetails('3db66afa');

      expect(result).toEqual(mockResult);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/connected-accounts/3db66afa/details');
    });
  });

  describe('fetchConnectedAccountFolders', () => {
    it('should fetch folders under a connected account', async () => {
      const mockFolders = [{ id: 'f1', name: 'Downtown' }];
      const spy = mockFetch({ data: { getFoldersUnderGoogleAccount: mockFolders } });

      const result = await client.fetchConnectedAccountFolders('acc-123', {
        folderName: 'Downtown',
      });

      expect(result).toEqual(mockFolders);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/connected-accounts/acc-123/folders');
      expect(url).toContain('folderName=Downtown');
    });

    it('should return empty array when no folders', async () => {
      mockFetch({ data: {} });
      const result = await client.fetchConnectedAccountFolders('acc-123');
      expect(result).toEqual([]);
    });
  });

  describe('fetchConnectedAccountListings', () => {
    it('should fetch listings for a connected account', async () => {
      const mockResult = { records: [{ id: 'l1' }], pageInfo: {} };
      const spy = mockFetch({ data: { connectedAccountListings: mockResult } });

      const result = await client.fetchConnectedAccountListings('acc-123', {
        locationInfo: '123 William', page: 1, perPage: 100,
      });

      expect(result).toEqual(mockResult);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/connected-accounts/connected-account-listings');
      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.connectedAccountId).toBe('acc-123');
      expect(body.locationInfo).toBe('123 William');
      expect(body.page).toBe(1);
      expect(body.perPage).toBe(100);
    });
  });

  describe('fetchConnectionSuggestions', () => {
    it('should fetch connection suggestions', async () => {
      const mockResult = { records: [{ id: 'm1' }] };
      const spy = mockFetch({ data: { connectionSuggestionsForAccount: mockResult } });

      const result = await client.fetchConnectionSuggestions('acc-123', {
        page: 1, perPage: 50,
      });

      expect(result).toEqual(mockResult);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/connected-accounts/acc-123/connection-suggestions');
      expect(url).toContain('page=1');
      expect(url).toContain('perPage=50');
    });
  });

  describe('triggerConnectedAccountMatches', () => {
    it('should trigger matches for connected accounts', async () => {
      const mockResult = { success: true };
      const spy = mockFetch({ data: { connectedAccountsTriggerMatches: mockResult } });

      const result = await client.triggerConnectedAccountMatches(['acc-1', 'acc-2']);

      expect(result).toEqual(mockResult);
      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.input.connectedAccountIds).toEqual(['acc-1', 'acc-2']);
    });
  });

  describe('confirmConnectedAccountMatches', () => {
    it('should confirm matches', async () => {
      const mockResult = { success: true };
      const spy = mockFetch({ data: { confirmConnectMatches: mockResult } });

      const result = await client.confirmConnectedAccountMatches(['match-1']);

      expect(result).toEqual(mockResult);
      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.input.matchRecordIds).toEqual(['match-1']);
    });
  });

  describe('connectListing', () => {
    it('should connect a listing with encoded location ID', async () => {
      const mockResult = { success: true };
      const spy = mockFetch({ data: { connectListing: mockResult } });

      const result = await client.connectListing(73933, 'R21iQnVsa0...', '3db66afa');

      expect(result).toEqual(mockResult);
      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.input.locationId).toBe(btoa('Location:73933'));
      expect(body.input.connectedAccountListingId).toBe('R21iQnVsa0...');
      expect(body.input.connectedAccountId).toBe('3db66afa');
    });
  });

  describe('disconnectListing', () => {
    it('should disconnect a listing', async () => {
      const mockResult = { success: true };
      const spy = mockFetch({ data: { disconnectConnectedAccountsLocations: mockResult } });

      const result = await client.disconnectListing(16808, 'GOOGLE');

      expect(result).toEqual(mockResult);
      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.input.locationId).toBe(btoa('Location:16808'));
      expect(body.input.site).toBe('GOOGLE');
    });
  });

  describe('createGmbListing', () => {
    it('should create a GMB listing with folderId', async () => {
      const mockResult = { success: true };
      const spy = mockFetch({ data: { createGmbListingForLocation: mockResult } });

      const result = await client.createGmbListing(14055, 'bc818dc7', {
        folderId: 'accounts/123',
      });

      expect(result).toEqual(mockResult);
      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.input.locationId).toBe(btoa('Location:14055'));
      expect(body.input.connectedAccountId).toBe('bc818dc7');
      expect(body.input.folderId).toBe('accounts/123');
    });

    it('should create a GMB listing without folderId', async () => {
      const spy = mockFetch({ data: { createGmbListingForLocation: { success: true } } });

      await client.createGmbListing(14055, 'bc818dc7');

      const body = JSON.parse((spy.mock.calls[0][1] as any).body);
      expect(body.input.locationId).toBe(btoa('Location:14055'));
      expect(body.input.connectedAccountId).toBe('bc818dc7');
      expect(body.input.folderId).toBeUndefined();
    });
  });
});
