import Tooltip from '@material-ui/core/Tooltip';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import { Progress } from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { fetchApiRef } from '@backstage/core-plugin-api';
import { stringifyEntityRef } from '@backstage/catalog-model';
import useAsync from 'react-use/esm/useAsync';
import { useLayoutEffect, useRef } from 'react';
import { DailyUptime, MonitorSummaryStats } from '../../../types';
import { buildEntityStatsUrl, formatPercent, fetchUptimeRobotJson, formatDate } from '../utils';
import { StatusPill } from './StatusPill';

// ////////////////////////////////////////////
//              STYLING HELPERS              //
// ////////////////////////////////////////////

/** The styles for the daily uptime chart
 * 
 * @returns The styles
 */
const useStyles = makeStyles({
  chartScroller: {
    overflowX: 'auto',
    overflowY: 'visible',
    scrollbarWidth: 'thin',
    scrollbarColor: '#cfd8dc transparent',
    '&::-webkit-scrollbar': {
      height: 8,
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: '#cfd8dc',
      borderRadius: 8,
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: '#b0bec5',
    },
  },
});

/** Gets the uptime color
 * 
 * @param value - The uptime value
 * @returns The uptime color
*/
function getUptimeColor(value?: number): string {
  if (value === undefined) return '#cfd8dc'; // Gray
  if (value >= 100) return '#2ecc71'; // Green
  if (value >= 99) return '#a8f0c6'; // Light green
  if (value >= 90) return '#f5a623'; // Yellow
  return '#e53935'; // Red
}

// ////////////////////////////////////////////
//         EXPORTED COMPONENTS/HOOKS         //
// ////////////////////////////////////////////

/** The daily uptime chart component
 * 
 * @param days - The days to display in the chart
 * @param status - The status of the monitor
 * @returns The daily uptime chart
*/
export function DailyUptimeChart({ chartDayCount, days = [], error, loading, status}: {
  chartDayCount: number;
  days?: DailyUptime[];
  error?: Error;
  loading?: boolean;
  status: string;
}) {
  const classes = useStyles();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  let chartContent;

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    // Start from the newest day when horizontal overflow exists.
    element.scrollLeft = element.scrollWidth;
  }, [chartDayCount, days.length, loading]);

  // Render indicators for loading/error/no data or of the chart itself if data is available
  if (loading) {
    chartContent = (
      <Box flex={1}>
        <Progress />
      </Box>
    );
  } else if (error) {
    chartContent = (
      <Typography variant="body2" color="textSecondary">
        Daily uptime is still unavailable. Use Refresh to try again.
      </Typography>
    );
  } else if (days.length > 0) {
    chartContent = days.map((day, index) => (
      <Tooltip
        key={`${day.date}-${index}`}
        arrow
        enterDelay={0}
        enterNextDelay={0}
        leaveDelay={0}
        placement="top"
        interactive
        PopperProps={{
          popperOptions: {
            positionFixed: true,
          },
          modifiers: {
            offset: {
              enabled: true,
              offset: '0, 0',
            },
            preventOverflow: {
              enabled: true,
              boundariesElement: 'window',
            },
            flip: {
              enabled: true,
            },
          },
        }}
        title={`${formatDate(day.date)}: ${formatPercent(
          day.uptimeRatio,
        )} uptime`}
      >
        <span
          aria-label={`${formatDate(day.date)} ${formatPercent(
            day.uptimeRatio,
          )} uptime`}
          style={{
            display: 'block',
            flex: '1 1 0',
            minWidth: Math.max(2, Math.floor(220 / Math.max(chartDayCount, 1))),
            height: 28,
            backgroundColor: getUptimeColor(day.uptimeRatio),
            borderRadius: 4,
            cursor: 'default',
          }}
        />
      </Tooltip>
    ));
  } else {
    chartContent = (
      <Typography variant="body2" color="textSecondary">
        No daily uptime loaded. If you recently hit the UptimeRobot rate limit (~10 requests per minute on
        the free plan), wait a minute and use Refresh.
      </Typography>
    );
  }

  // Return the daily uptime chart
  return (
    <Box>
      {/* Show the uptime title and status */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="subtitle2" component="span">
            Uptime
          </Typography>
          <Typography component="span" color="textSecondary">
            {' '}
            Last {chartDayCount} days
          </Typography>
        </Box>
        <StatusPill status={status} />
      </Box>

      {/* Show the daily uptime chart (horizontal scroll when many days / narrow card) */}
      <div ref={scrollRef} className={classes.chartScroller} style={{ width: '100%', marginTop: 16 }}>
        <Box
          display="flex"
          alignItems="flex-end"
          style={{
            gap: 4,
            minWidth: Math.max(days.length > 0 ? days.length * 7 : 0, 96),
          }}
          role="img"
          aria-label={`Daily uptime for the last ${chartDayCount} UTC calendar days`}
        >
          {chartContent}
        </Box>
      </div>
    </Box>
  );
}

/** Hook to fetch the daily uptime
 * 
 * @param summary - The summary of the monitor
 * @param refreshNonce - The refresh nonce
 * @returns The daily uptime
 */
export function useDailyUptime(
  summary: MonitorSummaryStats | undefined,
  refreshNonce: number,
) {
  const { entity } = useEntity();
  const { fetch } = useApi(fetchApiRef);
  const entityRef = stringifyEntityRef(entity);
  const url = summary?.display.dailyUptime
    ? buildEntityStatsUrl(entityRef, 'daily-uptime', refreshNonce)
    : undefined;

  return useAsync(async (): Promise<DailyUptime[] | undefined> => {
    if (!url) return undefined;
    return fetchUptimeRobotJson(fetch, url);
  }, [fetch, url]);
}
