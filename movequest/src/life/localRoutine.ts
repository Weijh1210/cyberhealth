import type { Cue, ContextFact, PlanMethod } from "./context";
import {
  categoryNames,
  type Category,
  type LifeDelta,
  type LifeLocation,
  type LifeState,
} from "./model";
import {
  avoidArms,
  avoidLegs,
  discreetWords,
  lowSweatWords,
  placeWords,
  statedDuration,
} from "./immediate";

const triggers: [Cue["kind"], RegExp][] = [
  [
    "commute_end",
    /(?:下车|下車|出站|出闸|出閘|下地铁|下地鐵|下公交)(?:后|後)?|(?:off|leave|exit) (?:the |my )?(?:train|bus|subway|metro|station)/i,
  ],
  [
    "meeting_end",
    /会(?:议|議|后|後)|开完.{0,10}会|開完.{0,10}會|周会|例会|\b(?:meeting|video call|online call)s?\b/i,
  ],
  [
    "screen_break",
    /视频|視頻|影片|追剧|追劇|片尾|看完.{0,6}集|\b(?:videos?|episodes?|shows?)\b/i,
  ],
  ["class_end", /下课|下課|课后|課後|class ends|after class/i],
  ["phone_break", /刷手机|刷手機|玩手机|玩手機|scroll.{0,20}phone/i],
  ["waiting", /排队|排隊|在等|等待|等候|等水|等饭|等人|\bwait(?:ing)?\b/i],
  [
    "task_end",
    /写完|寫完|做完|读完|讀完|完成|提交|保存|任务.{0,7}(?:后|後|结束)|休息|久坐|(?:坐|自习|自習|学习).{0,8}(?:小时|小時)|\b(?:finish(?:ed|ing)?|submit|save|study|studying|sitting|sit|task|break)\b/i,
  ],
  ["refill", /接水|装水|裝水|refill/i],
  ["meal_end", /吃完|饭后|飯後|after (?:lunch|dinner|breakfast)/i],
  ["errand", /买菜|買菜|取快递|取快遞|跑腿|\berrands?\b/i],
];

const folding =
  /叠.{0,5}(?:衣|毛巾)|摺.{0,5}(?:衣|毛巾)|fold.{0,30}(?:laundry|clothes|shirt|towel)/i;
const tidy = /整理|归位|歸位|收拾|put.{0,22}away|tidy/i;
const walking = /步行|走路|走到|走去|散步|走一段|步道|\bwalk(?:ing)?\b/i;
const avoidStanding =
  /(?:不能|不可|没法|無法|无法|不便)(?:站|起身)|(?:can't|cannot|unable to) stand/i;
const avoidWalking =
  /(?:不能|不可|没法|無法|无法|不便)(?:走|步行)|(?:can't|cannot|unable to) walk/i;
const formal =
  /不喜欢.{0,8}(?:运动|锻炼)|不喜歡.{0,8}(?:運動|鍛鍊)|dislike.{0,12}(?:exercise|workouts?)/i;

function choosePlan(
  kind: Cue["kind"],
  place: Category,
  clause: string,
  context: string,
): PlanMethod | undefined {
  if (kind === "commute_end") {
    if (walking.test(context) && !avoidWalking.test(context)) {
      const duration = statedDuration(context);
      return (duration === undefined || duration >= 300) &&
        /多走|繞一|绕一|延长|longer|extra/i.test(context)
        ? "extend_route"
        : "commute_leg";
    }
    return;
  }
  if (place === "home") {
    if (
      folding.test(clause) &&
      ["task_end", "screen_break", "waiting", "errand"].includes(kind)
    )
      return "household_slice";
    if (tidy.test(clause) && ["screen_break", "task_end"].includes(kind))
      return "light_reset";
    if (kind === "screen_break") return "desk_hands";
  }
  const indoor = ["campus", "library", "office", "home"].includes(place);
  if (
    !indoor ||
    ![
      "task_end",
      "meeting_end",
      "phone_break",
      "screen_break",
      "waiting",
    ].includes(kind)
  )
    return;
  if (
    place === "office" ||
    discreetWords.test(context) ||
    lowSweatWords.test(context)
  )
    return "desk_hands";
  return "seated_reset";
}

export function interpretRoutine(
  text: string,
  existing: Pick<LifeState, "locations">,
): LifeDelta {
  const locations: LifeLocation[] = [];
  const cues: Cue[] = [];
  const events: LifeDelta["events"] = [];
  const facts: ContextFact[] = [];
  const clauses = text
    .split(/[。！？；;!?\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  let place: LifeLocation | undefined;
  let previousClause = "";
  for (const clause of clauses.slice(0, 20)) {
    const cueKind = triggers.find(([, pattern]) => pattern.test(clause))?.[0];
    const known = existing.locations.find(
      (item) => item.name && clause.includes(item.name),
    );
    const mentioned = (
      Object.entries(placeWords) as [Category, RegExp][]
    ).filter(([, pattern]) => pattern.test(clause));
    const category =
      known?.category ??
      (cueKind === "commute_end"
        ? mentioned.find(([key]) => key === "subway" || key === "bus")?.[0]
        : mentioned[0]?.[0]);
    if (known || category) {
      place = known ?? locations.find((item) => item.category === category);
      if (!place && category) {
        place = {
          id: `place_${crypto.randomUUID()}`,
          name: categoryNames[category],
          category,
          source: "manual",
          confirmed: false,
        };
        locations.push(place);
      }
    } else if (mentioned.length > 1) {
      place = undefined;
    }
    const evidence = clause.slice(0, 200);
    const locationId = place?.id;
    for (const [kind, pattern] of [
      ["low_sweat", lowSweatWords],
      ["social", discreetWords],
      ["dislikes_workout", formal],
      ["existing_movement", walking],
      ["limitation", /不能|无法|無法|cannot|can't/i],
      ["sedentary", /久坐|坐.{0,12}(?:小时|小時)|sit(?:ting)? for/i],
    ] as const) {
      if (pattern.test(clause))
        facts.push({
          id: `fact_${crypto.randomUUID()}`,
          locationId,
          evidence,
          kind,
          source: "manual",
          uncertain: false,
        });
    }
    if (
      place &&
      cueKind &&
      !cues.some((cue) => cue.locationId === place!.id && cue.kind === cueKind)
    ) {
      const context =
        cueKind === "commute_end"
          ? clause
          : `${previousClause} ${clause} ${text}`;
      const method = choosePlan(cueKind, place.category, clause, context);
      const fitEvidence = clauses.find(
        (candidate) =>
          candidate !== clause &&
          (discreetWords.test(candidate) ||
            lowSweatWords.test(candidate) ||
            statedDuration(candidate) !== undefined ||
            formal.test(candidate)),
      );
      cues.push({
        id: `cue_${crypto.randomUUID()}`,
        locationId: place.id,
        evidence,
        kind: cueKind,
        source: "manual",
        uncertain: false,
        ...(method && {
          plan: { method, fitEvidence: fitEvidence?.slice(0, 200) ?? "" },
        }),
      });
      const times = [
        ...clause.matchAll(/(?<!\d)([01]?\d|2[0-3]):([0-5]\d)(?!\d)/g),
      ].map((match) => `${match[1].padStart(2, "0")}:${match[2]}`);
      events.push({
        id: `event_${crypto.randomUUID()}`,
        locationId: place.id,
        title: evidence.slice(0, 80),
        start: times[0] ?? null,
        end: times[1] ?? null,
        recurrence: /周末|週末|weekends?/i.test(clause)
          ? "weekend"
          : /工作日|平日|weekdays?/i.test(clause)
            ? "weekday"
            : /每天|每日|every day|daily/i.test(clause)
              ? "daily"
              : "unscheduled",
        transport:
          cueKind === "commute_end" && walking.test(clause)
            ? "walk"
            : "unknown",
        busy: false,
        evidence,
      });
    }
    previousClause = clause;
  }
  const limitedStanding = clauses.find((clause) => avoidStanding.test(clause));
  const limitedWalking = clauses.find((clause) => avoidWalking.test(clause));
  const limitedArms = clauses.find((clause) => avoidArms.test(clause));
  const limitedLegs = clauses.find((clause) => avoidLegs.test(clause));
  return {
    locations,
    events,
    cues,
    facts: facts.slice(0, 40),
    questions: [],
    ...(limitedStanding || limitedWalking || limitedArms || limitedLegs
      ? {
          constraints: {
            ...(limitedStanding && { standingAllowed: false }),
            ...(limitedWalking && { walkingAllowed: false }),
            ...(limitedArms && { armsAllowed: false }),
            ...(limitedLegs && { legsAllowed: false }),
            notes: [
              ...new Set(
                [limitedStanding, limitedWalking, limitedArms, limitedLegs]
                  .filter((part): part is string => !!part)
                  .map((part) => part.slice(0, 160)),
              ),
            ],
          },
        }
      : {}),
  };
}
