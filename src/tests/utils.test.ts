import {
  buildEntityStatsUrl,
  formatDate,
  formatDuration,
  formatMs,
  formatPercent,
  isSafeHttpUrl,
} from '../components/UptimeRobotCard/utils';

describe('isSafeHttpUrl', () => {
  it('allows only http and https URLs', () => {
    expect(isSafeHttpUrl('https://example.com/x')).toBe(true);
    expect(isSafeHttpUrl('http://example.com/x')).toBe(true);
    expect(isSafeHttpUrl(`java${'script'}:alert(1)`)).toBe(false);
    expect(isSafeHttpUrl('data:text/html,hi')).toBe(false);
    expect(isSafeHttpUrl('not a url')).toBe(false);
  });
});

describe('formatPercent', () => {
  it('returns N/A for undefined', () => {
    expect(formatPercent(undefined)).toBe('N/A');
  });

  it('trims trailing zeros from the percentage', () => {
    expect(formatPercent(99.9)).toBe('99.9%');
    expect(formatPercent(100)).toBe('100%');
    expect(formatPercent(99.912)).toBe('99.912%');
  });
});

describe('buildEntityStatsUrl', () => {
  it('builds plugin URLs with encoded path segments and optional refresh', () => {
    expect(buildEntityStatsUrl('component:default/my svc', 'summary', 0)).toBe(
      'plugin://uptimerobot/entity/component/default/my%20svc/summary',
    );
    expect(buildEntityStatsUrl('component:default/my svc', 'daily-uptime', 1)).toBe(
      'plugin://uptimerobot/entity/component/default/my%20svc/daily-uptime?refresh=true',
    );
  });
});

describe('formatMs', () => {
  it('returns N/A for undefined or NaN', () => {
    expect(formatMs(undefined)).toBe('N/A');
    expect(formatMs(Number.NaN)).toBe('N/A');
  });

  it('rounds milliseconds', () => {
    expect(formatMs(123.4)).toBe('123ms');
  });
});

describe('formatDuration', () => {
  it('returns a friendly message when seconds are missing', () => {
    expect(formatDuration(undefined)).toBe('Duration unavailable');
  });

  it('formats sub-hour downtime as minutes', () => {
    expect(formatDuration(3599)).toBe('59m down');
  });

  it('formats multi-hour downtime', () => {
    expect(formatDuration(7200)).toBe('2h 0m down');
    expect(formatDuration(7320)).toBe('2h 2m down');
  });
});

describe('formatDate', () => {
  it('formats an ISO calendar date in UTC', () => {
    const s = formatDate('2024-06-15');
    expect(s).toMatch(/Jun/);
    expect(s).toMatch(/15/);
  });
});
