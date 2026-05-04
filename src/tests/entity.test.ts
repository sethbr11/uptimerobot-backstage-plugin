import type { Entity } from '@backstage/catalog-model';
import { UPTIMEROBOT_DEFAULT_ENTITY_ANNOTATION } from '../annotationDefaults';
import { isUptimeRobotConfigured } from '../entity';

function componentWithAnnotation(value: string | undefined): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'c',
      namespace: 'default',
      ...(value !== undefined
        ? { annotations: { [UPTIMEROBOT_DEFAULT_ENTITY_ANNOTATION]: value } }
        : {}),
    },
    spec: {},
  };
}

describe('isUptimeRobotConfigured', () => {
  it('returns false when the annotation is missing', () => {
    expect(isUptimeRobotConfigured(componentWithAnnotation(undefined))).toBe(false);
  });

  it('returns false when the annotation is empty or whitespace', () => {
    expect(isUptimeRobotConfigured(componentWithAnnotation(''))).toBe(false);
    expect(isUptimeRobotConfigured(componentWithAnnotation('   '))).toBe(false);
  });

  it('returns false for common "off" values (case-insensitive)', () => {
    expect(isUptimeRobotConfigured(componentWithAnnotation('false'))).toBe(false);
    expect(isUptimeRobotConfigured(componentWithAnnotation('FALSE'))).toBe(false);
    expect(isUptimeRobotConfigured(componentWithAnnotation('0'))).toBe(false);
    expect(isUptimeRobotConfigured(componentWithAnnotation('no'))).toBe(false);
    expect(isUptimeRobotConfigured(componentWithAnnotation('off'))).toBe(false);
  });

  it('returns true for any other non-empty value', () => {
    expect(isUptimeRobotConfigured(componentWithAnnotation('true'))).toBe(true);
    expect(isUptimeRobotConfigured(componentWithAnnotation('12345'))).toBe(true);
    expect(isUptimeRobotConfigured(componentWithAnnotation(' yes '))).toBe(true);
  });
});
