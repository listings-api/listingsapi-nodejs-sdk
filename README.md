# listingsAPI Node.js SDK

[![npm](https://img.shields.io/npm/v/listingsapi-js)](https://www.npmjs.com/package/listingsapi-js)
[![Node](https://img.shields.io/badge/node-18%2B-blue)](https://www.npmjs.com/package/listingsapi-js)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

The official Node.js SDK for [listingsAPI](https://www.listingsapi.com): business listings, reviews, posts, and analytics for local marketing, in one typed client.

```ts
import { ListingsAPI } from 'listingsapi-js';

const client = new ListingsAPI(); // reads LISTINGSAPI_KEY from env

const { locations } = await client.fetchAllLocations({ first: 10 });
for (const location of locations) {
  console.log(location.name, location.city);
}
```

Full API reference and guides: [docs.listingsapi.com](https://docs.listingsapi.com)

## Contents

- [Installation](#installation)
- [Authentication](#authentication)
- [Quickstart](#quickstart)
- [Locations](#locations)
- [Posts](#posts)
- [Reviews](#reviews)
- [Listings](#listings)
- [Analytics](#analytics)
- [Photos](#photos)
- [Connected accounts](#connected-accounts)
- [Supporting APIs](#supporting-apis)
- [Method reference](#method-reference)
- [Error handling](#error-handling)
- [Configuration](#configuration)
- [TypeScript](#typescript)
- [Development](#development)

## Installation

```bash
npm install listingsapi-js
```

Requires Node 18+ (uses the built-in `fetch`). Zero runtime dependencies. Ships ESM and CJS with bundled TypeScript types.

```ts
// ESM
import { ListingsAPI } from 'listingsapi-js';

// CommonJS
const { ListingsAPI } = require('listingsapi-js');
```

## Authentication

Get an API key from your [listingsAPI dashboard](https://listingsapi.com/dashboard/api-keys) and export it:

```bash
export LISTINGSAPI_KEY="your-api-key"
```

```ts
const client = new ListingsAPI();                        // reads LISTINGSAPI_KEY
const client = new ListingsAPI({ apiKey: 'your-key' });  // or pass it explicitly
```

## Quickstart

```ts
import { ListingsAPI } from 'listingsapi-js';

const client = new ListingsAPI();

// Page through locations
const page = await client.fetchAllLocations({ first: 50 });
console.log(page.locations.length, page.pageInfo.hasNextPage);

// Or fetch everything at once
const all = await client.fetchAllLocations({ fetchAll: true });

// Reply to a review
await client.respondToReview('interaction-uuid', 'Thank you!');
```

## Locations

```ts
// List, search, and fetch
const page = await client.fetchAllLocations({ first: 25 });
const next = await client.fetchAllLocations({ first: 25, after: page.pageInfo.endCursor });
const results = await client.searchLocations('cafe', { first: 20 });
const byIds = await client.fetchLocationsByIds([16808, 16749]);
const byCodes = await client.fetchLocationsByStoreCodes(['STORE01', 'STORE02']);

// Create (name, a 200+ character description, subCategoryId, countryIso,
// and city are required by the API)
const created = await client.createLocation({
  name: 'Acme Dental',
  description: 'Acme Dental is a family-owned dental practice...', // 200+ chars
  subCategoryId: 1432,
  countryIso: 'US',
  city: 'New York',
  street: '123 Jump Street',
  postalCode: '10013',
  phone: '6443859313',
});

// Update and lifecycle
await client.updateLocation({ id: 16808, phone: '5559876543' });
await client.archiveLocations([16808]);
await client.cancelArchiveLocations([16808], 'manual', 'ops@example.com');
```

## Posts

Publish announcements, events, and offers to Google and Facebook.

`bulkPublish()` puts one post on both sites across many locations in one call. It expands your message per site, encodes location IDs, and validates the payload before any network call:

```ts
const result = await client.bulkPublish({
  name: 'Holiday hours',
  locationIds: [16808, 16809, 16810],
  message: 'Open until 10pm through the holidays!',
  mediaUrl: 'https://cdn.example.com/holiday.jpg',
  ctaType: 'LEARN_MORE',
  ctaUrl: 'https://example.com/holiday-hours',
});
console.log(result.socialPost.id, result.socialPost.status); // INPROGRESS, publishes async
```

Pass an object as `message` for per-site copy: `{ GOOGLE: '...', FACEBOOK: '...' }`. `sites` defaults to both.

Typed creates for single campaigns:

```ts
await client.createAnnouncement({
  name: 'Grand Opening',
  locationIds: [16808],
  message: 'We are now open!',
  sites: ['GOOGLE'],
  ctaType: 'LEARN_MORE',
  ctaUrl: 'https://example.com/opening',
});

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
```

Read, monitor, and delete:

```ts
const post = await client.fetchPost('U29jaWFsUG9zdDo0NDEyMg==');
const posts = await client.fetchLocationPosts(16808, { page: 1, perPage: 10 });
const bulk = await client.fetchBulkPost('QnVsa1Bvc3Q6OTk=');
const campaigns = await client.fetchLocationBulkPosts(16808);
await client.deletePost('U29jaWFsUG9zdDo0NDEyMg==');
```

Publishing is asynchronous: creates return `status: INPROGRESS`; poll `fetchPost()` until `SUCCESS` and check `publishDetails[].submissionError` for per-site failures.

## Reviews

```ts
const reviews = await client.fetchInteractions(16808, { first: 20 });
await client.respondToReview('interaction-uuid', 'Thank you!');
await client.editReviewResponse('review-id', 'response-id', 'Updated reply');
await client.archiveReviewResponse('response-id');

const overview = await client.fetchReviewAnalyticsOverview(16808, { startDate: '2024-01-01' });
const timeline = await client.fetchReviewAnalyticsTimeline(16808);
const sites = await client.fetchReviewAnalyticsSitesStats(16808);
const phrases = await client.fetchReviewPhrases(['TG9jYXRpb246MTY4MDg='], { startDate: '2024-01-01' });
```

## Listings

```ts
const premium = await client.fetchPremiumListings(16808);
const voice = await client.fetchVoiceListings(16808);

const dupes = await client.fetchDuplicateListings(16808);
await client.markListingsAsDuplicate(16808, ['listing-item-id']);
await client.markListingsAsNotDuplicate(16808, ['listing-item-id']);

await client.connectListing(16808, 'listing-id', 'account-id');
await client.disconnectListing(16808, 'GOOGLE');
```

## Analytics

```ts
const google = await client.fetchGoogleAnalytics(16808, { fromDate: '2024-01-01' });
const bing = await client.fetchBingAnalytics(16808);
const facebook = await client.fetchFacebookAnalytics(16808);
```

## Photos

```ts
const photos = await client.fetchLocationPhotos(16808);
await client.addLocationPhotos(16808, [{ photo: 'https://example.com/img.jpg', type: 'ADDITIONAL' }]);
await client.removeLocationPhotos(16808, ['photo-id']);
await client.starLocationPhotos(16808, ['media-id'], true);
const status = await client.fetchPhotoUploadStatus('request-id');
```

## Connected accounts

```ts
const accounts = await client.fetchConnectedAccounts();
const url = await client.connectGoogleAccount('https://ok.com', 'https://err.com');
await client.disconnectGoogleAccount('account-id');

// OAuth for a single location
const oauthUrl = await client.getOauthConnectUrl(16808, 'GOOGLE', 'https://ok.com', 'https://err.com');
await client.oauthDisconnect(16808, 'FACEBOOK');
```

## Supporting APIs

```ts
const sites = await client.fetchPlanSites();       // directories included in your plan
const countries = await client.fetchCountries();   // supported countries and states
const subs = await client.fetchSubscriptions();    // active subscriptions
```

## Method reference

### Supporting APIs

| Method | Description |
|--------|-------------|
| `fetchPlanSites()` | Directories included in your plan |
| `fetchCountries()` | Supported countries and states (ISO codes) |
| `fetchSubscriptions()` | Active subscriptions for the account |

### Locations

| Method | Description |
|--------|-------------|
| `fetchAllLocations(opts)` | List locations (paginated, or `fetchAll: true`) |
| `fetchLocationsByIds(ids)` | Fetch specific locations by ID |
| `fetchLocationsByStoreCodes(codes)` | Fetch locations by store code |
| `searchLocations(query, opts)` | Search by name, address, or store ID |
| `createLocation(data)` | Create a location (flat camelCase payload) |
| `updateLocation(data)` | Update fields on a location (pass `id` plus changes) |
| `archiveLocations(ids)` | Archive locations |
| `cancelArchiveLocations(ids, scope, changedBy)` | Cancel a pending archive |

### Posts

| Method | Description |
|--------|-------------|
| `bulkPublish(opts)` | One post to Google and Facebook across many locations |
| `createAnnouncement(opts)` | Create an ANNOUNCEMENT post |
| `createEvent(opts)` | Create an EVENT post with title and date window |
| `createOffer(opts)` | Create an OFFER post with coupon and terms |
| `createPost(body)` | Create from a raw flat payload |
| `fetchPost(postId)` | Get a post with per-site publish status and analytics |
| `deletePost(postId)` | Delete a post from every published site |
| `fetchLocationPosts(locationId, opts)` | List post campaigns for a location |
| `fetchBulkPost(bulkPostId)` | Get a bulk campaign with per-location status |
| `fetchLocationBulkPosts(locationId, opts)` | List bulk campaigns touching a location |

### Reviews

| Method | Description |
|--------|-------------|
| `fetchInteractions(locationId, opts)` | List reviews/interactions with filters |
| `fetchReviewDetails(interactionIds)` | Detailed review data for specific interactions |
| `respondToReview(interactionId, content)` | Reply to a review |
| `editReviewResponse(reviewId, responseId, content)` | Edit a reply |
| `archiveReviewResponse(responseId)` | Archive a reply |
| `fetchReviewSettings(locationId)` | Review notification settings |
| `editReviewSettings(locationId, siteUrls)` | Update notification settings |
| `fetchReviewSiteConfig()` | Review site configuration for the account |
| `fetchReviewPhrases(locationIds, opts)` | Frequently used phrases across reviews |
| `fetchReviewAnalyticsOverview(locationId, opts)` | Review analytics overview |
| `fetchReviewAnalyticsTimeline(locationId, opts)` | Review volume/rating over time |
| `fetchReviewAnalyticsSitesStats(locationId, opts)` | Per-site review stats |

### Listings

| Method | Description |
|--------|-------------|
| `fetchPremiumListings(locationId)` | Premium directory listings |
| `fetchVoiceListings(locationId)` | Voice assistant listings |
| `fetchDuplicateListings(locationId)` | Duplicate listings for a location |
| `fetchAllDuplicateListings(opts)` | Duplicates across all locations |
| `markListingsAsDuplicate(locationId, ids)` | Mark listings as duplicates |
| `markListingsAsNotDuplicate(locationId, ids)` | Unmark duplicates |
| `connectListing(locationId, listingId, accountId)` | Connect a listing to a profile |
| `disconnectListing(locationId, site)` | Disconnect a listing |
| `createGmbListing(locationId, opts)` | Create a Google Business Profile listing |

### Analytics

| Method | Description |
|--------|-------------|
| `fetchGoogleAnalytics(locationId, opts)` | Google Business Profile insights |
| `fetchBingAnalytics(locationId, opts)` | Bing Places insights |
| `fetchFacebookAnalytics(locationId, opts)` | Facebook page insights |

### Photos

| Method | Description |
|--------|-------------|
| `fetchLocationPhotos(locationId)` | List photos for a location |
| `addLocationPhotos(locationId, photos)` | Upload photos by URL |
| `removeLocationPhotos(locationId, photoIds)` | Delete photos |
| `starLocationPhotos(locationId, mediaIds, starred)` | Star or unstar photos |
| `fetchPhotoUploadStatus(requestId)` | Status of a bulk photo upload |

### Connected accounts

| Method | Description |
|--------|-------------|
| `fetchConnectedAccounts(opts)` | List connected Google/Facebook accounts |
| `fetchConnectedAccountDetails(id)` | Account details |
| `fetchConnectedAccountFolders(id, opts)` | Folders/location groups in the account |
| `fetchConnectedAccountListings(opts)` | Listings available in a connected account |
| `fetchConnectionSuggestions(opts)` | Suggested listing-to-location matches |
| `connectGoogleAccount(successUrl, errorUrl)` | Start Google OAuth connect |
| `connectFacebookAccount(successUrl, errorUrl)` | Start Facebook OAuth connect |
| `disconnectGoogleAccount(id)` | Disconnect a Google account |
| `disconnectFacebookAccount(id)` | Disconnect a Facebook account |
| `triggerConnectedAccountMatches(ids)` | Trigger profile-to-location matching |
| `confirmConnectedAccountMatches(matchRecordIds)` | Confirm suggested matches |
| `getOauthConnectUrl(locationId, site, successUrl, errorUrl)` | OAuth connect URL for one location |
| `oauthDisconnect(locationId, site)` | Disconnect one location's profile |

## Error handling

Every SDK error derives from `ListingsAPIError`. API failures throw `APIError` or one of its subclasses, whether the platform reports them as an HTTP status or inside the response body. The platform returns some failures (invalid tokens, mutation validation) as HTTP 200 with an `errors[]` payload, and the SDK throws for those too, so you never have to inspect `success` flags yourself.

```
ListingsAPIError                 base class for everything below
├── APIError                     any failure reported by the API
│   ├── AuthenticationError      401 or invalid-token error payloads
│   ├── PermissionDeniedError    403 or permission error payloads
│   ├── NotFoundError            404
│   ├── ValidationError          400/422, or mutations with success=false / errors[]
│   ├── RateLimitError           429, carries retryAfter
│   └── InternalServerError      5xx, safe to retry
└── APIConnectionError           network failure, nothing reached the API
```

| Property | Meaning |
|---|---|
| `statusCode` | HTTP status of the response (can be 200 for payload-level errors) |
| `code` | First platform error code, e.g. `"SY10005"` |
| `errors` | Every error entry, normalized to `{ code, message, context }` |
| `responseBody` | Raw response text |
| `retryAfter` | Seconds to wait (RateLimitError only) |

```ts
import {
  ListingsAPI,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  APIConnectionError,
} from 'listingsapi-js';

const client = new ListingsAPI();

try {
  await client.bulkPublish({
    name: 'Holiday hours',
    locationIds: [16808],
    message: 'Open late through the holidays!',
  });
} catch (err) {
  if (err instanceof ValidationError) {
    // Thrown client-side for bad input, or by the API (with platform codes)
    for (const e of err.errors) console.error(e.code, e.message);
  } else if (err instanceof AuthenticationError) {
    console.error('Invalid API key. Check LISTINGSAPI_KEY.');
  } else if (err instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${err.retryAfter}s.`);
  } else if (err instanceof APIConnectionError) {
    console.error('Network error. Could not reach the API.');
  } else {
    throw err;
  }
}
```

The client automatically retries 429 and 5xx responses (default 2 attempts, honoring `Retry-After`). A `RateLimitError` means retries were exhausted; back off for `err.retryAfter` seconds before trying again.

## Configuration

```ts
const client = new ListingsAPI({
  apiKey: 'your-api-key',
  baseUrl: 'https://listingsapi.com', // default
  timeout: 300_000,
  maxRetries: 3,
});
```

| Option | Default | Description |
|---|---|---|
| `apiKey` | `LISTINGSAPI_KEY` env var | Your API key |
| `baseUrl` | `https://listingsapi.com` | API host |
| `timeout` | `240000` | Per-request timeout in milliseconds |
| `maxRetries` | `2` | Automatic retries on 429 and 5xx |

## TypeScript

Types are bundled; no separate `@types/` package is needed. All option and response types are exported:

```ts
import type { BulkPublishOptions, Location, PageInfo } from 'listingsapi-js';
```

## Development

```bash
git clone https://github.com/synup/listingsapi-nodejs-sdk.git
cd listingsapi-nodejs-sdk
npm install
npm test          # vitest, fully offline
npm run typecheck
npm run build     # tsup -> dist (ESM + CJS + d.ts)
```

## License

[MIT](LICENSE)
