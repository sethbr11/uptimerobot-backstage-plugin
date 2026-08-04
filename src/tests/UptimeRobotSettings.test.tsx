import {
  renderInTestApp,
  mockApis,
  type TestApiPair,
} from '@backstage/frontend-test-utils';
import type { CatalogApi } from '@backstage/catalog-client';
import type { FetchApi } from '@backstage/core-plugin-api';
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

function settingsApis(options: {
  fetchMock: jest.Mock;
  catalog?: { getEntities: jest.Mock };
}): readonly [TestApiPair<FetchApi>, TestApiPair<CatalogApi>] {
  return [
    mockApis.fetch({ baseImplementation: options.fetchMock }),
    [
      catalogApiRef,
      {
        getEntities:
          options.catalog?.getEntities ?? jest.fn().mockResolvedValue({ items: [] }),
      },
    ],
  ];
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

    await renderInTestApp(<UptimeRobotSettings />, {
      apis: settingsApis({ fetchMock }),
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

    await renderInTestApp(<UptimeRobotSettings />, {
      apis: settingsApis({ fetchMock }),
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

    await renderInTestApp(<UptimeRobotSettings showResetComponents showResetAll />, {
      apis: settingsApis({
        fetchMock,
        catalog: {
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
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/backstage\.io\/uptimerobot/)).toBeInTheDocument();
    });
  });

  it('hides reset controls by default', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      if (requestUrl(input).includes('stats-cache/daily-uptime')) {
        return jsonResponse({ records: 1, components: 1 });
      }
      return new Response('unexpected', { status: 404 });
    });

    await renderInTestApp(<UptimeRobotSettings />, {
      apis: settingsApis({ fetchMock }),
    });

    await screen.findByText(/1 cached records/);

    expect(
      screen.queryByRole('button', { name: /Reset All UptimeRobot Daily Stats/i }),
    ).not.toBeInTheDocument();
  });

  it('hides reset controls when reset props are false', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      if (requestUrl(input).includes('stats-cache/daily-uptime')) {
        return jsonResponse({ records: 1, components: 1 });
      }
      return new Response('unexpected', { status: 404 });
    });

    await renderInTestApp(
      <UptimeRobotSettings showResetAll={false} showResetComponents={false} />,
      {
        apis: settingsApis({ fetchMock }),
      },
    );

    await screen.findByText(/1 cached records/);

    expect(
      screen.queryByRole('button', { name: /Reset All UptimeRobot Daily Stats/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Reset Component Caches/i }),
    ).not.toBeInTheDocument();
  });

  it('can show component reset without reset-all', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      if (requestUrl(input).includes('stats-cache/daily-uptime')) {
        return jsonResponse({ records: 1, components: 1 });
      }
      return new Response('unexpected', { status: 404 });
    });

    await renderInTestApp(<UptimeRobotSettings showResetComponents />, {
      apis: settingsApis({
        fetchMock,
        catalog: {
          getEntities: jest.fn().mockResolvedValue({
            items: [createCatalogComponentForSettings({ title: 'Owned' })],
          }),
        },
      }),
    });

    await screen.findByText(/1 cached records/);
    expect(
      screen.getByRole('button', { name: /Reset Component Caches/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Reset All UptimeRobot Daily Stats/i }),
    ).not.toBeInTheDocument();
  });

  it('applies host filterResettableEntities to the component picker', async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      if (requestUrl(input).includes('stats-cache/daily-uptime')) {
        return jsonResponse({ records: 0, components: 0 });
      }
      return new Response('unexpected', { status: 404 });
    });

    await renderInTestApp(
      <UptimeRobotSettings
        showResetComponents
        filterResettableEntities={entity => entity.metadata.name === 'keep-me'}
      />,
      {
        apis: settingsApis({
          fetchMock,
          catalog: {
            getEntities: jest.fn().mockResolvedValue({
              items: [
                createCatalogComponentForSettings({
                  name: 'keep-me',
                  title: 'Keep Me',
                }),
                createCatalogComponentForSettings({
                  name: 'drop-me',
                  title: 'Drop Me',
                }),
              ],
            }),
          },
        }),
      },
    );

    await waitFor(() => {
      expect(screen.getByText(/backstage\.io\/uptimerobot/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('textbox', { name: /Components/i }));
    expect(await screen.findByText(/Keep Me/)).toBeInTheDocument();
    expect(screen.queryByText(/Drop Me/)).not.toBeInTheDocument();
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

    await renderInTestApp(<UptimeRobotSettings showResetComponents showResetAll />, {
      apis: settingsApis({ fetchMock }),
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

    await renderInTestApp(<UptimeRobotSettings showResetComponents showResetAll />, {
      apis: settingsApis({
        fetchMock,
        catalog: {
          getEntities: jest.fn().mockRejectedValue(new Error('catalog unavailable')),
        },
      }),
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

    await renderInTestApp(<UptimeRobotSettings showResetComponents showResetAll />, {
      apis: settingsApis({ fetchMock }),
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
