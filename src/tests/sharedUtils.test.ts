import { fetchPluginJson } from '../components/sharedUtils';

afterEach(() => {
  jest.useRealTimers();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchPluginJson', () => {
  it('returns parsed JSON on success', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse({ ok: true }));
    await expect(fetchPluginJson(fetchFn, 'plugin://uptimerobot/x')).resolves.toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledWith('plugin://uptimerobot/x', undefined);
  });

  it('throws with JSON error message when present', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'nope' } }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    await expect(fetchPluginJson(fetchFn, 'plugin://uptimerobot/x')).rejects.toThrow('nope');
  });

  it('retries on 503 when retry503 is true then succeeds', async () => {
    jest.useFakeTimers();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ recovered: true }));

    const p = fetchPluginJson<{ recovered: boolean }>(fetchFn, 'plugin://uptimerobot/x', {
      retry503: true,
    });

    await jest.advanceTimersByTimeAsync(2500);
    await expect(p).resolves.toEqual({ recovered: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('does not retry 503 when retry503 is false', async () => {
    const fetchFn = jest.fn().mockResolvedValue(new Response('unavailable', { status: 503 }));
    await expect(fetchPluginJson(fetchFn, 'plugin://uptimerobot/x')).rejects.toThrow();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
