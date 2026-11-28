import { findQuest } from "../data/content.js";
import { activityPolicy, fitsMovementLimits } from "./activities.js";
import { cueLabels, type Cue, type PlanMethod } from "./context.js";
import { statedDuration } from "./immediate.js";
import { categoryScene, findMove } from "./moveNow.js";
import type { Category, LifeState } from "./model.js";

const actions: Record<Cue["kind"], Partial<Record<Category, string>>> = {
  phone_break: {
    library: "campus-study-pause",
    campus: "campus-study-pause",
    office: "office-screen-pause",
    home: "home-screen-pause",
  },
  screen_break: { home: "home-screen-pause" },
  task_end: {
    office: "office-transition",
    home: "home-task-pause",
    campus: "campus-task-pause",
    library: "campus-task-pause",
  },
  meeting_end: { office: "office-transition", home: "home-task-pause" },
  class_end: { campus: "campus-next-class" },
  refill: {
    campus: "campus-water",
    library: "campus-water",
    office: "office-water",
  },
  errand: { shop: "outdoors-destination", park: "outdoors-destination" },
  commute_end: {
    subway: "outdoors-destination",
    bus: "outdoors-destination",
    park: "outdoors-destination",
  },
  waiting: {
    home: "move-ankles",
    office: "office-hands",
    campus: "move-ankles",
    library: "move-ankles",
    park: "move-ankles",
  },
  meal_end: { restaurant: "outdoors-destination", office: "office-lunch" },
};
const instructions: Record<Cue["kind"], string> = {
  phone_break:
    "选一次本来要刷手机的间隙，先把手机收起来，在允许走动的安全平坦路段慢走，然后再决定想怎么休息。",
  screen_break:
    "等这段视频结束或你主动暂停时，放下屏幕，在家沿一段安全、无障碍的路线慢走，再回去继续。",
  task_end:
    "等这一小项任务结束、内容保存好之后，沿熟悉且安全的路线慢走一段，然后开始下一项。",
  meeting_end:
    "等会议结束，收好东西，在切换到下一项任务前，沿安全平坦的路线轻松走一段。",
  class_end:
    "等下课后，沿实际要走的安全路线慢走一段。没有下一间教室也可选择去自己本来要去的地方。",
  refill:
    "等你本来就要接水时，如果有你已经知道且可安全到达的接水点，把这小段走路融入去程。",
  errand:
    "只在本来就要出门办这件事时，沿已确认安全、可达的平坦路线慢走一段，照常完成原来的事。",
  commute_end:
    "在离开交通工具后，若前方有你确认安全、平坦且允许步行的路段，可把平常就要走的一段试成轻松步行。",
  waiting: "等在安全的地方、手边事务可以停下时，留半分钟活动。",
  meal_end:
    "吃完饭以后，若你感觉舒服，在下一件事开始前沿安全平坦路线轻松走一段。",
};

const planLibrary: Record<
  PlanMethod,
  {
    activity: string;
    cues: Cue["kind"][];
    places: Category[];
    action: string;
    minimum: string;
  }
> = {
  desk_hands: {
    activity: "office-hands",
    cues: ["meeting_end", "task_end", "phone_break", "screen_break", "waiting"],
    places: ["office", "home", "campus", "library"],
    action:
      "等你提到的事情暂停或结束后，双手离开设备，在舒服的范围内慢慢张合手指。",
    minimum: "轻轻张合一次。手部有不适时可以改为平常的休息方式。",
  },
  commute_leg: {
    activity: "move-route",
    cues: ["commute_end", "errand"],
    places: ["subway", "bus", "park", "shop", "office", "campus"],
    action:
      "等完全离开交通工具，在已经要走、与车流分开的熟悉路段按舒适速度步行半分钟，照常到达目的地。",
    minimum: "走原路线的一小段即可。赶时间或遇到车流时照常通行。",
  },
  seated_reset: {
    activity: "move-seat-march",
    cues: ["task_end", "meeting_end", "phone_break", "screen_break", "waiting"],
    places: ["office", "campus", "library", "home"],
    action:
      "等这一段专注或会议结束。如果你已经坐在稳固的无轮椅上，留一分钟做几次轻柔的交替抬膝，再进入下一件事。",
    minimum: "只做一侧一次，或不方便时保留原来的休息方式。",
  },
  household_slice: {
    activity: "move-fold",
    cues: ["task_end", "screen_break", "errand", "waiting"],
    places: ["home"],
    action:
      "等你提到的那件任务或视频结束，把原本要叠、已经在手边的一件轻衣物折好，再继续原来的安排。",
    minimum: "只折一件，无需另外准备。",
  },
  stable_rise: {
    activity: "move-sit-rise",
    cues: ["task_end", "meeting_end", "screen_break"],
    places: ["home", "office", "library", "campus"],
    action:
      "把一次坐站转换融入原有的任务间隙。使用稳固无轮椅，确认你能稳定起身后慢慢站起，再坐下。动作以舒适为准。",
    minimum: "先做一次；没有合适环境或感觉不稳就跳过。",
  },
  recall_walk: {
    activity: "plan-recall-walk",
    cues: ["class_end", "task_end", "phone_break"],
    places: ["campus", "library"],
    action:
      "把一次课后或学习收尾的复盘移到步行中。手机留在口袋，在你已经知道、平坦且允许步行的路线慢走约三分钟，想一到三个刚学到的关键词。路况需要注意力时先停下复盘。",
    minimum: "今天只有一点时间时，在原本就要走的那段想一个关键词就可以。",
  },
  extend_route: {
    activity: "plan-extend-route",
    cues: ["commute_end", "errand"],
    places: ["subway", "bus", "shop", "park"],
    action:
      "只选一次不赶时间的原有行程。在已经知道安全、可达的路段，提前选一个可折返的点，多走最多五分钟，然后接回原来的路线。不增加换乘，不为凑时长走陌生路。",
    minimum: "比平时多走到下一个熟悉地标就折返；时间紧就照常。",
  },
  close_loop: {
    activity: "plan-close-loop",
    cues: ["task_end", "meeting_end", "phone_break"],
    places: ["office", "home", "campus", "library"],
    action:
      "完成你提到的那件事后，先留一句笔记说明回来要从哪一步继续。若附近有你已经确认平坦、可达的路径，慢走一圈再回来，用那句笔记接上，不用在走路时看屏幕。",
    minimum: "如果只有半分钟，走一小段就回到下一步；没合适的路线就跳过。",
  },
  light_reset: {
    activity: "plan-light-reset",
    cues: ["screen_break", "task_end"],
    places: ["home"],
    action:
      "把你本来就会做的轻物归位放到屏幕或任务结束时。只用已经在手边、轻巧且好拿的几件物品，就近归位。可以坐着做，不登高或搬重物。",
    minimum: "只归位一件就好；手边没有合适物品时不用找。",
  },
};
export function approvedPlan(cue: Cue, place: Category) {
  const method = cue.plan && planLibrary[cue.plan.method];
  if (
    !method ||
    (cue.plan?.activityId && cue.plan.activityId !== method.activity) ||
    !method.cues.includes(cue.kind) ||
    !method.places.includes(place)
  )
    return undefined;
  return method;
}

export function discoveryFor(life: LifeState, cue: Cue, activityId?: string) {
  const location = life.locations.find(
    (l) => l.id === cue.locationId && l.confirmed,
  );
  if (!location || !cue.confirmed || cue.uncertain) return;
  const durationEvidence = [cue.evidence, cue.plan?.fitEvidence ?? ""].find(
    (text) =>
      /只有|只剩|最多|不超过|no more than|only (?:have|got)|at most/i.test(
        text,
      ),
  );
  const budget = durationEvidence && statedDuration(durationEvidence);
  const fits = (quest: NonNullable<ReturnType<typeof findQuest>>) =>
    (typeof budget !== "number" || quest.seconds <= budget) &&
    fitsMovementLimits(activityPolicy(quest), life);
  const preferred = approvedPlan(cue, location.category);
  const selected = preferred && findQuest(preferred.activity);
  const method =
    selected && (!activityId || selected.id === activityId) && fits(selected)
      ? preferred
      : undefined;
  const defaultId = actions[cue.kind]?.[location.category] ?? "";
  const defaultQuest = findQuest(defaultId);
  const canDoDefault = defaultQuest && fits(defaultQuest);
  const alternate =
    ["office", "home", "campus", "library"].includes(location.category) &&
    [
      "task_end",
      "meeting_end",
      "phone_break",
      "screen_break",
      "waiting",
    ].includes(cue.kind)
      ? (location.category === "office"
          ? ["office-hands", "move-ankles", "move-neck-turn"]
          : ["move-ankles", "office-hands", "move-neck-turn"]
        )
          .map(findQuest)
          .find((item) => item && fits(item))
      : undefined;
  const quest = activityId
    ? findQuest(activityId)
    : method
      ? selected
      : canDoDefault
        ? defaultQuest
        : alternate;
  if (!quest) return;
  const policy = activityPolicy(quest);
  if (
    !policy.eligible ||
    (policy.category !== "natural" &&
      !(findMove(quest.id) && policy.category === "guided")) ||
    !fits(quest)
  )
    return;
  const move = findMove(quest.id);
  if (move && !move.scenes.includes(categoryScene[location.category])) return;
  if (
    activityId &&
    !move &&
    quest.id !== selected?.id &&
    quest.id !== defaultId &&
    quest.scene !== categoryScene[location.category]
  )
    return;
  const kind =
    cue.kind === "phone_break" || cue.kind === "screen_break"
      ? "替换一次休息方式"
      : cue.kind === "refill" || cue.kind === "errand"
        ? "融入已有任务"
        : cue.kind === "waiting"
          ? "利用等待间隙"
          : "利用任务转换";
  return {
    cue,
    location,
    quest,
    policy,
    kind,
    trigger: cueLabels[cue.kind],
    action:
      method?.action ??
      (move
        ? move.instructions[1][0]
        : activityId && activityId !== defaultId
          ? quest.steps[1]
          : instructions[cue.kind]),
    addedSeconds: quest.id === "move-route" ? 0 : quest.seconds,
    minimum:
      method?.minimum ??
      (move
        ? "先试一次或做半分钟，保持舒服。"
        : "只做最短的一小段，条件不合适就保留原来的安排。"),
    tailored: !!method,
    method: method ? cue.plan?.method : undefined,
  };
}
export type Discovery = NonNullable<ReturnType<typeof discoveryFor>>;

export function hasPlanContext(cue: Cue) {
  const fit = cue.plan?.fitEvidence.trim();
  return !cue.uncertain && !!fit && fit !== cue.evidence.trim();
}

export function availableDiscoveries(
  life: LifeState,
  now: number,
  seconds = 300,
  personalOnly = false,
) {
  if (!life.settings.enabled) return [];
  const lowFriction = life.facts?.some(
    (f) =>
      f.confirmed &&
      !f.uncertain &&
      (f.kind === "low_sweat" || f.kind === "dislikes_workout"),
  );
  const scored = (life.cues ?? [])
    .flatMap((cue) => {
      const d = discoveryFor(life, cue);
      if (
        !d ||
        d.quest.seconds > seconds ||
        (personalOnly && (!d.tailored || !hasPlanContext(cue)))
      )
        return [];
      const seen = (life.attempts ?? []).filter(
        (a) => now - a.at >= 0 && now - a.at < 14 * 86400000,
      );
      const exact = seen.filter((a) => a.cueId === cue.id);
      if (exact.some((a) => a.status === "skipped" && now - a.at < 10 * 60000))
        return [];
      const similar = seen.filter(
        (a) =>
          a.cueId !== cue.id &&
          a.locationId === d.location.id &&
          a.subtype === d.policy.subtype,
      );
      const restrictive = exact.filter(
        (a) =>
          a.reason === "too_tiring" ||
          a.reason === "social" ||
          a.reason === "inconvenient",
      );
      const inconvenient = [...exact, ...similar].filter(
        (a) => a.status === "skipped",
      ).length;
      const curiosity = exact.length ? 0 : 4;
      const short = d.quest.seconds <= 60;
      const fit =
        cue.kind === "phone_break" || cue.kind === "screen_break"
          ? 12
          : cue.kind === "refill"
            ? 9
            : 6;
      const score =
        65 +
        (d.tailored ? 18 : 0) +
        fit +
        curiosity +
        (short && lowFriction ? 7 : 0) -
        Math.min(20, inconvenient * 4 + restrictive.length * 3);
      return [
        {
          ...d,
          score,
          fitNote:
            short && lowFriction
              ? "你偏好轻松、少出汗的方式，可以只试一次短的。"
              : "把它放在你本来就会遇到的转换里，随时可以结束。",
          learned: inconvenient > 0,
        },
      ];
    })
    .sort((a, b) => b.score - a.score || a.cue.id.localeCompare(b.cue.id));
  const displayed = new Set<string>();
  return scored.filter((d) => {
    const key = `${d.location.id}:${d.quest.seconds <= 60 ? "short" : d.policy.subtype}`;
    if (displayed.has(key)) return false;
    displayed.add(key);
    return true;
  });
}

export function discover(
  life: LifeState,
  now: number,
  seconds = 300,
  personalOnly = false,
) {
  return availableDiscoveries(life, now, seconds, personalOnly).slice(
    0,
    personalOnly ? 2 : 3,
  );
}
