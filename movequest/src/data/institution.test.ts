import { describe, it, expect } from "vitest";
import { institutionStats } from "./institution";
import { quests, lessons } from "./content";
import { findMove } from "../life/moveNow";
import { activityPolicy } from "../life/activities";
describe("content and transparent Demo metrics", () => {
  it("keeps original movement content and separate rest records with valid knowledge references", () => {
    expect(new Set(quests.map((q) => q.id)).size).toBe(quests.length);
    expect(quests.filter((q) => q.id.startsWith("rest-"))).toHaveLength(10);
    const movements = quests.filter(
      (q) => activityPolicy(q).category !== "rest",
    );
    expect(movements.length).toBeGreaterThanOrEqual(50);
    expect(movements.length).toBeLessThanOrEqual(80);
    expect(
      quests.every(
        (q) => activityPolicy(q).reviewStatus === "editorial_checked",
      ),
    ).toBe(true);
    for (const id of ["campus-ankle", "office-hands", "home-wait"])
      expect(findMove(id)?.review).toBe("source_checked");
    for (const q of quests) {
      expect(q.steps).toHaveLength(3);
      expect(lessons.some((l) => l.id === q.lessonId)).toBe(true);
      expect(q.seconds).toBeGreaterThan(0);
    }
  });
  it("reconciles Demo total, scene breakdown and daily chart in each filtered scope", () => {
    for (const audience of ["campus", "office"] as const)
      for (const days of [7, 14]) {
        const a = institutionStats(audience, days);
        expect(a.byScene.reduce((n, s) => n + s.completed, 0)).toBe(
          a.completed.length,
        );
        expect(a.byScene.reduce((n, s) => n + s.started, 0)).toBe(
          a.started.length,
        );
        expect(a.daily.reduce((n, d) => n + d.count, 0)).toBe(
          a.completed.length,
        );
        expect(a.learned.length).toBeLessThanOrEqual(a.people.length);
        expect(a.completed.length).toBeLessThanOrEqual(a.started.length);
      }
  });
  it("changes cohort size when scope changes and remains deterministic", () => {
    expect(institutionStats("campus", 7)).toEqual(
      institutionStats("campus", 7),
    );
    expect(institutionStats("campus", 14).people.length).toBe(36);
    expect(institutionStats("office", 14).people.length).toBe(24);
    expect(institutionStats("campus", 7).people.length).toBeLessThan(36);
  });
});
