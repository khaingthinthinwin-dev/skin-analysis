# Order Insights Module

Read-only merchant sales and revenue summaries (`BR-OI-007`). This Nest module is **not** registered in `AppModule` until the import below is added.

## Endpoints

Global prefix `api/v1` is applied in `main.ts`.

| Method | Path                                              | Roles                        |
| ------ | ------------------------------------------------- | ---------------------------- |
| `GET`  | `/api/v1/order-insights/merchant/sales-summary`   | merchant, admin, super_admin |
| `GET`  | `/api/v1/order-insights/merchant/revenue-summary` | merchant, admin, super_admin |

Optional query `merchantId` is honoured for **admin / super_admin** only. Merchant callers always use the shop resolved from the JWT (`BR-OI-001`). Admin callers who omit `merchantId` aggregate **all** platform orders (`BR-OI-004`).

Sales response: `{ salesSummary: { todayCount, thisMonthCount, completedCount } }`.

Revenue money fields and `commissionRate` are 2-decimal strings. `orderCount` is a number. `period.from` / `period.to` are inclusive `YYYY-MM-DD` (UTC).

## Cache

TTL: `OI_SUMMARY_CACHE_TTL_SECONDS` (default **300**), via `ORDER_INSIGHTS_CONFIG.summaryCacheTtlSeconds`.

| Key                                                            | When            |
| -------------------------------------------------------------- | --------------- |
| `cache:oi:merchant:{scope}:summary:sales`                      | Sales summary   |
| `cache:oi:merchant:{scope}:summary:revenue:{code}:{from}:{to}` | Revenue summary |

`{scope}` is the merchant UUID, or `all` for an unscoped admin query.

`MerchantSummaryService.invalidateMerchantSummaryCache(merchantId)` SCANs `cache:oi:merchant:{merchantId}:summary:*` and deletes matches. It is **not** wired to checkout or fulfilment (those modules are out of scope).

## Rate limit

`30` requests / user / minute / endpoint. Redis key: `rate:order-insights:{sales-summary\|revenue-summary}:{userId}`. Redis down → allow.

## Known gaps

- **Per-order rate snapshots are not used by the summary.** `orders.commission_rate` exists (`DECIMAL(5,2) NOT NULL DEFAULT 12.00`, written at checkout) and the merchant order list (`GET /orders`) and merchant order detail (`GET /merchant/orders/:id`) expose it per order, but the Revenue Summary aggregates a period that may mix rates, so it keeps resolving a single rate from the latest `commission_settings` row (fallback `'12.00'`) and still sends `commissionRateSource: "current_settings"` / `commissionRateLocked: false` (`BR-OI-023`).
- **Admin `all` cache** is not dropped by `invalidateMerchantSummaryCache` (pattern is per merchant id). Stale all-platform totals expire with TTL.
- **Module registration** requires adding `OrderInsightsModule` to `backend/src/app.module.ts` (not applied in this change).
