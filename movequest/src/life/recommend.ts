import { eventContext, type EventContext } from "./events";
import { quests } from "../data/content";
import { activityPolicy, fitsMovementLimits } from "./activities";
import {
  clockAt,
  type LifeState,
  type LifeLocation,
  type Feedback,
} from "./model";
import type { Quest } from "../domain/types";
export type Opportunity = {
  id: string;
  quest: Quest;
  location: LifeLocation;
  score: number;
  reasons: string[];
  timeWindow: string;
  policy: ReturnType<typeof activityPolicy>;
};
const sceneFor = (category: string) =>
  ({
    home: "home",
    office: "office",
    campus: "campus",
    library: "campus",
    park: "outdoors",
    restaurant: "outdoors",
    cafe: "outdoors",
    shop: "outdoors",
    gym: "outdoors",
  })[category];
export function isQuietTime(s: LifeState["settings"], time: string) {
  return s.quietStart === s.quietEnd
    ? false
    : s.quietStart < s.quietEnd
      ? time >= s.quietStart && time < s.quietEnd
      : time >= s.quietStart || time < s.quietEnd;
}

export function recommend(
  life: LifeState,
  options: {
    now: number;
    demo: boolean;
    contextId?: string;
    availableSeconds?: number;
    completed?: string[];
    eventContext?: EventContext;
    simulated?: boolean;
  },
): Opportunity[] {
  const {
    now,
    demo,
    contextId,
    availableSeconds = 180,
    completed = [],
  } = options;
  if (options.eventContext === "busy") return [];
  const clock = clockAt(now, life.timezone),
    s = life.settings;
  if (!s.enabled || isQuietTime(s, clock.time)) return [];
  const history = life.feedback.filter((f) => f.demo === demo);
  const cap = history.filter(
    (f) =>
      ["interested", "started"].includes(f.type) &&
      clockAt(f.at, life.timezone).day === clock.day,
  );
  if (new Set(cap.map((f) => f.recommendationId)).size >= s.dailyCap) return [];
  const previous = clockAt(now - 86400000, life.timezone);
  const schedule = life.events.filter(
    (e) =>
      e.recurrence === "daily" ||
      e.recurrence === (clock.weekend ? "weekend" : "weekday") ||
      (!!e.start &&
        !!e.end &&
        e.end < e.start &&
        clock.time < e.end &&
        e.recurrence === (previous.weekend ? "weekend" : "weekday")),
  );
  const current = schedule.filter(
    (e) =>
      e.start &&
      e.end &&
      (e.end > e.start
        ? clock.time >= e.start && clock.time < e.end
        : clock.time >= e.start || clock.time < e.end),
  );
  const recent = schedule.filter(
    (e) =>
      e.end &&
      e.end <= clock.time &&
      Number(clock.time.slice(0, 2)) * 60 +
        Number(clock.time.slice(3)) -
        Number(e.end.slice(0, 2)) * 60 -
        Number(e.end.slice(3)) <=
        15,
  );
  const activeIds = contextId
    ? [contextId]
    : [...current.filter((e) => !e.busy), ...recent].map((e) => e.locationId);
  // A coarse schedule is not proof of current location. No guessed location on an empty window.
  const locations = life.locations.filter(
    (l) => l.confirmed && activeIds.includes(l.id),
  );
  const trigger = options.eventContext;
  const timeWindow =
    clock.time < "12:00"
      ? "morning"
      : clock.time < "18:00"
        ? "afternoon"
        : "evening";
  const output: Opportunity[] = [];
  for (const location of locations) {
    if (
      !contextId &&
      current.some((e) => e.locationId === location.id && e.busy)
    )
      continue;
    const ended = recent.find((e) => e.locationId === location.id);
    const ongoing = current.find((e) => e.locationId === location.id);
    const actualTrigger =
      trigger ??
      (contextId
        ? undefined
        : ended?.busy
          ? /会议|meeting/i.test(ended.title)
            ? "meeting_end"
            : "break"
          : ended || ongoing
            ? eventContext((ended ?? ongoing)!)
            : undefined);
    for (const quest of quests) {
      const policy = activityPolicy(quest);
      if (
        !policy.eligible ||
        (!!actualTrigger && !policy.triggers.includes(actualTrigger)) ||
        quest.scene !== sceneFor(location.category) ||
        quest.seconds > availableSeconds ||
        !fitsMovementLimits(policy, life) ||
        completed.includes(quest.id)
      )
        continue;
      const relevant = history.filter((f) => f.activityId === quest.id);
      if (
        relevant.some((f) => f.type === "never_recommend") ||
        relevant.some(
          (f) =>
            (f.type === "not_now" || f.type === "remind_later") &&
            now - f.at < (f.type === "remind_later" ? 30 : 10) * 60000,
        )
      )
        continue;
      const negativeTypes = ["not_suitable", "too_repetitive"];
      const scoped = history.filter(
        (f) => negativeTypes.includes(f.type) && now - f.at < 30 * 86400000,
      );
      const subtypeRejections = scoped.filter((f) => {
        const prior = quests.find((q) => q.id === f.activityId);
        return (
          prior &&
          activityPolicy(prior).subtype === policy.subtype &&
          [
            "not_interested",
            "too_difficult",
            "not_suitable",
            "too_repetitive",
          ].includes(f.reason)
        );
      });
      const subtypePenalty = Math.min(
        18,
        subtypeRejections.reduce(
          (n, f) => n + 5 * Math.exp(-(now - f.at) / (14 * 86400000)),
          0,
        ),
      );
      const weights: Partial<Record<Feedback["type"], number>> = {
        interested: 2,
        started: 2,
        completed: 5,
        not_suitable: -8,
        too_repetitive: -6,
      };
      const feedbackScore = Math.max(
        -25,
        Math.min(
          20,
          relevant.reduce(
            (n, f) =>
              n +
              (weights[f.type] ?? 0) *
                Math.exp(-(now - f.at) / (14 * 86400000)),
            0,
          ),
        ),
      );
      const timePenalty = Math.min(
        6,
        history.filter(
          (f) =>
            f.timeWindow === timeWindow &&
            f.reason === "wrong_time" &&
            now - f.at < 7 * 86400000,
        ).length * 2,
      );
      const shorter = history.filter(
        (f) =>
          f.reason === "shorter" &&
          f.sceneId === location.id &&
          now - f.at < 14 * 86400000,
      ).length;
      const durationPenalty = Math.min(
        15,
        shorter * 2 * Math.max(0, quest.seconds / 60 - 1),
      );
      const score =
        (policy.category === "natural"
          ? 60
          : policy.category === "routine"
            ? 45
            : 35) +
        feedbackScore -
        subtypePenalty -
        timePenalty -
        durationPenalty -
        Math.abs(availableSeconds - quest.seconds) / 60;
      const reasons = [
        options.simulated
          ? "演示模拟场景，非实时观察"
          : contextId
            ? "你手动选择了这个生活场景"
            : "来自你确认的日程窗口（不是实时定位）",
        `符合 ${availableSeconds / 60} 分钟空闲与场地限制`,
        policy.category === "rest" ? "休息不计作运动" : "优先自然日常活动",
      ];
      if (trigger) reasons.push(`匹配你选择的事件：${trigger}`);
      if (subtypePenalty > 0)
        reasons.push(
          `同一活动子类型近期被拒绝 ${subtypeRejections.length} 次，降权 ${Math.round(subtypePenalty)} 分；其他活动子类型不受影响`,
        );
      if (durationPenalty)
        reasons.push("根据你偏好更短选项的反馈，降低较长活动优先级");
      if (feedbackScore !== 0)
        reasons.push(`该活动的历史反馈调整 ${Math.round(feedbackScore)} 分`);
      output.push({
        id: `${clock.day}_${timeWindow}_${location.id}_${quest.id}`,
        quest,
        location,
        score,
        reasons,
        timeWindow,
        policy,
      });
    }
  }
  return output.sort(
    (a, b) => b.score - a.score || a.quest.id.localeCompare(b.quest.id),
  );
}
