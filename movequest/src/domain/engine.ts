import {
  categoryScene,
  eligibleMoves,
  findMove,
  type MoveContext,
} from "../life/moveNow";
import { isDecorationUnlocked } from "../life/worldGrowth";
import { appendAnalytics, type AnalyticsEvent } from "../life/analytics";
import { v7DemoLife } from "../life/v7Demo";
import { discoveryFor } from "../life/discoveries";
import {
  habitOpportunity,
  suggestedAlternative,
  type Attempt,
} from "../life/habits";
import { demoLife } from "../life/demo";
import {
  emptyLife,
  activeLife,
  type Decoration,
  mergeLife,
  validateLife,
  type LifeDelta,
  type Feedback,
  type LifeState,
  clockAt,
} from "../life/model";
import { activityPolicy, fitsMovementLimits } from "../life/activities";
import { findQuest, lessons } from "../data/content";
import {
  scenes,
  type State,
  type Profile,
  type Locale,
  type Session,
  type Scene,
  type Campaign,
  type OwnMove,
} from "./types";
export const localDay = (now: number) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export type Command =
  | { type: "locale"; locale: Locale }
  | { type: "district-visit"; id: string }
  | { type: "restore"; state: State }
  | { type: "local-events"; events: AnalyticsEvent[] }
  | { type: "demo-habit-history"; at: number }
  | { type: "demo-reset"; v7?: boolean; blank?: boolean; at?: number }
  | { type: "movement-goal"; minutes: number }
  | {
      type: "habit-link";
      id: string;
      sessionId: string;
      locationId: string;
      trigger: string;
      at: number;
    }
  | { type: "habit-create"; id: string; cueId: string; at: number }
  | { type: "habit-archive"; id: string }
  | { type: "habit-experiment"; id: string; days: 3 | 5 | 7; at: number }
  | {
      type: "movement-attempt";
      id: string;
      cueId: string;
      habitId?: string;
      status: Attempt["status"];
      at: number;
      selfInitiated?: boolean;
      reason?: Attempt["reason"];
      convenience?: Attempt["convenience"];
    }
  | { type: "life-theme"; theme: "garden" | "twilight" }
  | { type: "decoration-remove"; id: string }
  | { type: "decoration-move"; id: string; nodeId: string; slot: number }
  | { type: "decoration-undo" }
  | { type: "life-shown"; impressions: NonNullable<LifeState["impressions"]> }
  | { type: "life-confirm"; delta: LifeDelta; replace?: boolean; at?: number }
  | { type: "life-feedback"; feedback: Feedback }
  | { type: "life-settings"; settings: LifeState["settings"]; timezone: string }
  | { type: "life-reset" }
  | { type: "life-remove"; locationId: string }
  | {
      type: "life-decorate";
      nodeId: string;
      kind: Decoration["kind"];
      slot: number;
      id?: string;
    }
  | { type: "life-interest"; interest: LifeState["interest"] }
  | { type: "profile"; profile: Profile }
  | { type: "demo"; value: boolean }
  | {
      type: "start";
      questId: string;
      id: string;
      owner: string;
      now: number;
      seated: boolean;
      moveContext?: MoveContext;
      guided?: NonNullable<Session["guided"]>;
    }
  | { type: "tick"; id: string; owner: string; now: number }
  | { type: "pause"; id: string }
  | { type: "resume"; id: string; owner: string; now: number }
  | { type: "step"; id: string; index: number }
  | {
      type: "complete";
      intensity?: Session["intensity"];
      selfInitiated?: boolean;
      id: string;
      now: number;
      convenience?: Attempt["convenience"];
    }
  | { type: "skip"; id: string; now?: number; reason?: Attempt["reason"] }
  | { type: "answer"; lessonId: string; answer: number; now: number }
  | { type: "own"; move: OwnMove }
  | { type: "campaign"; campaign: Campaign };
const unfinished = (s: Session) => !["completed", "skipped"].includes(s.status);
export const totalXP = (s: State, demo = s.demo) =>
  s.rewards.filter((r) => r.demo === demo).reduce((n, r) => n + r.xp, 0);
export const gardenStages = [
  { xp: 0, name: "一片期待" },
  { xp: 20, name: "初见新芽" },
  { xp: 80, name: "枝叶舒展" },
  { xp: 180, name: "花开有时" },
  { xp: 320, name: "满园生机" },
];
export function garden(xp: number) {
  const index = gardenStages.findLastIndex((s) => xp >= s.xp);
  return {
    index,
    ...gardenStages[Math.max(0, index)],
    next: gardenStages[index + 1],
  };
}
export function stats(s: State, now = Date.now()) {
  const allDone = s.sessions.filter(
    (x) => x.demo === s.demo && x.status === "completed",
  );
  const rest = allDone.filter((x) => x.questId.startsWith("rest-"));
  const routines = allDone.filter((x) => x.questId.startsWith("routine-"));
  const done = allDone.filter(
    (x) => !x.questId.startsWith("rest-") && !x.questId.startsWith("routine-"),
  );
  const learned = new Set(
    s.learning
      .filter((x) => x.demo === s.demo && x.correct)
      .map((x) => x.lessonId),
  );
  const explored = new Set(done.map((x) => x.scene));
  const today = done.filter((x) => x.day === localDay(now));
  return {
    done,
    rest,
    routines,
    learned,
    explored,
    today,
    total: done.length,
    minutes: done.reduce((n, x) => n + x.elapsedMs, 0) / 60000,
    xp: totalXP(s),
    todayXP: s.rewards
      .filter((x) => x.demo === s.demo && x.day === localDay(now))
      .reduce((n, x) => n + x.xp, 0),
    own: s.ownMoves.filter((x) => x.demo === s.demo),
  };
}
export function achievements(s: State) {
  const a = stats(s);
  return [
    { name: "第一颗种子", description: "完成一次微动", unlocked: a.total > 0 },
    ...scenes.map((scene) => ({
      name: {
        campus: "校园漫游者",
        office: "工作间隙家",
        home: "居家发现家",
        outdoors: "绿意收集者",
      }[scene],
      description: "完成对应场景的微动",
      unlocked: a.explored.has(scene),
    })),
    {
      name: "生活探索者",
      description: "体验四种不同场景",
      unlocked: a.explored.size === 4,
    },
    {
      name: "好奇的芽",
      description: "完成一次知识互动",
      unlocked: a.learned.size > 0,
    },
    {
      name: "自主发现",
      description: "记录自己的日常活动机会",
      unlocked: a.own.length > 0,
    },
  ];
}
function reward(
  s: State,
  key: string,
  xp: number,
  demo: boolean,
  now: number,
): State {
  if (s.rewards.some((x) => x.key === key && x.demo === demo)) return s;
  return {
    ...s,
    rewards: [...s.rewards, { key, xp, demo, day: localDay(now) }],
  };
}
export function reduce(s: State, c: Command): State {
  if (c.type === "restore") return c.state;
  const lifeKey = s.demo ? "demoLife" : "life";
  const life = activeLife(s);
  if (c.type === "locale") {
    const key = s.demo && s.demoProfile ? "demoProfile" : "profile";
    const profile = s[key];
    return profile && profile.locale !== c.locale
      ? { ...s, [key]: { ...profile, locale: c.locale } }
      : s;
  }
  if (c.type === "district-visit") {
    if (!life.unvisitedDistricts?.includes(c.id)) return s;
    return {
      ...s,
      [lifeKey]: {
        ...life,
        unvisitedDistricts: life.unvisitedDistricts.filter((id) => id !== c.id),
      },
    };
  }
  if (c.type === "movement-goal")
    return {
      ...s,
      [lifeKey]: validateLife({ ...life, dailyGoalMinutes: c.minutes }),
    };
  const withEvents = (current: LifeState, additions: AnalyticsEvent[]) => {
    const analytics = appendAnalytics(current.analytics, additions);
    return analytics === current.analytics
      ? current
      : { ...current, analytics };
  };
  if (c.type === "local-events") {
    const current = c.events.length ? withEvents(life, c.events) : life;
    return current === life ? s : { ...s, [lifeKey]: validateLife(current) };
  }
  if (c.type === "demo-habit-history") {
    if (!s.demo) return s;
    const habit = life.habits?.find((h) => !h.archived);
    if (
      !habit ||
      !life.cues?.some(
        (cue) => cue.id === habit.cueId && cue.source === "example",
      ) ||
      life.attempts?.some((a) => a.id.startsWith("sim-history-"))
    )
      return s;
    return [2, 1, 0].reduce(
      (current, offset) =>
        reduce(current, {
          type: "movement-attempt",
          id: `sim-history-${offset}`,
          cueId: habit.cueId,
          habitId: habit.id,
          status: "done",
          at: c.at - offset * 86400000,
          selfInitiated: offset === 0,
          convenience: "easy",
        }),
      s,
    );
  }
  const decorate = (decorations: Decoration[]) => ({
    ...s,
    [lifeKey]: validateLife({
      ...life,
      decorations,
      decorationHistory: [
        ...(life.decorationHistory ?? []),
        life.decorations,
      ].slice(-20),
    }),
  });
  if (c.type === "demo-reset")
    return {
      ...s,
      demo: true,
      demoProfile: {
        name: "演示探索家",
        role: "worker",
        scenes: ["home", "office", "outdoors", "campus"],
        minutes: 2,
        reminder: 0,
        locale: "zh-CN",
      },
      demoLife: c.v7 ? v7DemoLife(c.at ?? 0, c.blank) : demoLife(),
      sessions: s.sessions.filter((x) => !x.demo),
      rewards: s.rewards.filter((x) => !x.demo),
      learning: s.learning.filter((x) => !x.demo),
      ownMoves: s.ownMoves.filter((x) => !x.demo),
    };
  if (c.type === "habit-link") {
    const session = s.sessions.find(
      (item) =>
        item.id === c.sessionId &&
        item.demo === s.demo &&
        item.status === "completed" &&
        item.guided,
    );
    const location = life.locations.find(
      (item) => item.id === c.locationId && item.confirmed,
    );
    const trigger = c.trigger.trim();
    const habits = life.habits ?? [];
    const cues = life.cues ?? [];
    if (
      !session ||
      !location ||
      categoryScene[location.category] !== session.scene ||
      !trigger ||
      trigger.length > 200 ||
      cues.length >= 40 ||
      habits.length >= 50 ||
      habits.some((habit) => habit.id === c.id)
    )
      return s;
    const cue = {
      id: c.id,
      locationId: location.id,
      evidence: trigger,
      kind: "task_end",
      source: "manual",
      uncertain: false,
      confirmed: true,
    } as const;
    if (!discoveryFor(life, cue, session.questId)) return s;
    return {
      ...s,
      [lifeKey]: validateLife({
        ...life,
        cues: [...cues, cue],
        habits: [
          ...habits,
          {
            id: c.id,
            cueId: cue.id,
            activityId: session.questId,
            createdAt: c.at,
            alternativeId: suggestedAlternative(life, cue, session.questId),
            archived: false,
          },
        ],
      }),
    };
  }
  if (c.type === "habit-create" || c.type === "movement-attempt") {
    const cue = life.cues?.find((x) => x.id === c.cueId);
    const habits = life.habits ?? [];
    const linked =
      c.type === "movement-attempt" && c.habitId
        ? habits.find((h) => h.id === c.habitId)
        : undefined;
    const opportunity = linked
      ? habitOpportunity(life, linked)
      : cue && discoveryFor(life, cue);
    if (!opportunity || !cue) return s;
    if (c.type === "habit-create") {
      if (
        habits.length >= 50 ||
        habits.some(
          (h) => h.id === c.id || (h.cueId === c.cueId && !h.archived),
        )
      )
        return s;
      const latest =
        !s.demo &&
        life.attempts?.findLast(
          (item) =>
            item.cueId === cue.id &&
            item.activityId === opportunity.quest.id &&
            item.status === "done" &&
            !item.habitId,
        );
      return {
        ...s,
        [lifeKey]: validateLife({
          ...withEvents(life, [{ name: "habit_created", key: c.id, at: c.at }]),
          ...(latest && {
            attempts: life.attempts?.map((attempt) =>
              attempt.id === latest.id
                ? { ...attempt, habitId: c.id }
                : attempt,
            ),
          }),
          habits: [
            ...habits,
            {
              id: c.id,
              cueId: c.cueId,
              activityId: opportunity.quest.id,
              alternativeId: suggestedAlternative(
                life,
                cue,
                opportunity.quest.id,
              ),
              createdAt: c.at,
              archived: false,
            },
          ],
        }),
      };
    }
    const attempts = life.attempts ?? [];
    if (attempts.some((a) => a.id === c.id)) return s;
    const habit = habits.find(
      (h) =>
        h.id === c.habitId &&
        !h.archived &&
        h.cueId === cue.id &&
        h.activityId === opportunity.quest.id,
    );
    if (c.habitId && !habit) return s;
    const attempt: Attempt = {
      id: c.id,
      habitId: habit?.id,
      cueId: cue.id,
      activityId: opportunity.quest.id,
      locationId: opportunity.location.id,
      subtype: opportunity.policy.subtype,
      status: c.status,
      at: c.at,
      selfInitiated: c.status === "done" && c.selfInitiated === true,
      reason: c.status === "skipped" ? c.reason : undefined,
      convenience: c.status === "done" ? c.convenience : undefined,
    };
    const events: AnalyticsEvent[] = [
      {
        name: c.status === "done" ? "action_confirmed" : "opportunity_rejected",
        key: c.id,
        at: c.at,
      },
    ];
    if (habit)
      events.push({ name: "habit_attempt_recorded", key: c.id, at: c.at });
    if (attempt.selfInitiated)
      events.push({ name: "self_initiated", key: c.id, at: c.at });
    const previousCount = attempts.filter(
      (a) => a.locationId === attempt.locationId && a.status === "done",
    ).length;
    if (attempt.status === "done" && previousCount < 3)
      events.push({
        name: "world_reward_unlocked",
        key: `${attempt.locationId}:${previousCount + 1}`,
        at: c.at,
      });
    return {
      ...s,
      [lifeKey]: validateLife({
        ...withEvents(life, events),
        attempts: [...attempts, attempt].slice(-3000),
      }),
    };
  }
  if (c.type === "habit-archive" || c.type === "habit-experiment") {
    const habits = life.habits ?? [];
    const habit = habits.find((h) => h.id === c.id && !h.archived);
    if (
      !habit ||
      (c.type === "habit-experiment" &&
        habit.experiment &&
        c.at < habit.experiment.startsAt + habit.experiment.days * 86400000)
    )
      return s;
    const tracked =
      c.type === "habit-experiment"
        ? withEvents(life, [
            { name: "experiment_started", key: `${c.id}:${c.at}`, at: c.at },
          ])
        : life;
    return {
      ...s,
      [lifeKey]: validateLife({
        ...tracked,
        habits: habits.map((h) =>
          h.id !== c.id
            ? h
            : c.type === "habit-archive"
              ? { ...h, archived: true }
              : { ...h, experiment: { startsAt: c.at, days: c.days } },
        ),
      }),
    };
  }
  if (c.type === "life-theme")
    return { ...s, [lifeKey]: validateLife({ ...life, theme: c.theme }) };
  if (c.type === "decoration-remove")
    return decorate(life.decorations.filter((d) => d.id !== c.id));
  if (c.type === "decoration-move") {
    const item = life.decorations.find((d) => d.id === c.id);
    if (
      !item ||
      !life.nodes.some((n) => n.id === c.nodeId) ||
      life.decorations.some((d) => d.nodeId === c.nodeId && d.slot === c.slot)
    )
      return s;
    return decorate([
      ...life.decorations.filter((d) => d.id !== c.id),
      { ...item, nodeId: c.nodeId, slot: c.slot },
    ]);
  }
  if (c.type === "decoration-undo") {
    const history = life.decorationHistory ?? [];
    return history.length
      ? {
          ...s,
          [lifeKey]: {
            ...life,
            decorations: history[history.length - 1],
            decorationHistory: history.slice(0, -1),
          },
        }
      : s;
  }
  if (c.type === "life-shown") {
    const existing = life.impressions ?? [];
    const additions = c.impressions
      .filter((i) => !existing.some((e) => e.id === i.id && e.demo === s.demo))
      .map((i) => ({ ...i, demo: s.demo }));
    return additions.length
      ? {
          ...s,
          [lifeKey]: validateLife({
            ...life,
            impressions: [...existing, ...additions],
          }),
        }
      : s;
  }
  if (c.type === "life-confirm") {
    const ids = new Set(c.delta.locations.map((l) => l.id));
    const base = c.replace
      ? {
          ...life,
          locations: life.locations.filter((l) => ids.has(l.id)),
          events: [],
          cues: [],
          facts: [],
          nodes: life.nodes.filter((n) => ids.has(n.id)),
          edges: [],
          decorations: life.decorations.filter((d) => ids.has(d.nodeId)),
        }
      : life;
    const merged = mergeLife(base, c.delta, c.at);
    return {
      ...s,
      [lifeKey]:
        !life.locations.length && merged.locations.length && c.at
          ? withEvents(merged, [
              { name: "onboarding_completed", key: "first", at: c.at },
            ])
          : merged,
    };
  }
  if (c.type === "life-feedback") {
    if (life.feedback.some((f) => f.id === c.feedback.id)) return s;
    return {
      ...s,
      [lifeKey]: validateLife({
        ...life,
        feedback: [...life.feedback, { ...c.feedback, demo: s.demo }],
      }),
    };
  }
  if (c.type === "life-reset")
    return {
      ...s,
      [lifeKey]: {
        ...life,
        feedback: life.feedback.filter((f) => f.demo !== s.demo),
      },
    };
  if (c.type === "life-settings")
    return {
      ...s,
      [lifeKey]: validateLife({
        ...life,
        settings: c.settings,
        timezone: c.timezone,
      }),
    };
  if (c.type === "life-interest")
    return {
      ...s,
      [lifeKey]: validateLife({
        ...(c.interest
          ? withEvents(life, [
              {
                name: "premium_interest",
                key: String(c.interest.at),
                at: c.interest.at,
              },
            ])
          : life),
        interest: c.interest,
      }),
    };
  if (c.type === "life-remove")
    return {
      ...s,
      [lifeKey]: validateLife({
        ...life,
        unvisitedDistricts: life.unvisitedDistricts?.filter(
          (id) => id !== c.locationId,
        ),
        locations: life.locations.filter((l) => l.id !== c.locationId),
        events: life.events.filter((e) => e.locationId !== c.locationId),
        cues: life.cues?.filter((e) => e.locationId !== c.locationId),
        facts: life.facts?.filter((e) => e.locationId !== c.locationId),
        nodes: life.nodes.filter((n) => n.id !== c.locationId),
        edges: life.edges.filter(
          (e) => e.from !== c.locationId && e.to !== c.locationId,
        ),
        decorations: life.decorations.filter((d) => d.nodeId !== c.locationId),
      }),
    };
  if (c.type === "life-decorate") {
    if (
      !isDecorationUnlocked(life, c.kind) ||
      !life.nodes.some((n) => n.id === c.nodeId) ||
      life.decorations.some((d) => d.nodeId === c.nodeId && d.slot === c.slot)
    )
      return s;
    const base = c.id ?? `decor_${c.nodeId}_${c.slot}`;
    let id = base;
    for (let suffix = 1; life.decorations.some((d) => d.id === id); suffix++)
      id = `${base}_${suffix}`;
    return decorate([
      ...life.decorations,
      { id, nodeId: c.nodeId, kind: c.kind, slot: c.slot },
    ]);
  }
  if (c.type === "profile")
    return s.demo
      ? { ...s, demoProfile: c.profile }
      : { ...s, profile: c.profile };
  if (c.type === "demo")
    return {
      ...s,
      demo: c.value,
      demoLife: c.value
        ? (s.demoLife ?? structuredClone(s.life ?? emptyLife()))
        : s.demoLife,
      sessions: s.sessions.map((x) =>
        x.status === "running" ? { ...x, status: "paused" } : x,
      ),
    };
  if (c.type === "own")
    return c.move.title.trim() &&
      c.move.context.trim() &&
      !s.ownMoves.some((x) => x.id === c.move.id)
      ? {
          ...s,
          ownMoves: [
            ...s.ownMoves,
            {
              ...c.move,
              title: c.move.title.trim(),
              context: c.move.context.trim(),
              demo: s.demo,
            },
          ],
        }
      : s;
  if (c.type === "campaign")
    return c.campaign.name.trim() && c.campaign.goal > 0
      ? {
          ...s,
          campaigns: [
            ...s.campaigns.filter((x) => x.id !== c.campaign.id),
            { ...c.campaign, name: c.campaign.name.trim() },
          ],
        }
      : s;
  if (c.type === "answer") {
    const lesson = lessons.find((x) => x.id === c.lessonId);
    if (!lesson || c.answer < 0 || c.answer >= lesson.options.length) return s;
    const correct = c.answer === lesson.answer;
    const next = {
      ...s,
      learning: [
        ...s.learning,
        {
          lessonId: c.lessonId,
          answer: c.answer,
          correct,
          demo: s.demo,
          at: new Date(c.now).toISOString(),
        },
      ],
    };
    return correct
      ? reward(next, `lesson:${c.lessonId}`, 5, s.demo, c.now)
      : next;
  }
  if (c.type === "start") {
    if (s.sessions.some((x) => x.id === c.id)) return s;
    const q = findQuest(c.questId);
    const own = s.ownMoves.find((x) => x.id === c.questId && x.demo === s.demo);
    if (!q && !own) return s;
    if (q) {
      const policy = activityPolicy(q);
      if (!policy.eligible || !fitsMovementLimits(policy, life) || c.seated)
        return s;
    }
    const move = q && findMove(q.id);
    const guidedLocation =
      c.guided?.locationId &&
      life.locations.find((l) => l.id === c.guided?.locationId && l.confirmed);
    if (c.guided?.locationId && !guidedLocation) return s;
    if (
      move &&
      guidedLocation &&
      c.moveContext?.scene !== categoryScene[guidedLocation.category]
    )
      return s;
    if (c.guided?.habitId && !c.guided.cueId) return s;
    if (c.guided?.cueId) {
      const cue = life.cues?.find((x) => x.id === c.guided?.cueId);
      const habit = c.guided.habitId
        ? life.habits?.find(
            (h) => h.id === c.guided?.habitId && h.cueId === cue?.id,
          )
        : undefined;
      const opportunity = habit
        ? habitOpportunity(life, habit, c.guided.alternative)
        : !c.guided.habitId && cue && discoveryFor(life, cue);
      if (
        !cue ||
        !opportunity ||
        cue.locationId !== c.guided.locationId ||
        opportunity.quest.id !== q?.id
      )
        return s;
    }
    if (
      move &&
      (!c.moveContext ||
        !c.guided ||
        !eligibleMoves(c.moveContext, life).some((m) => m.id === move.id))
    )
      return s;
    if (
      c.guided &&
      !move &&
      (!q ||
        !c.moveContext?.safe ||
        c.moveContext.environment === "unsafe" ||
        (c.moveContext.noWalking && activityPolicy(q).walking))
    )
      return s;
    const session: Session = {
      ...(c.guided ? { guided: c.guided } : {}),
      id: c.id,
      questId: c.questId,
      scene: c.moveContext?.scene ?? ((q?.scene ?? own!.scene) as Scene),
      title: q?.title ?? own!.title,
      targetMs: s.demo ? 3000 : (q?.seconds ?? own!.seconds) * 1000,
      ...(c.guided && !s.demo && q && { countdownUntil: c.now + 3000 }),
      elapsedMs: 0,
      steps: 0,
      stepCount: q?.steps.length ?? 3,
      kind: c.guided ? "timer" : (q?.kind ?? "timer"),
      status: !c.guided && q?.kind === "steps" ? "paused" : "running",
      owner: c.owner,
      lastTick: c.now,
      demo: s.demo,
      seated: c.seated,
      createdAt: new Date(c.now).toISOString(),
      xp: 0,
      own: !!own,
    };
    return {
      ...s,
      [lifeKey]: withActivityFeedback(
        c.moveContext && !c.guided?.cueId
          ? {
              ...life,
              movePreferences: {
                goal: c.moveContext.goal,
                effort: c.moveContext.effort,
                discreet: c.moveContext.discreet,
                lowSweat: c.moveContext.lowSweat,
              },
            }
          : life,
        session,
        "started",
        c.now,
      ),
      sessions: [
        ...s.sessions.map((x) =>
          x.demo === s.demo && unfinished(x)
            ? { ...x, status: "skipped" as const }
            : x,
        ),
        session,
      ],
    };
  }
  const index = s.sessions.findIndex((x) => x.id === c.id);
  if (index < 0) return s;
  const current = s.sessions[index];
  let next = { ...current };
  if (c.type === "skip" && unfinished(next)) {
    next.status = "skipped";
    if (next.guided && c.now !== undefined && next.demo === s.demo)
      return {
        ...s,
        [lifeKey]: guidedAttempt(
          life,
          next,
          c.now,
          "skipped",
          undefined,
          c.reason,
        ),
        sessions: s.sessions.map((x, i) => (i === index ? next : x)),
      };
  }
  if (c.type === "pause" && next.status === "running") {
    next.status = "paused";
    if (next.countdownUntil) next.countdownUntil = undefined;
  }
  if (
    c.type === "resume" &&
    next.status === "paused" &&
    next.kind === "timer"
  ) {
    const activity = findQuest(next.questId);
    if (
      next.demo !== s.demo ||
      (activity && !fitsMovementLimits(activityPolicy(activity), life))
    )
      return s;
    next.status = "running";
    next.owner = c.owner;
    next.lastTick = c.now;
  }
  if (
    c.type === "tick" &&
    next.status === "running" &&
    next.owner === c.owner
  ) {
    if (next.countdownUntil && c.now < next.countdownUntil) return s;
    const delta = Math.max(
      0,
      Math.min(c.now - Math.max(next.lastTick, next.countdownUntil ?? 0), 1500),
    );
    next.countdownUntil = undefined;
    if (c.now < next.lastTick) return s;
    next.elapsedMs = Math.min(next.targetMs, next.elapsedMs + delta);
    next.lastTick = c.now;
    if (next.elapsedMs >= next.targetMs) next.status = "ready";
  }
  if (
    c.type === "step" &&
    next.kind === "steps" &&
    next.status === "paused" &&
    c.index === next.steps
  ) {
    next.steps++;
    if (next.steps === next.stepCount) next.status = "ready";
  }
  if (c.type === "complete") {
    if (next.status !== "ready" || next.demo !== s.demo) return s;
    const key = next.own
      ? `own:${localDay(c.now)}`
      : `quest:${next.questId}:${localDay(c.now)}`;
    const awarded = reward(
      s,
      key,
      next.questId.startsWith("rest-") ? 5 : 20,
      next.demo,
      c.now,
    );
    next = {
      ...next,
      status: "completed",
      intensity: c.intensity,
      completedAt: new Date(c.now).toISOString(),
      day: localDay(c.now),
      elapsedMs: next.kind === "steps" ? next.targetMs : next.elapsedMs,
      xp: awarded === s ? 0 : next.questId.startsWith("rest-") ? 5 : 20,
    };
    return {
      ...awarded,
      [lifeKey]: next.guided
        ? guidedAttempt(
            withActivityFeedback(life, next, "completed", c.now),
            next,
            c.now,
            "done",
            c.convenience,
            undefined,
            c.selfInitiated,
          )
        : withActivityFeedback(life, next, "completed", c.now),
      sessions: s.sessions.map((x) => (x.id === next.id ? next : x)),
    };
  }
  if (JSON.stringify(next) === JSON.stringify(current)) return s;
  return { ...s, sessions: s.sessions.map((x, i) => (i === index ? next : x)) };
}

function guidedAttempt(
  life: LifeState,
  session: Session,
  at: number,
  status: Attempt["status"],
  convenience?: Attempt["convenience"],
  reason?: Attempt["reason"],
  selfInitiated?: boolean,
): LifeState {
  const id = `guided-${session.id}`;
  const current = life.attempts ?? [];
  if (current.some((a) => a.id === id) || !session.guided) return life;
  const habit = life.habits?.find(
    (h) =>
      !h.archived &&
      h.cueId === session.guided?.cueId &&
      (session.guided?.habitId
        ? h.id === session.guided.habitId
        : h.activityId === session.questId),
  );
  return validateLife({
    ...life,
    attempts: [
      ...current,
      {
        id,
        cueId: session.guided.cueId ?? `now-${session.questId}`,
        locationId: session.guided.locationId ?? "",
        activityId: session.questId,
        subtype: session.questId,
        habitId: habit?.id,
        status,
        at,
        selfInitiated:
          status === "done" &&
          (selfInitiated === true || !session.guided.cueId),
        convenience,
        reason,
      },
    ].slice(-3000),
  });
}

function withActivityFeedback(
  life: LifeState,
  session: Session,
  type: "started" | "completed",
  now: number,
): LifeState {
  const q = findQuest(session.questId);
  if (!q) return life;
  const recent = life.feedback.findLast(
    (f) =>
      f.activityId === q.id &&
      f.demo === session.demo &&
      f.type === "interested" &&
      now - f.at < 3600000,
  );
  const location =
    life.locations.find((l) => l.id === session.guided?.locationId) ??
    life.locations.find((l) => l.id === recent?.sceneId) ??
    life.locations.find(
      (l) =>
        l.category === session.scene ||
        (session.scene === "outdoors" && l.category === "park"),
    );
  if (!location) return life;
  const category = activityPolicy(q).category;
  const time = clockAt(now, life.timezone).time;
  const window =
    time < "12:00" ? "morning" : time < "18:00" ? "afternoon" : "evening";
  return {
    ...life,
    feedback: [
      ...life.feedback,
      {
        id: `${session.id}_${type}`,
        recommendationId: recent?.recommendationId ?? session.id,
        activityId: q.id,
        category,
        sceneId: location.id,
        timeWindow: recent?.timeWindow ?? window,
        type,
        reason: "explicit-session-action",
        at: now,
        demo: session.demo,
        completionConfirmation: type === "completed",
      },
    ],
  };
}
