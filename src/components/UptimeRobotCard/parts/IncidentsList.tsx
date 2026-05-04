import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { fetchApiRef } from '@backstage/core-plugin-api';
import { stringifyEntityRef } from '@backstage/catalog-model';
import useAsync, { AsyncState } from 'react-use/esm/useAsync';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Divider from '@material-ui/core/Divider';
import Chip from '@material-ui/core/Chip';
import { BasicIncident, MonitorSummaryStats } from "../../../types";
import { buildEntityStatsUrl, fetchUptimeRobotJson, formatDuration } from '../utils';

// ////////////////////////////////////////////
//         EXPORTED COMPONENTS/HOOKS         //
// ////////////////////////////////////////////

/** The incident list component
 * 
 * @param incidents - The incidents to list
 * @returns The incident list
*/
export function IncidentList({ error, incidents, loading }: {
  error?: Error;
  incidents: BasicIncident[];
  loading?: boolean;
}) {
  // Show a message if the incidents are loading
  if (loading) {
    return (
      <Typography variant="body2" color="textSecondary">
        Loading incidents...
      </Typography>
    );
  }

  // Show a message if the incidents are unavailable
  if (error) {
    return (
      <Typography variant="body2" color="textSecondary">
        Incidents are still unavailable. Use Refresh to try again.
      </Typography>
    );
  }

  // Show a message if there are no incidents
  if (incidents.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No recent incidents.
      </Typography>
    );
  }

  // Return the incident list
  return (
    <Box>
      {incidents.map((incident, index) => (
        <Box key={incident.id}>
          {index > 0 ? <Divider /> : null}
          <Box py={1}>
            <Box display="flex" alignItems="center" style={{ gap: 8 }}>
              <Chip label={incident.type} size="small" />
              <Typography variant="body2">
                {new Date(incident.startedAt).toLocaleString()}
              </Typography>
            </Box>
            <Typography variant="caption" color="textSecondary" component="div">
              {formatDuration(incident.durationSeconds)}
              {incident.reason ? ` - ${incident.reason}` : ''}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/** Hook to fetch the incidents
 * 
 * @param summary - The summary of the monitor
 * @param refreshNonce - The refresh nonce
 * @returns The incidents
 */
export function useBasicIncidents(summary: MonitorSummaryStats | undefined, refreshNonce: number): AsyncState<BasicIncident[]> {
  const { entity } = useEntity();
  const { fetch } = useApi(fetchApiRef);
  const entityRef = stringifyEntityRef(entity);
  const url = summary
    ? buildEntityStatsUrl(entityRef, 'incidents', refreshNonce)
    : undefined;

  return useAsync(async (): Promise<BasicIncident[] | undefined> => {
    if (!url) return undefined;
    return fetchUptimeRobotJson(fetch, url);
  }, [fetch, url]);
}
