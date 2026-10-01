# AI Skin Analysis (Buyer)

Local, self-contained implementation of the AI Skin Analysis feature for buyers.

## Scope

- `POST /api/v1/skin-analysis/upload` — validate + store a facial scan (JPG/PNG/WebP, ≤10MB) on local disk under `uploads/skin-scans/{userId}/`.
- `POST /api/v1/skin-analysis/analyze` — start an analysis (5 scans/day quota per `BR-SKIN-005`), run the inference, mark `PROCESSING → COMPLETED` synchronously.
- `GET /api/v1/skin-analysis/latest` — dashboard summary of the latest completed scan.
- `GET /api/v1/skin-analysis/:id` — full result: conditions, findings, recommendations, mesh overlay.
- `GET /api/v1/skin-analysis/history` — paginated history + summary KPIs.
- `GET /api/v1/skin-analysis/trends` — health/hydration time series (`30d|90d|1y|all`).
- `POST /api/v1/skin-analysis/compare` — side-by-side delta between two completed scans.
- `GET /api/v1/skin-analysis/:id/export` — single clinical report as PDF (`pdfkit`).
- `GET /api/v1/skin-analysis/export-history` — longitudinal PDF report.
- `POST /api/v1/skin-analysis/recommendations/:id/feedback` — helpful/not-helpful vote (upsert).

## Implementation notes

- **AI engine:** local deterministic simulator (`services/ai-gateway.service.ts`). Outputs are seeded from the scan image hash + user id, so identical input reproduces identical results. No external AI calls.
- **Storage:** local disk, DB stores relative `/uploads/...` paths (mirrors the product-image pattern in the catalog module). `main.ts` serves `uploads/` statically at `/uploads`.
- **Status casing:** DB uses lowercase statuses (`pending/processing/completed/failed`); the API returns DD uppercase `AnalysisStatus` values. `matching.service.ts` reads `analysisStatus: 'completed'` and remains untouched.
- **Skin type casing:** DB stores lowercase (e.g. `combination`) for consistency with `products.skin_types` and the seed; the API returns capitalized DD `SkinType` values.
- **Error codes:** DD numeric codes (`40001`..`50002`) passed through the global `AllExceptionsFilter` via the `errorCode` payload property.
- **Redis:** daily quota uses `quota:skin:{userId}:{yyyymmdd}` (UTC day); result cache `skin:analysis:{id}` (300s); history cache invalidation `skin:history:{userId}:*`. If Redis is down the quota falls back to a DB count and caching is skipped.
- **Recommendations** are linked to real active products from approved merchants whose tags/skin types match the inferred conditions.

## Traceability

See the module unit tests in `tests/` and the DD-05/DD-06 design docs.