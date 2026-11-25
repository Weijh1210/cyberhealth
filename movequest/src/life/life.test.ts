import { describe, expect, it } from "vitest";
import {
  emptyLife,
  mergeLife,
  validateDelta,
  clockAt,
  type LifeDelta,
  type LifeState,
  type FeedbackType,
} from "./model";
import { recommend } from "./recommend";
import { reduce, stats, totalXP } from "../domain/engine";
import { emptyState } from "../domain/types";
import { decode } from "../storage/repository";
export const weekday: LifeDelta = {
  locations: [
    {
      id: "home",
      name: "我的家",
      category: "home",
      source: "manual",
      confirmed: false,
    },
    {
      id: "office",
      name: "公司",
      category: "office",
      source: "manual",
      confirmed: false,
    },
  ],
  events: [
    {
      id: "wake",
      locationId: "home",
      title: "起床",
      start: "08:00",
      end: null,
      recurrence: "weekday",
      transport: "unknown",
      busy: false,
      evidence: "8 点起床",
    },
    {
      id: "work",
      locationId: "office",
      title: "工作",
      start: "09:00",
      end: "18:00",
      recurrence: "weekday",
      transport: "subway",
      busy: false,
      evidence: "9 点到公司，18 点下班",
    },
  ],
  questions: [],
};
const now = Date.parse("2026-11-20T06:00:00Z");
const initial = () =>
  mergeLife({ ...emptyLife(), timezone: "Asia/Shanghai" }, weekday);
function feedback(
  life: LifeState,
  type: FeedbackType,
  activityId: string,
  category = "natural",
  demo = false,
) {
  return {
    ...life,
    feedback: [
      ...life.feedback,
      {
        id: `feedback_${life.feedback.length}`,
        recommendationId: "r",
        activityId,
        category,
        sceneId: "office",
        timeWindow: "afternoon",
        type,
        reason: type,
        at: now - 1000,
        demo,
        completionConfirmation: false,
      },
    ],
  };
}
describe("MoveQuest acceptance: real deterministic core", () => {
  it("roundtrips the whole world through the existing durable schema without moving nodes", () => {
    const life = initial(),
      saved = decode(JSON.stringify({ ...emptyState(), life }));
    expect(saved.life).toEqual(life);
    expect(mergeLife(saved.life!, weekday).nodes).toEqual(life.nodes);
  });
  it("appends a weekend park without changing home/company coordinates or existing events", () => {
    const life = initial();
    const expanded = mergeLife(life, {
      locations: [
        {
          id: "park",
          name: "周末公园",
          category: "park",
          source: "manual",
          confirmed: false,
        },
      ],
      events: [
        {
          id: "weekend",
          locationId: "park",
          title: "公园散步",
          start: "15:00",
          end: "16:00",
          recurrence: "weekend",
          transport: "walk",
          busy: false,
          evidence: "周末三点去公园",
        },
      ],
      questions: [],
    });
    expect(expanded.nodes.slice(0, 2)).toEqual(life.nodes);
    expect(expanded.events.slice(0, 2)).toEqual(life.events);
    expect(expanded.nodes).toHaveLength(3);
    expect(expanded.edges.some((e) => e.to === "park")).toBe(true);
  });
  it("keeps 40 buildings in unique nonoverlapping slots even after removal and additions", () => {
    let life = initial();
    life = mergeLife(life, {
      locations: Array.from({ length: 38 }, (_, i) => ({
        id: `p_${i}`,
        name: `地点${i}`,
        category: "other",
        source: "manual",
        confirmed: false,
      })),
      events: [],
      questions: [],
    });
    expect(new Set(life.nodes.map((n) => `${n.x}:${n.z}`)).size).toBe(40);
    for (const a of life.nodes)
      for (const b of life.nodes)
        if (a.id !== b.id)
          expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(190);
  });
  it("does not infer current location from a point event or an unknown window", () => {
    expect(
      recommend(initial(), {
        now: Date.parse("2026-11-20T00:00:00Z"),
        demo: false,
      }),
    ).toEqual([]);
  });
  it("selects company activities from confirmed routine windows and respects busy periods", () => {
    const life = initial();
    expect(recommend(life, { now, demo: false })[0].location.id).toBe("office");
    expect(
      recommend(
        { ...life, events: life.events.map((e) => ({ ...e, busy: true })) },
        { now, demo: false },
      ),
    ).toEqual([]);
  });
  it("changes the next recommendation category after consecutive natural activity rejections", () => {
    let life = initial();
    const first = recommend(life, { now, demo: false })[0];
    expect(first.policy.category).toBe("natural");
    for (let i = 0; i < 3; i++)
      life = feedback(life, "not_suitable", first.quest.id);
    const next = recommend(life, { now, demo: false });
    expect(next[0].policy.category).toBe("rest");
    expect(
      next.find((o) => o.policy.category === "natural")?.score,
    ).toBeLessThan(first.score);
    expect(
      next.find((o) => o.policy.category === "natural")?.reasons.join(""),
    ).toContain("降权");
  });
  it("isolates demo learning and permanent exclusions, and reset restores candidates", () => {
    let life = initial();
    const first = recommend(life, { now, demo: false })[0];
    life = feedback(life, "never_recommend", first.quest.id);
    expect(
      recommend(life, { now, demo: false }).some(
        (o) => o.quest.id === first.quest.id,
      ),
    ).toBe(false);
    expect(
      recommend(life, { now, demo: true }).some(
        (o) => o.quest.id === first.quest.id,
      ),
    ).toBe(true);
    const reset = reduce({ ...emptyState(), life }, { type: "life-reset" });
    expect(
      recommend(reset.life!, { now, demo: false }).some(
        (o) => o.quest.id === first.quest.id,
      ),
    ).toBe(true);
  });
  it("honors snooze, quiet hours, opt out, duration and walking limitations before ranking", () => {
    let life = initial();
    const first = recommend(life, { now, demo: false })[0];
    life = feedback(life, "remind_later", first.quest.id);
    expect(
      recommend(life, { now: now + 29 * 60000, demo: false }).some(
        (o) => o.quest.id === first.quest.id,
      ),
    ).toBe(false);
    expect(
      recommend(life, { now: now + 31 * 60000, demo: false }).some(
        (o) => o.quest.id === first.quest.id,
      ),
    ).toBe(true);
    expect(
      recommend(
        { ...life, settings: { ...life.settings, walking: false } },
        { now, demo: false },
      ).every((o) => !o.policy.walking),
    ).toBe(true);
    expect(recommend(life, { now, demo: false, availableSeconds: 10 })).toEqual(
      [],
    );
    expect(
      recommend(
        { ...life, settings: { ...life.settings, enabled: false } },
        { now, demo: false },
      ),
    ).toEqual([]);
    expect(
      recommend(life, {
        now: Date.parse("2026-11-20T15:00:00Z"),
        demo: false,
        contextId: "office",
      }),
    ).toEqual([]);
  });
  it("enforces cap on distinct accepted opportunities and requires a safety context even for published guided moves", () => {
    let life = initial();
    life = { ...life, settings: { ...life.settings, dailyCap: 1 } };
    life = feedback(life, "interested", "office-water");
    expect(recommend(life, { now, demo: false })).toEqual([]);
    const s = emptyState();
    expect(
      reduce(s, {
        type: "start",
        questId: "office-hands",
        id: "s",
        owner: "tab",
        seated: false,
        now,
      }),
    ).toEqual(s);
  });
  it("starts a formerly blocked move only under matching conditions", () => {
    const s = emptyState();
    const moveContext = {
      scene: "office",
      seconds: 30,
      standing: false,
      space: "compact",
      equipment: ["chair"],
      effort: "gentle",
      lowSweat: true,
      discreet: true,
      safe: true,
      noLegs: true,
      noArms: false,
      goal: "mobility",
    } as const;
    const command = {
      type: "start",
      questId: "office-hands",
      id: "hand",
      owner: "tab",
      seated: false,
      now,
      guided: {},
      moveContext: { ...moveContext, equipment: ["chair"] },
    } as const;
    const prepared = {
      ...command,
      moveContext: {
        ...command.moveContext,
        equipment: [...command.moveContext.equipment],
      },
    };
    expect(
      reduce(s, {
        ...prepared,
        moveContext: { ...prepared.moveContext, safe: false },
      }),
    ).toBe(s);
    expect(
      reduce(s, {
        ...prepared,
        moveContext: { ...prepared.moveContext, equipment: [] },
      }),
    ).toBe(s);
    expect(
      reduce(s, {
        ...prepared,
        moveContext: { ...prepared.moveContext, noArms: true },
      }),
    ).toBe(s);
    expect(reduce(s, prepared).sessions[0]).toMatchObject({
      questId: "office-hands",
      status: "running",
    });
  });
  it("requires explicit completion; rest earns separate XP and never inflates movement minutes", () => {
    let s = { ...emptyState(), life: initial(), demo: true };
    s = reduce(s, {
      type: "start",
      questId: "rest-office-screen",
      id: "r",
      owner: "tab",
      now,
      seated: false,
    }) as typeof s;
    for (let i = 1; i <= 3; i++)
      s = reduce(s, {
        type: "tick",
        id: "r",
        owner: "tab",
        now: now + i * 1000,
      }) as typeof s;
    expect(s.sessions[0].status).toBe("ready");
    expect(stats(s).rest).toHaveLength(0);
    expect(s.life.feedback.filter((f) => f.type === "completed")).toHaveLength(
      0,
    );
    s = reduce(s, { type: "complete", id: "r", now: now + 4000 }) as typeof s;
    expect(stats(s).rest).toHaveLength(1);
    expect(stats(s).minutes).toBe(0);
    expect(totalXP(s)).toBe(5);
    expect(
      s.demoLife!.feedback.find((f) => f.type === "completed")
        ?.completionConfirmation,
    ).toBe(true);
  });
  it("restores decorations independently of real life and removes only related records", () => {
    const s = { ...emptyState(), life: initial() };
    const next = reduce(s, {
      type: "life-decorate",
      nodeId: "office",
      kind: "bench",
      slot: 0,
    });
    expect(next.life?.events).toEqual(s.life.events);
    expect(decode(JSON.stringify(next)).life?.decorations).toHaveLength(1);
    const removed = reduce(next, { type: "life-remove", locationId: "office" });
    expect(removed.life?.nodes).toEqual([s.life.nodes[0]]);
    expect(removed.life?.decorations).toEqual([]);
  });
  it("rejects hostile fields, impossible times and broken references instead of overwriting", () => {
    expect(() => validateDelta({ ...weekday, subscription: "plus" })).toThrow();
    expect(() =>
      validateDelta({
        ...weekday,
        events: [{ ...weekday.events[0], start: "25:61" }],
      }),
    ).toThrow();
    expect(() =>
      mergeLife(initial(), {
        locations: [],
        events: [{ ...weekday.events[0], locationId: "missing" }],
        questions: [],
      }),
    ).toThrow();
    expect(() =>
      decode(
        JSON.stringify({
          ...emptyState(),
          life: {
            ...initial(),
            nodes: [{ id: "home", x: 0, z: 0, variant: 0 }],
          },
        }),
      ),
    ).toThrow();
  });
  it("uses configured timezone across midnight and weekend boundaries", () => {
    expect(
      clockAt(Date.parse("2026-11-20T17:00:00Z"), "Asia/Shanghai"),
    ).toMatchObject({ time: "01:00", weekend: true, day: "2026-11-21" });
  });
});

it("editing saved routines can remove an event without resurrecting it during merge", () => {
  const life = initial();
  const next = reduce(
    { ...emptyState(), life },
    {
      type: "life-confirm",
      replace: true,
      delta: {
        locations: life.locations,
        events: [life.events[0]],
        questions: [],
      },
    },
  );
  expect(next.life?.events).toEqual([life.events[0]]);
  expect(next.life?.nodes).toEqual(life.nodes);
});
