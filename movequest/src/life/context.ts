export const cueLabels = {
  phone_break: "想刷手机的学习或工作间隙",
  screen_break: "一段视频或屏幕娱乐结束",
  task_end: "完成一个任务",
  meeting_end: "会议结束",
  class_end: "下课离开教室",
  refill: "本来就准备接水",
  errand: "出门办原本要办的事",
  commute_end: "结束通勤、离开交通工具",
  waiting: "开始一段方便的等待",
  meal_end: "吃完一顿饭",
} as const;

export const factLabels = {
  sedentary: "久坐情境",
  existing_movement: "已有活动",
  low_sweat: "偏好少出汗",
  dislikes_workout: "偏好融入日常",
  barrier: "行动阻力",
  social: "社交情境",
  space: "空间条件",
  equipment: "器材",
  goal: "目标",
  environment: "环境条件",
  limitation: "行动限制",
} as const;

type Statement = {
  id: string;
  evidence: string;
  uncertain: boolean;
  source: "ai" | "manual" | "example";
  confirmed?: boolean;
  updatedAt?: number;
};
export const planMethods = [
  "recall_walk",
  "extend_route",
  "close_loop",
  "light_reset",
  "seated_reset",
  "household_slice",
  "stable_rise",
  "desk_hands",
  "commute_leg",
] as const;
export type PlanMethod = (typeof planMethods)[number];
export type CuePlan = {
  method: PlanMethod;
  fitEvidence: string;
  activityId?: string;
};
export type Cue = Statement & {
  plan?: CuePlan;
  kind: keyof typeof cueLabels;
  locationId: string;
};
export type ContextFact = Statement & {
  kind: keyof typeof factLabels;
  locationId?: string;
};

const validStatement = (
  v: unknown,
): v is Statement & { kind: string; locationId?: string } => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const x = v as Record<string, unknown>;
  return (
    Object.keys(x).every((k) =>
      [
        "id",
        "kind",
        "locationId",
        "evidence",
        "uncertain",
        "source",
        "confirmed",
        "updatedAt",
        "plan",
      ].includes(k),
    ) &&
    typeof x.id === "string" &&
    /^[\w-]{1,80}$/.test(x.id) &&
    typeof x.evidence === "string" &&
    !!x.evidence.trim() &&
    x.evidence.length <= 300 &&
    typeof x.kind === "string" &&
    typeof x.uncertain === "boolean" &&
    (x.source === "ai" || x.source === "manual" || x.source === "example") &&
    (x.confirmed === undefined || typeof x.confirmed === "boolean") &&
    (x.updatedAt === undefined ||
      (typeof x.updatedAt === "number" && Number.isFinite(x.updatedAt))) &&
    (x.locationId === undefined ||
      (typeof x.locationId === "string" && /^[\w-]{1,80}$/.test(x.locationId)))
  );
};

export function validPlan(value: unknown): value is CuePlan {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const plan = value as Record<string, unknown>;
  return (
    Object.keys(plan).every(
      (key) =>
        key === "method" || key === "fitEvidence" || key === "activityId",
    ) &&
    planMethods.includes(plan.method as PlanMethod) &&
    (plan.activityId === undefined ||
      (typeof plan.activityId === "string" &&
        /^[\w-]{1,80}$/.test(plan.activityId))) &&
    typeof plan.fitEvidence === "string" &&
    plan.fitEvidence.length <= 200
  );
}

export function validateContext(cues: unknown, facts: unknown) {
  for (const [items, labels, needsPlace] of [
    [cues, cueLabels, true],
    [facts, factLabels, false],
  ] as const) {
    if (items === undefined) continue;
    if (
      !Array.isArray(items) ||
      items.length > 40 ||
      !items.every(
        (x) =>
          validStatement(x) &&
          Object.hasOwn(labels, x.kind) &&
          (!needsPlace || x.locationId) &&
          (!("plan" in x) ||
            x.plan === undefined ||
            (needsPlace && validPlan(x.plan))),
      ) ||
      new Set(items.map((x) => x.id)).size !== items.length
    )
      throw Error("行为线索或生活事实格式不正确");
  }
}
