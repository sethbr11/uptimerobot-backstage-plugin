import { InfoCard, Progress, ResponseErrorPanel } from '@backstage/core-components';
import Box from '@material-ui/core/Box';
import Link from '@material-ui/core/Link';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CachedIcon from '@material-ui/icons/Cached';
import { useState } from 'react';
import { DailyUptimeChart, IncidentList, MetricGrid, Metric, ResponseTimeChart, StatusPill } from './parts';
import { useUptimeRobotStatsSummary, useUptimeRobotDailyUptime, useUptimeRobotResponseTime, useUptimeRobotIncidents } from './parts';
import { formatPercent } from './utils';

/** The UptimeRobot card component
 * 
 * @returns The UptimeRobot card
*/
export function UptimeRobotCard() {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const { value, loading, error } = useUptimeRobotStatsSummary(refreshNonce);
  const {
    value: dailyUptime,
    loading: dailyUptimeLoading,
    error: dailyUptimeError,
  } = useUptimeRobotDailyUptime(value, refreshNonce);
  const {
    value: responseTime,
    loading: responseTimeLoading,
    error: responseTimeError,
  } = useUptimeRobotResponseTime(value, refreshNonce);
  const {
    value: loadedIncidents,
    loading: incidentsLoading,
    error: incidentsError,
  } = useUptimeRobotIncidents(value, refreshNonce);
  const [showAllIncidents, setShowAllIncidents] = useState(false);

  // Show a loading indicator while fetching stats
  if (loading) {
    return (
      <InfoCard title="UptimeRobot">
        <Progress />
      </InfoCard>
    );
  }

  // Show an error message if the stats cannot be fetched
  if (error) {
    return (
      <InfoCard title="UptimeRobot">
        <ResponseErrorPanel error={error} />
      </InfoCard>
    );
  }

  // Show nothing if the stats are not available
  if (!value) return null;

  // Show the incidents
  const allIncidents = loadedIncidents ?? [];
  const incidents = showAllIncidents
    ? allIncidents
    : allIncidents.slice(0, 2);
  const activeResponseTime = responseTime ?? value.responseTime;

  // Show the card
  return (
    <InfoCard
      title="UptimeRobot"
      subheader={
        value.monitor.url ? (
          <Link href={value.monitor.url} target="_blank" rel="noopener noreferrer" color="inherit">
            {value.monitor.name}
          </Link>
        ) : (
          value.monitor.name
        )
      }
      action={
        <IconButton
          aria-label="Refresh UptimeRobot stats"
          disabled={loading}
          title="Refresh"
          onClick={() => setRefreshNonce(current => current + 1)}
        >
          <CachedIcon />
        </IconButton>
      }
    >
      {/* Optional graphs (see uptimerobot.graphs in app-config) */}
      {value.display.dailyUptime ? (
        <DailyUptimeChart
          chartDayCount={value.display.dailyUptimeDays}
          days={dailyUptime ?? []}
          error={dailyUptimeError}
          loading={dailyUptimeLoading}
          status={value.monitor.status}
        />
      ) : (
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">Monitor status</Typography>
          <StatusPill status={value.monitor.status} />
        </Box>
      )}

      {value.display.responseTime && activeResponseTime ? (
        <ResponseTimeChart
          data={activeResponseTime}
          error={responseTimeError}
          loading={responseTimeLoading}
        />
      ) : null}

      {/* Show the uptime metrics */}
      <Box mt={2}>
        <Typography variant="subtitle2" gutterBottom>
          Uptime
        </Typography>
        <MetricGrid>
          <Metric
            label="Last 24 hours"
            value={formatPercent(value.uptime.last24Hours)}
          />
          <Metric
            label="Last 7 days"
            value={formatPercent(value.uptime.last7Days)}
          />
          <Metric
            label={`Last ${value.display.dailyUptimeDays} days`}
            value={formatPercent(value.uptime.last30Days)}
          />
          <Metric
            label="Last 90 days"
            value={formatPercent(value.uptime.last90Days)}
          />
        </MetricGrid>
      </Box>

      {/* Show the latest incidents */}
      <Box mt={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">Latest Incidents</Typography>
          {!incidentsLoading && allIncidents.length > 2 ? (
            <Button
              size="small"
              onClick={() => setShowAllIncidents(current => !current)}
            >
              {showAllIncidents ? 'Show less' : 'Show all'}
            </Button>
          ) : null}
        </Box>
        <IncidentList
          error={incidentsError}
          incidents={incidents}
          loading={incidentsLoading}
        />
      </Box>
    </InfoCard>
  );
}
