import type { MovePreferences } from "./moveNow.js";
import { validateAnalytics, type AnalyticsEvent } from "./analytics.js";
import { validateHabits, type Habit, type Attempt } from "./habits.js";
import { validateContext, type Cue, type ContextFact } from "./context.js";
import { nextPlot } from "./worldLayout.js";
export const categories = [
  "home",
  "office",
  "campus",
  "library",
  "subway",
  "bus",
  "restaurant",
  "cafe",
  "park",
  "shop",
  "gym",
  "other",
] as const;
export type Category = (typeof categories)[number];
export const categoryNames: Record<Category, string> = {
  home: "家",
  office: "公司",
  campus: "学校",
  library: "图书馆",
  subway: "地铁站",
  bus: "公交站",
  restaurant: "餐厅",
  cafe: "咖啡馆",
  park: "公园",
  shop: "商店",
  gym: "运动场",
  other: "其他地点",
};
export type LifeLocation = {
  id: string;
  name: string;
  category: Category;
  source: "manual" | "ai";
  confirmed: boolean;
};
export type LifeEvent = {
  id: string;
  locationId: string;
  title: string;
  start: string | null;
  end: string | null;
  recurrence: "weekday" | "weekend" | "daily" | "unscheduled";
  transport: "walk" | "subway" | "bus" | "car" | "bike" | "unknown";
  busy: boolean;
  evidence: string;
  approximate?: boolean;
};
export type LifeConstraints = {
  notes: string[];
  walkingAllowed?: boolean;
  standingAllowed?: boolean;
  armsAllowed?: boolean;
  legsAllowed?: boolean;
};
export type LifeDelta = {
  cues?: Cue[];
  facts?: ContextFact[];
  preferences?: string[];
  constraints?: LifeConstraints;
  locations: LifeLocation[];
  events: LifeEvent[];
  questions: string[];
};
export type WorldNode = { id: string; x: number; z: number; variant: number };
export const decorationKinds = [
  "tree",
  "flowers",
  "bench",
  "lamp",
  "fountain",
  "planter",
  "pennant",
  "pergola",
] as const;
export type Decoration = {
  id: string;
  kind: (typeof decorationKinds)[number];
  nodeId: string;
  slot: number;
};
export function activeLife(s: {
  life?: LifeState;
  demoLife?: LifeState;
  demo: boolean;
}): LifeState {
  return (s.demo ? (s.demoLife ?? s.life) : s.life) ?? emptyLife();
}
export type WorldEdge = {
  id: string;
  from: string;
  to: string;
  mode: LifeEvent["transport"];
  kind?: "routine" | "decorative";
};
export type FeedbackType =
  | "interested"
  | "started"
  | "completed"
  | "not_now"
  | "remind_later"
  | "not_suitable"
  | "too_repetitive"
  | "never_recommend";
export type Feedback = {
  id: string;
  recommendationId: string;
  activityId: string;
  category: string;
  sceneId: string;
  timeWindow: string;
  type: FeedbackType;
  reason: string;
  at: number;
  demo: boolean;
  completionConfirmation: boolean;
};
export type LifeState = {
  dailyGoalMinutes?: number;
  movePreferences?: MovePreferences;
  unvisitedDistricts?: string[];
  analytics?: AnalyticsEvent[];
  habits?: Habit[];
  attempts?: Attempt[];
  cues?: Cue[];
  facts?: ContextFact[];
  version: 1;
  preferences?: string[];
  constraints?: LifeConstraints;
  timezone: string;
  seed: number;
  locations: LifeLocation[];
  events: LifeEvent[];
  nodes: WorldNode[];
  edges: WorldEdge[];
  decorations: Decoration[];
  decorationHistory?: Decoration[][];
  theme?: "garden" | "twilight";
  impressions?: {
    id: string;
    activityId: string;
    sceneId: string;
    score: number;
    reasons: string[];
    at: number;
    demo: boolean;
  }[];
  feedback: Feedback[];
  settings: {
    walking: boolean;
    standing: boolean;
    quietStart: string;
    quietEnd: string;
    dailyCap: number;
    enabled: boolean;
  };
  interest: {
    price: number;
    at: number;
    status: "local" | "registered";
  } | null;
};
export const emptyLife = (): LifeState => ({
  version: 1,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai",
  seed: 173,
  locations: [],
  events: [],
  nodes: [],
  edges: [],
  decorations: [],
  feedback: [],
  settings: {
    walking: true,
    standing: true,
    quietStart: "22:00",
    quietEnd: "07:00",
    dailyCap: 8,
    enabled: true,
  },
  interest: null,
});
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max = 160): v is string =>
  typeof v === "string" && v.length <= max;
const id = (v: unknown): v is string =>
  str(v, 80) && /^[a-zA-Z0-9_-]+$/.test(v);
const time = (v: unknown) =>
  v === null || (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v));
const keys = (v: Record<string, unknown>, allowed: string[]) =>
  Object.keys(v).every((k) => allowed.includes(k));
export function validateDelta(value: unknown): LifeDelta {
  if (
    !record(value) ||
    !keys(value, [
      "locations",
      "events",
      "questions",
      "preferences",
      "constraints",
      "cues",
      "facts",
    ]) ||
    !Array.isArray(value.locations) ||
    value.locations.length > 40 ||
    !Array.isArray(value.events) ||
    value.events.length > 100 ||
    !Array.isArray(value.questions) ||
    value.questions.length > 8 ||
    !value.questions.every((x) => str(x, 300))
  )
    throw Error("生活资料结构不正确");
  if (
    value.preferences !== undefined &&
    (!Array.isArray(value.preferences) ||
      value.preferences.length > 12 ||
      !value.preferences.every((v) => str(v, 200)))
  )
    throw Error("偏好字段不正确");
  if (
    value.constraints !== undefined &&
    (!record(value.constraints) ||
      !keys(value.constraints, [
        "notes",
        "walkingAllowed",
        "standingAllowed",
        "armsAllowed",
        "legsAllowed",
      ]) ||
      !Array.isArray(value.constraints.notes) ||
      !value.constraints.notes.every((v) => str(v, 200)) ||
      value.constraints.notes.length > 12 ||
      ["walkingAllowed", "standingAllowed", "armsAllowed", "legsAllowed"].some(
        (k) =>
          value.constraints &&
          record(value.constraints) &&
          value.constraints[k] !== undefined &&
          typeof value.constraints[k] !== "boolean",
      ))
  )
    throw Error("限制字段不正确");
  for (const l of value.locations)
    if (
      !record(l) ||
      !keys(l, ["id", "name", "category", "source", "confirmed"]) ||
      !id(l.id) ||
      !str(l.name, 60) ||
      !l.name.trim() ||
      !categories.includes(l.category as Category) ||
      !["manual", "ai"].includes(String(l.source)) ||
      typeof l.confirmed !== "boolean"
    )
      throw Error("地点字段不正确");
  const ids = new Set(value.locations.map((l) => l.id));
  if (ids.size !== value.locations.length) throw Error("地点 ID 重复");
  const eventIds = new Set<string>();
  for (const e of value.events) {
    if (
      !record(e) ||
      !keys(e, [
        "id",
        "locationId",
        "title",
        "start",
        "end",
        "recurrence",
        "transport",
        "busy",
        "evidence",
        "approximate",
      ]) ||
      !id(e.id) ||
      !id(e.locationId) ||
      !str(e.title) ||
      !e.title.trim() ||
      !time(e.start) ||
      !time(e.end) ||
      !["weekday", "weekend", "daily", "unscheduled"].includes(
        String(e.recurrence),
      ) ||
      !["walk", "subway", "bus", "car", "bike", "unknown"].includes(
        String(e.transport),
      ) ||
      typeof e.busy !== "boolean" ||
      (e.approximate !== undefined && typeof e.approximate !== "boolean") ||
      !str(e.evidence, 500)
    )
      throw Error("事件或时间格式不正确");
    if (eventIds.has(e.id)) throw Error("事件 ID 重复");
    eventIds.add(e.id);
  }
  validateContext(value.cues, value.facts);
  return value as unknown as LifeDelta;
}
export function validateLife(value: unknown): LifeState {
  if (
    !record(value) ||
    value.version !== 1 ||
    !str(value.timezone) ||
    !Number.isSafeInteger(value.seed)
  )
    throw Error("世界数据版本不正确");
  new Intl.DateTimeFormat("en", {
    timeZone: value.timezone as string,
  }).format();
  validateDelta({
    locations: value.locations,
    events: value.events,
    questions: [],
    preferences: value.preferences,
    constraints: value.constraints,
    cues: value.cues,
    facts: value.facts,
  });
  validateHabits(value.habits, value.attempts);
  validateAnalytics(value.analytics);
  const l = value as unknown as LifeState;
  if (
    l.movePreferences &&
    (![
      "any",
      "aerobic",
      "household",
      "mobility",
      "routine",
      "strength",
    ].includes(l.movePreferences.goal) ||
      !["gentle", "steady"].includes(l.movePreferences.effort) ||
      typeof l.movePreferences.lowSweat !== "boolean" ||
      typeof l.movePreferences.discreet !== "boolean")
  )
    throw Error("即时微动偏好格式不正确");
  if (
    l.dailyGoalMinutes !== undefined &&
    (!Number.isInteger(l.dailyGoalMinutes) ||
      l.dailyGoalMinutes < 0 ||
      l.dailyGoalMinutes > 180)
  )
    throw Error("每日目标无效");
  const finite = (n: unknown) => typeof n === "number" && Number.isFinite(n);
  if (
    !Array.isArray(l.nodes) ||
    l.nodes.length > 40 ||
    !l.nodes.every(
      (n) =>
        record(n) &&
        id(n.id) &&
        finite(n.x) &&
        finite(n.z) &&
        Number.isInteger(n.variant),
    ) ||
    !Array.isArray(l.edges) ||
    !l.edges.every(
      (e) =>
        record(e) &&
        id(e.id) &&
        id(e.from) &&
        id(e.to) &&
        ["walk", "subway", "bus", "car", "bike", "unknown"].includes(e.mode),
    ) ||
    !Array.isArray(l.decorations) ||
    l.decorations.length > 240 ||
    !l.decorations.every(
      (d) =>
        record(d) &&
        id(d.id) &&
        id(d.nodeId) &&
        (decorationKinds as readonly string[]).includes(d.kind) &&
        Number.isInteger(d.slot) &&
        d.slot >= 0 &&
        d.slot < 6,
    )
  )
    throw Error("地图数据损坏");
  if (
    l.unvisitedDistricts !== undefined &&
    (!Array.isArray(l.unvisitedDistricts) ||
      l.unvisitedDistricts.length > 40 ||
      new Set(l.unvisitedDistricts).size !== l.unvisitedDistricts.length ||
      !l.unvisitedDistricts.every(
        (x) => id(x) && l.nodes.some((n) => n.id === x),
      ))
  )
    throw Error("未探索街区记录损坏");
  if (l.theme !== undefined && !["garden", "twilight"].includes(l.theme))
    throw Error("世界主题无效");
  if (
    l.decorationHistory !== undefined &&
    (!Array.isArray(l.decorationHistory) ||
      l.decorationHistory.length > 20 ||
      !l.decorationHistory.every(
        (snapshot) =>
          Array.isArray(snapshot) &&
          snapshot.length <= 240 &&
          snapshot.every(
            (d) =>
              record(d) &&
              id(d.id) &&
              id(d.nodeId) &&
              (decorationKinds as readonly string[]).includes(d.kind) &&
              Number.isInteger(d.slot) &&
              d.slot >= 0 &&
              d.slot < 6,
          ),
      ))
  )
    throw Error("装饰历史损坏");
  if (
    new Set(l.nodes.map((n) => n.id)).size !== l.nodes.length ||
    l.nodes.some((n) => !l.locations.some((p) => p.id === n.id)) ||
    l.locations.some((p) => !l.nodes.some((n) => n.id === p.id)) ||
    l.events.some((e) => !l.locations.some((p) => p.id === e.locationId)) ||
    l.edges.some(
      (e) =>
        !l.nodes.some((n) => n.id === e.from) ||
        !l.nodes.some((n) => n.id === e.to),
    )
  )
    throw Error("地图关联损坏");
  if (
    !record(l.settings) ||
    typeof l.settings.walking !== "boolean" ||
    typeof l.settings.standing !== "boolean" ||
    typeof l.settings.enabled !== "boolean" ||
    !time(l.settings.quietStart) ||
    !time(l.settings.quietEnd) ||
    typeof l.settings.dailyCap !== "number" ||
    l.settings.dailyCap < 0 ||
    l.settings.dailyCap > 30
  )
    throw Error("偏好字段不正确");
  if (
    !Array.isArray(l.feedback) ||
    !l.feedback.every(
      (f) =>
        record(f) &&
        id(f.id) &&
        str(f.recommendationId) &&
        str(f.activityId) &&
        str(f.category) &&
        id(f.sceneId) &&
        str(f.timeWindow) &&
        [
          "interested",
          "started",
          "completed",
          "not_now",
          "remind_later",
          "not_suitable",
          "too_repetitive",
          "never_recommend",
        ].includes(f.type) &&
        str(f.reason, 300) &&
        finite(f.at) &&
        typeof f.demo === "boolean" &&
        typeof f.completionConfirmation === "boolean",
    )
  )
    throw Error("反馈记录损坏");
  if (
    l.impressions !== undefined &&
    (!Array.isArray(l.impressions) ||
      !l.impressions.every(
        (i) =>
          record(i) &&
          str(i.id) &&
          str(i.activityId) &&
          id(i.sceneId) &&
          finite(i.score) &&
          Array.isArray(i.reasons) &&
          i.reasons.every((r) => str(r, 300)) &&
          finite(i.at) &&
          typeof i.demo === "boolean",
      ))
  )
    throw Error("推荐记录损坏");
  if (
    l.interest !== null &&
    (!record(l.interest) ||
      ![69, 99, 149].includes(l.interest.price) ||
      !finite(l.interest.at) ||
      !["local", "registered"].includes(l.interest.status))
  )
    throw Error("意向记录损坏");
  return l;
}
export function mergeLife(
  life: LifeState,
  input: LifeDelta,
  at?: number,
): LifeState {
  const delta = validateDelta(input);
  const locations = [...life.locations];
  const aliases = new Map<string, string>();
  const normalized = (name: string) =>
    name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  for (const item of delta.locations) {
    const i = locations.findIndex((l) => l.id === item.id);
    if (i >= 0) {
      locations[i] = { ...item, confirmed: true };
      continue;
    }
    const duplicate = locations.find(
      (l) =>
        l.category === item.category &&
        normalized(l.name) === normalized(item.name),
    );
    if (duplicate) aliases.set(item.id, duplicate.id);
    else locations.push({ ...item, confirmed: true });
  }
  if (locations.length > 40) throw Error("最多支持 40 个地点");
  const events = [...life.events];
  for (const incoming of delta.events) {
    const item = {
      ...incoming,
      locationId: aliases.get(incoming.locationId) ?? incoming.locationId,
    };
    if (!locations.some((l) => l.id === item.locationId))
      throw Error("事件引用了不存在的地点");
    const i = events.findIndex((e) => e.id === item.id);
    if (i >= 0) {
      events[i] = item;
      continue;
    }
    const duplicate = events.some(
      (e) =>
        e.locationId === item.locationId &&
        normalized(e.title) === normalized(item.title) &&
        e.start === item.start &&
        e.end === item.end &&
        e.recurrence === item.recurrence &&
        e.busy === item.busy &&
        e.transport === item.transport &&
        !!e.approximate === !!item.approximate,
    );
    if (!duplicate) events.push(item);
  }
  const mergeContext = <T extends Cue | ContextFact>(
    previous: T[] | undefined,
    incoming: T[] | undefined,
  ) => {
    if (!previous && !incoming) return undefined;
    const all = new Map((previous ?? []).map((item) => [item.id, item]));
    for (const proposed of incoming ?? []) {
      const item =
        proposed.locationId && aliases.has(proposed.locationId)
          ? { ...proposed, locationId: aliases.get(proposed.locationId)! }
          : proposed;
      if (
        item.locationId &&
        !locations.some((location) => location.id === item.locationId)
      )
        throw Error("行为线索引用了不存在的地点");
      const duplicate = [...all.values()].find(
        (other) =>
          other.kind === item.kind &&
          other.locationId === item.locationId &&
          other.evidence === item.evidence,
      );
      const key = duplicate?.id ?? item.id;
      all.set(key, {
        ...item,
        id: key,
        confirmed: true,
        updatedAt: at ?? item.updatedAt,
      });
    }
    if (all.size > 40)
      throw Error("最多保存 40 条同类生活线索或事实，请先整理旧资料。");
    return [...all.values()];
  };
  const nodes = [...life.nodes];
  for (const location of locations)
    if (!nodes.some((n) => n.id === location.id)) {
      const position = nextPlot(location.category, nodes, life.seed);
      nodes.push({
        id: location.id,
        ...position,
        variant: (life.seed + nodes.length) % 3,
      });
    }
  const edges: WorldEdge[] = [];
  for (const recurrence of ["weekday", "weekend"]) {
    const ordered = events
      .filter((e) => e.recurrence === recurrence || e.recurrence === "daily")
      .sort((a, b) => (a.start ?? "99:99").localeCompare(b.start ?? "99:99"));
    for (let i = 1; i < ordered.length; i++) {
      const from = ordered[i - 1].locationId,
        to = ordered[i].locationId;
      if (from !== to && !edges.some((e) => e.from === from && e.to === to))
        edges.push({
          id: `road_${from}_${to}`,
          from,
          to,
          mode: ordered[i].transport,
          kind: "routine",
        });
    }
  }
  // A known location with no transition gets a clearly cosmetic connecting path.
  for (let i = 1; i < nodes.length; i++)
    if (!edges.some((e) => e.from === nodes[i].id || e.to === nodes[i].id))
      edges.push({
        id: `path_${nodes[i].id}`,
        from: nodes[0].id,
        to: nodes[i].id,
        mode: "unknown",
        kind: "decorative",
      });
  return validateLife({
    ...life,
    locations,
    events,
    nodes,
    unvisitedDistricts: [
      ...new Set([
        ...(life.unvisitedDistricts ?? []),
        ...nodes
          .filter((n) => !life.nodes.some((old) => old.id === n.id))
          .map((n) => n.id),
      ]),
    ].filter((id) => nodes.some((n) => n.id === id)),
    edges,
    cues: mergeContext(life.cues, delta.cues),
    facts: mergeContext(life.facts, delta.facts),
    preferences: delta.preferences ?? life.preferences,
    constraints: delta.constraints
      ? { ...life.constraints, ...delta.constraints }
      : life.constraints,
    settings: {
      ...life.settings,
      ...(delta.constraints?.walkingAllowed !== undefined
        ? { walking: delta.constraints.walkingAllowed }
        : {}),
      ...(delta.constraints?.standingAllowed !== undefined
        ? { standing: delta.constraints.standingAllowed }
        : {}),
    },
  });
}
export function clockAt(now: number, timezone: string) {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (k: string) => p.find((x) => x.type === k)?.value ?? "";
  return {
    time: `${get("hour")}:${get("minute")}`,
    weekend: ["Sat", "Sun"].includes(get("weekday")),
    day: `${get("year")}-${get("month")}-${get("day")}`,
  };
}
