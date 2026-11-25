export const analyticsNames = [
  "onboarding_started",
  "onboarding_completed",
  "life_description_submitted",
  "opportunity_displayed",
  "opportunity_accepted",
  "opportunity_rejected",
  "action_confirmed",
  "habit_created",
  "habit_attempt_recorded",
  "self_initiated",
  "world_explored",
  "world_reward_unlocked",
  "experiment_started",
  "experiment_completed",
  "premium_interest",
] as const;
export type AnalyticsName = (typeof analyticsNames)[number];
export type AnalyticsEvent = { name: AnalyticsName; key: string; at: number };

export function appendAnalytics(
  events: AnalyticsEvent[] = [],
  additions: AnalyticsEvent[],
) {
  const existing = new Set(events.map((e) => `${e.name}:${e.key}`));
  const appended = additions.filter((e) => {
    const key = `${e.name}:${e.key}`;
    if (existing.has(key)) return false;
    existing.add(key);
    return true;
  });
  return appended.length ? [...events, ...appended].slice(-500) : events;
}

export function validateAnalytics(value: unknown) {
  if (value === undefined) return;
  if (
    !Array.isArray(value) ||
    value.length > 500 ||
    !value.every(
      (e) =>
        e &&
        analyticsNames.includes(e.name) &&
        typeof e.key === "string" &&
        e.key.length <= 180 &&
        typeof e.at === "number" &&
        Number.isFinite(e.at),
    )
  )
    throw Error("本机使用记录损坏");
}
