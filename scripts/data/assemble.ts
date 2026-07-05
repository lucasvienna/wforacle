import type { Dataset } from '../../src/lib/model/types';
import { buildRegions, buildNodes, buildFrames, type SolNodes, type RawWarframe } from './build';

export function assembleDataset(solNodes: SolNodes, warframes: RawWarframe[]): Dataset {
	const regions = buildRegions(solNodes);
	const nodes = buildNodes(solNodes);
	const { frames, bosses } = buildFrames(warframes, nodes);
	const bossByNode = new Map(bosses.map((b) => [b.nodeId, b]));
	const frameByNode = new Map(frames.map((f) => [f.nodeId!, f]));
	for (const n of nodes) {
		if (!n.isAssassination) continue;
		n.bossId = bossByNode.get(n.id)?.id;
		n.frameId = frameByNode.get(n.id)?.id;
	}
	return { regions, nodes, bosses, warframes: frames };
}

export function validateDataset(ds: Dataset): string[] {
	const problems: string[] = [];
	const nodeIds = new Set(ds.nodes.map((n) => n.id));
	const bossIds = new Set(ds.bosses.map((b) => b.id));
	const frameIds = new Set(ds.warframes.map((f) => f.id));
	for (const n of ds.nodes) {
		if (n.bossId && !bossIds.has(n.bossId))
			problems.push(`node ${n.id} → missing boss ${n.bossId}`);
		if (n.frameId && !frameIds.has(n.frameId))
			problems.push(`node ${n.id} → missing frame ${n.frameId}`);
	}
	for (const f of ds.warframes) {
		if (f.nodeId && !nodeIds.has(f.nodeId))
			problems.push(`frame ${f.id} → missing node ${f.nodeId}`);
		for (const p of f.parts) if (p.id !== `${f.id}:${p.slot}`) problems.push(`bad part id ${p.id}`);
	}
	const allIds = [...ds.regions.map((r) => r.id), ...frameIds];
	if (new Set(allIds).size !== allIds.length) problems.push('duplicate region/frame ids');
	return problems;
}
