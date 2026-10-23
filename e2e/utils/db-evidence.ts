import { test, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { Client } from 'pg';
import { getScreenFromFilePath } from './screenshot';

const TEST_RESULTS_ROOT = path.resolve(__dirname, '../test-results');

type IndexEntry = { description?: string; test?: string };
type ScreenshotIndex = Record<string, string | IndexEntry>;

type QueryResult = {
  label: string;
  text: string;
  displaySql: string;
  rowCount: number;
  rows: Array<Record<string, unknown>>;
};

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadIndex(dir: string): ScreenshotIndex {
  const indexPath = path.join(dir, 'index.json');
  if (!fs.existsSync(indexPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } catch {
    return {};
  }
}

function saveIndex(dir: string, index: ScreenshotIndex): void {
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index, null, 2), 'utf-8');
}

export function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.resolve(__dirname, '../../backend/.env');
  const content = fs.readFileSync(envPath, 'utf-8');
  const match = content.match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
  if (!match) {
    throw new Error('DATABASE_URL not found in environment or backend/.env');
  }
  return match[1];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildDisplaySql(text: string, values: ReadonlyArray<unknown> | undefined): string {
  let i = 0;
  return text.replace(/\$\d+/g, () => sqlLiteral(values?.[i++]));
}

function highlightSql(sql: string): string {
  let html = escapeHtml(sql);
  html = html.replace(
    /('(?:''|[^'])*')/g,
    '<span class="str">$1</span>'
  );
  html = html.replace(
    /\b(SELECT|FROM|WHERE|LEFT|RIGHT|INNER|OUTER|JOIN|ON|ORDER|BY|GROUP|HAVING|LIMIT|AS|AND|OR|NOT|NULL|COUNT|INSERT|UPDATE|DELETE|SET|VALUES)\b/gi,
    '<span class="kw">$1</span>'
  );
  return html;
}

function inferPgType(value: unknown): string {
  if (value === null || value === undefined) return 'text';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'numeric';
  if (value instanceof Date) return 'timestamp without time zone';
  const s = String(value);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return 'uuid';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return 'timestamp without time zone';
  return 'text';
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) return value.toISOString().replace('T', ' ').replace('Z', '');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function renderDbHtml(results: QueryResult[], description?: string): string {
  const queryBlocks = results
    .map((r) => {
      const lines = r.displaySql
        .split('\n')
        .map((line, idx) => {
          return `<div class="sql-line"><span class="ln">${idx + 1}</span><span class="sql">${highlightSql(line)}</span></div>`;
        })
        .join('');
      return `<div class="query-label">${escapeHtml(r.label)} — ${r.rowCount} row(s)</div><div class="editor">${lines}</div>`;
    })
    .join('');

  const tables = results
    .map((r) => {
      if (r.rows.length === 0) {
        return `<div class="empty">0 rows — ${escapeHtml(r.label)}</div>`;
      }
      const cols = Object.keys(r.rows[0]);
      const head = cols
        .map((c) => {
          const type = inferPgType(r.rows[0][c]);
          return `<th>${escapeHtml(c)}<span class="type">${escapeHtml(type)}</span></th>`;
        })
        .join('');
      const body = r.rows
        .map(
          (row) =>
            `<tr>${cols.map((c) => `<td>${escapeHtml(formatCell(row[c]))}</td>`).join('')}</tr>`
        )
        .join('');
      return `<div class="grid-label">Data Output — ${escapeHtml(r.label)}</div>
        <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; background: #f3f3f3; color: #111; }
  .header { background: #fff; border-bottom: 1px solid #ccc; padding: 8px 14px; font-size: 13px; }
  .header strong { font-weight: 600; }
  .desc { color: #555; margin-top: 2px; }
  .tabs { display: flex; background: #e9e9e9; border-bottom: 1px solid #ccc; padding: 0 10px; gap: 4px; }
  .tab { padding: 8px 16px; font-size: 13px; color: #333; }
  .tab.active { background: #fff; border: 1px solid #ccc; border-bottom: none; font-weight: 600; margin-bottom: -1px; }
  .query-label, .grid-label { padding: 10px 14px 4px; font-size: 12px; font-weight: 600; color: #333; }
  .editor { background: #fff; border-bottom: 1px solid #ccc; padding: 8px 0 14px; min-height: 120px; }
  .sql-line { display: flex; font-family: Consolas, "Courier New", monospace; font-size: 14px; line-height: 1.75; padding: 0 12px; }
  .ln { width: 28px; color: #999; text-align: right; padding-right: 14px; user-select: none; }
  .sql { white-space: pre-wrap; word-break: break-word; }
  .kw { color: #c2185b; font-weight: 700; }
  .str { color: #1565c0; }
  .panel { background: #f0f0f0; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 8px 14px; font-size: 13px; font-weight: 600; }
  table { border-collapse: collapse; width: 100%; background: #fff; }
  th, td { border: 1px solid #d5d5d5; padding: 7px 10px; font-size: 12px; text-align: left; vertical-align: top; }
  th { background: #fafafa; font-weight: 600; }
  th .type { display: block; font-weight: 400; color: #666; font-size: 10px; margin-top: 2px; }
  td { font-family: Consolas, "Courier New", monospace; }
  .empty { background: #fff; padding: 16px; border-bottom: 1px solid #ddd; color: #666; font-size: 13px; }
  .footer { padding: 10px 14px; font-size: 11px; color: #666; background: #fff; border-top: 1px solid #ddd; }
</style>
</head>
<body>
  <div class="header">
    <strong>Database Query Result</strong>
    <div class="desc">${escapeHtml(description || 'PostgreSQL — live SELECT evidence')}</div>
  </div>
  <div class="tabs">
    <div class="tab active">Query</div>
    <div class="tab">Query History</div>
  </div>
  ${queryBlocks}
  <div class="panel">Data Output</div>
  ${tables}
  <div class="footer">Source: real Postgres | captured ${new Date().toISOString()}</div>
</body>
</html>`;
}

function upsertIndex(
  evidenceDir: string,
  filename: string,
  description: string | undefined,
  testKey: string | undefined
): void {
  const index = loadIndex(evidenceDir);
  const existing = index[filename];
  const prev: IndexEntry =
    typeof existing === 'string' ? { description: existing } : existing || {};
  index[filename] = {
    ...prev,
    ...(description ? { description } : {}),
    ...(testKey ? { test: testKey } : {}),
  };
  saveIndex(evidenceDir, index);
}

async function captureHtmlPng(page: Page, html: string, filePath: string): Promise<void> {
  const dbPage = await page.context().newPage();
  try {
    await dbPage.setViewportSize({ width: 1600, height: 1000 });
    await dbPage.setContent(html, { waitUntil: 'load' });
    await dbPage.waitForTimeout(150);
    const height = await dbPage.evaluate(() => {
      const footer = document.querySelector('.footer');
      if (footer) {
        return Math.ceil(footer.getBoundingClientRect().bottom + window.scrollY);
      }
      return Math.ceil(document.body.getBoundingClientRect().bottom);
    });
    await dbPage.screenshot({
      path: filePath,
      clip: { x: 0, y: 0, width: 1600, height },
    });
  } finally {
    await dbPage.close();
  }
}

export type DbQuery = {
  label: string;
  text: string;
  values?: ReadonlyArray<unknown>;
};

export type DbEvidenceOptions = {
  description?: string;
  queries: DbQuery[];
};

/**
 * Live DB evidence for one step:
 * 1) <step>.png  — pgAdmin-style SQL + Data Output table screenshot
 * 2) <step>.json — machine-readable rows
 * Both registered in index.json (Evidence order = capture order).
 * Never selects password hashes.
 */
export async function captureDbEvidence(
  page: Page,
  stepName: string,
  opts: DbEvidenceOptions
): Promise<{ pngPath: string; jsonPath: string }> {
  let screenFolder = 'Other';
  let testKey: string | undefined;

  try {
    const info = test.info();
    screenFolder = getScreenFromFilePath(info.file);
    testKey = `${path.basename(info.file)}::${info.title}`;
  } catch {
    // outside Playwright test context
  }

  const evidenceDir = path.join(TEST_RESULTS_ROOT, screenFolder, 'screenshots');
  ensureDir(evidenceDir);

  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();

  try {
    const results: QueryResult[] = [];
    for (const q of opts.queries) {
      const res = await client.query(q.text, [...(q.values ?? [])]);
      results.push({
        label: q.label,
        text: q.text,
        displaySql: buildDisplaySql(q.text, q.values),
        rowCount: res.rowCount ?? res.rows.length,
        rows: res.rows as Array<Record<string, unknown>>,
      });
    }

    const base = sanitize(stepName);
    const jsonPath = path.join(evidenceDir, `${base}.json`);
    const pngPath = path.join(evidenceDir, `${base}.png`);

    const payload = {
      capturedAt: new Date().toISOString(),
      description: opts.description,
      results: results.map((r) => ({
        label: r.label,
        rowCount: r.rowCount,
        rows: r.rows,
      })),
    };
    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf-8');

    const html = renderDbHtml(results, opts.description);
    await captureHtmlPng(page, html, pngPath);

    upsertIndex(evidenceDir, `${base}.png`, opts.description, testKey);
    upsertIndex(evidenceDir, `${base}.json`, opts.description, testKey);

    return { pngPath, jsonPath };
  } finally {
    await client.end();
  }
}

/** Safe users row for a registered account (no password_hash). */
export async function captureUserDbEvidence(
  page: Page,
  stepName: string,
  email: string,
  description?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: 'users by email',
        text: `SELECT id, email, name, role AS role_code, is_active, email_verified, created_at
               FROM users WHERE email = $1`,
        values: [email],
      },
    ],
  });
}

/** users + merchants profile (license status) for one email. */
export async function captureUserWithMerchantDbEvidence(
  page: Page,
  stepName: string,
  email: string,
  description?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: 'users + merchants by email',
        text: `SELECT u.id, u.email, u.name, u.role AS role_code,
                      m.shop_name, m.business_license_url, m.license_status, m.created_at AS merchant_created_at
               FROM users u
               LEFT JOIN merchants m ON m.user_id = u.id
               WHERE u.email = $1`,
        values: [email],
      },
    ],
  });
}

/** Row count for an email — proves duplicate did not insert a second user. */
export async function captureUserCountDbEvidence(
  page: Page,
  stepName: string,
  email: string,
  description?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: 'users count by email',
        text: `SELECT COUNT(*)::int AS user_count FROM users WHERE email = $1`,
        values: [email],
      },
    ],
  });
}

const WISHLIST_SELECT = `SELECT w.id, w.user_id, w.product_id,
       p.name AS product_name, p.stock_quantity, w.created_at
FROM wishlists w
JOIN users u ON u.id = w.user_id
JOIN products p ON p.id = w.product_id
WHERE u.email = $1`;

const CART_SELECT = `SELECT ci.id, ci.cart_id, c.user_id, ci.product_id,
       p.name AS product_name, ci.quantity, p.stock_quantity,
       ci.created_at, ci.updated_at
FROM cart_items ci
JOIN carts c ON c.id = ci.cart_id
JOIN users u ON u.id = c.user_id
JOIN products p ON p.id = ci.product_id
WHERE u.email = $1`;

const PRODUCT_STOCK_QUERY = `SELECT id, name, stock_quantity, is_active
FROM products WHERE id = $1`;

/** Wishlist rows for a buyer, optionally scoped to one product. */
export async function captureWishlistDbEvidence(
  page: Page,
  stepName: string,
  email: string,
  description?: string,
  productId?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  const values: string[] = [email];
  const filter = productId ? ' AND w.product_id = $2' : '';
  if (productId) values.push(productId);

  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: productId ? 'wishlist row by buyer and product' : 'wishlists by buyer email',
        text: `${WISHLIST_SELECT}${filter}\nORDER BY w.created_at`,
        values,
      },
    ],
  });
}

/** Wishlist row count, optionally scoped to one product. */
export async function captureWishlistCountDbEvidence(
  page: Page,
  stepName: string,
  email: string,
  description?: string,
  productId?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  const values: string[] = [email];
  const filter = productId ? ' AND w.product_id = $2' : '';
  if (productId) values.push(productId);

  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: productId ? 'wishlist count by buyer and product' : 'wishlist count by buyer',
        text: `SELECT COUNT(*)::int AS wishlist_count
FROM wishlists w
JOIN users u ON u.id = w.user_id
WHERE u.email = $1${filter}`,
        values,
      },
    ],
  });
}

/** Wishlist row count for a buyer and product slug. */
export async function captureWishlistCountByProductSlugDbEvidence(
  page: Page,
  stepName: string,
  email: string,
  productSlug: string,
  description?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: 'wishlist count by buyer and product slug',
        text: `SELECT COUNT(*)::int AS wishlist_count
FROM wishlists w
JOIN users u ON u.id = w.user_id
JOIN products p ON p.id = w.product_id
WHERE u.email = $1 AND p.slug = $2`,
        values: [email, productSlug],
      },
    ],
  });
}

/** Cart items for a buyer, optionally scoped to one product. */
export async function captureCartDbEvidence(
  page: Page,
  stepName: string,
  email: string,
  description?: string,
  productId?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  const values: string[] = [email];
  const filter = productId ? ' AND ci.product_id = $2' : '';
  if (productId) values.push(productId);

  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: productId ? 'cart row by buyer and product' : 'cart_items by buyer email',
        text: `${CART_SELECT}${filter}\nORDER BY ci.created_at`,
        values,
      },
    ],
  });
}

/** A single cart item by its primary key, including the buyer's user_id. */
export async function captureCartItemDbEvidence(
  page: Page,
  stepName: string,
  email: string,
  itemId: string,
  description?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: 'cart item by id',
        text: `${CART_SELECT} AND ci.id = $2`,
        values: [email, itemId],
      },
    ],
  });
}

/** Cart row count and quantity sum, optionally scoped to one product. */
export async function captureCartCountDbEvidence(
  page: Page,
  stepName: string,
  email: string,
  description?: string,
  productId?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  const values: string[] = [email];
  const filter = productId ? ' AND ci.product_id = $2' : '';
  if (productId) values.push(productId);

  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: productId ? 'cart count by buyer and product' : 'cart count by buyer',
        text: `SELECT COUNT(*)::int AS cart_item_count,
       COALESCE(SUM(ci.quantity), 0)::int AS total_quantity
FROM cart_items ci
JOIN carts c ON c.id = ci.cart_id
JOIN users u ON u.id = c.user_id
WHERE u.email = $1${filter}`,
        values,
      },
    ],
  });
}

/** Wishlist row + cart row + product stock for one product. */
export async function captureWishlistCartStateDbEvidence(
  page: Page,
  stepName: string,
  email: string,
  productId: string,
  description?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: 'wishlist row by buyer and product',
        text: `${WISHLIST_SELECT} AND w.product_id = $2`,
        values: [email, productId],
      },
      {
        label: 'cart row by buyer and product',
        text: `${CART_SELECT} AND ci.product_id = $2`,
        values: [email, productId],
      },
      {
        label: 'product stock by id',
        text: PRODUCT_STOCK_QUERY,
        values: [productId],
      },
    ],
  });
}

/** Cart row + product stock for one product. */
export async function captureCartProductDbEvidence(
  page: Page,
  stepName: string,
  email: string,
  productId: string,
  description?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: 'cart row by buyer and product',
        text: `${CART_SELECT} AND ci.product_id = $2`,
        values: [email, productId],
      },
      {
        label: 'product stock by id',
        text: PRODUCT_STOCK_QUERY,
        values: [productId],
      },
    ],
  });
}

/* ------------------------------------------------------------------------- *
 * Commission & Revenue (Admin → Commission / Revenue)
 * ------------------------------------------------------------------------- */

export const COMMISSION_SETTINGS_SQL = `SELECT id, commission_rate, updated_by, updated_at, created_at
FROM commission_settings
ORDER BY updated_at DESC`;

export const COMMISSION_RATE_HISTORY_SQL = `SELECT id, commission_rate, effective_from, created_by, created_at
FROM commission_rate_history
ORDER BY effective_from DESC
LIMIT 5`;

export const REVENUE_TARGETS_SQL = `SELECT id, target_amount, period, is_active, created_by, updated_at, created_at
FROM revenue_targets
ORDER BY period`;

export const PAYOUTS_SQL = `SELECT p.id, m.shop_name, p.period_start, p.order_count, p.total_amount,
       p.commission_amount, p.net_payout, p.status, p.processed_by, p.processed_at,
       p.idempotency_key, p.created_at, p.updated_at
FROM payouts p
LEFT JOIN merchants m ON m.id = p.merchant_id
ORDER BY p.period_start DESC, p.created_at DESC`;

export const PAYOUT_ITEMS_SQL = `SELECT pi.id, pi.payout_id, pi.order_id, pi.order_amount,
       pi.commission_amount, pi.created_at
FROM payout_items pi
ORDER BY pi.created_at DESC`;

export const RATE_AUDIT_SQL = `SELECT id, user_id, action, entity_type, entity_id,
       old_value, new_value, ip_address, created_at
FROM audit_logs
WHERE action = 'COMMISSION_RATE_UPDATED'
  AND created_at >= $1
ORDER BY created_at DESC
LIMIT 5`;

export const TARGET_AUDIT_SQL = `SELECT id, user_id, action, entity_type, entity_id,
       old_value, new_value, ip_address, created_at
FROM audit_logs
WHERE action = 'TARGET_UPDATED'
  AND created_at >= $1
ORDER BY created_at DESC
LIMIT 5`;

export const PAYOUT_AUDIT_SQL = `SELECT id, user_id, action, entity_type, entity_id,
       old_value, new_value, ip_address, created_at
FROM audit_logs
WHERE action IN ('PAYOUT_PROCESSED', 'PAYOUT_REVIEWED', 'PAYOUT_DELETED')
  AND created_at >= $1
ORDER BY created_at DESC
LIMIT 5`;

export const EXPORT_AUDIT_SQL = `SELECT id, user_id, action, entity_type, entity_id,
       old_value, new_value, ip_address, created_at
FROM audit_logs
WHERE action = 'EXPORT_GENERATED'
  AND created_at >= $1
ORDER BY created_at DESC
LIMIT 8`;

/**
 * Per-table fingerprint (row count + MD5 of the row payload).
 * Two snapshots with the same fingerprint prove the table was NOT modified.
 */
export const DB_FINGERPRINT_SQL = `SELECT 'commission_settings' AS table_name,
       COUNT(*)::int AS row_count,
       MD5(COALESCE(STRING_AGG(id::text || '|' || commission_rate::text || '|' || updated_at::text, ',' ORDER BY id), '')) AS fingerprint
FROM commission_settings
UNION ALL
SELECT 'commission_rate_history', COUNT(*)::int,
       MD5(COALESCE(STRING_AGG(id::text || '|' || commission_rate::text || '|' || effective_from::text, ',' ORDER BY id), ''))
FROM commission_rate_history
UNION ALL
SELECT 'revenue_targets', COUNT(*)::int,
       MD5(COALESCE(STRING_AGG(id::text || '|' || target_amount::text || '|' || period || '|' || is_active::text || '|' || updated_at::text, ',' ORDER BY id), ''))
FROM revenue_targets
UNION ALL
SELECT 'payouts', COUNT(*)::int,
       MD5(COALESCE(STRING_AGG(id::text || '|' || status || '|' || total_amount::text || '|' || commission_amount::text || '|' || COALESCE(processed_at::text, '') || '|' || COALESCE(idempotency_key, ''), ',' ORDER BY id), ''))
FROM payouts
UNION ALL
SELECT 'payout_items', COUNT(*)::int,
       MD5(COALESCE(STRING_AGG(id::text || '|' || payout_id::text || '|' || order_amount::text, ',' ORDER BY id), ''))
FROM payout_items
UNION ALL
SELECT 'audit_logs', COUNT(*)::int,
       MD5(COALESCE(STRING_AGG(id::text || '|' || action, ',' ORDER BY id), ''))
FROM audit_logs`;

/** Commission settings + rate history + the matching audit trail. */
export async function captureDbEvidenceCommissionRate(
  page: Page,
  stepName: string,
  description?: string,
  since?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      { label: 'commission_settings (current rate)', text: COMMISSION_SETTINGS_SQL },
      { label: 'commission_rate_history (newest first)', text: COMMISSION_RATE_HISTORY_SQL },
      {
        label: 'audit_logs — COMMISSION_RATE_UPDATED (this run only)',
        text: RATE_AUDIT_SQL,
        values: [since ?? '1970-01-01 00:00:00'],
      },
    ],
  });
}

/** Revenue targets (all periods) + the matching audit trail. */
export async function captureDbEvidenceRevenueTarget(
  page: Page,
  stepName: string,
  description?: string,
  since?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      { label: 'revenue_targets (all periods)', text: REVENUE_TARGETS_SQL },
      {
        label: 'audit_logs — TARGET_UPDATED (this run only)',
        text: TARGET_AUDIT_SQL,
        values: [since ?? '1970-01-01 00:00:00'],
      },
    ],
  });
}

/** Payout rows + their line items + the payout audit trail. */
export async function captureDbEvidencePayout(
  page: Page,
  stepName: string,
  description?: string,
  since?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      { label: 'payouts (newest period first)', text: PAYOUTS_SQL },
      { label: 'payout_items', text: PAYOUT_ITEMS_SQL },
      {
        label: 'audit_logs — payout events (this run only)',
        text: PAYOUT_AUDIT_SQL,
        values: [since ?? '1970-01-01 00:00:00'],
      },
    ],
  });
}

/** Export audit trail — exports must not touch any business table. */
export async function captureDbEvidenceExportAudit(
  page: Page,
  stepName: string,
  description?: string,
  since?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: 'audit_logs — EXPORT_GENERATED (this run only)',
        text: EXPORT_AUDIT_SQL,
        values: [since ?? '1970-01-01 00:00:00'],
      },
      { label: 'commission_settings (unchanged?)', text: COMMISSION_SETTINGS_SQL },
      { label: 'revenue_targets (unchanged?)', text: REVENUE_TARGETS_SQL },
    ],
  });
}

/** Per-table fingerprint — the "did the database change?" proof. */
export async function captureDbEvidenceFingerprint(
  page: Page,
  stepName: string,
  description?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: 'table fingerprints (row count + MD5)',
        text: DB_FINGERPRINT_SQL,
      },
    ],
  });
}

/** Everything the Commission & Revenue screen owns, in one snapshot. */
export async function captureDbEvidenceCommissionAndRevenue(
  page: Page,
  stepName: string,
  description?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      { label: 'commission_settings', text: COMMISSION_SETTINGS_SQL },
      { label: 'commission_rate_history', text: COMMISSION_RATE_HISTORY_SQL },
      { label: 'revenue_targets', text: REVENUE_TARGETS_SQL },
      { label: 'payouts', text: PAYOUTS_SQL },
      { label: 'payout_items', text: PAYOUT_ITEMS_SQL },
      { label: 'table fingerprints (row count + MD5)', text: DB_FINGERPRINT_SQL },
    ],
  });
}

/**
 * Runs arbitrary SQL against the live database.
 * Used to seed / clean up test fixtures for the database-evidence scenarios.
 */
export async function runDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/* ------------------------------------------------------------------------- *
 * Ad Management (Admin → Advertisement Management & Fees)
 * ------------------------------------------------------------------------- */

export async function captureAdDbEvidence(
  page: Page,
  stepName: string,
  adId: string,
  description?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: 'advertisements row by id',
        text: `SELECT a.id, a.shop_id, s.name AS shop_name, a.title, a.approval_status, a.payment_status,
                      a.approved_by, a.approved_at, a.rejection_reason, a.created_at
               FROM advertisements a
               LEFT JOIN shops s ON s.id = a.shop_id
               WHERE a.id = $1`,
        values: [adId],
      },
    ],
  });
}

export async function captureBulkAdsDbEvidence(
  page: Page,
  stepName: string,
  adIds: string[],
  description?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: 'advertisements rows by ids',
        text: `SELECT a.id, a.shop_id, s.name AS shop_name, a.title, a.approval_status, a.payment_status,
                      a.approved_by, a.approved_at, a.rejection_reason, a.created_at
               FROM advertisements a
               LEFT JOIN shops s ON s.id = a.shop_id
               WHERE a.id = ANY($1::uuid[])
               ORDER BY a.created_at DESC`,
        values: [adIds],
      },
    ],
  });
}

export async function captureAdListDbEvidence(
  page: Page,
  stepName: string,
  description?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: 'pending advertisements queue',
        text: `SELECT a.id, a.title, a.approval_status, a.payment_status, s.name AS shop_name, a.created_at
               FROM advertisements a
               LEFT JOIN shops s ON s.id = a.shop_id
               WHERE a.approval_status = 'pending'
               ORDER BY a.created_at DESC
               LIMIT 10`,
      },
    ],
  });
}

export async function captureFeeSettingDbEvidence(
  page: Page,
  stepName: string,
  feeId: string,
  description?: string
): Promise<{ pngPath: string; jsonPath: string }> {
  return captureDbEvidence(page, stepName, {
    description,
    queries: [
      {
        label: 'ad_fee_settings row by id',
        text: `SELECT id, placement, tier, daily_rate, duration_days, max_ads, is_active, created_at
               FROM ad_fee_settings
               WHERE id = $1`,
        values: [feeId],
      },
    ],
  });
}

