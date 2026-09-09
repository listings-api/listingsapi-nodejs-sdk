# Changelog

## 0.3.2

Fixes for request bodies, response keys, error reporting, and the retry policy.

### Changed

- **Writes are no longer retried automatically.** `maxRetries` now applies to
  reads only (GET/HEAD/OPTIONS); a POST or DELETE is sent exactly once and any
  429/5xx surfaces immediately. The API has no `Idempotency-Key` support, so a
  retried write that had actually succeeded could publish a duplicate post or
  create a duplicate location. The `maxRetries` option is unchanged — it just
  governs reads now. Retry a failed write yourself only when you can tolerate
  or detect a duplicate. This matches the Python SDK.

### Fixed

- **Post creation now works.** `createPost`, `createAnnouncement`,
  `createEvent`, `createOffer`, and `bulkPublish` sent their fields at the top
  level of the request body. The API expects them wrapped in an `input` object,
  so every post creation failed with `400 $input ... was not provided`. The
  fields are now wrapped for you; the options objects are unchanged, and
  `createPost` still takes a flat field object.
- **`bulkPublish` reads the right response key.** It looked for
  `createBulkSocialPost`, which the API never returns; the payload is under
  `createSocialPost`. The method resolved to an empty object on success.
- **`fetchLocationPosts` no longer sends `tag`.** `GET
  /locations/{id}/posts` rejects a tag, so the call always errored.
  `options.tag` is still accepted for backwards compatibility but is not sent —
  use `fetchLocationBulkPosts` when you need tag filtering.
- **`fetchLocationPosts` reads the right response key** (`postsByLocation`, not
  `rollupSocialPosts`). `fetchLocationBulkPosts` is unchanged: that route really
  does return `rollupSocialPosts`.
- **Errors now carry `errors[]` and `code`.** Every non-2xx threw with
  `errors: []` and `code: null` because the response body was kept as text but
  never parsed. Both platform shapes are now parsed: the `errors[]` envelope
  and the singular `{ error: { code, message, ... } }` object used for 429s and
  some 4xx, plus a bare `{ message, code }` body.
- **`SYxxxxx:` message prefixes are split into `code`.** The platform embeds
  error codes in the message ("SY90005: Invalid Token"); `code` is now populated
  from the prefix when no separate `code` field is present, matching the Python
  SDK.
- **Mutation-level errors attach the raw response body.** A mutation reporting
  `success: false` or `errors[]` threw with `responseBody: null`; it now carries
  the body the API actually sent, as does the HTTP-200 top-level-errors path
  (which previously re-serialized just the parsed entries).
- **`starLocationPhotos` sends `photoIds`.** It sent `mediaIds`, which the API
  ignores, so starring and unstarring silently did nothing. The argument itself
  is unchanged.
- **`getOauthConnectUrl` reads the right response key** (`createConnectUrl`, not
  `connectUrl`), so it no longer resolves to an empty object and drops the
  connect URL.
