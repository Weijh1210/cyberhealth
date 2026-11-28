import { clockAt, type LifeState } from "./model.js";
import { discoveryFor } from "./discoveries.js";
export const skipLabels = {
  busy: "这次太忙",
  forgot: "忘了",
  timing: "时机不对",
  too_tiring: "有点累",
  social: "这个场合不自在",
  repetitive: "太重复了",
  inconvenient: "不方便",
  uninterested: "不感兴趣",
  other: "其他／不说明",
} as const;

export type Habit = {
  id: string;
  cueId: string;
  activityId: string;
  createdAt: number;
  archived: boolean;
  alternativeId?: string;
  experiment?: { startsAt: number; days: 3 | 5 | 7 };
};
export type Attempt = {
  id: string;
  habitId?: string;
  cueId: string;
  locationId: string;
  activityId: string;
  subtype: string;
  status: "done" | "skipped";
  at: number;
  selfInitiated: boolean;
  convenience?: "easy" | "hard";
  reason?: keyof typeof skipLabels;
};

export function habitStage(attempts: Attempt[], timezone: string) {
  if (attempts.some((a) => a.status === "done" && a.selfInitiated))
    return "主动发起过";
  const done = attempts.filter((a) => a.status === "done");
  const dates = new Set(
    done.map((a) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(a.at),
    ),
  );
  if (
    dates.size >= 2 &&
    done.filter((a) => a.convenience === "easy").length >= 2
  )
    return "逐渐熟悉";
  if (dates.size >= 2) return "正在重复";
  return attempts.length ? "正在尝试" : "探索中";
}

const validTime = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 8.64e15;
export function validateHabits(habits: unknown, attempts: unknown) {
  const check = <T extends { id: string }>(
    values: unknown,
    max: number,
    valid: (item: T) => boolean,
  ) =>
    values === undefined ||
    (Array.isArray(values) &&
      values.length <= max &&
      values.every((x) => x && typeof x.id === "string" && valid(x)) &&
      new Set(values.map((x) => x.id)).size === values.length);
  if (
    !check<Habit>(
      habits,
      50,
      (h) =>
        typeof h.cueId === "string" &&
        typeof h.activityId === "string" &&
        typeof h.archived === "boolean" &&
        (h.alternativeId === undefined ||
          /^[\w-]{1,80}$/.test(h.alternativeId)) &&
        validTime(h.createdAt) &&
        (h.experiment === undefined ||
          (!!h.experiment &&
            [3, 5, 7].includes(h.experiment.days) &&
            validTime(h.experiment.startsAt))),
    ) ||
    !check<Attempt>(
      attempts,
      3000,
      (a) =>
        [a.cueId, a.locationId, a.activityId, a.subtype].every(
          (x) => typeof x === "string",
        ) &&
        (a.habitId === undefined || typeof a.habitId === "string") &&
        ["done", "skipped"].includes(a.status) &&
        validTime(a.at) &&
        typeof a.selfInitiated === "boolean" &&
        (!a.selfInitiated || a.status === "done") &&
        (a.reason === undefined ||
          (a.status === "skipped" && Object.hasOwn(skipLabels, a.reason))) &&
        (a.convenience === undefined ||
          (a.status === "done" && ["easy", "hard"].includes(a.convenience))),
    )
  )
    throw Error("习惯或尝试记录损坏");
}

export function habitOpportunity(
  life: LifeState,
  habit: Habit,
  alternative = false,
) {
  const cue = life.cues?.find((item) => item.id === habit.cueId);
  if (!cue || habit.archived) return;
  const id = alternative ? habit.alternativeId : habit.activityId;
  if (id) return discoveryFor(life, cue, id);
}

export function suggestedAlternative(
  life: LifeState,
  cue: NonNullable<LifeState["cues"]>[number],
  primaryId: string,
) {
  for (const id of ["move-ankles", "office-hands", "move-neck-turn"]) {
    if (id !== primaryId && discoveryFor(life, cue, id)) return id;
  }
}

export function nextHabitMoment(life: LifeState, habit: Habit, now: number) {
  const opportunity = habitOpportunity(life, habit);
  if (!opportunity) return;
  const events = life.events.filter(
    (event) =>
      event.locationId === opportunity.location.id &&
      event.evidence &&
      opportunity.cue.evidence.trim() === event.evidence.trim(),
  );
  const clock = clockAt(now, life.timezone);
  const day = Date.parse(clock.day + "T00:00:00Z");
  for (let days = 0; days < 7; days++) {
    const date = new Date(day + days * 86400000);
    const weekend = [0, 6].includes(date.getUTCDay());
    const time = events
      .filter(
        (event) =>
          event.recurrence === "daily" ||
          event.recurrence === (weekend ? "weekend" : "weekday"),
      )
      .map((event) => event.end)
      .filter((end): end is string => !!end && (days > 0 || end >= clock.time))
      .sort()[0];
    if (time) return { days, day: date.toISOString().slice(0, 10), time };
  }
}
