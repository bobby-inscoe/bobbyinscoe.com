# Synthetic collector

This Node entry point prepares contract-v1 ingest requests in memory. It has no sender, credentials, file input, URL-fetch option, mail intake or model integration. Its only executor produces authored fictional observations at `https://example.invalid`. Pending and disabled candidates have no executor and no live coverage.

Build with `vite build --config tools/house-scanner/vite.config.ts`, then run `node .house-scanner-build/collector.mjs`. The default mode is fixture and dry. `--source` can demonstrate permission rejection, but cannot enable a real source. `--mode` accepts only `fixture`.

Replay inputs are explicit: `--at`, `--run-id` and `--batch-id`. Defaults are fixed for reproducibility, not fresh publication IDs. Use the same options only when replaying the same run; assign new UUIDs for a distinct run. The fixture policy review window is fixed and expiration fails closed. No request is signed or sent; this output cannot establish server acceptance or activation.

The planner accepts up to 20 profile projections, uses enabled-profile geography/type unions, and reports requested price caps and gaps. It keeps numeric restrictions local because native filter semantics remain unverified. It includes unknown-price and upcoming paths explicitly. Partitions are planned, never claimed completed. No household, actor or recipient fields enter ingest requests.

Fixture collection has a 100-observation ceiling and 256 KiB ceiling per prepared request. Source identity includes source ID, source listing ID and episode. Prices compare only within that identity, in observation-time order. Equal-time contradictions and explicit price conflicts break comparability, as do unknown prices. Repeated known values retain the latest meaningful previous price. History begins at the first supplied observation; this utility does not claim complete historical pricing.

Static checks cover syntax, types and bundling. Behavioral, permission-denial and replay verification remain pending user authorization. Keep generated `.house-scanner-build/` output ignored and out of Pages assets.
