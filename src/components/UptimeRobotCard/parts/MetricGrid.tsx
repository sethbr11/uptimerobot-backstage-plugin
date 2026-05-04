import type { ReactNode } from 'react';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import useAsync, { AsyncState } from 'react-use/esm/useAsync';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { fetchApiRef } from '@backstage/core-plugin-api';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { buildEntityStatsUrl, fetchUptimeRobotJson } from '../utils';
import { MonitorSummaryStats } from '../../../types';


// ////////////////////////////////////////////
//         EXPORTED COMPONENTS/HOOKS         //
// ////////////////////////////////////////////

/** The metric grid component
 * 
 * @param children - The children to display in the metric grid
 * @returns The metric grid
*/
export function MetricGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      display="grid"
      gridTemplateColumns="repeat(auto-fit, minmax(90px, 1fr))"
      style={{ gap: 12 }}
    >
      {children}
    </Box>
  );
}

/** The metric component
 * 
 * @param label - The label to display
 * @param value - The value to display
 * @returns The metric
 */
export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="h6" component="div">
        {value}
      </Typography>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
    </Box>
  );
}

/** Hook to fetch fast UptimeRobot summary stats
 * 
 * @param refreshNonce - The refresh nonce
 * @returns The UptimeRobot summary stats
*/
export function useStatsSummary(refreshNonce: number): AsyncState<MonitorSummaryStats> {
  const { entity } = useEntity();
  const { fetch } = useApi(fetchApiRef);
  const entityRef = stringifyEntityRef(entity);
  const url = buildEntityStatsUrl(entityRef, 'summary', refreshNonce);

  return useAsync(
    async (): Promise<MonitorSummaryStats> =>
      fetchUptimeRobotJson(fetch, url),
    [fetch, url],
  );
}
