import { renderInTestApp, mockApis } from '@backstage/frontend-test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UptimeRobotSettings } from '../components/UptimeRobotSettings/UptimeRobotSettings';
import { createCatalogComponentForSettings } from './fixtures';

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
  return String(input);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('UptimeRobotSettings', () => {
  it('loads cache stats from the plugin route', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('plugin://uptimerobot/stats-cache/daily-uptime')) {
        return jsonResponse({
          records: 42,
          components: 3,
          oldestDate: '2024-01-01',
          newestDate: '2024-01-31',
        });
      }
      return new Response('unexpected', { status: 404 });
    });

    renderInTestApp(<UptimeRobotSettings />, {
      apis: [
        mockApis.fetch({ baseImplementation: fetchMock }),
        [
          catalogApiRef,
          {
            getEntities: jest.fn().mockResolvedValue({ items: [] }),
          },
        ],
      ],
    });

    expect(
      await screen.findByText(/42 cached records across 3 components \(2024-01-01 to 2024-01-31\)/),
    ).toBeInTheDocument();
  });

  it('surfaces stats load failures', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    renderInTestApp(<UptimeRobotSettings />, {
      apis: [
        mockApis.fetch({ baseImplementation: fetchMock }),
        [
          catalogApiRef,
          {
            getEntities: jest.fn().mockResolvedValue({ items: [] }),
          },
        ],
      ],
    });

    expect(await screen.findByText(/Failed to load cache stats: offline/)).toBeInTheDocument();
  });

  it('lists catalog components that expose the UptimeRobot annotation', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      if (requestUrl(input).includes('stats-cache/daily-uptime')) {
        return jsonResponse({ records: 0, components: 0 });
      }
      return new Response('unexpected', { status: 404 });
    });

    renderInTestApp(<UptimeRobotSettings />, {
      apis: [
        mockApis.fetch({ baseImplementation: fetchMock }),
        [
          catalogApiRef,
          {
            getEntities: jest.fn().mockResolvedValue({
              items: [
                createCatalogComponentForSettings({ title: 'Payments' }),
                {
                  apiVersion: 'backstage.io/v1alpha1',
                  kind: 'Component',
                  metadata: { name: 'plain', namespace: 'default' },
                  spec: {},
                },
              ],
            }),
          },
        ],
      ],
    });

    await waitFor(() => {
      expect(screen.getByText(/backstage\.io\/uptimerobot/)).toBeInTheDocument();
    });
  });

  it('deletes all cache rows when reset-all is confirmed', async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.includes('stats-cache/daily-uptime') && init?.method === 'DELETE') {
        return jsonResponse({ deleted: 7 });
      }
      if (url.includes('stats-cache/daily-uptime')) {
        return jsonResponse({ records: 7, components: 1 });
      }
      return new Response('unexpected', { status: 404 });
    });

    renderInTestApp(<UptimeRobotSettings />, {
      apis: [
        mockApis.fetch({ baseImplementation: fetchMock }),
        [
          catalogApiRef,
          {
            getEntities: jest.fn().mockResolvedValue({ items: [] }),
          },
        ],
      ],
    });

    await screen.findByText(/7 cached records/);

    await user.click(
      screen.getByRole('checkbox', {
        name: /I understand this will delete all cached UptimeRobot daily uptime rows/i,
      }),
    );
    await user.click(screen.getByRole('button', { name: /Reset All UptimeRobot Daily Stats/i }));

    expect(
      await screen.findByText(/Reset all cached daily uptime stats\. Deleted 7 records\./),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true);
  });

  it('shows component list load error in helper text', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      if (requestUrl(input).includes('stats-cache/daily-uptime')) {
        return jsonResponse({ records: 0, components: 0 });
      }
      return new Response('unexpected', { status: 404 });
    });

    renderInTestApp(<UptimeRobotSettings />, {
      apis: [
        mockApis.fetch({ baseImplementation: fetchMock }),
        [
          catalogApiRef,
          {
            getEntities: jest.fn().mockRejectedValue(new Error('catalog unavailable')),
          },
        ],
      ],
    });

    expect(
      await screen.findByText(/Failed to load component options: catalog unavailable/),
    ).toBeInTheDocument();
  });

  it('shows error when reset-all fails', async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.includes('stats-cache/daily-uptime') && init?.method === 'DELETE') {
        return new Response(JSON.stringify({ message: 'permission denied' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('stats-cache/daily-uptime')) {
        return jsonResponse({ records: 1, components: 1 });
      }
      return new Response('unexpected', { status: 404 });
    });

    renderInTestApp(<UptimeRobotSettings />, {
      apis: [
        mockApis.fetch({ baseImplementation: fetchMock }),
        [
          catalogApiRef,
          {
            getEntities: jest.fn().mockResolvedValue({ items: [] }),
          },
        ],
      ],
    });

    await screen.findByText(/1 cached records/);

    await user.click(
      screen.getByRole('checkbox', {
        name: /I understand this will delete all cached UptimeRobot daily uptime rows/i,
      }),
    );
    await user.click(screen.getByRole('button', { name: /Reset All UptimeRobot Daily Stats/i }));

    expect(await screen.findByText(/permission denied/)).toBeInTheDocument();
  });
});
