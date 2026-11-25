import { beforeEach, describe, it, expect, vi } from "vitest";
import { decode, load, STORAGE_KEY, transact } from "./repository";
import { emptyState } from "../domain/types";
let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
  });
  vi.stubGlobal("navigator", {});
});
describe("versioned local repository", () => {
  it("creates a clean state only when the application key is absent", () => {
    expect(decode(null)).toEqual(emptyState());
    values.set("moyu-wellness-v1", "original");
    expect(load().state).toEqual(emptyState());
    expect(values.get("moyu-wellness-v1")).toBe("original");
  });
  it("round trips a version 1 snapshot", () => {
    expect(decode(JSON.stringify(emptyState()))).toEqual(emptyState());
  });
  it("rejects unknown versions instead of destructive migration", async () => {
    const raw = JSON.stringify({ ...emptyState(), schemaVersion: 99 });
    values.set(STORAGE_KEY, raw);
    expect(load().error).not.toBe("");
    await expect(transact({ type: "demo", value: true })).rejects.toThrow();
    expect(values.get(STORAGE_KEY)).toBe(raw);
  });
  it("preserves malformed JSON and gives a readable recovery error", async () => {
    values.set(STORAGE_KEY, "broken");
    expect(load().error).not.toBe("");
    await expect(transact({ type: "demo", value: true })).rejects.toThrow();
    expect(values.get(STORAGE_KEY)).toBe("broken");
  });
  it("rejects corrupt arrays and non-finite or duplicate rewards", () => {
    expect(() =>
      decode(JSON.stringify({ ...emptyState(), sessions: [{}] })),
    ).toThrow();
    expect(() =>
      decode(
        JSON.stringify({
          ...emptyState(),
          rewards: [{ key: "x", xp: -1, demo: false, day: "2026-11-19" }],
        }),
      ),
    ).toThrow();
    expect(() =>
      decode(
        JSON.stringify({
          ...emptyState(),
          rewards: Array(2).fill({
            key: "same",
            xp: 20,
            demo: false,
            day: "2026-11-19",
          }),
        }),
      ),
    ).toThrow();
  });
  it("reports write failure without replacing the saved record", async () => {
    values.set(STORAGE_KEY, JSON.stringify(emptyState()));
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => values.get(k),
      setItem: () => {
        throw new Error("quota");
      },
    });
    await expect(transact({ type: "demo", value: true })).rejects.toThrow(
      "quota",
    );
    expect(decode(values.get(STORAGE_KEY)!)).toEqual(emptyState());
  });
  it("re-reads latest state for consecutive writes and retains both learning events", async () => {
    await transact({ type: "answer", lessonId: "everyday", answer: 1, now: 1 });
    await transact({ type: "answer", lessonId: "small", answer: 0, now: 2 });
    expect(load().state.rewards).toHaveLength(2);
  });
});
