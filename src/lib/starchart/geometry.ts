import type { Region } from '$lib/model/types';

export interface PlacedPlanet {
	region: Region;
	x: number;
	y: number;
	r: number;
	front: number;
}

export function layoutRing(
	regions: Region[],
	opts: {
		cx?: number;
		cy?: number;
		rx?: number;
		ry?: number;
		phase?: number;
	} = {},
): PlacedPlanet[] {
	const { cx = 560, cy = 238, rx = 500, ry = 150, phase = 0.18 } = opts;
	const ordered = [...regions].sort((a, b) => a.progressionOrder - b.progressionOrder);
	const n = ordered.length;
	const placed = ordered.map((region, i) => {
		const t = (i / n) * 2 * Math.PI + phase;
		const x = cx + rx * Math.cos(t);
		const y = cy + ry * Math.sin(t);
		const front = (Math.sin(t) + 1) / 2;
		const r = 13 + 17 * front;
		return { region, x, y, r, front };
	});
	return placed.sort((a, b) => a.front - b.front);
}

export function layoutAnomalies(
	regions: Region[],
	opts: {
		cx?: number;
		cy?: number;
		rx?: number;
		ry?: number;
		phase?: number;
	} = {},
): PlacedPlanet[] {
	const { cx = 560, cy = 238, rx = 250, ry = 78, phase = 0.6 } = opts;
	const ordered = [...regions].sort((a, b) => a.progressionOrder - b.progressionOrder);
	const n = ordered.length;
	const placed = ordered.map((region, i) => {
		const t = (i / n) * 2 * Math.PI + phase;
		const x = cx + rx * Math.cos(t);
		const y = cy + ry * Math.sin(t);
		const front = (Math.sin(t) + 1) / 2;
		const r = 9 + 7 * front; // [9,16] — smaller than planets, an inner anomaly arc
		return { region, x, y, r, front };
	});
	return placed.sort((a, b) => a.front - b.front);
}
