import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import StarChart from './StarChart.svelte';
import { seed } from '$lib/data/seed';

describe('StarChart', () => {
  const base = { regions: seed.regions, selectedId: 'venus', statusOf: () => 'none' as const };
  it('renders a label per region', () => {
    render(StarChart, { ...base, onselect: () => {} });
    expect(screen.getByText('EARTH')).toBeInTheDocument();
    expect(screen.getByText('VENUS')).toBeInTheDocument();
  });
  it('fires onselect with the region id on click', async () => {
    const onselect = vi.fn();
    render(StarChart, { ...base, onselect });
    await screen.getByText('MARS').click();
    expect(onselect).toHaveBeenCalledWith('mars');
  });
});
