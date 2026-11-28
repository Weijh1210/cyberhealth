import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Check,
  Clock3,
  Pause,
  Play,
  Shield,
  Sprout,
  Square,
} from "lucide-react";
import { placeName } from "../i18n/lifeLabels";
import { localizedQuest, productText } from "../i18n/productContent";
import { useLanguage } from "../i18n/language";
import { useStore } from "../state/Store";
import { activeLife } from "../life/model";
import {
  categoryScene,
  eligibleMoves,
  findMove,
  type Move,
  type MoveContext,
} from "../life/moveNow";
import {
  interpretImmediate,
  discreetWords,
  lowSweatWords,
} from "../life/immediate";
import { MovementFigure } from "../components/MovementFigure";
import { everydayNames } from "../data/everydayNames";
import { findQuest, quests } from "../data/content";
import { activityPolicy, fitsMovementLimits } from "../life/activities";
import { discoveryFor } from "../life/discoveries";
import { englishPlan, englishSkip } from "../life/planEnglish";
import { habitOpportunity, skipLabels, type Attempt } from "../life/habits";
import type { Scene, Session } from "../domain/types";

const sceneLabels: Record<Scene, [string, string]> = {
  home: ["家里", "Home"],
  campus: ["学校 / 图书馆", "School / library"],
  office: ["办公室", "Office"],
  outdoors: ["室外 / 通勤", "Outdoors / commute"],
};
const choiceLabels = {
  any: ["都可以", "Any"],
  mobility: ["灵活度", "Mobility"],
  strength: ["力量", "Strength"],
  aerobic: ["轻有氧", "Easy aerobic"],
  household: ["顺手家务", "Household"],
  routine: ["短组合", "Short combinations"],
} as const;
const equipmentLabels = {
  chair: ["稳固无轮椅", "Stable, non-wheeled chair"],
  wall: ["稳固墙面", "Solid wall"],
  counter: ["易够到的台面和布", "Reachable surface and cloth"],
  none: ["无需器材", "No equipment"],
} as const;

const durationChoices = [30, 60, 180, 300];
const baseContext = (scene: Scene): MoveContext => ({
  scene,
  seconds: 60,
  standing: false,
  space: "compact",
  equipment: ["chair"],
  effort: "gentle",
  lowSweat: true,
  discreet: true,
  safe: false,
  noLegs: false,
  noArms: false,
  goal: "any",
});
const segmentSeconds = (n: number) =>
  n >= 60 ? (n / 60).toFixed(n % 60 ? 1 : 0) : undefined;

export function Movement() {
  const { locale, t } = useLanguage();
  const { state, send, owner, busy } = useStore();
  const life = activeLife(state);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested =
    life.locations.find((l) => l.id === params.get("scene") && l.confirmed) ??
    (!params.has("scene") && life.locations.length === 1
      ? life.locations[0]
      : undefined);
  const [description, setDescription] = useState("");
  const [applied, setApplied] = useState(false);
  const [place, setPlace] = useState(requested?.id ?? "");
  const [context, setContext] = useState<MoveContext>(() => {
    const defaults = baseContext(
      requested
        ? categoryScene[requested.category]
        : (state.profile?.scenes[0] ?? "campus"),
    );
    return {
      ...defaults,
      ...life.movePreferences,
      lowSweat:
        life.facts?.some(
          (fact) =>
            fact.confirmed &&
            !fact.uncertain &&
            fact.kind === "low_sweat" &&
            lowSweatWords.test(fact.evidence),
        ) ||
        (life.movePreferences?.lowSweat ?? defaults.lowSweat),
      discreet:
        life.facts?.some(
          (fact) =>
            fact.confirmed &&
            !fact.uncertain &&
            fact.kind === "social" &&
            discreetWords.test(fact.evidence),
        ) ||
        (life.movePreferences?.discreet ?? defaults.discreet),
    };
  });
  const [mode, setMode] = useState(params.get("pick") ? "pick" : "auto");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(params.has("pick"));
  const [libraryCategory, setLibraryCategory] = useState<
    "all" | "natural" | Move["category"]
  >("all");
  const picked =
    mode === "pick" ? findMove(params.get("pick") ?? "") : undefined;
  const primaryOptions = eligibleMoves({ ...context, safe: true }, life);
  const selected =
    mode === "pick"
      ? primaryOptions.find((m) => m.id === params.get("pick"))
      : primaryOptions.find(
          (m) =>
            (m.id !== "move-route" || context.goal === "aerobic") &&
            ((m.category !== "household" && m.category !== "routine") ||
              m.category === context.goal),
        );
  const currentPlace = life.locations.find((l) => l.id === place);
  const formatSeconds = (n: number) =>
    segmentSeconds(n)
      ? t(`${segmentSeconds(n)} 分钟`, `${segmentSeconds(n)} min`)
      : t(`${n} 秒`, `${n} sec`);
  function patch(values: Partial<MoveContext>) {
    setContext((previous) => ({ ...previous, ...values, safe: false }));
  }
  function applyDescription() {
    const values = interpretImmediate(description, context);
    const named = life.locations.find(
      (l) => l.confirmed && l.name && description.includes(l.name),
    );
    if (named) {
      setPlace(named.id);
      values.scene = categoryScene[named.category];
    } else if (values.scene !== undefined) {
      const matching = life.locations.filter(
        (l) => l.confirmed && categoryScene[l.category] === values.scene,
      );
      setPlace(matching.length === 1 ? matching[0].id : "");
    }
    patch(values);
    setExpanded(true);
    setApplied(true);
  }
  async function start() {
    if (!selected || !context.safe) return;
    const id = crypto.randomUUID();
    if (
      await send({
        type: "start",
        id,
        owner,
        now: Date.now(),
        seated: false,
        questId: selected.id,
        moveContext: context,
        guided: { locationId: currentPlace?.id },
      })
    )
      navigate(`/move/${selected.id}?session=${id}`);
  }
  const query = search.trim().toLowerCase();
  const catalog = quests
    .flatMap((quest) => {
      const policy = activityPolicy(quest);
      const move = findMove(quest.id);
      const category: Move["category"] | "natural" =
        move?.category ??
        (policy.category === "routine"
          ? "routine"
          : policy.category === "natural" && !policy.walking
            ? "household"
            : "natural");
      const searchable =
        `${quest.title} ${quest.context} ${move?.name[1] ?? everydayNames[quest.id] ?? ""} ${quest.steps.join(" ")}`.toLowerCase();
      if (
        !policy.eligible ||
        policy.category === "rest" ||
        (libraryCategory !== "all" && libraryCategory !== category) ||
        !searchable.includes(query)
      )
        return [];
      return [{ quest, move, category }];
    })
    .sort((a, b) => Number(!!b.move) - Number(!!a.move));
  const preview = selected ?? picked;
  return (
    <>
      <header className="movement-header">
        <h1>{t("此刻动一动", "Move now")}</h1>
        <p>
          {t(
            "挑一个适合当下的小动作。推荐在本机计算。",
            "Find a move that fits right now. Recommendations run locally.",
          )}
        </p>
        <a className="back-link" href="#movement-library">
          {t("浏览动作库", "Browse the movement library")}{" "}
          <ArrowRight size={14} />
        </a>
      </header>
      <div className="movement-grid">
        <section className="move-recommendation panel" aria-live="polite">
          {preview ? (
            <>
              <span className="movement-kicker">
                <Activity size={17} />{" "}
                {selected
                  ? t("适合此刻", "For right now")
                  : t("所选动作", "Selected movement")}
              </span>
              <h2>{t(...preview.name)}</h2>
              <p>
                {formatSeconds(preview.seconds)} ·{" "}
                {t(
                  choiceLabels[preview.category][0],
                  choiceLabels[preview.category][1],
                )}{" "}
                ·{" "}
                {preview.position === "seated"
                  ? t("坐姿", "Seated")
                  : t("站姿", "Standing")}
              </p>
              <MovementFigure
                pose={preview.demonstration}
                seated={
                  preview.position === "seated" ||
                  preview.demonstration === "rise"
                }
                supported={
                  preview.equipment === "chair" &&
                  preview.position === "standing" &&
                  preview.demonstration !== "rise"
                }
              />
              <p className="move-condition">
                <Shield size={17} /> {t(...preview.safety)}
              </p>
              <p className="fineprint">
                {t(
                  equipmentLabels[preview.equipment][0],
                  equipmentLabels[preview.equipment][1],
                )}{" "}
                ·{" "}
                {preview.space === "clear"
                  ? t("需要空出一小块场地", "Requires clear space")
                  : t("可原位完成", "Fits a compact space")}
              </p>
              {preview.category === "household" && (
                <p>{t(...preview.instructions[0])}</p>
              )}
              {!selected && (
                <p role="status">
                  {t(
                    "当前设置与这个动作不匹配。请按实际情况核对地点、时长、身体限制和器材，或选择其他动作。",
                    "This move does not fit your settings. Check the location, time, physical limits and equipment, or choose another move.",
                  )}
                </p>
              )}
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={context.safe && !!selected}
                  disabled={!selected}
                  onChange={(e) =>
                    setContext({ ...context, safe: e.target.checked })
                  }
                />
                {t(
                  "我在安全的地方，符合上面的条件，目前没有不适。",
                  "I’m in a safe place, meet the requirements above, and feel well.",
                )}
              </label>
              <button
                className="button primary"
                disabled={!selected || !context.safe || busy}
                onClick={() => void start()}
              >
                <Play size={17} /> {t("开始活动", "Start movement")}
              </button>
              {picked && !selected && (
                <button
                  className="button"
                  onClick={() => {
                    setMode("auto");
                    patch({});
                  }}
                >
                  {t("找一个合适的替代", "Find a suitable alternative")}
                </button>
              )}
              <p className="fineprint">
                {t(
                  "驾车、乘坐移动中的交通工具或穿行车流时不要开始。",
                  "Do not start while driving, on moving transit, or crossing traffic.",
                )}
              </p>
            </>
          ) : (
            <div>
              <h2>
                {t("目前没有符合条件的动作", "No move fits these settings")}
              </h2>
              <p>
                {t(
                  "可以延长时间或调整可用场地，不需要放宽身体限制。",
                  "Try a longer time or adjust the space available. Keep your physical limits in place.",
                )}
              </p>
              {mode === "pick" && (
                <button className="button" onClick={() => setMode("auto")}>
                  {t("找一个合适的替代", "Find a suitable alternative")}
                </button>
              )}
            </div>
          )}
        </section>
        <section className="panel movement-settings">
          <h2>{t("你现在在哪儿？", "Where are you now?")}</h2>
          <form
            className="now-description"
            onSubmit={(e) => {
              e.preventDefault();
              if (description.trim()) applyDescription();
            }}
          >
            <label>
              {t("用一句话说现在的情况", "Describe the moment in one sentence")}
              <input
                value={description}
                maxLength={300}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setApplied(false);
                }}
                placeholder={t(
                  "例如：在办公室坐着，有 30 秒，不想出汗",
                  "At my desk, 30 seconds, something discreet",
                )}
              />
            </label>
            <button className="button" disabled={!description.trim()}>
              {t("应用到推荐", "Apply to recommendation")}
            </button>
            {applied && (
              <p role="status" className="fineprint">
                {t(
                  "已在本机读取，请核对地点、时间和身体限制。",
                  "Read on your device. Check location, time and physical limits.",
                )}
              </p>
            )}
          </form>
          {context.environment === "unsafe" && (
            <p role="alert" className="field-error">
              {t(
                "请等停车、下车或离开车流后再开始。到安全位置后，可在下面更新环境。",
                "Wait until you have stopped, left transit or moved away from traffic. Update the setting once safe.",
              )}
            </p>
          )}
          <label>
            {t("地点", "Location")}
            <select
              value={place ? `place:${place}` : context.scene}
              onChange={(e) => {
                const value = e.target.value;
                const location = life.locations.find(
                  (l) => `place:${l.id}` === value,
                );
                setPlace(location?.id ?? "");
                patch({
                  scene: location
                    ? categoryScene[location.category]
                    : (value as Scene),
                });
              }}
            >
              {life.locations
                .filter((l) => l.confirmed)
                .map((l) => (
                  <option key={l.id} value={`place:${l.id}`}>
                    {placeName(l, locale)}
                  </option>
                ))}
              {Object.entries(sceneLabels).map(([id, names]) => (
                <option key={id} value={id}>
                  {t(names[0], names[1])}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="move-durations">
            <legend>{t("有多长时间？", "How much time?")}</legend>
            {durationChoices.map((n) => (
              <button
                key={n}
                className="button"
                type="button"
                aria-pressed={context.seconds === n}
                onClick={() => patch({ seconds: n })}
              >
                {formatSeconds(n)}
              </button>
            ))}
          </fieldset>
          <details
            open={expanded}
            onToggle={(e) => setExpanded(e.currentTarget.open)}
          >
            <summary>
              {t("时间、场地和身体限制", "Time, space and physical limits")}
            </summary>
            <div className="form-stack">
              <label>
                {t("当前环境", "Current environment")}
                <select
                  value={context.environment ?? "unknown"}
                  onChange={(e) =>
                    patch({
                      environment: e.target.value as MoveContext["environment"],
                    })
                  }
                >
                  <option value="unknown">
                    {t("开始前确认", "Confirm before starting")}
                  </option>
                  <option value="stationary">
                    {t("已停稳，远离车流", "Stationary and away from traffic")}
                  </option>
                  <option value="unsafe">
                    {t(
                      "在车上、开车或穿过车流",
                      "In transit, driving or crossing traffic",
                    )}
                  </option>
                </select>
              </label>
              <label>
                {t("自定义秒数", "Custom seconds")}
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={context.seconds}
                  onChange={(e) =>
                    patch({
                      seconds: Math.max(
                        0,
                        Math.min(300, Number(e.target.value)),
                      ),
                    })
                  }
                />
              </label>
              <label>
                {t("想做哪类活动？", "What would you like to do?")}
                <select
                  value={context.goal}
                  onChange={(e) =>
                    patch({ goal: e.target.value as MoveContext["goal"] })
                  }
                >
                  {Object.entries(choiceLabels).map(([id, names]) => (
                    <option key={id} value={id}>
                      {t(names[0], names[1])}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("场地", "Space")}
                <select
                  value={context.space}
                  onChange={(e) =>
                    patch({ space: e.target.value as MoveContext["space"] })
                  }
                >
                  <option value="compact">
                    {t("狭小，只够原位活动", "Compact")}
                  </option>
                  <option value="clear">
                    {t("周边空出一小块", "Clear space")}
                  </option>
                </select>
              </label>
              <label>
                {t("强度", "Effort")}
                <select
                  value={context.effort}
                  onChange={(e) =>
                    patch({ effort: e.target.value as MoveContext["effort"] })
                  }
                >
                  <option value="gentle">{t("很轻松", "Very gentle")}</option>
                  <option value="steady">
                    {t("可以稍用力", "A little effort")}
                  </option>
                </select>
              </label>
              {(
                [
                  ["chair", t("有稳固无轮椅", "Stable, non-wheeled chair")],
                  ["wall", t("有稳固的墙面", "Solid wall")],
                  ["counter", t("有可清理的台面和布", "Surface and cloth")],
                ] as const
              ).map(([id, label]) => (
                <label className="inline-check" key={id}>
                  <input
                    type="checkbox"
                    checked={context.equipment.includes(id)}
                    onChange={(e) =>
                      patch({
                        equipment: e.target.checked
                          ? [...context.equipment, id]
                          : context.equipment.filter((x) => x !== id),
                      })
                    }
                  />
                  {label}
                </label>
              ))}
              {(
                [
                  ["standing", t("能安全站立", "I can stand safely")],
                  ["lowSweat", t("尽量少出汗", "Keep sweat low")],
                  ["discreet", t("尽量不显眼", "Keep it discreet")],
                  ["noWalking", t("避免走动", "Avoid walking")],
                  ["noLegs", t("避免腿脚活动", "Avoid leg movement")],
                  ["noArms", t("避免上肢活动", "Avoid arm movement")],
                ] as const
              ).map(([id, label]) => (
                <label className="inline-check" key={id}>
                  <input
                    type="checkbox"
                    checked={context[id]}
                    onChange={(e) => patch({ [id]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </details>
        </section>
      </div>
      <section
        id="movement-library"
        className="panel movement-library"
        aria-label={t("动作库", "Movement library")}
      >
        <div className="section-heading">
          <h2>{t("动作库", "Movement library")}</h2>
          <div className="movement-library-filters">
            <select
              aria-label={t("按类别筛选", "Filter by category")}
              value={libraryCategory}
              onChange={(e) =>
                setLibraryCategory(e.target.value as typeof libraryCategory)
              }
            >
              <option value="all">{t("全部类别", "All categories")}</option>
              <option value="natural">
                {t("日常活动", "Everyday movement")}
              </option>
              {Object.entries(choiceLabels)
                .filter(([id]) => id !== "any")
                .map(([id, names]) => (
                  <option key={id} value={id}>
                    {t(names[0], names[1])}
                  </option>
                ))}
            </select>
            <input
              type="search"
              aria-label={t("搜索动作", "Search movements")}
              placeholder={t("搜索动作", "Search movements")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <p className="fineprint" role="status">
          {t(`${catalog.length} 项活动`, `${catalog.length} activities`)}
        </p>
        <div className="movement-library-list">
          {catalog.map(({ quest: q, move: m, category }) => {
            const names =
              category === "natural"
                ? ["日常活动", "Everyday movement"]
                : choiceLabels[category];
            return (
              <article key={q.id}>
                <div>
                  <strong>
                    {m
                      ? t(...m.name)
                      : t(q.title, everydayNames[q.id] ?? q.title)}
                  </strong>
                  <p>
                    {formatSeconds(q.seconds)} · {t(names[0], names[1])}
                    {m && (
                      <>
                        {" "}
                        ·{" "}
                        {m.position === "seated"
                          ? t("坐姿", "Seated")
                          : t("站姿", "Standing")}
                      </>
                    )}
                  </p>
                </div>
                {m ? (
                  <Link
                    to={`/movement?pick=${encodeURIComponent(q.id)}${place ? `&scene=${encodeURIComponent(place)}` : ""}`}
                    onClick={() => {
                      setMode("pick");
                      setExpanded(true);
                      setContext((previous) => ({ ...previous, safe: false }));
                      window.scrollTo({ top: 0 });
                    }}
                  >
                    {t("确认条件", "Check requirements")}{" "}
                    <ArrowRight size={14} />
                  </Link>
                ) : (
                  <Link to={`/move/${q.id}?library=1`}>
                    {t("查看动作", "View movement")} <ArrowRight size={14} />
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

export function GuidedMovement() {
  const { t, locale } = useLanguage();
  const { state, send, owner, busy } = useStore();
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const life = activeLife(state);
  const session = state.sessions.find(
    (s) =>
      s.id === params.get("session") &&
      s.demo === state.demo &&
      s.questId === id &&
      s.guided,
  );
  const sessionId = session?.id;
  const running = session?.status === "running" && session.owner === owner;
  const activity = findQuest(id);
  const move = findMove(id);
  const cue = life.cues?.find(
    (c) => c.id === (session?.guided?.cueId ?? params.get("cue")),
  );
  const requestedHabit = life.habits?.find(
    (h) =>
      h.id === (session?.guided?.habitId ?? params.get("habit")) &&
      h.cueId === cue?.id,
  );
  const alternative = session?.guided?.alternative ?? params.has("alternative");
  const opportunity = requestedHabit
    ? habitOpportunity(life, requestedHabit, alternative)
    : cue && discoveryFor(life, cue);
  const authored =
    locale === "en" && opportunity ? englishPlan(opportunity) : undefined;
  const [safe, setSafe] = useState(false);
  const [selfInitiated, setSelfInitiated] = useState(false);
  const [intensity, setIntensity] = useState<Session["intensity"]>();
  const [trigger, setTrigger] = useState("");
  const [habitPlace, setHabitPlace] = useState("");
  const [linkedHabit, setLinkedHabit] = useState<string>();
  const [clock, setClock] = useState(Date.now);
  const [symptoms, setSymptoms] = useState(false);
  const [convenience, setConvenience] = useState<Attempt["convenience"]>();
  const [skipReason, setSkipReason] = useState<Attempt["reason"]>("other");
  useEffect(() => {
    if (!running || !sessionId) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        setClock(now);
        void send({ type: "tick", id: sessionId, owner, now });
      }
    }, 500);
    const pause = () => {
      if (document.hidden) void send({ type: "pause", id: sessionId });
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", pause);
      void send({ type: "pause", id: sessionId });
    };
  }, [running, sessionId, send, owner]);
  if (!activity || !activityPolicy(activity).eligible)
    return (
      <p>
        <Link to="/movement">{t("返回微运动", "Back to Movement")}</Link>
      </p>
    );
  const title = move
    ? t(...move.name)
    : (authored?.title ??
      t(activity.title, everydayNames[activity.id] ?? activity.title));
  const steps = move
    ? move.instructions.map((step) => t(...step))
    : authored
      ? [authored.action, authored.minimum]
      : localizedQuest(activity, locale).steps;
  const sameOpportunity = opportunity?.quest.id === id;
  const libraryEntry =
    params.get("library") === "1" &&
    !move &&
    activityPolicy(activity).category !== "rest";
  const countdown =
    running && session.countdownUntil
      ? Math.max(
          0,
          Math.ceil(
            (session.countdownUntil - Math.max(clock, session.lastTick)) / 1000,
          ),
        )
      : 0;
  const location = life.locations.find(
    (l) => l.id === session?.guided?.locationId,
  );
  const remaining = session
    ? Math.max(0, Math.ceil((session.targetMs - session.elapsedMs) / 1000))
    : activity.seconds;
  const segments = move?.sequence
    ?.map(findMove)
    .filter((part): part is Move => !!part);
  const elapsed = session
    ? (session.elapsedMs / session.targetMs) * (move?.seconds ?? 0)
    : 0;
  const currentPart =
    segments?.length === 2 && elapsed >= segments[0].seconds
      ? segments[1]
      : segments?.[0];
  const sources = [
    ...new Set((segments ?? (move ? [move] : [])).map((part) => part.source)),
  ];
  const habit =
    cue && life.habits?.find((h) => h.cueId === cue.id && !h.archived);
  async function start() {
    if (!safe || !activity || (!sameOpportunity && !libraryEntry)) return;
    const movementId = crypto.randomUUID();
    const sourceScene = opportunity
      ? categoryScene[opportunity.location.category]
      : activity.scene;
    const context = {
      ...baseContext(sourceScene),
      safe: true,
      standing: move?.position === "standing",
      effort: move?.effort ?? "gentle",
      equipment: move ? [move.equipment] : [],
      seconds: activity.seconds,
      space: move?.space ?? "clear",
      discreet: false,
      lowSweat: false,
    };
    if (
      await send({
        type: "start",
        id: movementId,
        owner,
        questId: id,
        now: Date.now(),
        seated: false,
        moveContext: context,
        guided: {
          cueId: sameOpportunity ? cue?.id : undefined,
          locationId: sameOpportunity ? opportunity?.location.id : undefined,
          habitId: requestedHabit?.id,
          alternative: requestedHabit ? alternative : undefined,
        },
      })
    )
      navigate(`/move/${id}?session=${movementId}`, { replace: true });
  }
  if (session?.status === "completed")
    return (
      <section className="panel movement-complete">
        <Check size={29} />
        <h1>{t("完成已记录", "Movement recorded")}</h1>
        <p>
          {location
            ? t(
                `${placeName(location, locale)} 的街区成长已记录。`,
                `Growth was recorded in ${placeName(location, locale)}.`,
              )
            : t("这次活动已记入今日。", "This activity counts toward today.")}
        </p>
        {location && (
          <p className="completion-growth">
            <Sprout size={20} />{" "}
            {t("已计入这个街区的成长", "Added to this district’s growth")}
          </p>
        )}
        <div className="action-row">
          <Link
            className="button primary"
            to={
              location ? `/world?scene=${encodeURIComponent(location.id)}` : "/"
            }
          >
            {location
              ? t("查看街区变化", "See district growth")
              : t("回到今日", "Back to Today")}
          </Link>
          {cue &&
            sameOpportunity &&
            (habit ? (
              <Link className="button" to="/habits">
                {t("查看我的习惯", "View my habit")}
              </Link>
            ) : (
              <button
                className="button"
                disabled={busy}
                onClick={() =>
                  void send({
                    type: "habit-create",
                    id: crypto.randomUUID(),
                    cueId: cue.id,
                    at: Date.now(),
                  })
                }
              >
                {t("把这个时机种成习惯", "Save this moment as a habit")}
              </button>
            ))}
        </div>
        {!cue &&
          !state.demo &&
          (linkedHabit && life.habits?.some((h) => h.id === linkedHabit) ? (
            <Link to="/habits">
              {t("习惯已保存，查看我的习惯", "Habit saved. View my habits")}
            </Link>
          ) : (
            <details className="habit-exp">
              <summary>
                {t("把这次活动连到日常", "Link this activity to a routine")}
              </summary>
              {life.locations.some(
                (l) =>
                  l.confirmed && categoryScene[l.category] === session.scene,
              ) ? (
                <form
                  className="form-stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const placeId = habitPlace || location?.id;
                    if (!placeId || !trigger.trim()) return;
                    const id = `habit-${crypto.randomUUID()}`;
                    if (
                      await send({
                        type: "habit-link",
                        id,
                        sessionId: session.id,
                        locationId: placeId,
                        trigger,
                        at: Date.now(),
                      })
                    )
                      setLinkedHabit(id);
                  }}
                >
                  <label>
                    {t("日常地点", "Routine location")}
                    <select
                      required
                      value={habitPlace || location?.id || ""}
                      onChange={(e) => setHabitPlace(e.target.value)}
                    >
                      <option value="">
                        {t("选一个已确认的地点", "Choose a confirmed place")}
                      </option>
                      {life.locations
                        .filter(
                          (l) =>
                            l.confirmed &&
                            categoryScene[l.category] === session.scene,
                        )
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {placeName(l, locale)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    {t("在哪件事之后做？", "What will cue it?")}
                    <input
                      required
                      maxLength={200}
                      value={trigger}
                      onChange={(e) => setTrigger(e.target.value)}
                      placeholder={t(
                        "例如：合上书本之后",
                        "After I close my book",
                      )}
                    />
                  </label>
                  <button className="button" disabled={busy}>
                    {t("保存这个习惯", "Save this habit")}
                  </button>
                </form>
              ) : (
                <Link to="/life">
                  {t("先在我的生活添加这个地点", "Add this place in My Life")}
                </Link>
              )}
            </details>
          ))}
      </section>
    );
  if (session?.status === "skipped" || symptoms)
    return (
      <section className="panel movement-complete">
        <h1>{t("活动已停止", "Movement stopped")}</h1>
        {symptoms && (
          <p role="alert">
            {t(
              "先停止活动，坐到安全的地方。若不适持续或让你担心，请联系医疗专业人员；遇到紧急情况请寻求当地急救。",
              "Stop and rest in a safe place. If symptoms persist or concern you, seek medical advice. Get local emergency help if necessary.",
            )}
          </p>
        )}
        <Link className="button" to="/movement">
          {t("返回微运动", "Back to Movement")}
        </Link>
      </section>
    );
  const allowed = fitsMovementLimits(activityPolicy(activity), life);
  return (
    <>
      <Link className="back-link" to="/movement">
        {t("返回微运动", "Back to Movement")}
      </Link>
      <header className="movement-header">
        <h1>{title}</h1>
        <p>
          {t(
            "以舒适程度为准，随时可以停。",
            "Stay comfortable. You can stop at any time.",
          )}
        </p>
      </header>
      <div className="movement-grid guided-player">
        <section className="panel move-recommendation">
          <div
            className="movement-clock"
            aria-label={t("剩余时间", "Time left")}
          >
            <Clock3 size={22} />{" "}
            {countdown ||
              `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
          </div>
          {countdown > 0 && (
            <p role="status">
              {t(`准备开始 · ${countdown} 秒`, `Get ready · ${countdown} sec`)}
            </p>
          )}
          <MovementFigure
            pose={
              (currentPart ?? move)?.demonstration ??
              (activityPolicy(activity).walking ? "march" : "household")
            }
            seated={
              move?.position === "seated" || move?.demonstration === "rise"
            }
            supported={
              move?.equipment === "chair" &&
              move.position === "standing" &&
              move.demonstration !== "rise"
            }
            active={running && !countdown}
          />
          {currentPart && <p role="status">{t(...currentPart.name)}</p>}
          {!session && (sameOpportunity || libraryEntry) && allowed ? (
            <>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={safe}
                  onChange={(e) => setSafe(e.target.checked)}
                />
                {t(
                  "我当前远离车流，满足动作的场地和器材要求，没有不适。",
                  "I’m away from traffic, have the required space and equipment, and feel well.",
                )}
              </label>
              <button
                className="button primary"
                disabled={!safe || busy}
                onClick={() => void start()}
              >
                <Play size={17} />
                {t("开始活动", "Start movement")}
              </button>
            </>
          ) : null}
          {!session && move && (
            <p className="fineprint">
              {t(
                equipmentLabels[move.equipment][0],
                equipmentLabels[move.equipment][1],
              )}
              {" · "}
              {move.space === "clear"
                ? t("需要空出一小块场地", "Requires clear space")
                : t("可原位完成", "Fits a compact space")}
            </p>
          )}
          {!session && !sameOpportunity && !libraryEntry && (
            <Link className="button primary" to={`/movement?pick=${id}`}>
              {t("先确认活动条件", "Check requirements first")}
            </Link>
          )}
          {!allowed && !session && (
            <p>
              {t(
                "这个动作不符合当前行动限制。",
                "This move conflicts with your current physical limits.",
              )}
            </p>
          )}
          {session?.status === "ready" && (
            <>
              <label>
                {t("这次容易融进今天吗？", "How easily did this fit today?")}
                <select
                  value={convenience ?? ""}
                  onChange={(e) =>
                    setConvenience(
                      (e.target.value || undefined) as Attempt["convenience"],
                    )
                  }
                >
                  <option value="">{t("不评价", "No rating")}</option>
                  <option value="easy">{t("容易", "Easy")}</option>
                  <option value="hard">
                    {t("有点难", "A little difficult")}
                  </option>
                </select>
              </label>
              {!state.demo && (
                <label>
                  {t(
                    "本次体感强度（可选）",
                    "How hard did it feel? (optional)",
                  )}
                  <select
                    value={intensity ?? ""}
                    onChange={(e) =>
                      setIntensity(
                        (e.target.value || undefined) as Session["intensity"],
                      )
                    }
                  >
                    <option value="">{t("未标注", "Unspecified")}</option>
                    <option value="light">{t("轻度", "Light")}</option>
                    <option value="moderate">{t("中等", "Moderate")}</option>
                    <option value="vigorous">{t("高强度", "Vigorous")}</option>
                  </select>
                </label>
              )}
              {cue && (
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={selfInitiated}
                    onChange={(e) => setSelfInitiated(e.target.checked)}
                  />
                  {t("这次是我自己想起来的", "I remembered on my own")}
                </label>
              )}
              <button
                className="button primary"
                disabled={busy}
                onClick={() =>
                  void send({
                    type: "complete",
                    id: session.id,
                    now: Date.now(),
                    convenience,
                    selfInitiated,
                    intensity,
                  })
                }
              >
                <Check size={18} />
                {t("我已完成，确认记录", "I finished. Save my record")}
              </button>
            </>
          )}
          {session?.status === "running" && (
            <button
              className="button"
              onClick={() => void send({ type: "pause", id: session.id })}
            >
              <Pause size={17} />
              {t("暂停", "Pause")}
            </button>
          )}
          {session?.status === "paused" && (
            <button
              className="button primary"
              disabled={!allowed || busy}
              onClick={() =>
                void send({
                  type: "resume",
                  id: session.id,
                  now: Date.now(),
                  owner,
                })
              }
            >
              <Play size={17} />
              {t("继续", "Resume")}
            </button>
          )}
          {session && (
            <div className="move-stop">
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  void send({ type: "skip", id: session.id, now: Date.now() })
                }
              >
                {t("停止且不记录完成", "Stop without recording completion")}
              </button>
              <button
                className="text-button"
                onClick={async () => {
                  setSymptoms(true);
                  await send({
                    type: "skip",
                    id: session.id,
                    reason: "other",
                    now: Date.now(),
                  });
                }}
              >
                <Square size={15} />
                {t("疼痛或头晕 · 立即停止", "Pain or dizziness · Stop now")}
              </button>
              <details>
                <summary>{t("跳过这次", "Skip this time")}</summary>
                <select
                  aria-label={t("跳过原因", "Skip reason")}
                  value={skipReason}
                  onChange={(e) =>
                    setSkipReason(e.target.value as Attempt["reason"])
                  }
                >
                  {Object.entries(skipLabels).map(([id, label]) => (
                    <option value={id} key={id}>
                      {t(label, englishSkip[id as keyof typeof englishSkip])}
                    </option>
                  ))}
                </select>
                <button
                  className="button"
                  onClick={() =>
                    void send({
                      type: "skip",
                      id: session.id,
                      reason: skipReason,
                      now: Date.now(),
                    })
                  }
                >
                  {t("确认跳过", "Confirm skip")}
                </button>
              </details>
            </div>
          )}
        </section>
        <section className="panel">
          <h2>{t("动作步骤", "How to move")}</h2>
          <ol className="movement-steps">
            {(currentPart
              ? currentPart.instructions.map((step) => t(...step))
              : steps
            ).map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {!move && (
            <p className="move-condition">
              <Shield size={17} />{" "}
              {productText(activityPolicy(activity).cautions, locale)}
            </p>
          )}
          {move && (
            <>
              <p className="move-condition">
                <Shield size={17} /> {t(...move.safety)}
              </p>
              {sources.map((source, index) => (
                <p key={source}>
                  <a href={source} rel="noreferrer" target="_blank">
                    {sources.length === 1
                      ? t("查看内容来源", "View content source")
                      : t(
                          `查看第 ${index + 1} 段来源`,
                          `View source for part ${index + 1}`,
                        )}
                  </a>
                </p>
              ))}
            </>
          )}
          <p className="fineprint">
            {t(
              "计时结束后需手动确认。设备不会判断你是否运动。",
              "Confirm after the timer ends. The app cannot detect whether you moved.",
            )}
          </p>
        </section>
      </div>
    </>
  );
}
