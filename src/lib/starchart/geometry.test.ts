import { describe, it, expect } from 'vitest';
import { layoutRing } from './geometry';
import { seed } from '$lib/data/seed';

describe('layoutRing', () => {
  const placed = layoutRing(seed.regions, { cx: 100, cy: 100, rx: 80, ry: 40 });
  it('places every region once', () => {
    expect(placed).toHaveLength(seed.regions.length);
    expect(new Set(placed.map((p) => p.region.id)).size).toBe(seed.regions.length);
  });
  it('keeps points within the ellipse bounds', () => {
    for (const p of placed) {
      expect(p.x).toBeGreaterThanOrEqual(100 - 80 - p.r);
      expect(p.x).toBeLessThanOrEqual(100 + 80 + p.r);
    }
  });
  it('paints back-to-front (ascending front)', () => {
    for (let i = 1; i < placed.length; i++) {
      expect(placed[i].front).toBeGreaterThanOrEqual(placed[i - 1].front);
    }
  });
  it('makes front planets larger than back planets', () => {
    const front = placed[placed.length - 1];
    const back = placed[0];
    expect(front.r).toBeGreaterThan(back.r);
  });
});
