// helpers/date.ts

// --- Existing export (unchanged) ---
export const formatDate = (date: string) => {
    const dateObj = new Date(date)
    const month = dateObj.getMonth()
    const day = dateObj.getDate()
    const year = dateObj.getFullYear()
    const months: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    let formattedDate: string | null = null
    if(!Number.isNaN(month)) {
        formattedDate = `${months[month]}, ${year}`
    }

    return formattedDate
}

// --- New, lightweight helpers for carousel + a11y (zero deps) ---
export type DateLike = Date | string | number;

function toDate(d: DateLike): Date | null {
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/** Returns YYYY-MM-DD for machine-readable <time dateTime> */
export function toISODateString(d: DateLike): string | null {
  const dt = toDate(d);
  if (!dt) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Locale-aware absolute date, e.g. "Oct 14, 2025" */
export function formatAbsolute(d: DateLike, locale?: string | string[]): string | null {
  const dt = toDate(d);
  if (!dt) return null;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(dt);
  } catch {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
  }
}
