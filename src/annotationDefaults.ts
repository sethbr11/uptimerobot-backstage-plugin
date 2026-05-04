/**
 * Default catalog annotation for UptimeRobot integration (single key).
 * Must match backend `uptimerobot.catalog.entityAnnotation` default in config.d.ts.
 *
 * @see UPTIMEROBOT_DEFAULT_ENTITY_ANNOTATION in the backend package for value semantics.
 */
export const UPTIMEROBOT_DEFAULT_ENTITY_ANNOTATION = 'backstage.io/uptimerobot';

/**
 * Optional absolute URL for the monitor name link on the entity card.
 * Must match backend `UPTIMEROBOT_MONITOR_URL_ANNOTATION`.
 */
export const UPTIMEROBOT_MONITOR_URL_ANNOTATION = 'backstage.io/uptimerobot-monitor-url';
