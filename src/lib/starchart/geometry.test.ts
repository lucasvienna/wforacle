import { describe, it, expect } from 'vitest';
import { layoutRing, layoutAnomalies } from './geometry';
import { seed } from '$lib/data/seed';
import type { Region } from '$lib/model/types';

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
		const noPhase = layoutRing(seed.regions, {
			cx: 100,
			cy: 100,
			rx: 80,
			ry: 40,
			phase: 0,
		});
		const mars = noPhase.find((p) => p.region.id === 'mars')!;

		expect(mars.x).toBeCloseTo(82.198325, 5);
		expect(mars.y).toBeCloseTo(138.997116, 5);
		expect(mars.front).toBeCloseTo(0.987464, 5);

		expect(mars.x).not.toBeCloseTo(27.922491, 1);
		expect(mars.y).not.toBeCloseTo(117.35535, 1);
		expect(mars.front).not.toBeCloseTo(0.716942, 1);
	});
});

describe('layoutAnomalies', () => {
	const planets = layoutRing(seed.regions, { cx: 100, cy: 100, rx: 80, ry: 40 });

	const deimos: Region = {
		id: 'deimos',
		name: 'Deimos',
		kind: 'special',
		progressionOrder: 15,
		factions: ['Infested'],
		nodeIds: [],
		spoilerGated: true,
		resourceIds: [],
		questId: 'heartofdeimos',
	};
	const kuvafortress: Region = {
		id: 'kuvafortress',
		name: 'Kuva Fortress',
		kind: 'special',
		progressionOrder: 18,
		factions: ['Grineer'],
		nodeIds: [],
		spoilerGated: true,
		resourceIds: [],
	};
	const lua: Region = {
		id: 'lua',
		name: 'Lua',
		kind: 'special',
		progressionOrder: 17,
		factions: ['Sentient'],
		nodeIds: [],
		spoilerGated: true,
		resourceIds: [],
	};
	const void_: Region = {
		id: 'void',
		name: 'Void',
		kind: 'special',
		progressionOrder: 16,
		factions: ['Corrupted'],
		nodeIds: [],
		spoilerGated: true,
		resourceIds: [],
	};
	const zariman: Region = {
		id: 'zariman',
		name: 'Zariman',
		kind: 'special',
		progressionOrder: 19,
		factions: ['Sentient'],
		nodeIds: [],
		spoilerGated: false,
		resourceIds: [],
	};

	const specialRegions = [deimos, kuvafortress, lua, void_, zariman];
	const placed = layoutAnomalies(specialRegions, planets, {
		cx: 100,
		cy: 100,
		rx: 60,
		ry: 40,
	});

	it('places every region once', () => {
		expect(placed).toHaveLength(specialRegions.length);
		expect(new Set(placed.map((p) => p.region.id)).size).toBe(specialRegions.length);
	});

	it('keeps radii within the documented anomaly range', () => {
		for (const p of placed) {
			expect(p.r).toBeGreaterThanOrEqual(9);
			expect(p.r).toBeLessThanOrEqual(16);
		}
	});

	it('paints back-to-front (ascending front)', () => {
		for (let i = 1; i < placed.length; i++) {
			expect(placed[i].front).toBeGreaterThanOrEqual(placed[i - 1].front);
		}
	});

	// The chart centre these anomalies are placed relative to (matches the opts above).
	const CX = 100;
	const CY = 100;
	// Positive when `p` sits on the inside of the ellipse relative to `planet`,
	// i.e. offset from the planet toward the chart centre.
	const towardCentre = (p: { x: number; y: number }, planet: { x: number; y: number }) =>
		(p.x - planet.x) * (CX - planet.x) + (p.y - planet.y) * (CY - planet.y);
	const dist = (p: { x: number; y: number }, q: { x: number; y: number }) =>
		Math.hypot(p.x - q.x, p.y - q.y);

	it('fans Deimos (right) and Kuva Fortress (left) into a triangle inside the ellipse near Mars', () => {
		const mars = planets.find((p) => p.region.id === 'mars')!;
		const deimosPlaced = placed.find((p) => p.region.id === 'deimos')!;
		const kuvaPlaced = placed.find((p) => p.region.id === 'kuvafortress')!;

		for (const p of [deimosPlaced, kuvaPlaced]) {
			// on the inside of the ellipse (offset toward the centre, not outward)
			expect(towardCentre(p, mars)).toBeGreaterThan(0);
			// still in Mars's neighbourhood, not flung across the chart
			expect(dist(p, mars)).toBeLessThan(mars.r + 22 + 42 + 20);
		}
		// Deimos sits to the right of Kuva Fortress (fanned to opposite sides),
		// and the two are well separated so their labels never collide.
		expect(deimosPlaced.x).toBeGreaterThan(kuvaPlaced.x);
		expect(dist(deimosPlaced, kuvaPlaced)).toBeGreaterThan(60);
	});

	it('anchors Lua inside the ellipse near Earth', () => {
		const earth = planets.find((p) => p.region.id === 'earth')!;
		const luaPlaced = placed.find((p) => p.region.id === 'lua')!;

		expect(towardCentre(luaPlaced, earth)).toBeGreaterThan(0);
		expect(dist(luaPlaced, earth)).toBeLessThan(earth.r + 24 + 20);
	});

	it('keeps unanchored special regions (Void, Zariman) on the inner arc', () => {
		const voidPlaced = placed.find((p) => p.region.id === 'void')!;
		const zarimanPlaced = placed.find((p) => p.region.id === 'zariman')!;

		for (const p of [voidPlaced, zarimanPlaced]) {
			expect(p.x).toBeGreaterThanOrEqual(100 - 60 - p.r);
			expect(p.x).toBeLessThanOrEqual(100 + 60 + p.r);
			expect(p.y).toBeGreaterThanOrEqual(100 - 40 - p.r);
			expect(p.y).toBeLessThanOrEqual(100 + 40 + p.r);
		}
	});
});
