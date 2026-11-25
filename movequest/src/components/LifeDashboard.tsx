import { discover } from "../life/discoveries";
import { growthTitles, worldGrowth } from "../life/worldGrowth";
import { contexts, type EventContext } from "../life/events";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Clock3, Footprints, Coffee, Sprout } from "lucide-react";
import { useStore } from "../state/Store";
import { activeLife, clockAt, type FeedbackType } from "../life/model";
import { isQuietTime, recommend, type Opportunity } from "../life/recommend";
import { LifeWorld } from "./LifeWorld";
export function LifeDashboard() {
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
    ? "先描述日常，让城镇认识你。"
    : !life.settings.enabled
      ? "活动推荐已关闭，可在生活节奏中开启。"
      : quiet
        ? `现在是静默时段（${life.settings.quietStart}–${life.settings.quietEnd}）。`
        : trigger === "busy"
          ? "你标记了正在忙，先留出这段时间。"
          : !context
            ? "目前的日程没有匹配到可推荐的空档。时间缺失或正在上课也可能出现这种情况。你可以选一个此刻所在的地点。"
            : "这个场景暂无符合当前事件、空闲时长和偏好的活动。";
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
          ? "已按具体原因调整该活动及相关子类型，不影响无关活动。"
          : type === "never_recommend"
            ? "已永久排除这项活动，可在节奏设置中重置。"
            : "已推迟这项活动，稍后再看。",
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
          事件情境
          <select
            aria-label="事件情境"
            value={trigger}
            onChange={(e) => {
              setTrigger(e.target.value as EventContext);
              setSelected("");
            }}
          >
            <option value="">按日程／场景判断</option>
            {contexts.map(([value, title]) => (
              <option key={value} value={value}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <label>
          此刻的场景
          <select
            aria-label="此刻的场景"
            value={context}
            onChange={(e) => {
              setContext(e.target.value);
              setSelected(e.target.value);
            }}
          >
            <option value="">按日程发现机会</option>
            {life.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}（手动选择）
              </option>
            ))}
          </select>
        </label>
        <label>
          空闲时长
          <select
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          >
            {[1, 2, 3, 5].map((m) => (
              <option key={m} value={m}>
                {m} 分钟
              </option>
            ))}
          </select>
        </label>
        <p>
          {day.weekend ? "周末" : "工作日"} · {day.time} · {life.timezone}
          <br />
          根据你提供的生活日程推测，不使用定位。
        </p>
      </div>
      {trigger && (
        <p className={state.demo ? "simulation-label" : "context-label"}>
          {state.demo ? "演示模拟" : "你主动确认的事件"} ·{" "}
          {contexts.find((c) => c[0] === trigger)?.[1]} · 不代表实时监测
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
            ? "收起活动详情"
            : choices.length
              ? `查看活动机会 · ${choices.length}`
              : sceneDiscoveries.length
                ? `生活发现 · ${sceneDiscoveries.length}`
                : "此刻暂无推荐"}
        </button>
        <aside className={`opportunity-panel ${sheet ? "sheet-open" : ""}`}>
          <button
            className="sheet-close text-button"
            onClick={() => setSheet(false)}
          >
            收起详情
          </button>
          <div className="section-heading">
            <h2>留给自己的间隙</h2>
            <Clock3 size={20} />
          </div>
          {choices.length > 0 && sceneDiscoveries.length > 0 && (
            <p>
              <Link className="text-link" to="/explore">
                查看生活线索发现 <ArrowRight size={16} />
              </Link>
            </p>
          )}
          {selected && growth.get(selected) && (
            <p className="growth-scene-note">
              {growthTitles[growth.get(selected)!.level]} · 来自你确认的尝试
            </p>
          )}
          {choices.length > 0 && (
            <label className="feedback-reason">
              不适合的原因
              <select
                aria-label="反馈原因"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {[
                  ["not_interested", "对这类活动没兴趣"],
                  ["too_busy", "现在太忙"],
                  ["too_difficult", "难度不适合"],
                  ["already_done", "已经做过"],
                  ["wrong_time", "时间不对"],
                  ["wrong_context", "地点／情境不对"],
                  ["shorter", "希望更短一点"],
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
                {o.policy.category === "rest" ? "休息" : "自然微动"} ·{" "}
                {o.location.name} · {o.quest.seconds / 60} 分钟
              </div>
              <h3>{o.quest.title}</h3>
              <p>{o.quest.description}</p>
              <details>
                <summary>为什么推荐 · {Math.round(o.score)} 分</summary>
                <ul>
                  {o.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <p>内容状态：编辑核对的日常建议，未经临床验证。</p>
              </details>
              <Link
                className="button primary"
                to={`/quest/${o.quest.id}`}
                onClick={() => void feedback(o, "interested")}
              >
                查看活动
                <ArrowRight size={16} />
              </Link>
              <div className="feedback-actions">
                <button
                  disabled={busy}
                  onClick={() => void feedback(o, "not_now")}
                >
                  现在不想
                </button>
                <button
                  disabled={busy}
                  onClick={() => void feedback(o, "not_suitable")}
                >
                  不适合我
                </button>
                <button
                  disabled={busy}
                  onClick={() => void feedback(o, "remind_later")}
                >
                  30 分钟后
                </button>
                <button
                  disabled={busy}
                  onClick={() => void feedback(o, "never_recommend")}
                >
                  以后不推荐
                </button>
              </div>
            </article>
          ))}
          {!choices.length &&
            (sceneDiscoveries.length ? (
              <div className="opportunity-empty">
                <Sprout size={30} />
                <h3>这里有可以试的微动</h3>
                <p>来自你说过的日常。等对应的时机出现时再试。</p>
                <Link className="button primary" to="/explore">
                  查看生活线索发现 <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="opportunity-empty">
                <Coffee size={30} />
                <h3>此刻，可以留白。</h3>
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
                      在{selectedLocation.name}找机会
                    </button>
                  )}
                <Link
                  to={life.locations.length ? "/rhythm" : "/life"}
                  className="text-link"
                >
                  {life.locations.length ? "调整生活节奏" : "添加生活地点"}
                  <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          <p role="status">{status}</p>
          <Link className="text-link" to="/rhythm">
            查看反馈与节奏设置
            <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
      <section className="discovery-journal">
        <div className="section-heading">
          <h2>世界发现手记</h2>
          <Link to="/demo">
            演示与世界扩展 <ArrowRight size={15} />
          </Link>
        </div>
        <div role="region" tabIndex={0} aria-label="已发现地点，可横向滚动">
          {life.locations.map((l) => (
            <span key={l.id}>
              {l.name}
              <small>
                已确认 · {l.source === "ai" ? "来自生活描述" : "手动确认"}
              </small>
            </span>
          ))}
        </div>
      </section>
      <section className="life-timeline">
        <div className="section-heading">
          <h2>今天的生活节奏</h2>
          <Link to="/life">
            编辑日常
            <ArrowRight size={16} />
          </Link>
        </div>
        {!events.length ? (
          <p>还没有今天的日程。补充工作日或周末事件，地图会随生活一起扩展。</p>
        ) : (
          <ol tabIndex={0} aria-label="日程时间轴，可横向滚动">
            {events.map((e) => (
              <li key={e.id}>
                <time>
                  {e.start
                    ? `${e.approximate ? "约 " : ""}${e.start}`
                    : "时间待补充"}
                  {e.end ? ` — ${e.end}` : ""}
                </time>
                <strong>{e.title}</strong>
                <span>
                  {life.locations.find((l) => l.id === e.locationId)?.name} ·{" "}
                  {e.busy ? "专注时段" : "潜在空闲窗口"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
