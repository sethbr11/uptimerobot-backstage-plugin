import { fetchPluginJson, type PluginFetchFn } from '../sharedUtils';

/** Formats the percentage
 * 
 * @param value - The percentage value
 * @returns The formatted percentage
 */
export function formatPercent(value?: number): string {
  return value === undefined
    ? 'N/A'
    : `${value.toFixed(3).replace(/\.?0+$/, '')}%`;
}

/** True only for absolute http(s) URLs safe to use as link hrefs. */
export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Builds the entity stats URL
 * 
 * @param entityRef - The entity reference
 * @param section - The section to fetch
 * @param refreshNonce - The refresh nonce
 * @returns The entity stats URL
 */
export function buildEntityStatsUrl(entityRef: string, section: string, refreshNonce: number): string {
  const [kind, namespaceAndName] = entityRef.split(':');
  const [namespace, name] = namespaceAndName.split('/');
  return `plugin://uptimerobot/entity/${encodeURIComponent(kind)}/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/${section}${refreshNonce > 0 ? '?refresh=true' : ''}`;
}

/** Formats the milliseconds
 * 
 * @param ms - The milliseconds
 * @returns The formatted milliseconds
 */
export function formatMs(ms?: number): string {
  if (ms === undefined || Number.isNaN(ms)) return 'N/A';
  return `${Math.round(ms)}ms`;
}

/** Formats the timestamp
 * 
 * @param ts - The timestamp
 * @returns The formatted timestamp
 */
export function formatTs(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Formats the duration
 * 
 * @param seconds - The duration in seconds
 * @returns The formatted duration
 */
export function formatDuration(seconds?: number): string {
  if (seconds === undefined) return 'Duration unavailable';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m down`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m down`;
}

/** Formats the date
 * 
 * @param date - The date to format
 * @returns The formatted date
 */
export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** Fetches UptimeRobot entity stats JSON with 503 retry/backoff for plugin cold start.
 * 
 * @param fetchFn - The fetch function
 * @param url - The URL to fetch
 * @returns The UptimeRobot entity stats JSON
*/
export function fetchUptimeRobotJson<T>(fetchFn: PluginFetchFn, url: string): Promise<T> {
  return fetchPluginJson<T>(fetchFn, url, { retry503: true });
}
