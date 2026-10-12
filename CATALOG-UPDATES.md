# Daily wine discovery

This is an open-ended index, not a claim to contain every existing wine. People can register any bottle, whether indexed or not. The bundled records are an offline starting point; live records are merged from D1 on each app load. Records and discovery IDs are retained across imports. Existing member bottles are never modified by a catalog refresh.

## Unattended update

1. Retrieve this Site using `get_site` and confirm it is still owner-private. Obtain its current service bearer using supported Sites access. Never write the bearer to files or logs.
2. Fetch each source page from the public `/products.json?limit=250&page=N` feed in the cloud task. Keep only `title`, `vendor`, `handle`, `product_type`, `tags`, up to two image `src` values, and variant `title`, `price`, and `available` values per product. Do not send full product descriptions. For every origin in `data/catalog-sources.json`, POST JSON `{ "origin": "https://mysa.wine", "page": 1, "products": [/* factual product metadata from that source page */] }` to the published Site's `/api/catalog/refresh`, with `OAI-Sites-Authorization: Bearer <current token>`. Fetch the corresponding next source page and repeat using the returned `nextPage` until `done` is true. Retry a failed page up to twice; never reset the catalog. This is an idempotent data update, with no deployment or DB reset needed.
3. GET `/api/catalog` with the same service authorization. Verify a completed sync for each origin and today’s timestamp. Report failures and partial runs accurately. A newly seen listing is not a confirmed new release date.
4. Research new public producer releases and additional producer/importer/merchant sources. Only add source adapters after verifying data access and schema. Do not guess wine names, release dates, technical details or stock. When source material contains producer information, add concise original, attributed articles to `data/winemakers.json`, with source URL and checked date. These source-code additions require the normal validated Site update workflow; routine catalog imports do not.

## Access boundary

The updater is restricted by this Site's owner-private platform dispatch boundary and `PRIVATE_CATALOG_UPDATER=enabled`. Signed-in non-admins are rejected. Service access does not grant permission to private member records. Before making this Site shared or public, disable the unattended updater or replace its authorization with a scoped service credential. Never publish the private updater unchanged to a public audience.

No private tasting notes, user profile data, or emails are sent to catalog sources. Daily refreshes import factual metadata; personal recommendations must be based on user experience, never retailer flavor scores.

Merchant prices retain their configured source currency and check date. Import only available single-bottle variants, never bundle prices. Missing prices stay unknown. Price comparisons exclude stale offers and use dated reference exchange rates when needed.
