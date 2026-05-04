/** Fetch from Backstage plugin discovery URLs (`plugin://...`)
 * 
 * @param input - The input to fetch
 * @param init - The init options
 * @returns The response
*/
export type PluginFetchFn = (input: string, init?: RequestInit) => Promise<Response>;

/** The options for the fetch
 * 
 * @property init - The init options
 * @property retry503 - Whether to retry on 503
 */
export type FetchPluginJsonOptions = {
  init?: RequestInit;
  /**
   * When true, retry on 503 with backoff (catalog vs plugin lifecycle during cold start).
   * Leave false for admin-style calls (e.g. DELETE).
   */
  retry503?: boolean;
};

/** Parses the error message from the response
 * @param response - The response to parse
 * @returns The error message
 */
async function parseErrorMessage(response: Response): Promise<string> {
  let message = `${response.status} ${response.statusText}`;
  try {
    const body = (await response.json()) as { error?: { message?: string }; message?: string };
    message = body.error?.message ?? body.message ?? message;
  } catch {
    /* ignore non-JSON error bodies */
  }
  return message;
}

/** GET/POST/DELETE JSON against `plugin://` routes with consistent error handling.
 * 
 * @param fetchFn - The fetch function
 * @param url - The URL to fetch
 * @param options - The options for the fetch
 * @returns The JSON response
 */
export async function fetchPluginJson<T>(
  fetchFn: PluginFetchFn,
  url: string,
  options?: FetchPluginJsonOptions,
): Promise<T> {
  const { init, retry503 = false } = options ?? {};
  const maxAttempts = retry503 ? 8 : 1;
  let lastDetail = '';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetchFn(url, init);
    if (response.ok) {
      return response.json() as Promise<T>;
    }

    lastDetail = await parseErrorMessage(response);

    if (response.status === 429) {
      throw new Error(lastDetail);
    }

    const backoffMs = 2000 * (attempt + 1);
    if (retry503 && response.status === 503 && attempt < maxAttempts - 1) {
      await new Promise<void>(resolve => {
        setTimeout(resolve, backoffMs);
      });
      continue;
    }

    throw new Error(retry503 ? `Failed to fetch UptimeRobot stats: ${lastDetail}` : lastDetail);
  }

  throw new Error(retry503 ? `Failed to fetch UptimeRobot stats: ${lastDetail}` : lastDetail);
}
