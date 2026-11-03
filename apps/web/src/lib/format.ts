/**
 * Formatting helpers shared by pages and components, so the same value never
 * renders two different ways.
 */

/** "4m 12s". A null value means the scene never closed. */
export function duration(ms: number | null | undefined, whenMissing = '—'): string {
  if (ms === null) return whenMissing;
  if (ms === undefined) return '';
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/** Local date and time, Spanish (Venezuela). */
export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
}

/** Clock time only, 24-hour. */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-VE', { hour12: false });
}
