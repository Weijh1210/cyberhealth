import { useLanguage } from "../i18n/language";
import { productText, localizedQuest } from "../i18n/productContent";
import { discover } from "../life/discoveries";
import { englishGrowth, growthTitles, worldGrowth } from "../life/worldGrowth";
import { contexts, type EventContext } from "../life/events";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Clock3, Footprints, Coffee, Sprout } from "lucide-react";
import { useStore } from "../state/Store";
import { activeLife, clockAt, type FeedbackType } from "../life/model";
import { isQuietTime, recommend, type Opportunity } from "../life/recommend";
import { LifeWorld } from "./LifeWorld";
export function LifeDashboard() {
  const { locale, t } = useLanguage();
  const contextName = (key: EventContext) =>
    t(
      contexts.find(([id]) => id === key)?.[1] ?? "",
      {
        desk: "Desk work",
        meeting_end: "After a meeting",
        lunch_end: "After lunch",
        water: "Refilling water",
        phone: "A call that allows movement",
        break: "Between tasks",
        commute: "Travelling between places",
        leisure: "Leisure time",
        busy: "Busy",
      }[key],
    );
  const { state, send, busy } = useStore();
  const [params] = useSearchParams();
  const [trigger, setTrigger] = useState<EventContext | "">(
    (params.get("event") as EventContext) || "",
  );
  const [reason, setReason] = useState("not_interested");
  const [sheet, setSheet] = useState(false);
  const life = activeLife(state);
  const [now, setNow] = useState(Date.now),
    [context, setContext] = useState(
      state.demo && params.has("event")
        ? (activeLife(state).locations.find((l) => l.category === "office")
            ?.id ?? "")
        : "",
    ),
    [selected, setSelected] = useState(
      life.locations.find((l) => l.id === params.get("scene"))?.id ?? "",
    ),
    [minutes, setMinutes] = useState(3),
    [status, setStatus] = useState("");
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const contextual = discover(life, now);
  const sceneDiscoveries = contextual.filter(
    (d) => !selected || d.location.id === selected,
  );
  const growth = worldGrowth(life);
  const day = clockAt(now, life.timezone);
  const completed = state.sessions
    .filter(
      (s) =>
        s.demo === state.demo &&
        s.status === "completed" &&
        s.completedAt &&
        clockAt(Date.parse(s.completedAt), life.timezone).day === day.day,
    )
    .map((s) => s.questId);
  const opportunities = recommend(life, {
    now,
    demo: state.demo,
    contextId: context || undefined,
    availableSeconds: minutes * 60,
    completed,
    eventContext: trigger || undefined,
    simulated: state.demo && !!trigger,
  });
  const impressions = JSON.stringify(
    opportunities
      .filter((o) => !selected || o.location.id === selected)
      .slice(0, 2)
      .map((o) => ({
        id: o.id,
        activityId: o.quest.id,
        sceneId: o.location.id,
        score: o.score,
        reasons: o.reasons,
        at: now,
        demo: state.demo,
      })),
  );
  useEffect(() => {
    const items = JSON.parse(impressions);
    if (items.length) void send({ type: "life-shown", impressions: items });
  }, [impressions, send]);
  const choices = opportunities
    .filter((o) => !selected || o.location.id === selected)
    .slice(0, 2);
  const selectedLocation = life.locations.find(
    (location) => location.id === selected,
  );
  const quiet = isQuietTime(life.settings, day.time);
  const emptyReason = !life.locations.length
    ? t(
        "先描述日常，让城镇认识你。",
        "Describe your routine to start building your town.",
      )
    : !life.settings.enabled
      ? t(
          "活动推荐已关闭，可在生活节奏中开启。",
          "Recommendations are off. You can enable them in Activity limits.",
        )
      : quiet
        ? t(
            `现在是静默时段（${life.settings.quietStart}–${life.settings.quietEnd}）。`,
            `Quiet hours are active (${life.settings.quietStart}–${life.settings.quietEnd}).`,
          )
        : trigger === "busy"
          ? t(
              "你标记了正在忙，先留出这段时间。",
              "You marked this time as busy. Recommendations will pause.",
            )
          : !context
            ? t(
                "目前的日程没有匹配到可推荐的空档。时间缺失或正在上课也可能出现这种情况。你可以选一个此刻所在的地点。",
                "Your routine has no available break right now. Select your current location to look for options.",
              )
            : t(
                "这个场景暂无符合当前事件、空闲时长和偏好的活动。",
                "No available activity fits this setting, time and your preferences.",
              );
  const feedback = async (o: Opportunity, type: FeedbackType) => {
    const ok = await send({
      type: "life-feedback",
      feedback: {
        id: crypto.randomUUID(),
        recommendationId: o.id,
        activityId: o.quest.id,
        category: o.policy.category,
        sceneId: o.location.id,
        timeWindow: o.timeWindow,
        type:
          type === "not_suitable" &&
          ["too_busy", "already_done", "wrong_time", "wrong_context"].includes(
            reason,
          )
            ? "not_now"
            : type,
        reason: type === "not_suitable" ? reason : type,
        at: Date.now(),
        demo: state.demo,
        completionConfirmation: false,
      },
    });
    if (ok)
      setStatus(
        type === "not_suitable"
          ? t(
              "已按具体原因调整该活动及相关子类型，不影响无关活动。",
              "Feedback saved. This activity and similar ones will be ranked lower.",
            )
          : type === "never_recommend"
            ? t(
                "已永久排除这项活动，可在节奏设置中重置。",
                "This activity is hidden. Restore it in Activity limits.",
              )
            : t(
                "已推迟这项活动，稍后再看。",
                "This activity is hidden for now.",
              ),
      );
  };
  const events = life.events
    .filter(
      (e) =>
        e.recurrence === "daily" ||
        e.recurrence === (day.weekend ? "weekend" : "weekday"),
    )
    .sort((a, b) => (a.start ?? "99:99").localeCompare(b.start ?? "99:99"));
  return (
    <>
      <div className="rhythm-controls">
        <label>
          {t("事件情境", "Current event")}
          <select
            aria-label={t("事件情境", "Current event")}
            value={trigger}
            onChange={(e) => {
              setTrigger(e.target.value as EventContext);
              setSelected("");
            }}
          >
            <option value="">
              {t("按日程／场景判断", "Use routine or location")}
            </option>
            {contexts.map(([value]) => (
              <option key={value} value={value}>
                {contextName(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("此刻的场景", "Current location")}
          <select
            aria-label={t("此刻的场景", "Current location")}
            value={context}
            onChange={(e) => {
              setContext(e.target.value);
              setSelected(e.target.value);
            }}
          >
            <option value="">{t("按日程发现机会", "Use my routine")}</option>
            {life.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {t(`${l.name}（手动选择）`, `${l.name} (selected manually)`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("空闲时长", "Time available")}
          <select
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          >
            {[1, 2, 3, 5].map((m) => (
              <option key={m} value={m}>
                {t(`${m} 分钟`, `${m} min`)}
              </option>
            ))}
          </select>
        </label>
        <p>
          {day.weekend ? t("周末", "Weekend") : t("工作日", "Weekday")} ·{" "}
          {day.time} · {life.timezone}
          <br />
          {t(
            "根据你提供的生活日程推测，不使用定位。",
            "Based on the routine you shared. Location services are not used.",
          )}
        </p>
      </div>
      {trigger && (
        <p className={state.demo ? "simulation-label" : "context-label"}>
          {state.demo
            ? t("演示模拟", "Demo data")
            : t("你主动确认的事件", "Confirmed event")}{" "}
          · {contextName(trigger)} · {t("不代表实时监测", "No live monitoring")}
        </p>
      )}
      <div className="life-town-layout">
        <LifeWorld
          life={life}
          opportunities={opportunities}
          discoveryLocations={contextual.map((d) => d.location.id)}
          selected={selected}
          onSelect={(id) => {
            setSelected(id);
            setSheet(true);
            void send({
              type: "local-events",
              events: [
                {
                  name: "world_explored",
                  key: `${day.day}:${id}`,
                  at: Date.now(),
                },
              ],
            });
          }}
        />
        <button
          className="mobile-opportunities button primary"
          onClick={() => setSheet(!sheet)}
        >
          {sheet
            ? t("收起活动详情", "Hide activity details")
            : choices.length
              ? t(
                  `查看活动机会 · ${choices.length}`,
                  `View suggestions · ${choices.length}`,
                )
              : sceneDiscoveries.length
                ? t(
                    `生活发现 · ${sceneDiscoveries.length}`,
                    `Routine discoveries · ${sceneDiscoveries.length}`,
                  )
                : t("此刻暂无推荐", "No suggestions right now")}
        </button>
        <aside className={`opportunity-panel ${sheet ? "sheet-open" : ""}`}>
          <button
            className="sheet-close text-button"
            onClick={() => setSheet(false)}
          >
            {t("收起详情", "Hide details")}
          </button>
          <div className="section-heading">
            <h2>{t("留给自己的间隙", "Your activity options")}</h2>
            <Clock3 size={20} />
          </div>
          {choices.length > 0 && sceneDiscoveries.length > 0 && (
            <p>
              <Link className="text-link" to="/explore">
                {t("查看生活线索发现", "Open my action plan")}
                <ArrowRight size={16} />
              </Link>
            </p>
          )}
          {selected && growth.get(selected) && (
            <p className="growth-scene-note">
              {t(
                growthTitles[growth.get(selected)!.level],
                englishGrowth[growth.get(selected)!.level],
              )}{" "}
              · {t("来自你确认的尝试", "From your confirmed attempts")}
            </p>
          )}
          {choices.length > 0 && (
            <label className="feedback-reason">
              {t("不适合的原因", "Why it does not fit")}
              <select
                aria-label={t("反馈原因", "Reason for feedback")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {[
                  [
                    "not_interested",
                    t("对这类活动没兴趣", "Not interested in this activity"),
                  ],
                  ["too_busy", t("现在太忙", "Too busy right now")],
                  ["too_difficult", t("难度不适合", "Difficulty does not fit")],
                  ["already_done", t("已经做过", "Already did it")],
                  ["wrong_time", t("时间不对", "Wrong time")],
                  [
                    "wrong_context",
                    t("地点／情境不对", "Wrong location or setting"),
                  ],
                  ["shorter", t("希望更短一点", "Prefer something shorter")],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {choices.map((o) => (
            <article
              key={o.id}
              className="opportunity"
              data-testid="opportunity"
              data-activity={o.quest.id}
            >
              <div className="opportunity-category">
                {o.policy.category === "rest" ? (
                  <Coffee size={17} />
                ) : (
                  <Footprints size={17} />
                )}{" "}
                {o.policy.category === "rest"
                  ? t("休息", "Rest")
                  : t("自然微动", "Everyday movement")}{" "}
                · {o.location.name} ·{" "}
                {t(
                  `${o.quest.seconds / 60} 分钟`,
                  `${o.quest.seconds / 60} min`,
                )}
              </div>
              <h3>{localizedQuest(o.quest, locale).title}</h3>
              <p>{localizedQuest(o.quest, locale).description}</p>
              <details>
                <summary>
                  {t(
                    `为什么推荐 · ${Math.round(o.score)} 分`,
                    `Why this fits · Score ${Math.round(o.score)}`,
                  )}
                </summary>
                <ul>
                  {o.reasons.map((reason) => (
                    <li key={reason}>{productText(reason, locale)}</li>
                  ))}
                </ul>
                <p>
                  {t(
                    "内容状态：编辑核对的日常建议，未经临床验证。",
                    "General everyday activity, checked by the editorial team.",
                  )}
                </p>
              </details>
              <Link
                className="button primary"
                to={`/quest/${o.quest.id}`}
                onClick={() => void feedback(o, "interested")}
              >
                {t("查看活动", "View movement")}
                <ArrowRight size={16} />
              </Link>
              <div className="feedback-actions">
                <button
                  disabled={busy}
                  onClick={() => void feedback(o, "not_now")}
                >
                  {t("现在不想", "Not now")}
                </button>
                <button
                  disabled={busy}
                  onClick={() => void feedback(o, "not_suitable")}
                >
                  {t("不适合我", "Does not fit")}
                </button>
                <button
                  disabled={busy}
                  onClick={() => void feedback(o, "remind_later")}
                >
                  {t("30 分钟后", "In 30 minutes")}
                </button>
                <button
                  disabled={busy}
                  onClick={() => void feedback(o, "never_recommend")}
                >
                  {t("以后不推荐", "Never recommend")}
                </button>
              </div>
            </article>
          ))}
          {!choices.length &&
            (sceneDiscoveries.length ? (
              <div className="opportunity-empty">
                <Sprout size={30} />
                <h3>{t("这里有可以试的微动", "Movements to try here")}</h3>
                <p>
                  {t(
                    "来自你说过的日常。等对应的时机出现时再试。",
                    "These come from your routine. Try one the next time its cue comes up.",
                  )}
                </p>
                <Link className="button primary" to="/explore">
                  {t("查看生活线索发现", "Open my action plan")}
                  <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="opportunity-empty">
                <Coffee size={30} />
                <h3>{t("此刻，可以留白。", "Take a break for now")}</h3>
                <p>{emptyReason}</p>
                {selectedLocation &&
                  context !== selected &&
                  !quiet &&
                  life.settings.enabled && (
                    <button
                      className="button"
                      onClick={() => {
                        setContext(selected);
                        setTrigger("");
                      }}
                    >
                      {t(
                        `在${selectedLocation.name}找机会`,
                        `Find a movement at ${selectedLocation.name}`,
                      )}
                    </button>
                  )}
                <Link
                  to={life.locations.length ? "/rhythm" : "/life"}
                  className="text-link"
                >
                  {life.locations.length
                    ? t("调整生活节奏", "Adjust activity settings")
                    : t("添加生活地点", "Add a place")}
                  <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          <p role="status">{status}</p>
          <Link className="text-link" to="/rhythm">
            {t("查看反馈与节奏设置", "View activity limits and feedback")}
            <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
      <section className="discovery-journal">
        <div className="section-heading">
          <h2>{t("世界发现手记", "My town discoveries")}</h2>
          <Link to="/demo">
            {t("演示与世界扩展", "Demo and town expansion")}
            <ArrowRight size={15} />
          </Link>
        </div>
        <div
          role="region"
          tabIndex={0}
          aria-label={t(
            "已发现地点，可横向滚动",
            "Discovered places. Scroll horizontally for more.",
          )}
        >
          {life.locations.map((l) => (
            <span key={l.id}>
              {l.name}
              <small>
                {t("已确认", "Confirmed")} ·{" "}
                {l.source === "ai"
                  ? t("来自生活描述", "From your routine")
                  : t("手动确认", "Confirmed manually")}
              </small>
            </span>
          ))}
        </div>
      </section>
      <section className="life-timeline">
        <div className="section-heading">
          <h2>{t("今天的生活节奏", "Today's routine")}</h2>
          <Link to="/life">
            {t("编辑日常", "Edit routine")}
            <ArrowRight size={16} />
          </Link>
        </div>
        {!events.length ? (
          <p>
            {t(
              "还没有今天的日程。补充工作日或周末事件，地图会随生活一起扩展。",
              "No routine events today. Add weekday or weekend events to grow your town.",
            )}
          </p>
        ) : (
          <ol
            tabIndex={0}
            aria-label={t(
              "日程时间轴，可横向滚动",
              "Routine timeline. Scroll horizontally for more.",
            )}
          >
            {events.map((e) => (
              <li key={e.id}>
                <time>
                  {e.start
                    ? `${e.approximate ? t("约 ", "Approx. ") : ""}${e.start}`
                    : t("时间待补充", "Time not specified")}
                  {e.end ? ` — ${e.end}` : ""}
                </time>
                <strong>{e.title}</strong>
                <span>
                  {life.locations.find((l) => l.id === e.locationId)?.name} ·{" "}
                  {e.busy
                    ? t("专注时段", "Busy time")
                    : t("潜在空闲窗口", "Possible break")}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
