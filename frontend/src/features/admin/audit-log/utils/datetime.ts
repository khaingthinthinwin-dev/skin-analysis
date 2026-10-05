/**
 * Audit events are stored and transported as UTC instants, but the trail is
 * reviewed by Myanmar-based admins, so every value the UI shows is rendered in
 * Myanmar Time (MMT).
 *
 * MMT is a fixed UTC+06:30 with no DST, so the conversion is a plain offset
 * rather than an `Intl` time-zone lookup. That keeps the output identical on
 * every machine regardless of the viewer's OS time zone or the ICU data shipped
 * with the runtime — an audit timestamp must not depend on who is looking.
 */
const MMT_OFFSET_MS = (6 * 60 + 30) * 60 * 1000;

const pad = (value: number, width = 2): string =>
  String(value).padStart(width, '0');

const toMmtInstant = (date: Date): Date =>
  new Date(date.getTime() + MMT_OFFSET_MS);

const parse = (value: string | Date): Date | null => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** `2026-09-30 12:43:12.123 MMT`, or an em dash for a missing/invalid value. */
export function formatMmt(value: string | Date | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const date = parse(value);
  if (!date) return '—';
  const mmt = toMmtInstant(date);
  return (
    `${mmt.getUTCFullYear()}-${pad(mmt.getUTCMonth() + 1)}-${pad(mmt.getUTCDate())}` +
    ` ${pad(mmt.getUTCHours())}:${pad(mmt.getUTCMinutes())}:${pad(mmt.getUTCSeconds())}` +
    `.${pad(mmt.getUTCMilliseconds(), 3)} MMT`
  );
}

/** `YYYY-MM-DD` for the Myanmar calendar day that contains `value`. */
export function toMmtDateStamp(value: string | Date = new Date()): string {
  const date = parse(value);
  if (!date) return '';
  const mmt = toMmtInstant(date);
  return (
    `${mmt.getUTCFullYear()}-${pad(mmt.getUTCMonth() + 1)}-${pad(mmt.getUTCDate())}`
  );
}
