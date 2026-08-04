import type { Entity } from '@backstage/catalog-model';
import { UPTIMEROBOT_DEFAULT_ENTITY_ANNOTATION } from '../annotationDefaults';
import type { MonitorSummaryStats } from '../types';

/** Default entity for `EntityProvider` when rendering {@link UptimeRobotCard}. */
export function createCardEntity(): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'demo',
      namespace: 'default',
      annotations: {
        [UPTIMEROBOT_DEFAULT_ENTITY_ANNOTATION]: 'monitor-id',
      },
    },
    spec: {},
  };
}

/** Component returned from catalog for settings autocomplete filtering. */
export function createCatalogComponentForSettings(options?: {
  name?: string;
  title?: string;
}): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: options?.name ?? 'svc',
      namespace: 'default',
      title: options?.title,
      annotations: {
        [UPTIMEROBOT_DEFAULT_ENTITY_ANNOTATION]: 'mon',
      },
    },
    spec: {},
  };
}

export function createSummaryPayload(
  overrides?: Partial<MonitorSummaryStats>,
): MonitorSummaryStats {
  return {
    chartDayCount: 30,
    display: {
      dailyUptime: true,
      dailyUptimeDays: 30,
      responseTime: true,
      responseTimeDays: 7,
    },
    monitor: {
      id: 'm1',
      name: 'Demo Monitor',
      status: 'Up',
      url: 'https://example.com/status',
    },
    uptime: {
      last24Hours: 99.912,
      last7Days: 99.5,
      chartWindow: 98.2,
      last90Days: 97.1,
    },
    responseTime: {
      windowDays: 7,
      avgMs: 120,
      maxMs: 400,
      minMs: 80,
      series: [
        { timestamp: '2024-06-01T12:00:00.000Z', valueMs: 100 },
        { timestamp: '2024-06-02T12:00:00.000Z', valueMs: 130 },
      ],
    },
    ...overrides,
  };
}
