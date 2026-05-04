import { renderWithEffects, wrapInTestApp } from '@backstage/test-utils';
import { screen } from '@testing-library/react';
import { IncidentList } from '../components/UptimeRobotCard/parts/IncidentsList';
import type { BasicIncident } from '../types';

describe('IncidentList', () => {
  it('shows a loading message', async () => {
    await renderWithEffects(wrapInTestApp(<IncidentList incidents={[]} loading />));
    expect(screen.getByText('Loading incidents...')).toBeInTheDocument();
  });

  it('shows a soft error hint', async () => {
    await renderWithEffects(wrapInTestApp(<IncidentList incidents={[]} error={new Error('nope')} />));
    expect(screen.getByText(/Incidents are still unavailable/)).toBeInTheDocument();
  });

  it('shows empty copy', async () => {
    await renderWithEffects(wrapInTestApp(<IncidentList incidents={[]} />));
    expect(screen.getByText('No recent incidents.')).toBeInTheDocument();
  });

  it('renders incident rows', async () => {
    const incidents: BasicIncident[] = [
      {
        id: 'a',
        type: 'down',
        startedAt: '2024-01-15T12:00:00.000Z',
        durationSeconds: 90,
        reason: 'blip',
      },
    ];
    await renderWithEffects(wrapInTestApp(<IncidentList incidents={incidents} />));
    expect(screen.getByText('down')).toBeInTheDocument();
    expect(screen.getByText(/1m down/)).toBeInTheDocument();
    expect(screen.getByText(/blip/)).toBeInTheDocument();
  });
});
