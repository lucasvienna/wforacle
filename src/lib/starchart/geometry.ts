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

// Special regions positioned next to a thematically-related planet (moon/orbit).
// Regions absent here fall back to the inner anomaly arc.
const ANOMALY_ANCHORS: Record<string, string> = {
	deimos: 'mars',
	kuvafortress: 'mars',
	lua: 'earth',
};

export function layoutAnomalies(
	regions: Region[],
	planets: PlacedPlanet[] = [],
	opts: {
		cx?: number;
		cy?: number;
		rx?: number;
		ry?: number;
		phase?: number;
	} = {},
): PlacedPlanet[] {
	const { cx = 560, cy = 238, rx = 250, ry = 78, phase = 0.6 } = opts;
	const planetById = new Map(planets.map((p) => [p.region.id, p]));

	const anchored: Region[] = [];
	const free: Region[] = [];
	for (const region of regions) {
		const anchorId = ANOMALY_ANCHORS[region.id];
		if (anchorId && planetById.has(anchorId)) {
			anchored.push(region);
		} else {
			free.push(region);
		}
	}

	// Group anchored regions by their anchor planet, then stack them INWARD —
	// toward the chart centre, on the inside of the ellipse — at increasing
	// distances, so they never overlap the planet or each other's labels.
	const groups = new Map<string, Region[]>();
	for (const region of anchored) {
		const anchorId = ANOMALY_ANCHORS[region.id];
		const group = groups.get(anchorId) ?? [];
		group.push(region);
		groups.set(anchorId, group);
	}
	const anchoredPlaced: PlacedPlanet[] = [];
	for (const [anchorId, group] of groups) {
		const a = planetById.get(anchorId)!;
		// Unit vector from the planet toward the chart centre.
		let ux = cx - a.x;
		let uy = cy - a.y;
		const len = Math.hypot(ux, uy) || 1;
		ux /= len;
		uy /= len;
		group.forEach((region, j) => {
			const dist = a.r + 24 + j * 34; // step further inward per stacked anomaly
			anchoredPlaced.push({
				region,
				x: a.x + ux * dist,
				y: a.y + uy * dist,
				r: 12,
				front: a.front,
			});
		});
	}

	// Remaining special regions keep the original inner-arc placement.
	const ordered = [...free].sort((a, b) => a.progressionOrder - b.progressionOrder);
	const n = ordered.length;
	const freePlaced = ordered.map((region, i) => {
		const t = (i / n) * 2 * Math.PI + phase;
		const x = cx + rx * Math.cos(t);
		const y = cy + ry * Math.sin(t);
		const front = (Math.sin(t) + 1) / 2;
		const r = 9 + 7 * front; // [9,16] — smaller than planets, an inner anomaly arc
		return { region, x, y, r, front };
	});

	return [...anchoredPlaced, ...freePlaced].sort((a, b) => a.front - b.front);
}
