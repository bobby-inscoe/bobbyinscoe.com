# Synthetic collector

This Node entry point prepares contract-v1 ingest requests in memory. It has no sender, credentials, file input, URL-fetch option, mail intake or model integration. Its only executor produces authored fictional observations at `https://example.invalid`. Pending and disabled candidates have no executor and no live coverage.

Build with `vite build --config tools/house-scanner/vite.config.ts`, then run `node .house-scanner-build/collector.mjs`. The default mode is fixture and dry. `--source` can demonstrate permission rejection, but cannot enable a real source. `--mode` accepts only `fixture`.

Replay inputs are explicit: `--at`, `--run-id` and `--batch-id`. Defaults are fixed for reproducibility, not fresh publication IDs. Use the same options only when replaying the same run; assign new UUIDs for a distinct run. The fixture policy review window is fixed and expiration fails closed. No request is signed or sent; this output cannot establish server acceptance or activation.

The planner accepts up to 20 profile projections, uses enabled-profile geography/type unions, and reports requested price caps and gaps. It keeps numeric restrictions local because native filter semantics remain unverified. It includes unknown-price and upcoming paths explicitly. Partitions are planned, never claimed completed. No household, actor or recipient fields enter ingest requests.

Fixture collection has a 100-observation ceiling and 256 KiB ceiling per prepared request. Source identity includes source ID, source listing ID and episode. Prices compare only within that identity, in observation-time order. Equal-time contradictions and explicit price conflicts break comparability, as do unknown prices. Repeated known values retain the latest meaningful previous price. History begins at the first supplied observation; this utility does not claim complete historical pricing.

Static checks cover syntax, types and bundling. Behavioral, permission-denial and replay verification remain pending user authorization. Keep generated `.house-scanner-build/` output ignored and out of Pages assets.

## Boneo reader (pending source)

`boneo-parser.ts` turns a public Boneo search page into contract observations from the embedded `__NEXT_DATA__` JSON. `boneo-live.ts` is the guarded fetcher. The registry entry is `pending`, not approved: approval is an operator step in the database, so nothing here publishes anything. The household owner chose to read public pages for personal use at their own judgment; that is recorded in the policy rights basis and is not a reuse license.

Live use needs all three flags: `--live --source=boneo --confirm-personal-read`. Without them the CLI refuses and stays fixture-only. `--mode live` is still rejected. A live run reads robots.txt first and refuses a disallowed path, sends `HouseScannerPersonalReader/0.1 (private household tool)`, waits 2 seconds between requests, reads at most 5 pages per partition and makes at most 30 requests per run including robots.txt. It sends no cookies and handles no login or CAPTCHA. Any non-200 (including 403 and 429), redirect, network error, timeout or page without embedded data stops the whole run with no retry. A page without embedded data is failed coverage, not an empty result. Output is counts, statuses and partition names; listing values are never logged, saved or printed.

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
