import { describe, it, expect } from "vitest";
import { emptyState } from "./types";
import { reduce, totalXP, garden } from "./engine";
describe("MoveQuest foundation", () => {
  it("starts empty with a seed and no fabricated activity", () => {
    const s = emptyState();
    expect(totalXP(s)).toBe(0);
    expect(s.sessions).toHaveLength(0);
    expect(garden(0).name).toBe("一片期待");
  });
  it("saves profile and keeps demo isolated", () => {
    const s = reduce(emptyState(), {
      type: "profile",
      profile: {
        name: "青禾",
        role: "student",
        scenes: ["campus"],
        minutes: 1,
        reminder: 0,
        locale: "zh-CN",
      },
    });
    expect(s.profile?.name).toBe("青禾");
    expect(reduce(s, { type: "demo", value: true }).demo).toBe(true);
    expect(totalXP(s, true)).toBe(0);
  });
});
describe("quest state machine", () => {
  const start = (demo = false) =>
    reduce(
      { ...emptyState(), demo },
      {
        type: "start",
        questId: "campus-corridor",
        id: "s1",
        owner: "tab1",
        seated: false,
        now: 100000,
      },
    );
  it("timer cannot reward early; pause and other tabs cannot advance it", () => {
    let s = start();
    expect(reduce(s, { type: "complete", id: "s1", now: 100001 })).toEqual(s);
    s = reduce(s, { type: "tick", id: "s1", owner: "other", now: 101000 });
    expect(s.sessions[0].elapsedMs).toBe(0);
    s = reduce(s, { type: "pause", id: "s1" });
    s = reduce(s, { type: "tick", id: "s1", owner: "tab1", now: 101000 });
    expect(s.sessions[0].elapsedMs).toBe(0);
    s = reduce(s, { type: "resume", id: "s1", owner: "tab1", now: 102000 });
    s = reduce(s, { type: "tick", id: "s1", owner: "tab1", now: 103000 });
    expect(s.sessions[0].elapsedMs).toBe(1000);
  });
  it("long background time never grants a whole activity automatically", () => {
    const s = reduce(start(), {
      type: "tick",
      id: "s1",
      owner: "tab1",
      now: 1000000,
    });
    expect(s.sessions[0].elapsedMs).toBe(1500);
    expect(s.sessions[0].status).toBe("running");
  });
  it("demo timer becomes ready but requires explicit completion", () => {
    let s = start(true);
    for (let i = 1; i <= 3; i++)
      s = reduce(s, {
        type: "tick",
        id: "s1",
        owner: "tab1",
        now: 100000 + i * 1000,
      });
    expect(s.sessions[0].status).toBe("ready");
    expect(totalXP(s)).toBe(0);
    s = reduce(s, { type: "complete", id: "s1", now: 104000 });
    expect(totalXP(s)).toBe(20);
    expect(totalXP(s, false)).toBe(0);
    expect(reduce(s, { type: "complete", id: "s1", now: 105000 })).toEqual(s);
  });
  it("skipped session never rewards; replacement closes previous session without penalty", () => {
    let s = start();
    s = reduce(s, { type: "skip", id: "s1" });
    expect(reduce(s, { type: "complete", id: "s1", now: 104000 })).toEqual(s);
    expect(totalXP(s)).toBe(0);
    s = reduce(start(), {
      type: "start",
      questId: "office-water",
      id: "s2",
      owner: "tab1",
      seated: false,
      now: 104000,
    });
    expect(s.sessions[0].status).toBe("skipped");
    expect(s.sessions[1].status).toBe("running");
  });
  it("steps must be checked in order and cannot be advanced by repeated clicks", () => {
    let s = reduce(emptyState(), {
      type: "start",
      questId: "home-tidy",
      id: "s",
      owner: "tab",
      seated: false,
      now: 100000,
    });
    s = reduce(s, { type: "step", id: "s", index: 1 });
    expect(s.sessions[0].steps).toBe(0);
    s = reduce(s, { type: "step", id: "s", index: 0 });
    s = reduce(s, { type: "step", id: "s", index: 0 });
    expect(s.sessions[0].steps).toBe(1);
    for (const index of [1, 2]) s = reduce(s, { type: "step", id: "s", index });
    expect(s.sessions[0].status).toBe("ready");
    s = reduce(s, { type: "complete", id: "s", now: 104000 });
    expect(s.sessions[0].elapsedMs).toBe(60000);
  });
});
describe("reward ledger and growth", () => {
  const now = new Date(2026, 10, 19, 12).getTime();
  const completeSteps = (
    s: ReturnType<typeof emptyState>,
    id: string,
    questId = "home-tidy",
    at = now,
  ) => {
    s = reduce(s, {
      type: "start",
      questId,
      id,
      owner: "tab",
      seated: false,
      now: at,
    });
    for (const index of [0, 1, 2]) s = reduce(s, { type: "step", id, index });
    return reduce(s, { type: "complete", id, now: at + 1000 });
  };
  it("same task can be recorded again today but gives no additional XP", () => {
    let s = completeSteps(emptyState(), "a");
    s = completeSteps(s, "b");
    expect(s.sessions.filter((x) => x.status === "completed")).toHaveLength(2);
    expect(s.sessions[1].xp).toBe(0);
    expect(totalXP(s)).toBe(20);
  });
  it("next local calendar day makes a new task reward eligible", () => {
    let s = completeSteps(emptyState(), "a");
    s = completeSteps(s, "b", "home-tidy", now + 86400000);
    expect(totalXP(s)).toBe(40);
  });
  it("wrong quiz answers never reward; re-answering correctly grants only once", () => {
    let s = reduce(emptyState(), {
      type: "answer",
      lessonId: "everyday",
      answer: 0,
      now,
    });
    expect(totalXP(s)).toBe(0);
    for (let i = 0; i < 20; i++)
      s = reduce(s, { type: "answer", lessonId: "everyday", answer: 1, now });
    expect(totalXP(s)).toBe(5);
    expect(s.rewards).toHaveLength(1);
  });
  it("demo and real activities, knowledge rewards and XP stay isolated", () => {
    let s = completeSteps(emptyState(), "real");
    s = reduce(s, { type: "demo", value: true });
    s = completeSteps(s, "demo");
    s = reduce(s, { type: "answer", lessonId: "everyday", answer: 1, now });
    expect(totalXP(s)).toBe(25);
    expect(totalXP(s, false)).toBe(20);
    s = reduce(s, { type: "demo", value: false });
    expect(totalXP(s)).toBe(20);
  });
  it("XP thresholds give predictable garden growth without losing progress on skip", () => {
    expect([0, 20, 80, 180, 320].map((x) => garden(x).index)).toEqual([
      0, 1, 2, 3, 4,
    ]);
    let s = completeSteps(emptyState(), "a");
    s = reduce(s, {
      type: "start",
      questId: "campus-corridor",
      id: "b",
      owner: "tab",
      seated: false,
      now,
    });
    s = reduce(s, { type: "skip", id: "b" });
    expect(garden(totalXP(s)).index).toBe(1);
  });
  it("own move discovery gives no repeat XP and completed own moves share a daily cap", () => {
    let s = emptyState();
    for (const id of ["own1", "own2"]) {
      s = reduce(s, {
        type: "own",
        move: {
          id,
          title: "自己的活动",
          context: "下课以后",
          scene: "campus",
          seconds: 60,
          demo: false,
          createdAt: new Date(now).toISOString(),
        },
      });
      expect(totalXP(s)).toBe(id === "own1" ? 0 : 20);
      s = reduce(s, {
        type: "start",
        questId: id,
        id: `session-${id}`,
        owner: "tab",
        seated: false,
        now,
      });
      for (let i = 1; i <= 60; i++)
        s = reduce(s, {
          type: "tick",
          id: `session-${id}`,
          owner: "tab",
          now: now + i * 1000,
        });
      s = reduce(s, {
        type: "complete",
        id: `session-${id}`,
        now: now + 61000,
      });
    }
    expect(s.ownMoves).toHaveLength(2);
    expect(totalXP(s)).toBe(20);
  });
});
