import { createDevApp } from '@backstage/frontend-dev-utils';

import plugin from '../src';

/**
 * Isolated frontend dev shell. With the backend running, open DevTools and watch the
 * log line from the probe below, or call the health route directly:
 *
 *   curl http://localhost:7007/api/uptimerobot/health
 */
void fetch('/api/uptimerobot/health')
  .then(async res => {
    const body = await res.json().catch(() => ({}));
    // eslint-disable-next-line no-console
    console.info('[uptimerobot dev] GET /api/uptimerobot/health', res.status, body);
  })
  .catch(err => {
    // eslint-disable-next-line no-console
    console.warn('[uptimerobot dev] health probe failed — is the backend up?', err);
  });

createDevApp({ features: [plugin] });
