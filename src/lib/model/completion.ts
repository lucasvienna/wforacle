import type { Slot, Warframe } from './types';

export function partId(frameId: string, slot: Slot): string {
  return `${frameId}:${slot}`;
}

export function frameCompletion(frame: Warframe, owned: ReadonlySet<string>) {
  const total = frame.parts.length;
  const ownedCount = frame.parts.filter((p) => owned.has(p.id)).length;
  return { owned: ownedCount, total };
}

export function datasetCompletion(frames: Warframe[], owned: ReadonlySet<string>) {
  return frames.reduce(
    (acc, f) => {
      const c = frameCompletion(f, owned);
      return { owned: acc.owned + c.owned, total: acc.total + c.total };
    },
    { owned: 0, total: 0 }
  );
}
