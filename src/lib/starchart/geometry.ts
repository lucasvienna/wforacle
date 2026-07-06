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
// `lateral` fans multiple anomalies on the same planet sideways (perpendicular
// to the planet→centre line, +1 ≈ screen-right, -1 ≈ screen-left) so they and
// their labels don't collide — Deimos and Kuva Fortress form a triangle with
// Mars. Regions absent here fall back to the inner anomaly arc.
const ANOMALY_ANCHORS: Record<string, { planet: string; lateral: number }> = {
	deimos: { planet: 'mars', lateral: 1 },
	kuvafortress: { planet: 'mars', lateral: -1 },
	lua: { planet: 'earth', lateral: 0 },
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
		const cfg = ANOMALY_ANCHORS[region.id];
		if (cfg && planetById.has(cfg.planet)) {
			anchored.push(region);
		} else {
			free.push(region);
		}
	}

	// Place each anchored anomaly just inside the ellipse from its planet
	// (offset toward the chart centre) and fanned sideways by its `lateral`
	// weight, so multiple anomalies on one planet form a triangle with it
	// instead of stacking on top of each other.
	const INWARD = 22; // gap past the planet edge, toward centre
	const SPREAD = 42; // sideways fan per unit of `lateral`
	const anchoredPlaced: PlacedPlanet[] = anchored.map((region) => {
		const cfg = ANOMALY_ANCHORS[region.id];
		const a = planetById.get(cfg.planet)!;
		// Unit vector from the planet toward the chart centre, and its perpendicular.
		let ux = cx - a.x;
		let uy = cy - a.y;
		const len = Math.hypot(ux, uy) || 1;
		ux /= len;
		uy /= len;
		const perpX = -uy;
		const perpY = ux;
		const inward = a.r + INWARD;
		const lateral = cfg.lateral * SPREAD;
		return {
			region,
			x: a.x + ux * inward + perpX * lateral,
			y: a.y + uy * inward + perpY * lateral,
			r: 12,
			front: a.front,
		};
	});

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
