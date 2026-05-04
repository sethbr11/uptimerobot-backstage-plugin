import Box from '@material-ui/core/Box';
import Divider from '@material-ui/core/Divider';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import { useEffect, useRef, useState } from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { fetchApiRef } from '@backstage/core-plugin-api';
import { stringifyEntityRef } from '@backstage/catalog-model';
import useAsync, { AsyncState } from 'react-use/esm/useAsync';
import type { MonitorSummaryStats, APIResponseTimeChart } from '../../../types';
import { buildEntityStatsUrl, fetchUptimeRobotJson, formatMs, formatTs } from '../utils';

// ////////////////////////////////////////////
//               CONSTANTS                  //
// ////////////////////////////////////////////

const DEFAULT_CHART_WIDTH = 720;
const CHART_HEIGHT = 150;
const PAD_L = 44;
const PAD_R = 6;
const PAD_T = 10;
const PAD_B = 10;
const PLOT_X1 = PAD_L;
const PLOT_Y1 = PAD_T;
const PLOT_Y2 = CHART_HEIGHT - PAD_B;
const INNER_H = PLOT_Y2 - PLOT_Y1;

const LINE_COLOR = '#2ecc71';
const FILL_COLOR = 'rgba(46, 204, 113, 0.18)';

// ////////////////////////////////////////////
//         EXPORTED COMPONENTS/HOOKS         //
// ////////////////////////////////////////////

/** The response time chart component
 * 
 * @param data - The data of the response time
 * @param error - The error of the response time
 * @param loading - The loading state of the response time
 * @returns The response time chart
 */
export function ResponseTimeChart({
  data,
  error,
  loading,
}: {
  data: APIResponseTimeChart;
  error?: Error;
  loading?: boolean;
}) {
  const { windowDays, avgMs, maxMs, minMs, series: seriesProp } = data;
  const series = seriesProp ?? [];
  let chartContent;

  // Assign chart content to loading/error/no data messages, or the chart if data is available
  if (loading && series.length === 0) {
    chartContent = (
      <Typography variant="body2" color="textSecondary">
        Loading response time chart...
      </Typography>
    );
  } else if (error && series.length === 0) {
    chartContent = (
      <Typography variant="body2" color="textSecondary">
        Response time chart is still unavailable. Use Refresh to try again.
      </Typography>
    );
  } else if (series.length === 0) {
    chartContent = (
      <Typography variant="body2" color="textSecondary">
        No response time series loaded for this period. Some monitor types may not expose response time, or the
        request failed.
      </Typography>
    );
  } else {
    chartContent = <ResponseTimeSvg series={series} />;
  }

  // Return the response time chart
  return (
    <Box mt={2}>
      <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={1}>
        <Box>
          <Typography variant="subtitle2" component="span">
            Response time
          </Typography>
          <Typography component="span" color="textSecondary">
            {' '}
            Last {windowDays} days
          </Typography>
        </Box>
      </Box>

      {chartContent}

      <Box display="flex" mt={2} style={{ gap: 0 }}>
        <Box flex={1} pr={1} textAlign="center">
          <Typography variant="h6" component="div">
            {formatMs(avgMs)}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Avg. response time
          </Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box flex={1} px={1} textAlign="center">
          <Typography variant="h6" component="div">
            {formatMs(maxMs)}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Max. response time
          </Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box flex={1} pl={1} textAlign="center">
          <Typography variant="h6" component="div">
            {formatMs(minMs)}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Min. response time
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

/** Hook to fetch the response time
 * 
 * @param summary - The summary of the monitor
 * @param refreshNonce - The refresh nonce
 * @returns The response time
 */
export function useResponseTime(
  summary: MonitorSummaryStats | undefined,
  refreshNonce: number,
): AsyncState<APIResponseTimeChart | undefined> {
  const { entity } = useEntity();
  const { fetch } = useApi(fetchApiRef);
  const entityRef = stringifyEntityRef(entity);

  // Build the URL for the response time data
  const url = summary?.display.responseTime
    ? buildEntityStatsUrl(entityRef, 'response-time', refreshNonce)
    : undefined;

  // Return the response time data
  return useAsync(async (): Promise<APIResponseTimeChart | undefined> => {
    if (!url) return undefined;
    const responseTime = await fetchUptimeRobotJson<APIResponseTimeChart | null>(fetch, url);
    return responseTime ?? undefined;
  }, [fetch, url]);
}

// ////////////////////////////////////////////
//               HELPER FUNCTIONS            //
// ////////////////////////////////////////////

/** The response time SVG component
 * 
 * @param series - The series of the response time
 * @returns The response time SVG
 */
function ResponseTimeSvg({ series }: { series: APIResponseTimeChart['series'] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(DEFAULT_CHART_WIDTH);
  const plotX2 = chartWidth - PAD_R;
  const innerW = plotX2 - PLOT_X1;

  // Update the chart width when the container is resized
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const updateWidth = () => {
      const width = Math.round(element.getBoundingClientRect().width);
      if (width > 0) setChartWidth(width);
    };

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate the minimum and maximum values for the chart
  const values = series.map(p => p.valueMs);
  let minV = Math.min(...values);
  let maxV = Math.max(...values);
  if (minV === maxV) {
    maxV = minV + 1;
  }
  const padY = (maxV - minV) * 0.08;
  minV = Math.max(0, minV - padY);
  maxV += padY;

  // Calculate the x and y values for the chart
  const xAt = (i: number) =>
    PLOT_X1 + (series.length > 1 ? (i / (series.length - 1)) * innerW : innerW / 2);
  const yAt = (v: number) => PLOT_Y2 - ((v - minV) / (maxV - minV)) * INNER_H;

  const points = series.map((p, i) => ({ x: xAt(i), y: yAt(p.valueMs), ...p }));

  // If there is only one point, return a single point chart
  if (points.length === 1) {
    const pt = points[0];
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
          width="100%"
          height={CHART_HEIGHT}
          style={{ display: 'block' }}
          role="img"
          aria-label="Single response time sample"
        >
          <Tooltip title={`${formatTs(pt.timestamp)}: ${formatMs(pt.valueMs)}`} enterDelay={200}>
            <g style={{ cursor: 'pointer' }}>
              <circle cx={pt.x} cy={pt.y} r={8} fill="transparent" />
              <circle cx={pt.x} cy={pt.y} r={4} fill={LINE_COLOR} pointerEvents="none" />
            </g>
          </Tooltip>
        </svg>
      </div>
    );
  }

  // Calculate the line and area data for the chart
  const lineD = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const areaD = `${lineD} L ${points[points.length - 1]?.x ?? plotX2} ${PLOT_Y2} L ${points[0]?.x ?? PLOT_X1} ${PLOT_Y2} Z`;

  // Calculate the reference value for the chart
  const refMs = 400;
  const showRef = refMs > minV && refMs < maxV;
  const refY = yAt(refMs);

  // Return the response time SVG
  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
        width="100%"
        height={CHART_HEIGHT}
        style={{ display: 'block' }}
        role="img"
        aria-label={`Response time over time, ${series.length} samples`}
      >
        {showRef ? (
          <g>
            <line
              x1={PLOT_X1}
              x2={plotX2}
              y1={refY}
              y2={refY}
              stroke="#bdbdbd"
              strokeWidth={0.75}
              strokeDasharray="3 3"
            />
            <text x={4} y={refY + 3} fill="#757575" fontSize={10}>
              {refMs}ms
            </text>
          </g>
        ) : null}
        <path d={areaD} fill={FILL_COLOR} stroke="none" />
        <path d={lineD} fill="none" stroke={LINE_COLOR} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        {points.map((pt, i) => (
          <Tooltip
            key={`${pt.timestamp}-${i}`}
            title={`${formatTs(pt.timestamp)}: ${formatMs(pt.valueMs)}`}
            enterDelay={200}
          >
            <g style={{ cursor: 'pointer' }}>
              <circle cx={pt.x} cy={pt.y} r={6} fill="transparent" />
              <circle cx={pt.x} cy={pt.y} r={3} fill={LINE_COLOR} pointerEvents="none" />
            </g>
          </Tooltip>
        ))}
      </svg>
    </div>
  );
}
