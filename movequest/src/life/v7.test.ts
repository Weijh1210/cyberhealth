import { expect, it } from "vitest";
import { reduce } from "../domain/engine";
import { emptyState } from "../domain/types";
import { decode } from "../storage/repository";
import { discover } from "./discoveries";
import { habitStage } from "./habits";
import { activeLife, emptyLife, mergeLife, type Category } from "./model";
import type { Cue } from "./context";
import { worldGrowth } from "./worldGrowth";

const at = Date.UTC(2026, 10, 23, 12);

it("matches different real-life cues and blocks walking when the confirmed profile excludes it", () => {
  const cases: [Category, Cue["kind"], string, string][] = [
    ["library", "phone_break", "写累了就刷手机", "campus-study-pause"],
    ["office", "task_end", "保存完报告才休息", "office-transition"],
    ["home", "task_end", "I take a break when coding ends", "home-task-pause"],
    ["subway", "commute_end", "下车后走路去教室", "outdoors-destination"],
    ["home", "screen_break", "我在家看视频", "home-screen-pause"],
  ];
  for (const [category, kind, evidence, quest] of cases) {
    const life = mergeLife(
      emptyLife(),
      {
        locations: [
          {
            id: "place",
            category,
            name: "日常地点",
            source: "manual",
            confirmed: false,
          },
        ],
        events: [],
        questions: [],
        cues: [
          {
            id: "cue",
            kind,
            locationId: "place",
            evidence,
            source: "ai",
            uncertain: false,
          },
        ],
      },
      at,
    );
    expect(discover(life, at)[0]).toMatchObject({
      quest: { id: quest },
      cue: { evidence },
    });
    const limited = discover(
      { ...life, constraints: { notes: [], walkingAllowed: false } },
      at,
    );
    expect(limited.every((activity) => !activity.policy.walking)).toBe(true);
    if (category === "library")
      expect(limited[0]?.quest.id).toBe("move-ankles");
    expect(
      discover(
        { ...life, cues: life.cues?.map((c) => ({ ...c, uncertain: true })) },
        at,
      ),
    ).toEqual([]);
  }
});

it("records skip vs completion, creates a durable habit and unlocks growth only once per attempt", () => {
  let state = reduce(emptyState(), { type: "demo-reset", v7: true, at });
  const cue = discover(activeLife(state), at)[0].cue;
  expect(cue.kind).toBe("phone_break");
  state = reduce(state, {
    type: "movement-attempt",
    id: "skipped",
    cueId: cue.id,
    status: "skipped",
    at,
    reason: "social",
  });
  expect(worldGrowth(activeLife(state)).size).toBe(0);
  expect(
    discover(activeLife(state), at + 1000).map((d) => d.cue.id),
  ).not.toContain(cue.id);
  expect(discover(activeLife(state), at + 1000).length).toBeGreaterThan(0);
  state = reduce(state, {
    type: "habit-create",
    id: "habit",
    cueId: cue.id,
    at,
  });
  state = reduce(state, { type: "habit-experiment", id: "habit", days: 3, at });
  const done = {
    type: "movement-attempt",
    id: "done",
    cueId: cue.id,
    habitId: "habit",
    status: "done",
    at: at + 1,
    convenience: "easy",
    selfInitiated: true,
  } as const;
  state = reduce(state, done);
  expect(reduce(state, done)).toBe(state);
  const restored = activeLife(decode(JSON.stringify(state)));
  expect(restored.habits?.[0].experiment?.days).toBe(3);
  expect(habitStage(restored.attempts!, restored.timezone)).toBe("主动发起过");
  expect(worldGrowth(restored).get(cue.locationId)?.level).toBe(1);
  expect(
    restored.analytics?.filter((e) => e.name === "world_reward_unlocked"),
  ).toHaveLength(1);
  expect(state.life).toBeUndefined();
  state = reduce(state, { type: "life-remove", locationId: cue.locationId });
  expect(activeLife(state).cues?.find((c) => c.id === cue.id)).toBeUndefined();
  expect(
    activeLife(state).attempts?.find((a) => a.id === "done"),
  ).toBeDefined();
});

it("merges a repeated scene without moving the original plot or losing new context links", () => {
  const base = activeLife(
    reduce(emptyState(), { type: "demo-reset", v7: true, at }),
  );
  const library = base.locations.find((l) => l.id === "sample_library")!;
  const updated = mergeLife(
    base,
    {
      locations: [
        { ...library, id: "alias", name: "绿荫图书馆 ", source: "ai" },
      ],
      events: [],
      questions: [],
      cues: [
        {
          id: "fresh-cue",
          locationId: "alias",
          kind: "task_end",
          evidence: "写完一页就休息",
          source: "ai",
          uncertain: false,
        },
      ],
    },
    at,
  );
  expect(updated.nodes).toEqual(base.nodes);
  expect(updated.cues?.at(-1)).toMatchObject({
    id: "fresh-cue",
    locationId: library.id,
    updatedAt: at,
    confirmed: true,
  });
});
