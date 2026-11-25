import { scenes, type Campaign, type Scene } from "../domain/types";
export const DEMO_AS_OF = "2026-11-19";
export type Participant = {
  id: string;
  audience: "campus" | "office";
  joined: string;
  learned: boolean;
};
export type DemoActivity = {
  participantId: string;
  scene: Scene;
  day: string;
  completed: boolean;
};
const day = (offset: number) => {
  const d = new Date("2026-11-19T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
};
export const participants: Participant[] = Array.from(
  { length: 60 },
  (_, i) => ({
    id: `demo-person-${i + 1}`,
    audience: i < 36 ? "campus" : "office",
    joined: day(i % 14),
    learned: i % 3 !== 0,
  }),
);
export const activities: DemoActivity[] = participants.flatMap((p, i) =>
  Array.from({ length: i % 6 }, (_, j) => ({
    participantId: p.id,
    scene: scenes[(i + j) % 4],
    day: day((i + j) % 14),
    completed: (i + j) % 5 !== 0,
  })),
);
export const sampleCampaigns: Campaign[] = [
  {
    id: "sample-campus",
    name: "课间一小步",
    audience: "campus",
    goal: 100,
    status: "active",
    createdAt: "2026-11-12",
  },
  {
    id: "sample-office",
    name: "接水路上的新发现",
    audience: "office",
    goal: 80,
    status: "draft",
    createdAt: "2026-11-16",
  },
];
export function institutionStats(audience: "campus" | "office", days: number) {
  const from = day(days - 1);
  const people = participants.filter(
    (p) => p.audience === audience && p.joined >= from,
  );
  const ids = new Set(people.map((p) => p.id));
  const started = activities.filter(
    (x) => ids.has(x.participantId) && x.day >= from,
  );
  const completed = started.filter((x) => x.completed);
  const learned = people.filter((x) => x.learned);
  const byScene = scenes.map((scene) => ({
    scene,
    started: started.filter((x) => x.scene === scene).length,
    completed: completed.filter((x) => x.scene === scene).length,
  }));
  const daily = Array.from({ length: days }, (_, i) => ({
    day: day(days - 1 - i),
    count: completed.filter((x) => x.day === day(days - 1 - i)).length,
  }));
  return {
    people,
    started,
    completed,
    learned,
    byScene,
    daily,
    from,
    to: DEMO_AS_OF,
  };
}
