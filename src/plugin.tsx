import {
  SubPageBlueprint,
  createFrontendFeatureLoader,
  createFrontendModule,
} from '@backstage/frontend-plugin-api';
import { Content } from '@backstage/core-components';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { isUptimeRobotConfigured } from './entity';

/** The UptimeRobot entity card */
const uptimeRobotEntityCard = EntityCardBlueprint.make({
  name: 'uptimerobot-entity-card',
  params: {
    type: 'info',
    filter: isUptimeRobotConfigured,
    loader: async () => {
      const { UptimeRobotCard } = await import(
        './components/UptimeRobotCard/UptimeRobotCard'
      );
      return <UptimeRobotCard />;
    },
  },
});

/** The UptimeRobot catalog module */
const uptimeRobotCatalogModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [uptimeRobotEntityCard],
});

/** The UptimeRobot settings page */
const uptimeRobotSettingsPage = SubPageBlueprint.make({
  attachTo: { id: 'page:user-settings', input: 'pages' },
  name: 'uptimerobot',
  params: {
    path: 'uptimerobot',
    title: 'UptimeRobot',
    loader: async () => {
      const { UptimeRobotSettings } = await import(
        './components/UptimeRobotSettings/UptimeRobotSettings'
      );
      // Match stock settings SubPages (General / Auth / Feature Flags): Content
      // provides the page padding around the InfoCard.
      return (
        <Content>
          <UptimeRobotSettings />
        </Content>
      );
    },
  },
});

/** The UptimeRobot user settings module */
const uptimeRobotUserSettingsModule = createFrontendModule({
  pluginId: 'user-settings',
  extensions: [uptimeRobotSettingsPage],
});

/** The UptimeRobot plugin */
export const uptimerobotPlugin = createFrontendFeatureLoader({
  loader: () => [uptimeRobotCatalogModule, uptimeRobotUserSettingsModule],
});
