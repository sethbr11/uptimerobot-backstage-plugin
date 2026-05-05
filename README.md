# UptimeRobot frontend plugin (`@sethbr11/plugin-uptimerobot`)

[![npm version](https://img.shields.io/npm/v/%40sethbr11%2Fplugin-uptimerobot)](https://www.npmjs.com/package/@sethbr11/plugin-uptimerobot)
[![npm downloads](https://img.shields.io/npm/dm/%40sethbr11%2Fplugin-uptimerobot)](https://www.npmjs.com/package/@sethbr11/plugin-uptimerobot)
[![license](https://img.shields.io/npm/l/%40sethbr11%2Fplugin-uptimerobot)](https://www.apache.org/licenses/LICENSE-2.0)
[![Backstage frontend plugin](https://img.shields.io/badge/backstage-frontend--plugin-9BF0E1)](https://backstage.io/)

UNOFFICIAL catalog entity card and user settings page for [UptimeRobot](https://uptimerobot.com/) monitor health in Backstage.

![UptimeRobot entity card on a component overview](https://raw.githubusercontent.com/sethbr11/uptimerobot-backstage-plugin/main/docs/images/entity-card-preview.png)

## What this package does

- Adds a catalog entity card (`entity-card:catalog/uptimerobot-entity-card`).
- Adds a user settings subpage for cache maintenance (`/settings/uptimerobot`).
- Reads data from the backend plugin over `plugin://uptimerobot/...` discovery routes.

This package is frontend-only. You also need the backend package in the same Backstage deployment:
[`@sethbr11/plugin-uptimerobot-backend`](https://www.npmjs.com/package/@sethbr11/plugin-uptimerobot-backend).

## Installation

Install frontend package in your Backstage app:

```bash
yarn --cwd packages/app add @sethbr11/plugin-uptimerobot
```

Register the feature loader in `packages/app/src/App.tsx` (or your app root):

```tsx
import uptimeRobotPlugin from '@sethbr11/plugin-uptimerobot';

const app = createApp({
  features: [
    // ...
    uptimeRobotPlugin,
  ],
});
```

## Required backend wiring

Install backend package:

```bash
yarn --cwd packages/backend add @sethbr11/plugin-uptimerobot-backend
```

Register backend plugin in your backend startup:

```ts
backend.add(import('@sethbr11/plugin-uptimerobot-backend'));
```

Add config values (for example in `app-config.yaml`):

```yaml
uptimerobot:
  apiKey: ${UPTIMEROBOT_API_KEY}
```

Optional graph/display settings can also be configured under `uptimerobot`.

## Catalog annotation behavior

Default annotation key is `backstage.io/uptimerobot`:

- `"true"`, `"1"`, `"yes"` (case-insensitive): use `metadata.name` as monitor friendly name.
- Any other non-empty string: use that value as monitor friendly name.
- `"false"`, `"0"`, `"no"`, `"off"`: integration disabled (card hidden).

Example:

```yaml
metadata:
  annotations:
    backstage.io/uptimerobot: "true"
```

### Monitor name link (optional)

To turn the monitor name into a link, set an absolute `http(s)` URL on the entity:

```yaml
metadata:
  annotations:
    backstage.io/uptimerobot: "true"
    backstage.io/uptimerobot-monitor-url: "https://dashboard.uptimerobot.com/monitors/123456789"
```

The annotation key is exported as `UPTIMEROBOT_MONITOR_URL_ANNOTATION` from this package for forks and tooling.

### Pointing at a monitor whose name is not the component name

Your catalog **component name** (`metadata.name`) can stay whatever you like (for example `web-checkout`). Set the annotation to the **UptimeRobot monitor friendly name** string so the plugin resolves a different monitor:

```yaml
# Component metadata.name: web-checkout
# UptimeRobot monitor friendly name: prod-checkout-api
metadata:
  annotations:
    backstage.io/uptimerobot: "prod-checkout-api"
```

`"true"` / `"1"` / `"yes"` only means “use `metadata.name` as the monitor name”; use any other non-empty string when the monitor name should differ from the component name.

## Extension ID (optional card ordering)

Card extension ID:

`entity-card:catalog/uptimerobot-entity-card`

Only add it to `app.extensions` if you want explicit ordering in the entity overview.

## API notes

- Frontend calls `plugin://uptimerobot/...` endpoints via discovery.
- Add `?refresh=true` on endpoint calls to bypass backend in-memory cache for that request.

## Public exports

- Default export: `uptimerobotPlugin` feature loader.
- Named exports: `UPTIMEROBOT_DEFAULT_ENTITY_ANNOTATION`, `UPTIMEROBOT_MONITOR_URL_ANNOTATION`.

## Chart configuration

Charts are controlled from `app-config.yaml` through backend config:

```yaml
uptimerobot:
  apiKey: ${UPTIME_ROBOT_API_KEY}
  graphs:
    dailyUptime:
      enabled: true
      days: 90
    responseTime:
      enabled: true
      days: 30
```

- `graphs.dailyUptime.enabled`: show/hide daily uptime pill chart.
- `graphs.dailyUptime.days`: number of daily bars and "Last N days" label.
  - Min: `1`
  - Max: `90` (values above this are clamped by backend config parsing).
- `graphs.responseTime.enabled`: show/hide response-time chart.
- `graphs.responseTime.days`: response-time chart lookback window.
  - Min: `1`
  - Max: `90` (values above this are clamped by backend config parsing).
  - `30` or lower is recommended.

## Optional: card ordering in entity overview

If you want a fixed overview card position, add this extension ID under `app.extensions` in `app-config.yaml`:

`entity-card:catalog/uptimerobot-entity-card`

## Troubleshooting

- Card does not show:
  - Verify backend plugin is installed and running.
  - Verify `uptimerobot.apiKey` is set.
  - Verify entity annotation is present and not set to an "off" value.
- Charts do not show:
  - Check `uptimerobot.graphs.*.enabled` values.
  - Confirm `days` values are positive numbers.
- Monitor name is not a link:
  - Set `backstage.io/uptimerobot-monitor-url` on the entity (absolute `https://` or `http://` URL).
- Wrong entities showing card:
  - This frontend defaults to `backstage.io/uptimerobot`.
  - If backend overrides `uptimerobot.catalog.entityAnnotation`, align frontend filter logic accordingly.

## License

Apache-2.0. See [LICENSE](https://www.apache.org/licenses/LICENSE-2.0).

