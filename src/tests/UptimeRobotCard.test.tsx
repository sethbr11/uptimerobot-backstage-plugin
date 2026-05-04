import { fetchApiRef } from '@backstage/core-plugin-api';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import {
  MockFetchApi,
  TestApiProvider,
  renderWithEffects,
  wrapInTestApp,
} from '@backstage/test-utils';
import type { ReactElement } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UptimeRobotCard } from '../components/UptimeRobotCard';
import type { BasicIncident } from '../types';
import { createCardEntity, createSummaryPayload } from './fixtures';

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

async function renderCard(fetchImplementation: typeof fetch, ui: ReactElement = <UptimeRobotCard />) {
  const fetchApi = new MockFetchApi({ baseImplementation: fetchImplementation });
  return renderWithEffects(
    wrapInTestApp(
      <TestApiProvider apis={[[fetchApiRef, fetchApi]]}>
        <EntityProvider entity={createCardEntity()}>{ui}</EntityProvider>
      </TestApiProvider>,
    ),
  );
}

describe('UptimeRobotCard', () => {
  it('shows a progress state while the summary request is pending', async () => {
    let finishSummary!: (r: Response) => void;
    const summaryGate = new Promise<Response>(resolve => {
      finishSummary = resolve;
    });

    const fetchImpl = jest.fn((input: RequestInfo | URL) => {
      if (requestUrl(input).includes('/summary')) {
        return summaryGate;
      }
      return Promise.resolve(jsonResponse([]));
    });

    await renderCard(fetchImpl);
    expect(await screen.findByTestId('progress')).toBeInTheDocument();

    finishSummary(jsonResponse(createSummaryPayload()));
    await screen.findByText('Demo Monitor');
  });

  it('renders an error panel when the summary request fails', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'boom' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await renderCard(fetchImpl);
    await waitFor(() => {
      expect(document.body.textContent).toContain('boom');
    });
  });

  it('renders uptime metrics, charts, incidents, and a monitor link when data loads', async () => {
    const summary = createSummaryPayload();
    const daily = [{ date: '2024-06-01', uptimeRatio: 0.999 }];
    const incidents: BasicIncident[] = [
      {
        id: 'i1',
        type: 'down',
        startedAt: '2024-06-01T10:00:00.000Z',
        durationSeconds: 125,
        reason: 'timeout',
      },
    ];

    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/summary')) return jsonResponse(summary);
      if (url.includes('/daily-uptime')) return jsonResponse(daily);
      if (url.includes('/response-time')) return jsonResponse(summary.responseTime);
      if (url.includes('/incidents')) return jsonResponse(incidents);
      return new Response('missing', { status: 404 });
    });

    await renderCard(fetchImpl);

    const title = await screen.findByText('UptimeRobot');
    expect(title).toBeInTheDocument();

    const link = screen.getByRole('link', { name: 'Demo Monitor' });
    expect(link).toHaveAttribute('href', 'https://example.com/status');

    expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
    expect(screen.getByText('99.912%')).toBeInTheDocument();
    expect(screen.getByText('Latest Incidents')).toBeInTheDocument();
    expect(screen.getByText(/timeout/)).toBeInTheDocument();
    expect(screen.getByText(/2m down/)).toBeInTheDocument();
  });

  it('shows monitor status row when daily uptime graph is disabled', async () => {
    const summary = createSummaryPayload({
      display: {
        dailyUptime: false,
        dailyUptimeDays: 30,
        responseTime: false,
        responseTimeDays: 7,
      },
      responseTime: undefined,
    });

    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/summary')) return jsonResponse(summary);
      if (url.includes('/incidents')) return jsonResponse([]);
      return new Response('missing', { status: 404 });
    });

    await renderCard(fetchImpl);

    expect(await screen.findByText('Monitor status')).toBeInTheDocument();
    expect(screen.getByText('Operational')).toBeInTheDocument();
  });

  it('toggles incident list when more than two incidents exist', async () => {
    const user = userEvent.setup();
    const summary = createSummaryPayload();
    const incidents: BasicIncident[] = [
      {
        id: '1',
        type: 'down',
        startedAt: '2024-06-01T10:00:00.000Z',
        durationSeconds: 60,
      },
      {
        id: '2',
        type: 'down',
        startedAt: '2024-06-02T10:00:00.000Z',
        durationSeconds: 60,
      },
      {
        id: '3',
        type: 'down',
        startedAt: '2024-06-03T10:00:00.000Z',
        durationSeconds: 60,
      },
    ];

    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/summary')) return jsonResponse(summary);
      if (url.includes('/daily-uptime')) return jsonResponse([]);
      if (url.includes('/response-time')) return jsonResponse(summary.responseTime);
      if (url.includes('/incidents')) return jsonResponse(incidents);
      return new Response('missing', { status: 404 });
    });

    await renderCard(fetchImpl);
    await screen.findByText('Latest Incidents');

    const chips = () => screen.getAllByText('down');
    expect(chips()).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Show all' }));
    await waitFor(() => expect(chips()).toHaveLength(3));

    await user.click(screen.getByRole('button', { name: 'Show less' }));
    await waitFor(() => expect(chips()).toHaveLength(2));
  });

  it('requests a refreshed summary when the refresh control is used', async () => {
    const user = userEvent.setup();
    const summary = createSummaryPayload();
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/summary')) return jsonResponse(summary);
      if (url.includes('/daily-uptime')) return jsonResponse([]);
      if (url.includes('/response-time')) return jsonResponse(summary.responseTime);
      if (url.includes('/incidents')) return jsonResponse([]);
      return new Response('missing', { status: 404 });
    });

    await renderCard(fetchImpl);
    await screen.findByText('Demo Monitor');

    const summaryCalls = () =>
      fetchImpl.mock.calls.filter(([u]) => requestUrl(u as RequestInfo).includes('/summary'));

    expect(summaryCalls()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /refresh uptimerobot stats/i }));
    await waitFor(() => expect(summaryCalls()).toHaveLength(2));
    expect(summaryCalls()[1]?.[0]).toContain('?refresh=true');
  });
});
