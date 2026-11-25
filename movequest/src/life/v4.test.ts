import { expect, it } from "vitest";
import { emptyState } from "../domain/types";
import { reduce } from "../domain/engine";
import { demoLife, demoPark } from "./demo";
import { activeLife, mergeLife, validateDelta } from "./model";
import { recommend } from "./recommend";
import { roadPoints, footprint } from "./worldLayout";
import { decode } from "../storage/repository";
import { quests } from "../data/content";
import { activityPolicy } from "./activities";
const now = Date.parse("2026-11-23T05:00:00Z");
it("resets a separate demonstration world without touching personal data or rewards", () => {
  const personal = demoLife();
  let s = {
    ...emptyState(),
    life: personal,
    rewards: [{ key: "personal", xp: 20, demo: false, day: "2026-11-23" }],
  };
  s = reduce(s, { type: "demo-reset" }) as typeof s;
  expect(s.life).toEqual(personal);
  expect(s.demoLife).toBeDefined();
  const moved = reduce(s, { type: "life-confirm", delta: demoPark });
  expect(moved.life?.locations).toHaveLength(5);
  expect(moved.demoLife?.locations).toHaveLength(6);
  const reset = reduce(moved, { type: "demo-reset" });
  expect(reset.life).toEqual(personal);
  expect(reset.rewards).toHaveLength(1);
  expect(reset.demoLife?.locations).toHaveLength(5);
  const exited = reduce(reset, { type: "demo", value: false });
  expect(activeLife(exited)).toEqual(personal);
  expect(decode(JSON.stringify(reset)).demoLife).toEqual(reset.demoLife);
});
it("places, moves, removes and undoes all six decorations through durable commands", () => {
  let s = reduce(emptyState(), { type: "demo-reset" });
  for (const [slot, kind] of (
    ["tree", "flowers", "bench", "lamp", "fountain", "planter"] as const
  ).entries())
    s = reduce(s, { type: "life-decorate", nodeId: "demo_home", kind, slot });
  expect(s.demoLife?.decorations).toHaveLength(6);
  const before = s.demoLife?.decorations;
  s = reduce(s, {
    type: "decoration-move",
    id: "decor_demo_home_0",
    nodeId: "demo_office",
    slot: 2,
  });
  expect(
    s.demoLife?.decorations.find((d) => d.id === "decor_demo_home_0")?.nodeId,
  ).toBe("demo_office");
  s = reduce(s, { type: "decoration-undo" });
  expect(s.demoLife?.decorations).toEqual(before);
  s = reduce(s, { type: "decoration-remove", id: "decor_demo_home_0" });
  expect(s.demoLife?.decorations).toHaveLength(5);
  s = reduce(s, { type: "decoration-undo" });
  expect(decode(JSON.stringify(s)).demoLife?.decorations).toHaveLength(6);
});
it("matches explicit events, suppresses a busy context and lists source-checked guidance", () => {
  const life = demoLife();
  for (const trigger of [
    "water",
    "meeting_end",
    "lunch_end",
    "desk",
  ] as const) {
    const results = recommend(life, {
      now,
      demo: true,
      contextId: "demo_office",
      eventContext: trigger,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((o) => o.policy.triggers.includes(trigger))).toBe(
      true,
    );
    expect(results.every((o) => o.policy.eligible)).toBe(true);
  }
  expect(
    recommend(life, {
      now,
      demo: true,
      contextId: "demo_office",
      eventContext: "busy",
    }),
  ).toEqual([]);
  expect(
    quests.filter((q) => activityPolicy(q).category === "routine"),
  ).toHaveLength(5);
  expect(
    quests
      .filter((q) => activityPolicy(q).category === "guided")
      .every((q) => activityPolicy(q).eligible),
  ).toBe(true);
});
it("bounded subtype learning preserves unrelated natural movement after repeated rejection", () => {
  let s = reduce(emptyState(), { type: "demo-reset" });
  const life = s.demoLife!;
  for (let i = 0; i < 6; i++)
    s = reduce(s, {
      type: "life-feedback",
      feedback: {
        id: `rejection_${i}`,
        recommendationId: "r",
        activityId: "office-water",
        category: "natural",
        sceneId: "demo_office",
        timeWindow: "afternoon",
        type: "not_suitable",
        reason: "not_interested",
        at: now,
        demo: true,
        completionConfirmation: false,
      },
    });
  const before = recommend(life, { now, demo: true, contextId: "demo_office" }),
    after = recommend(s.demoLife!, {
      now,
      demo: true,
      contextId: "demo_office",
    });
  expect(after.find((o) => o.quest.id === "office-water")!.score).toBeLessThan(
    before.find((o) => o.quest.id === "office-water")!.score,
  );
  expect(after.find((o) => o.quest.id === "office-lunch")!.score).toBe(
    before.find((o) => o.quest.id === "office-lunch")!.score,
  );
  expect(
    after.find((o) => o.quest.id === "office-water")!.score,
  ).toBeGreaterThan(-20);
});
it("preserves coordinates while expanding districts, and road street legs avoid all footprints", () => {
  const life = demoLife(),
    expanded = mergeLife(life, demoPark);
  expect(expanded.nodes.slice(0, life.nodes.length)).toEqual(life.nodes);
  for (const edge of expanded.edges) {
    const points = roadPoints(
      expanded.nodes.find((n) => n.id === edge.from)!,
      expanded.nodes.find((n) => n.id === edge.to)!,
    );
    for (const [index, a] of points.entries()) {
      if (index < 2 || index > 4) continue;
      const b = points[index + 1];
      if (!b) continue;
      for (const node of expanded.nodes) {
        if (a[0] === b[0])
          expect(
            Math.abs(a[0] - node.x) >= footprint.width / 2 ||
              Math.max(a[1], b[1]) < node.z - footprint.depth / 2 ||
              Math.min(a[1], b[1]) > node.z + footprint.depth / 2,
          ).toBe(true);
        else
          expect(
            Math.abs(a[1] - node.z) >= footprint.depth / 2 ||
              Math.max(a[0], b[0]) < node.x - footprint.width / 2 ||
              Math.min(a[0], b[0]) > node.x + footprint.width / 2,
          ).toBe(true);
      }
    }
  }
});
it("confirms explicit AI constraints into eligibility while rejecting invented fields", () => {
  const delta = validateDelta({
    locations: [],
    events: [],
    questions: [],
    preferences: ["短一些"],
    constraints: { notes: ["不方便站立"], standingAllowed: false },
  });
  const life = mergeLife(demoLife(), delta);
  expect(life.settings.standing).toBe(false);
  expect(
    recommend(life, { now, demo: true, contextId: "demo_office" }).every(
      (o) => !o.policy.standing,
    ),
  ).toBe(true);
  expect(() =>
    validateDelta({
      ...delta,
      constraints: { notes: [], diagnosis: "invented" },
    }),
  ).toThrow();
});

it("demo name and settings edits never overwrite the personal profile", () => {
  const profile = {
    name: "真实用户",
    role: "worker" as const,
    scenes: ["home" as const],
    minutes: 2,
    reminder: 0,
    locale: "zh-CN" as const,
  };
  let s = reduce({ ...emptyState(), profile }, { type: "demo-reset" });
  s = reduce(s, { type: "profile", profile: { ...profile, name: "示例姓名" } });
  expect(s.profile).toEqual(profile);
  expect(s.demoProfile?.name).toBe("示例姓名");
  expect(decode(JSON.stringify(s)).demoProfile?.name).toBe("示例姓名");
});
it("recognizes the previous weekday overnight shift into Saturday without inventing movement", () => {
  const life = demoLife();
  life.events = [
    {
      id: "night",
      locationId: "demo_office",
      title: "夜班工作",
      start: "22:00",
      end: "06:00",
      recurrence: "weekday",
      transport: "unknown",
      busy: true,
      evidence: "测试样例",
    },
  ];
  expect(
    recommend(life, { now: Date.parse("2026-11-27T18:00:00Z"), demo: true }),
  ).toEqual([]);
});
