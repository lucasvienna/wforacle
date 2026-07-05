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
  it('keeps points within the ellipse y-bounds', () => {
    for (const p of placed) {
      expect(p.y).toBeGreaterThanOrEqual(100 - 40 - p.r);
      expect(p.y).toBeLessThanOrEqual(100 + 40 + p.r);
    }
  });
  it('keeps radii within the documented range', () => {
    for (const p of placed) {
      expect(p.r).toBeGreaterThanOrEqual(13);
      expect(p.r).toBeLessThanOrEqual(30);
    }
  });
  it('places regions by progressionOrder rank, not array order', () => {
    // seed.regions array order is Earth, Venus, Mercury, Mars, Phobos, Ceres, Jupiter
    // but progressionOrder ranks are Earth1, Venus2, Mars3, Phobos4, Ceres5, Mercury6, Jupiter7.
    // Mars (array idx 3) and Mercury (array idx 2) swap once sorted by progressionOrder,
    // so Mars must land at sorted-index i=2 (of 7), not its array index i=3.
    //
    // Expected values hand-computed from the layoutRing formula
    // (t = (i/n)*2*PI + phase; x = cx + rx*cos(t); y = cy + ry*sin(t); front = (sin(t)+1)/2)
    // with cx=100, cy=100, rx=80, ry=40, phase=0, n=7:
    //   i=2 (correct, progressionOrder-sorted position): x≈82.198325, y≈138.997116, front≈0.987464
    //   i=3 (wrong, if the sort were dropped and array order used): x≈27.922491, y≈117.355350, front≈0.716942
    const noPhase = layoutRing(seed.regions, { cx: 100, cy: 100, rx: 80, ry: 40, phase: 0 });
    const mars = noPhase.find((p) => p.region.id === 'mars')!;

    expect(mars.x).toBeCloseTo(82.198325, 5);
    expect(mars.y).toBeCloseTo(138.997116, 5);
    expect(mars.front).toBeCloseTo(0.987464, 5);

    expect(mars.x).not.toBeCloseTo(27.922491, 1);
    expect(mars.y).not.toBeCloseTo(117.355350, 1);
    expect(mars.front).not.toBeCloseTo(0.716942, 1);
  });
});
