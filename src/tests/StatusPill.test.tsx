import { renderWithEffects, wrapInTestApp } from '@backstage/test-utils';
import { screen } from '@testing-library/react';
import { StatusPill } from '../components/UptimeRobotCard/parts/StatusPill';

describe('StatusPill', () => {
  it('renders operational styling for Up monitors', async () => {
    await renderWithEffects(wrapInTestApp(<StatusPill status="Up" />));
    expect(screen.getByText('Operational')).toBeInTheDocument();
  });

  it('renders the raw status label for non-up monitors', async () => {
    await renderWithEffects(wrapInTestApp(<StatusPill status="Down" />));
    expect(screen.getByText('Down')).toBeInTheDocument();
  });
});
