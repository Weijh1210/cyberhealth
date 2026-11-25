import type { LifeState } from "./model";

export function worldGrowth(life: LifeState) {
  const growth = new Map<string, { count: number; level: 1 | 2 | 3 }>();
  for (const attempt of life.attempts ?? []) {
    if (
      attempt.status !== "done" ||
      !life.nodes.some((n) => n.id === attempt.locationId)
    )
      continue;
    const count = (growth.get(attempt.locationId)?.count ?? 0) + 1;
    growth.set(attempt.locationId, {
      count,
      level: count >= 3 ? 3 : count >= 2 ? 2 : 1,
    });
  }
  return growth;
}

export const englishGrowth = {
  1: "Seedling path",
  2: "Lantern path",
  3: "Blossom district",
};
export const growthTitles = { 1: "新芽步道", 2: "花径灯笼", 3: "花园街区" };

export const earnedDecorations = {
  pennant: { label: "街区彩旗", level: 1 },
  pergola: { label: "街角花亭", level: 3 },
} as const;
export function isDecorationUnlocked(life: LifeState, kind: string) {
  const reward = earnedDecorations[kind as keyof typeof earnedDecorations];
  return (
    !reward ||
    [...worldGrowth(life).values()].some((g) => g.level >= reward.level)
  );
}

export function nextDistrictReward(life: LifeState) {
  const progress = worldGrowth(life);
  return life.locations
    .filter(
      (location) =>
        location.confirmed &&
        life.nodes.some((node) => node.id === location.id),
    )
    .map((location) => ({
      location,
      count: progress.get(location.id)?.count ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .find(({ count }) => count < 3);
}
