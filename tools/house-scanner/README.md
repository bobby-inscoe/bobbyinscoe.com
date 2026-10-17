# Synthetic collector

This Node entry point prepares contract-v1 ingest requests in memory. In fixture mode it has no sender, credentials, file input, URL-fetch option, mail intake or model integration (live reading and sending are described under the Boneo reader and the Bjurfors reader below). Its only executor produces authored fictional observations at `https://example.invalid`. Pending and disabled candidates have no executor and no live coverage.

Build with `vite build --config tools/house-scanner/vite.config.ts`, then run `node .house-scanner-build/collector.mjs`. The default mode is fixture and dry. `--source` can demonstrate permission rejection, but cannot enable a real source. `--mode` accepts only `fixture`.

Replay inputs are explicit: `--at`, `--run-id` and `--batch-id`. Defaults are fixed for reproducibility, not fresh publication IDs. Use the same options only when replaying the same run; assign new UUIDs for a distinct run. The fixture policy review window is fixed and expiration fails closed. No request is signed or sent; this output cannot establish server acceptance or activation.

The planner accepts up to 20 profile projections, uses enabled-profile geography/type unions, and reports requested price caps and gaps. It keeps numeric restrictions local because native filter semantics remain unverified. It includes unknown-price and upcoming paths explicitly. Partitions are planned, never claimed completed. No household, actor or recipient fields enter ingest requests.

A run has a 1000-observation ceiling, a stage request holds at most 100 observations and fixture requests have a 256 KiB ceiling. Source identity includes source ID, source listing ID and episode. Prices compare only within that identity, in observation-time order. Equal-time contradictions and explicit price conflicts break comparability, as do unknown prices. Repeated known values retain the latest meaningful previous price. History begins at the first supplied observation; this utility does not claim complete historical pricing.

Static checks cover syntax, types and bundling. Behavioral, permission-denial and replay verification remain pending user authorization. Keep generated `.house-scanner-build/` output ignored and out of Pages assets.

## Boneo reader (pending source)

`boneo-parser.ts` turns a public Boneo search page into contract observations from the embedded `__NEXT_DATA__` JSON. `live-reader.ts` is the guarded fetcher, shared with Bjurfors: pacing, caps, stop rules, run memory and the listing page phase live there once, and `robots.ts` parses and applies `robots.txt`. `live-run.ts` turns a run into begin, stage and publish requests and writes the coverage note. `page-read.ts` holds what both parsers share: the page result types, number helpers and the house-number rule for position precision. `source-adapters.ts` holds what differs per source (search URL, request headers, page readers, hosts). The registry entry is `pending`, not approved: approval is an operator step in the database, so nothing here publishes anything. The household owner chose to read public pages for personal use at their own judgment; that is recorded in the policy rights basis and is not a reuse license.

Live use needs all three flags: `--live --source=boneo --confirm-personal-read`, plus `--profiles <file>` (below). Without them the CLI refuses and stays fixture-only. `--mode live` is still rejected. A live run reads robots.txt first and refuses a disallowed path, sends `HouseScannerPersonalReader/0.1 (private household tool)`, waits between 2 and 4 seconds between requests (`MIN_INTERVAL_MS` 2000 and `MAX_INTERVAL_MS` 4000; each gap is drawn at random per request so a run does not hit the site in lockstep, and the random source is injectable for tests), reads at most 40 pages per partition (25 results per page) and makes at most 250 requests per run including robots.txt. It sends no cookies and handles no login or CAPTCHA. Any non-200 (including 403 and 429), redirect, network error, timeout or page without embedded data on a search page stops the whole run with no retry. A page without embedded data is failed coverage, not an empty result. Output is counts, statuses and partition names; listing values are never logged, saved or printed, apart from the ids and two facts in the run memory below.

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

After the filter, each kept listing's own page is read (same guards, same 2 to 4 second gap, robots check on the exact path) for balcony, terrace, glazing and the floor, at most 150 pages per run. `property_detail.field_property_balcony` and `field_property_terrace` give `outdoor`: both true is `both`, one true is `balcony` or `terrace`, anything else is unknown, never `none`, because the broker may leave a box unticked. `glazed` is `true` only when `property_detail.body` says a glazed balcony, terrace or conservatory in Swedish ("inglasad balkong") and not "ej inglasad"; otherwise unknown. The text is matched and dropped. A listing page that returns a non-200 other than 403 or 429, has no embedded data or has an unexpected shape leaves that listing's two facts unknown and is counted in `detailFailed`; 403, 429, a network error or a timeout still stops the run. Listings past the 150 page cap, past the request cap or disallowed by robots.txt count in `detailSkipped`. The summary prints `detailRead`, `detailCached`, `detailFailed` and `detailSkipped`. Lift and build year are not collected.

### Floor rule (both sources)

`groundFloor` is `false` when the floor number is 2 or higher, because that is above ground under every numbering convention. It is `true` only for an explicit marker (`BV`, `bottenvåning`) or the number 0. Floor 1, a missing value and anything unparseable stay unknown (`null`), since floor 1 can be ground level or one above it. The rule is in `floor.ts`. Boneo reads `property_detail.field_floor` (a string such as "3") and Bjurfors reads Våningsplan ("3 av 5"). Both policies allow `groundFloor`, and the Boneo policy is now revision 4, so the operator re-approves it.

### Run memory and pacing

A live read keeps one small JSON file, `house-scanner.cache.json` in the current directory (the `house-scanner.cache*.json` pattern is gitignored). `--cache <path>` picks another file. The file holds `version`, `lastLiveRunAt` and, per listing id, `readAt` and the facts that listing's page supplied. For Boneo that is `outdoor`, `glazed` and `groundFloor`. For Bjurfors it is also `lift`, `propertyType`, `tenure`, `status`, `baseFeeSek`, `askingPriceSek`, `livingAreaM2`, `rooms` and the home's `latitude` and `longitude`. Entries hold ids, small enums and numbers only: no titles, street addresses, URLs or page text. A Bjurfors id is the listing path, which does name a street, and the coordinates locate the home, so keep this file out of version control like the profiles file. The summary never prints the contents.

- A listing whose page was read less than 7 days ago (`DETAIL_TTL_MS`) is not requested again: its remembered facts are merged and counted in `detailCached`. These listings count toward neither the 150 page cap nor the 250 request cap. Search pages and robots.txt are read on every run. Failed or skipped pages are not remembered.
- A live read refuses to start when the last one began less than 6 hours ago (`MIN_RUN_INTERVAL_MS`). It exits 1 before any request and prints the time left. `--force` skips this check. The start time is written right after the configuration checks and before the first request, so a run that fails or stops still counts.
- Entries older than 30 days are dropped on save, and the file keeps at most 5000 entries. A missing file is empty memory. A corrupt, wrong-version or oversize file (over 2 MiB) is treated as empty, reported as `cacheReset: true` in the summary and replaced on save. Deleting the file also lifts the 6 hour wait, as does `--force`.
- Saving writes a temp file next to the target and renames it, so a failed write leaves the previous file intact. If the final save fails the summary shows `cacheSaved: false`.
- Fixture mode never reads or writes the file, and `--cache` and `--force` are rejected without `--live`.

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

## Bjurfors reader (pending source)

Same guards and the same CLI as Boneo, with `--source=bjurfors`: `--live --source=bjurfors --confirm-personal-read --profiles <file>`. The registry entry is `pending` at revision 1, executor `bjurfors-personal-read`, retention 14 days. The owner reads public search pages for personal use at their own judgment, on the same basis as Boneo. robots.txt for www.bjurfors.se (checked 16 October 2026) allows everything except `/globalassets/ragnar/`, `/contentassets/*.pdf` and one office path. The reader still checks the exact path of every request.

`bjurfors-parser.ts` reads server-rendered HTML. The search page has no embedded JSON, so the parser matches the card markup. Without ordinary `Accept` and `Accept-Language` headers the site answers 200 with an empty body, so the reader sends `text/html,application/xhtml+xml` and `sv-SE,sv;q=0.9,en;q=0.8` beside the honest user agent. An empty or tiny body, or a page without the results list, is failed coverage (`no-results-list`), never an empty result.

- Search URL: `/sv/tillsalu/vastra-gotaland/goteborg` and `?page=N`, 24 cards a page. Göteborg is the only municipality supported. The one search lists apartments and houses.
- Total and paging: the heading `<strong>N</strong> bostäder till salu` is the total (893 on 16 October, 38 pages), so a read ends when the cards received reach it. A page past the end shows an empty list with the same total, which is reported as truncated before the total (`empty-page-before-total`). The total can fall while a run reads as homes sell, so only a page's own cards are checked against it. A full 38 page read plus listing pages fits the 40 page, 1000 observation and 250 request caps.
- Card: `h3.c-object-card__heading > a.c-object-card__link[href]` with `span.c-object-card__city-area` (district, municipality) and `span.c-object-card__address` (street and number, used as the title). `li.c-object-card__meta` cells are recognised by unit: `62 kvm`, `217+40 kvm` (living plus secondary area, inferred from one house), `2 rum` or `2,5 rum`, and `3 250 000 kr`, which is missing on about half the cards. Type and tenure are not on the card. Tags are not read.
- Photo: the `img` src is a 16 by 24 placeholder. The photo comes from `<picture><source data-srcset>`, validated to the exact `/cdn-cgi/image/format=auto,fit=crop,width=320,height=480,quality=80/contentassets/<32 hex>/<name>.jpg?v=<digits>` shape on the same origin. The browser loads it and it is valid for 7 days. One image request without a Referer answered 200 with an avif.
- Identity: the listing path after `/sv/tillsalu/` is `sourceListingId` and the episode is the constant `listed`, because the cards carry no id or date. A relisting of the same home is not told apart. A card that links outside the for-sale listing path, such as a project page, is skipped.
- Pre-filter: area, rooms and price come from the cards, so the pre-filter runs on the cards and only kept listings get a page request. A card does not carry the property type, so houses pass until their page is read; the pre-filter then runs again with the page's type, area and price.
- Listing page: one `RealEstateListing` JSON block (price in `offers.price`, availability, `geo`, floor size, rooms) plus definition lists. The reader takes Utgångspris or the offer price, Boarea (fallback floor size), Antal rum or Rum, Avgift or Avgift/hyra, Typ, Upplåtelseform (Bostadsrätt is cooperative, Friköpt or Äganderätt ownership, Hyresrätt rental), Våningsplan (floor rule above), Balkong and Hiss. Only `Ja` is a fact for Balkong (`balcony`) and Hiss (`lift`). `Nej`, a missing row or anything else is unknown, because it reads like an unticked box. `InStock` is available and `PreOrder` upcoming (inferred). A missing or non-numeric value is unknown, never zero. Glazing is not collected. Descriptions, seller details and all other text are read past and dropped.
- Coordinates: from `geo`. Four of four listings matched an independent geocoder (Nominatim) within 12 m of the street address, so a title with a house number is labelled `address` and any other `approximate_area`. The sample is small.
- Operator steps: `node .house-scanner-build/collector.mjs --print-policy-sql --source=bjurfors --household=<uuid>` prints the approval SQL for the operator to run in the SQL editor. The ingest credential is issued per source, so Bjurfors needs its own key id and secret in `HS_INGEST_KEY_ID` and `HS_INGEST_SECRET` for its run. Boneo's policy must be printed and run again because its revision is now 4.

Fixtures under `fixtures/bjurfors/` are synthetic: fake addresses, values and ids in the same markup shape, with search pages 1 and 2, an empty page, a page missing its total, a blocked page, and listing pages with every field, with missing fields and with the wrong shape. No real listing data, captured page or image is committed.

## Erik Olsson reader (pending source)

`erik-olsson-parser.ts` reads two kinds of page. Photos are off for this source: its terms limit copying, no image host was checked, and the policy names no image origin.

- Search URL: `/municipalities/goteborg-166?tab=homes`, later pages `&page=N` (the adapter's `pageUrl` hook adds the page number to an address that already has a query). Göteborg is the only municipality supported, and the number in the path is the site's own id. The one search lists apartments, houses and villas.
- Cards are server-rendered with Chakra's stable class names: the page title carries the total (`468 bostäder till salu i Göteborg`), every card has a wishlist button, and sixteen cards make a page (about thirty pages). A card's paragraphs are the street (the title), `Type, District, Municipality`, `3 rum • 87.3 m² • 6 000 kr / mån` (a house reads `5 rum • 113 + 58 m² • 121 m² tomt`, a villa has no room count) and the price, or `Inget utropspris`, which is unknown, never zero.
- Pre-market homes (`Underhand`) show no street and have no link, so they are counted and skipped. They were ten of sixteen cards on the first page seen and three of sixteen on the second, so this is the largest coverage gap and is listed in the policy.
- Identity: the number at the end of the listing path is `sourceListingId`; the episode is the constant `listed`.
- Pre-filter: area, rooms and price come from the cards, so only kept homes get a listing-page request, as for Bjurfors.
- Listing page: the facts sit in the framework's streamed data (`self.__next_f.push` string chunks), as a `"home":{...}` object with a numeric id. The reader joins the chunks, finds that object by counting braces outside strings and reads livingSpace, monthlyFee, rooms, price (`startingPrice`), property type, tenure, `floor` and `elevator`, balcony and patio flags, status and the broker's coordinates. Balcony and patio are facts only when `true`; `elevator` counts only as `Yes`; a zero or missing price is unknown; coordinates are dropped when the broker hides the address. Descriptions, broker, image and nearby-place data are read past. Glazing is not collected.
- Operator steps: `node .house-scanner-build/collector.mjs --print-policy-sql --source=erik-olsson --household=<uuid>`, then a credential for this source (`hs.admin_issue_credential`), as for Bjurfors.

Tests use pages authored in `erik-olsson-test-pages.ts` (fictional streets and values in the same markup shape). The parser was also run once against the five pages fetched for the probe, which are not kept in the repository.

### Estimated positions

Kept homes with a house number in the title and no source position are looked up on OpenStreetMap's Nominatim (`geocoder.ts`): honest user agent, 1.5 seconds apart, at most 60 per run, stop on the first error. Answers are cached in `house-scanner.cache-geocode.json` (gitignored by the `house-scanner.cache*.json` pattern): hits for 90 days, misses for 7. The position is stored as `address` with a source that says it is estimated from the address or the street name.
