# Synthetic collector

This Node entry point prepares contract-v1 ingest requests in memory. In fixture mode it has no sender, credentials, file input, URL-fetch option, mail intake or model integration (live reading and sending are described under the Boneo reader below). Its only executor produces authored fictional observations at `https://example.invalid`. Pending and disabled candidates have no executor and no live coverage.

Build with `vite build --config tools/house-scanner/vite.config.ts`, then run `node .house-scanner-build/collector.mjs`. The default mode is fixture and dry. `--source` can demonstrate permission rejection, but cannot enable a real source. `--mode` accepts only `fixture`.

Replay inputs are explicit: `--at`, `--run-id` and `--batch-id`. Defaults are fixed for reproducibility, not fresh publication IDs. Use the same options only when replaying the same run; assign new UUIDs for a distinct run. The fixture policy review window is fixed and expiration fails closed. No request is signed or sent; this output cannot establish server acceptance or activation.

The planner accepts up to 20 profile projections, uses enabled-profile geography/type unions, and reports requested price caps and gaps. It keeps numeric restrictions local because native filter semantics remain unverified. It includes unknown-price and upcoming paths explicitly. Partitions are planned, never claimed completed. No household, actor or recipient fields enter ingest requests.

A run has a 1000-observation ceiling, a stage request holds at most 100 observations and fixture requests have a 256 KiB ceiling. Source identity includes source ID, source listing ID and episode. Prices compare only within that identity, in observation-time order. Equal-time contradictions and explicit price conflicts break comparability, as do unknown prices. Repeated known values retain the latest meaningful previous price. History begins at the first supplied observation; this utility does not claim complete historical pricing.

Static checks cover syntax, types and bundling. Behavioral, permission-denial and replay verification remain pending user authorization. Keep generated `.house-scanner-build/` output ignored and out of Pages assets.

## Boneo reader (pending source)

`boneo-parser.ts` turns a public Boneo search page into contract observations from the embedded `__NEXT_DATA__` JSON. `boneo-live.ts` is the guarded fetcher. The registry entry is `pending`, not approved: approval is an operator step in the database, so nothing here publishes anything. The household owner chose to read public pages for personal use at their own judgment; that is recorded in the policy rights basis and is not a reuse license.

Live use needs all three flags: `--live --source=boneo --confirm-personal-read`, plus `--profiles <file>` (below). Without them the CLI refuses and stays fixture-only. `--mode live` is still rejected. A live run reads robots.txt first and refuses a disallowed path, sends `HouseScannerPersonalReader/0.1 (private household tool)`, waits 2 seconds between requests, reads at most 40 pages per partition (25 results per page) and makes at most 250 requests per run including robots.txt. It sends no cookies and handles no login or CAPTCHA. Any non-200 (including 403 and 429), redirect, network error, timeout or page without embedded data on a search page stops the whole run with no retry. A page without embedded data is failed coverage, not an empty result. Output is counts, statuses and partition names; listing values are never logged, saved or printed.

### Profiles file, pre-filter and sending

`--profiles <path>` names a private JSON file that is never committed. It holds an array of enabled-or-disabled profiles: `id` and `revision` must match the household's profile rows, because the ingest function rejects a run whose profile versions differ from the enabled profiles it stores. `criteria` is checked with the same `criteriaSchema` the app uses. The collector reads the municipalities from it. Fictional example:

```json
[
  {
    "id": "00000000-0000-4000-8000-0000000000aa",
    "revision": 1,
    "enabled": true,
    "criteria": {
      "minAreaM2": 60,
      "maxAreaM2": 110,
      "minRooms": 2,
      "preferredPriceSek": 4000000,
      "stretchPriceSek": 4500000,
      "propertyTypes": ["apartment"],
      "excludeGroundFloor": false,
      "requireLift": false,
      "requireOutdoor": false,
      "preferGlazing": false,
      "feeReferenceSek": 5000,
      "geography": { "municipalities": ["Göteborg"], "center": [11.97, 57.71], "radiusKm": 10 },
      "nature": { "preferImmediateGreenery": false, "preferredWalkMinutes": 10 },
      "transit": { "preferredWalkMinutes": 10, "preferredJourneyMinutes": 30, "tradeoffJourneyMinutes": 45 }
    }
  }
]
```

Before staging, an observation is dropped only when it is confirmed to fail every enabled profile: living area below `minAreaM2`, rooms below `minRooms`, asking price above `stretchPriceSek`, or a property type outside `propertyTypes`. Unknown or conflicting values always pass, an absent price is unknown and bounds are inclusive. The summary prints `droppedByReason` counts only. The run ceiling is applied before this filter.

After the filter, each kept listing's own page is read (same guards, same 2 second gap, robots check on the exact path) for balcony, terrace and glazing, at most 150 pages per run. `property_detail.field_property_balcony` and `field_property_terrace` give `outdoor`: both true is `both`, one true is `balcony` or `terrace`, anything else is unknown, never `none`, because the broker may leave a box unticked. `glazed` is `true` only when `property_detail.body` says a glazed balcony, terrace or conservatory in Swedish ("inglasad balkong") and not "ej inglasad"; otherwise unknown. The text is matched and dropped. A listing page that returns a non-200 other than 403 or 429, has no embedded data or has an unexpected shape leaves that listing's two facts unknown and is counted in `detailFailed`; 403, 429, a network error or a timeout still stops the run. Listings past the 150 page cap, past the request cap or disallowed by robots.txt count in `detailSkipped`. The summary prints `detailRead`, `detailFailed` and `detailSkipped`. Floor, lift and build year are not collected.

Sending needs `--send --confirm-send` on top of the live flags, and these environment variables:

- `HS_INGEST_URL`: `https` and ending in `/functions/v1/house-scanner-ingest` (`http://localhost` is allowed for a local stack).
- `HS_INGEST_KEY_ID`: the issued key id.
- `HS_INGEST_SECRET`: at least 32 characters. It is never printed or logged.

Requests go out in order (begin, stage in batches of at most 100, publish), each signed with HMAC-SHA256 over the method, path, timestamp, nonce and body digest, as the function verifies. The first non-2xx response, network error or timeout stops the run. Nothing is retried, because a retry would need a new nonce and the first attempt may have landed; the printed status tells the operator what to check. A stopped or truncated source run still publishes `partial` or `failed`, never `success`. The summary prints status codes and counts only and exits 1 when delivery stopped.

What was confirmed on 13 October 2026 from one search page and one beyond-the-end page:

- The page embeds `props.pageProps.listData.pData` and `count`. `count` is the total result count: `?page=2` kept `count` and returned no items.
- Price fields are numbers and the other-currency field was `SEK` where set. SEK is inferred, and any other currency makes the price unknown with a conflict.
- Coordinates are `{lon, lat}`, as numbers in most items and numeric strings in one. Precision is not stated, so it is recorded as `approximate_area`.
- The status field held `Till salu` on every returned item. Facet labels list `Kommande`, `Kommande-light`, `Removed from API` and `Såld`, and the facet counted upcoming homes that the default view did not return.

Unproven, and recorded as gaps in the registry entry:

- Page size and multi-page ordering. The page query is accepted, but no result set larger than one page was seen, so coverage is never reported complete and a run publishes `partial` or `failed`, never `success`.
- How to query upcoming inventory, and whether listings without a price appear in the default view.
- The municipality level path. Only the district path was observed; the municipality path is derived by dropping its last segment. A wrong guess fails as a page without embedded data.
- Houses (the apartment path segment is the only one known), municipalities other than Göteborg, and whether `created_date` is stable enough to serve as an episode across relistings.
- The `field_status_id` meanings other than `Till salu`, taken from facet labels only.

Fixtures under `fixtures/boneo/` are synthetic: invented addresses, prices and ids in the observed key shape, with case-colliding keys, a missing price, an upcoming status, a null coordinate, a non-active item, an off-origin link and a page with no embedded data. No real listing data or captured page is committed.
