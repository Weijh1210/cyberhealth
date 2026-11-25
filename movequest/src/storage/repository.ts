import { demoEnabled } from "../app/release";
import { validateLife } from "../life/model";
import { reduce, type Command } from "../domain/engine";
import { emptyState, scenes, type State } from "../domain/types";
export const STORAGE_KEY = "movequest:v1";
type Obj = Record<string, unknown>;
const obj = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown) => typeof v === "string";
const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
const bool = (v: unknown) => typeof v === "boolean";
const scene = (v: unknown) => scenes.includes(v as (typeof scenes)[number]);
const list = (v: unknown, check: (o: Obj) => boolean) =>
  Array.isArray(v) && v.every((x) => obj(x) && check(x));
export function decode(raw: string | null): State {
  if (!raw) return emptyState();
  const s: unknown = JSON.parse(raw);
  if (!obj(s) || s.schemaVersion !== 1 || !bool(s.demo))
    throw new Error("数据版本或结构不支持");
  for (const p of [s.profile, s.demoProfile ?? null]) {
    if (
      p !== null &&
      (!obj(p) ||
        !text(p.name) ||
        !["student", "worker"].includes(String(p.role)) ||
        !Array.isArray(p.scenes) ||
        !p.scenes.every(scene) ||
        !num(p.minutes) ||
        !num(p.reminder) ||
        !["zh-CN", "zh-TW", "en"].includes(String(p.locale)))
    )
      throw new Error("偏好数据损坏");
  }
  if (
    !list(
      s.sessions,
      (x) =>
        text(x.id) &&
        text(x.questId) &&
        text(x.title) &&
        scene(x.scene) &&
        num(x.elapsedMs) &&
        num(x.targetMs) &&
        (x.countdownUntil === undefined || num(x.countdownUntil)) &&
        num(x.steps) &&
        num(x.stepCount) &&
        ["timer", "steps"].includes(String(x.kind)) &&
        ["running", "paused", "ready", "completed", "skipped"].includes(
          String(x.status),
        ) &&
        text(x.owner) &&
        num(x.lastTick) &&
        bool(x.demo) &&
        bool(x.seated) &&
        text(x.createdAt) &&
        num(x.xp) &&
        bool(x.own) &&
        (x.intensity === undefined ||
          ["light", "moderate", "vigorous"].includes(String(x.intensity))) &&
        (x.day === undefined || text(x.day)) &&
        (x.guided === undefined ||
          (obj(x.guided) &&
            (x.guided.locationId === undefined || text(x.guided.locationId)) &&
            (x.guided.cueId === undefined || text(x.guided.cueId)) &&
            (x.guided.habitId === undefined || text(x.guided.habitId)) &&
            (x.guided.alternative === undefined ||
              bool(x.guided.alternative)))) &&
        (x.completedAt === undefined || text(x.completedAt)),
    )
  )
    throw new Error("活动记录损坏");
  if (
    !list(
      s.rewards,
      (x) => text(x.key) && num(x.xp) && bool(x.demo) && text(x.day),
    ) ||
    !list(
      s.learning,
      (x) =>
        text(x.lessonId) &&
        num(x.answer) &&
        bool(x.correct) &&
        bool(x.demo) &&
        text(x.at),
    ) ||
    !list(
      s.ownMoves,
      (x) =>
        text(x.id) &&
        text(x.title) &&
        text(x.context) &&
        scene(x.scene) &&
        num(x.seconds) &&
        bool(x.demo) &&
        text(x.createdAt),
    ) ||
    !list(
      s.campaigns,
      (x) =>
        text(x.id) &&
        text(x.name) &&
        ["campus", "office"].includes(String(x.audience)) &&
        num(x.goal) &&
        ["draft", "active"].includes(String(x.status)) &&
        text(x.createdAt),
    )
  )
    throw new Error("记录数据损坏");
  if (s.life !== undefined) validateLife(s.life);
  if (s.demoLife !== undefined) validateLife(s.demoLife);
  // Reward keys and session IDs are unique invariants, including after import/migration.
  const state = s as unknown as State;
  if (
    new Set(state.rewards.map((x) => `${x.demo}:${x.key}`)).size !==
      state.rewards.length ||
    new Set(state.sessions.map((x) => x.id)).size !== state.sessions.length
  )
    throw new Error("发现重复记录");
  return state;
}
const personalState = (state: State) =>
  !demoEnabled && state.demo
    ? reduce(state, { type: "demo", value: false })
    : state;

export function load(): { state: State; error: string } {
  try {
    return {
      state: personalState(decode(localStorage.getItem(STORAGE_KEY))),
      error: "",
    };
  } catch {
    return {
      state: emptyState(),
      error:
        "本地数据无法读取。原数据已保留，请先导出原始数据；本次不会覆盖它。",
    };
  }
}
export async function transact(command: Command): Promise<State> {
  const work = () => {
    const state = decode(localStorage.getItem(STORAGE_KEY));
    if (command.type === "restore") decode(JSON.stringify(command.state));
    const next = personalState(reduce(personalState(state), command));
    if (next !== state) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  };
  if (navigator.locks) return navigator.locks.request("movequest-write", work);
  return work();
}
