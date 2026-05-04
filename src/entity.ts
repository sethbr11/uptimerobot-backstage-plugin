import type { Entity } from '@backstage/catalog-model';
import { UPTIMEROBOT_DEFAULT_ENTITY_ANNOTATION } from './annotationDefaults';

/** The off values for the UptimeRobot annotation. */
const OFF_VALUES = new Set(['false', '0', 'no', 'off']);

/** Whether the catalog overview should show the UptimeRobot entity card.
 * 
 * Uses the same single annotation and active/off rules as the backend.
 * If you override `uptimerobot.catalog.entityAnnotation`, align this module or fork the filter.
 *
 * @param entity - The entity to check
 * @returns Whether the entity is configured for UptimeRobot
 */
export function isUptimeRobotConfigured(entity: Entity): boolean {
  return isUptimeRobotAnnotationActive(
    entity.metadata.annotations?.[UPTIMEROBOT_DEFAULT_ENTITY_ANNOTATION],
  );
}

/** Whether the UptimeRobot annotation is active.
 * 
 * @param raw - The raw annotation value
 * @returns Whether the annotation is active
 */
function isUptimeRobotAnnotationActive(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  const v = raw.trim();
  if (!v) return false;
  return !OFF_VALUES.has(v.toLowerCase());
}
