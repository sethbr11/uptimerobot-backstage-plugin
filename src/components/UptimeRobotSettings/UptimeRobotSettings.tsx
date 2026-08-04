import { useState } from 'react';
import { InfoCard, Progress } from '@backstage/core-components';
import { parseEntityRef, stringifyEntityRef, type Entity } from '@backstage/catalog-model';
import { fetchApiRef, useApi } from '@backstage/frontend-plugin-api';
import { CatalogAutocomplete, catalogApiRef } from '@backstage/plugin-catalog-react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import Divider from '@material-ui/core/Divider';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Typography from '@material-ui/core/Typography';
import useAsync from 'react-use/esm/useAsync';
import { isUptimeRobotConfigured } from '../../entity';
import { UPTIMEROBOT_DEFAULT_ENTITY_ANNOTATION } from '../../annotationDefaults';
import { fetchPluginJson } from '../sharedUtils';

// ////////////////////////////////////////////
//              TYPES DEFINITIONS            //
// ////////////////////////////////////////////

/** The daily uptime cache stats type
 * 
 * @property records - The number of records
 * @property components - The number of components
 * @property oldestDate - The oldest date
 * @property newestDate - The newest date
 */
type DailyUptimeCacheStats = {
  records: number;
  components: number;
  oldestDate?: string;
  newestDate?: string;
};

/** The reset result type
 * 
 * @property deleted - The number of deleted records
 */
type ResetResult = {
  deleted: number;
};

/** The UptimeRobot component option type
 * 
 * @property entityRef - The entity reference
 * @property label - The label
 */
type UptimeRobotComponentOption = {
  entityRef: string;
  label: string;
};


// ////////////////////////////////////////////
//               MAIN COMPONENT              //
// ////////////////////////////////////////////

/** Props for {@link UptimeRobotSettings}.
 *
 * Host apps supply these when overriding the settings SubPage so feature scoping
 * (owners vs DevOps, custom group checks, etc.) stays in app code.
 */
export type UptimeRobotSettingsProps = {
  /**
   * When `true`, shows the destructive "reset all" control.
   * Defaults to `false`. Backend enforces `uptimerobot.cache.reset` when
   * the permission framework is enabled.
   */
  showResetAll?: boolean;
  /**
   * When `true`, shows the per-component reset picker and button.
   * Defaults to `false`. Backend enforces `uptimerobot.cache.reset-entity`
   * (catalog-entity resource permission) when the permission framework is enabled.
   */
  showResetComponents?: boolean;
  /**
   * Optional host filter applied after the built-in UptimeRobot annotation filter.
   * Use this to limit the picker to entities the signed-in user may reset
   * (for example catalog ownership). Omit to list all annotated Components.
   */
  filterResettableEntities?: (entity: Entity) => boolean;
  /**
   * When `false`, only entities from the options list can be selected
   * (blocks free-typing arbitrary entity refs). Defaults to `false` so hosts
   * must opt in (typical for admin/DevOps override flows).
   */
  allowArbitraryEntityRefs?: boolean;
};

/** Settings page for UptimeRobot cached stats maintenance.
 * 
 * @returns The UptimeRobot settings page
 */
export function UptimeRobotSettings(
  props: UptimeRobotSettingsProps = {},
): JSX.Element {
  const {
    showResetAll = false,
    showResetComponents = false,
    filterResettableEntities,
    allowArbitraryEntityRefs = false,
  } = props;
  const { fetch } = useApi(fetchApiRef);
  const catalogApi = useApi(catalogApiRef);
  const [entityRefs, setEntityRefs] = useState<string[]>([]);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [confirmResetEntity, setConfirmResetEntity] = useState(false);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  const [refreshNonce, setRefreshNonce] = useState(0);

  const {
    value: stats,
    loading,
    error: statsError,
  } = useAsync(
    async (): Promise<DailyUptimeCacheStats> =>
      fetchPluginJson(fetch, 'plugin://uptimerobot/stats-cache/daily-uptime'),
    [fetch, refreshNonce],
  );
  const {
    value: componentOptions = [],
    loading: componentOptionsLoading,
    error: componentOptionsError,
  } = useAsync(async (): Promise<UptimeRobotComponentOption[]> => {
    if (!showResetComponents) return [];

    const { items } = await catalogApi.getEntities({
      filter: {
        kind: 'Component',
      },
      fields: [
        'kind',
        'metadata.name',
        'metadata.namespace',
        'metadata.title',
        'metadata.annotations',
        'spec.owner',
        'relations',
      ],
      limit: 5000,
    });

    return items
      .filter(isUptimeRobotConfigured)
      .filter(entity => (filterResettableEntities ? filterResettableEntities(entity) : true))
      .map(formatEntityOption)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [catalogApi, showResetComponents, filterResettableEntities]);

  const optionLabels = new Map(
    componentOptions.map(option => [option.entityRef, option.label]),
  );

  const resetAll = async () => {
    setError(undefined);
    setStatus(undefined);

    try {
      const result = await fetchPluginJson<ResetResult>(fetch, 'plugin://uptimerobot/stats-cache/daily-uptime', {
        init: { method: 'DELETE' },
      });
      setStatus(`Reset all cached daily uptime stats. Deleted ${result.deleted} records.`);
      setConfirmResetAll(false);
      setRefreshNonce(current => current + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const resetEntities = async () => {
    setError(undefined);
    setStatus(undefined);
    const trimmedEntityRefs = entityRefs.map(ref => ref.trim()).filter(Boolean);
    if (trimmedEntityRefs.length === 0) return;

    try {
      const results = await Promise.all(
        trimmedEntityRefs.map(entityRef =>
          fetchPluginJson<ResetResult>(fetch, entityRefToDailyUptimeCacheUrl(entityRef), {
            init: { method: 'DELETE' },
          }),
        ),
      );
      const deleted = results.reduce((total, result) => total + result.deleted, 0);
      setStatus(
        `Reset cached daily uptime stats for ${trimmedEntityRefs.length} components. Deleted ${deleted} records.`,
      );
      setConfirmResetEntity(false);
      setRefreshNonce(current => current + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <InfoCard title="UptimeRobot Stats Cache">
      <Box display="grid" gridGap={16}>
        <Typography variant="body2" color="textSecondary">
          Daily uptime records are cached by UTC calendar day. Historical cached days are reused, while today and
          missing days are fetched from UptimeRobot.
        </Typography>

        {loading ? <Progress /> : null}
        {statsError ? (
          <Typography variant="body2" color="error">
            Failed to load cache stats: {statsError.message}
          </Typography>
        ) : null}
        {stats ? (
          <Typography variant="body2">
            {stats.records} cached records across {stats.components} components
            {stats.oldestDate && stats.newestDate
              ? ` (${stats.oldestDate} to ${stats.newestDate})`
              : ''}
          </Typography>
        ) : null}

        {showResetComponents ? (
          <>
            <Divider />

            <Box display="grid" gridGap={8}>
              <Typography variant="subtitle2">Reset components</Typography>
              {allowArbitraryEntityRefs ? (
                <CatalogAutocomplete<string, true, false, true>
                  multiple
                  freeSolo
                  disableCloseOnSelect
                  label="Components"
                  name="uptimerobot-reset-components"
                  loading={componentOptionsLoading}
                  options={componentOptions.map(option => option.entityRef)}
                  value={entityRefs}
                  TextFieldProps={{
                    helperText: componentOptionsError
                      ? `Failed to load component options: ${componentOptionsError.message}`
                      : `Type an entity ref, or choose components annotated with ${UPTIMEROBOT_DEFAULT_ENTITY_ANNOTATION}.`,
                  }}
                  getOptionLabel={option => optionLabels.get(option) ?? option}
                  onChange={(_event, nextEntityRefs) => {
                    setEntityRefs(
                      nextEntityRefs
                        .map(ref => ref.trim())
                        .filter((ref, index, refs) => ref && refs.indexOf(ref) === index),
                    );
                    setConfirmResetEntity(false);
                  }}
                />
              ) : (
                <CatalogAutocomplete<string, true, false, false>
                  multiple
                  freeSolo={false}
                  disableCloseOnSelect
                  label="Components"
                  name="uptimerobot-reset-components"
                  loading={componentOptionsLoading}
                  options={componentOptions.map(option => option.entityRef)}
                  value={entityRefs}
                  TextFieldProps={{
                    helperText: componentOptionsError
                      ? `Failed to load component options: ${componentOptionsError.message}`
                      : `Choose components annotated with ${UPTIMEROBOT_DEFAULT_ENTITY_ANNOTATION}.`,
                  }}
                  getOptionLabel={option => optionLabels.get(option) ?? option}
                  onChange={(_event, nextEntityRefs) => {
                    const allowed = new Set(
                      componentOptions.map(option => option.entityRef),
                    );
                    setEntityRefs(
                      nextEntityRefs
                        .map(ref => ref.trim())
                        .filter((ref, index, refs) => ref && refs.indexOf(ref) === index)
                        .filter(ref => allowed.has(ref)),
                    );
                    setConfirmResetEntity(false);
                  }}
                />
              )}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={confirmResetEntity}
                    onChange={event => setConfirmResetEntity(event.target.checked)}
                  />
                }
                label="I understand this will delete cached daily uptime rows for the selected components."
              />
              <Box>
                <Button
                  color="primary"
                  disabled={entityRefs.length === 0 || !confirmResetEntity}
                  variant="outlined"
                  onClick={resetEntities}
                >
                  Reset Component Caches
                </Button>
              </Box>
            </Box>
          </>
        ) : null}

        {showResetAll ? (
          <>
            <Divider />

            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={confirmResetAll}
                    onChange={event => setConfirmResetAll(event.target.checked)}
                  />
                }
                label="I understand this will delete all cached UptimeRobot daily uptime rows."
              />
              <Box>
                <Button
                  color="secondary"
                  disabled={!confirmResetAll}
                  variant="outlined"
                  onClick={resetAll}
                >
                  Reset All UptimeRobot Daily Stats
                </Button>
              </Box>
            </Box>
          </>
        ) : null}

        {status ? (
          <Typography variant="body2" color="textSecondary">
            {status}
          </Typography>
        ) : null}
        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : null}
      </Box>
    </InfoCard>
  );
}


// ////////////////////////////////////////////
//               HELPER FUNCTIONS            //
// ////////////////////////////////////////////

/** Formats the entity option
 * 
 * @param entity - The entity to format
 * @returns The entity option
 */
function formatEntityOption(entity: Entity): UptimeRobotComponentOption {
  const entityRef = stringifyEntityRef(entity);
  const title = entity.metadata.title ?? entity.metadata.name;
  return {
    entityRef,
    label: title === entityRef ? entityRef : `${title} (${entityRef})`,
  };
}

/** Converts the entity reference to the daily uptime cache URL
 * 
 * @param entityRef - The entity reference
 * @returns The daily uptime cache URL
 */
function entityRefToDailyUptimeCacheUrl(entityRef: string): string {
  const parsed = parseEntityRef(entityRef, {
    defaultKind: 'component',
    defaultNamespace: 'default',
  });

  return `plugin://uptimerobot/entity/${encodeURIComponent(parsed.kind)}/${encodeURIComponent(
    parsed.namespace,
  )}/${encodeURIComponent(parsed.name)}/daily-uptime-cache`;
}