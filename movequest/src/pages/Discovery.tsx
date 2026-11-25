import { englishPlan, englishSkip } from "../life/planEnglish";
import { useLanguage } from "../i18n/language";
import { demoEnabled } from "../app/release";
import { everydayNames } from "../data/everydayNames";
import { findMove } from "../life/moveNow";
import { suggestedAlternative } from "../life/habits";
import { QuickOpportunities } from "../components/QuickOpportunities";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Footprints, Sprout } from "lucide-react";
import { PageTitle } from "../components/UI";
import { useStore } from "../state/Store";
import { activeLife, clockAt } from "../life/model";
import { discover, type Discovery } from "../life/discoveries";
import { movementEvidence } from "../life/evidence";
import { skipLabels, type Attempt } from "../life/habits";
import { Explore } from "./Home";

export function AttemptForm({
  opportunity,
  habitId,
  onSaved,
  initiallySkipping = false,
}: {
  opportunity: Discovery;
  habitId?: string;
  initiallySkipping?: boolean;
  onSaved: (status: Attempt["status"]) => void;
}) {
  const { t } = useLanguage();
  const { send, busy } = useStore();
  const [reason, setReason] = useState<NonNullable<Attempt["reason"]>>("other");
  const [convenience, setConvenience] = useState<"" | "easy" | "hard">("");
  const [selfInitiated, setSelfInitiated] = useState(false);
  const [showSkip, setShowSkip] = useState(initiallySkipping);
  const [saving, setSaving] = useState(false);
  const [id] = useState(() => crypto.randomUUID());
  async function record(status: Attempt["status"]) {
    setSaving(true);
    try {
      if (
        await send({
          type: "movement-attempt",
          id,
          habitId,
          cueId: opportunity.cue.id,
          status,
          at: Date.now(),
          selfInitiated,
          reason: status === "skipped" ? reason : undefined,
          convenience: status === "done" ? convenience || undefined : undefined,
        })
      )
        onSaved(status);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="try-action">
      {showSkip ? (
        <>
          <label>
            {t("这次为什么跳过？", "Why did you skip it?")}
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as typeof reason)}
            >
              {Object.entries(skipLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {t(label, englishSkip[value as keyof typeof englishSkip])}
                </option>
              ))}
            </select>
          </label>
          <div className="action-row">
            <button
              className="button"
              disabled={busy || saving}
              onClick={() => void record("skipped")}
            >
              {t("记录跳过", "Save skip")}
            </button>
            <button
              className="text-button"
              disabled={saving}
              onClick={() => setShowSkip(false)}
            >
              {t("返回记录", "Go back")}
            </button>
          </div>
        </>
      ) : (
        <>
          <label>
            {t("这次融入日常容易吗？", "How easily did this fit your day?")}
            <select
              value={convenience}
              onChange={(e) =>
                setConvenience(e.target.value as typeof convenience)
              }
            >
              <option value="">{t("暂不评价", "Skip this question")}</option>
              <option value="easy">{t("容易", "Easy")}</option>
              <option value="hard">
                {t("有点费劲", "A little difficult")}
              </option>
            </select>
          </label>
          {habitId && (
            <label className="inline-check">
              <input
                type="checkbox"
                checked={selfInitiated}
                onChange={(e) => setSelfInitiated(e.target.checked)}
              />
              {t("今天是我自己想起来做的", "I thought of doing it myself")}
            </label>
          )}
          <div className="action-row">
            <button
              className="button primary"
              disabled={busy || saving}
              onClick={() => void record("done")}
            >
              {t("我做过了，确认记录", "I did it. Save my record")}
            </button>
            <button
              className="text-button"
              disabled={saving}
              onClick={() => setShowSkip(true)}
            >
              {t("这次跳过", "Skip this time")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DiscoveryCard({
  discovery,
  featured,
  onSaved,
}: {
  discovery: ReturnType<typeof discover>[number];
  featured: boolean;
  onSaved: (discovery: Discovery, status: Attempt["status"]) => void;
}) {
  const { locale, t } = useLanguage();
  const { state, send } = useStore();
  const [trying, setTrying] = useState<"try" | "skip" | null>(null);
  const translated = locale === "en" ? englishPlan(discovery) : undefined;
  const life = activeLife(state);
  const alternative = findMove(
    suggestedAlternative(life, discovery.cue, discovery.quest.id) ?? "",
  );
  const move = findMove(discovery.quest.id);
  const result = life.attempts?.findLast((a) => a.cueId === discovery.cue.id);
  return (
    <article className={`discovery-card ${featured ? "featured" : ""}`}>
      <p className="discovery-context">
        <Footprints size={15} />
        {discovery.location.name} · {t(discovery.kind, "From your routine")} ·{" "}
        {t(
          `${discovery.quest.seconds / 60} 分钟以内`,
          `Up to ${discovery.quest.seconds / 60} min`,
        )}
      </p>
      <h2>
        {translated?.title ??
          (move
            ? t(...move.name)
            : t(
                discovery.quest.title,
                everydayNames[discovery.quest.id] ?? discovery.quest.title,
              ))}
      </h2>
      <p className="fineprint">
        {discovery.cue.source === "ai"
          ? t("AI 整理 · 已确认", "AI-assisted · confirmed")
          : t("本机计划 · 已确认", "Local plan · confirmed")}
      </p>
      <blockquote>「{discovery.cue.evidence}」</blockquote>
      {discovery.cue.plan?.fitEvidence &&
        discovery.cue.plan.fitEvidence !== discovery.cue.evidence && (
          <p className="discovery-fit">
            {t("也考虑了你说的", "Your plan also takes this into account:")} 「
            {discovery.cue.plan.fitEvidence}」
          </p>
        )}
      <p>{translated?.action ?? discovery.action}</p>
      <p className="fineprint">
        {discovery.addedSeconds
          ? t(
              `预留约 ${discovery.addedSeconds} 秒，放在原本的间隙里。`,
              `Allow about ${discovery.addedSeconds} seconds within your existing break.`,
            )
          : t(
              "沿原有行程完成，无需额外留时间。",
              "Fits into your existing trip without extra time.",
            )}
      </p>
      {discovery.minimum && (
        <p className="plan-minimum">
          <strong>{t("只做一点也可以", "Make it smaller")}</strong>{" "}
          {translated?.minimum ?? discovery.minimum}
        </p>
      )}
      {!discovery.tailored && (
        <p className="discovery-fit">{discovery.fitNote}</p>
      )}
      {trying ? (
        <AttemptForm
          opportunity={discovery}
          initiallySkipping={trying === "skip"}
          onSaved={(status) => {
            setTrying(null);
            onSaved(discovery, status);
          }}
        />
      ) : (
        <div className="action-row">
          {!state.demo && (
            <Link
              className="button primary"
              to={`/move/${discovery.quest.id}?cue=${encodeURIComponent(discovery.cue.id)}`}
            >
              {t("开始引导活动", "Start guided movement")}
            </Link>
          )}
          {demoEnabled && (
            <button
              className={`button ${featured && state.demo ? "primary" : ""}`}
              onClick={() => {
                setTrying("try");
                void send({
                  type: "local-events",
                  events: [
                    {
                      name: "opportunity_accepted",
                      key: crypto.randomUUID(),
                      at: Date.now(),
                    },
                  ],
                });
              }}
            >
              {t("试一次", "Try it")}
            </button>
          )}
          <button className="text-button" onClick={() => setTrying("skip")}>
            {t("这个机会不适合", "This doesn’t fit")}
          </button>
        </div>
      )}
      <details>
        <summary>
          <BookOpen size={16} />
          {t("为什么值得试", "Why try this?")}
        </summary>
        <p>
          {t(
            movementEvidence.explanation,
            "WHO recommends replacing some sedentary time with physical activity you can do, including light movement.",
          )}
        </p>
        <p>
          {t(
            movementEvidence.limitations,
            "The guideline does not establish the effect of a single short activity.",
          )}
        </p>
        <a href={movementEvidence.url} target="_blank" rel="noreferrer">
          {t("查看世卫组织指南", "Read the WHO guideline")}
        </a>
        <p>{discovery.policy.cautions}</p>
        {alternative && (
          <p>
            {t("可替代", "Alternative")} ·{" "}
            <Link
              to={`/movement?scene=${encodeURIComponent(discovery.location.id)}&pick=${encodeURIComponent(alternative.id)}`}
            >
              {t(...alternative.name)}
            </Link>
          </p>
        )}
        <p>
          {t(
            movementEvidence.safety,
            "Choose a safe, accessible setting and stop if you feel unwell.",
          )}{" "}
          {t(
            "如果环境不合适，可以按原来的方式休息，或选择另一条发现。",
            "If it doesn’t fit, take your usual break or choose another suggestion.",
          )}
        </p>
      </details>
      {discovery.learned && (
        <p className="fineprint">
          {t(
            "之前在这个情境的反馈已用于降低重复出现的优先级。",
            "Your previous feedback makes this suggestion less likely to repeat here.",
          )}
        </p>
      )}
      {result?.status === "done" && (
        <p className="fineprint">
          {t(
            "你已经确认过一次，可以照自己的节奏再试。",
            "You’ve tried this before. Repeat it at your own pace.",
          )}
        </p>
      )}
    </article>
  );
}

export function TodayDiscoveries() {
  const { t } = useLanguage();
  const { state, send, busy } = useStore();
  const life = activeLife(state);
  const [now, setNow] = useState(Date.now);
  const [result, setResult] = useState<{
    discovery: Discovery;
    status: Attempt["status"];
  }>();
  const options = discover(life, now);
  const displayed = options.map((o) => o.cue.id).join(",");
  const day = clockAt(now, life.timezone).day;
  useEffect(() => {
    if (!displayed) return;
    void send({
      type: "local-events",
      events: displayed.split(",").map((cueId) => ({
        name: "opportunity_displayed",
        key: `${day}:${cueId}`,
        at: Date.now(),
      })),
    });
  }, [displayed, day, send]);
  if (state.demo && !life.cues?.length)
    return (
      <>
        <section className="panel discovery-no-cues">
          <h2>从一个真实生活间隙开始</h2>
          <p>
            说说你通常在哪里、什么时候会停一下。比如完成作业后想刷手机，或者收尾一项工作才离开桌前。
          </p>
          <Link className="button primary" to="/life">
            聊聊我的生活 <ArrowRight size={16} />
          </Link>
        </section>
        {state.demo && <Explore />}
      </>
    );
  const existingHabit = life.habits?.find(
    (h) => h.cueId === result?.discovery.cue.id && !h.archived,
  );
  return (
    <>
      <PageTitle
        title={state.demo ? "今日发现" : t("我的行动计划", "My action plan")}
        description={
          options.length
            ? t("先选一个想试的。", "Pick one thing you’d like to try.")
            : undefined
        }
        action={
          !state.demo ? (
            <Link className="button" to="/habits">
              {t("我的习惯", "My habits")}
            </Link>
          ) : undefined
        }
      />
      {result && (
        <section className="discovery-result panel" aria-live="polite">
          <Sprout size={22} />
          <div>
            <h2>
              {result.status === "done"
                ? t("这次尝试，城镇记住了", "Your town grew from this try")
                : t("已记录这次跳过", "Skip recorded")}
            </h2>
            <p>
              {result.status === "done"
                ? t(
                    `${result.discovery.location.name}多了一点新绿。`,
                    `${result.discovery.location.name} has grown a little.`,
                  )
                : t(
                    "下次会优先考虑其他线索，你也可以继续照原来的方式休息。",
                    "Other options will have priority next time. Your usual break is fine too.",
                  )}
            </p>
            {result.status === "done" && (
              <div className="action-row">
                <Link
                  to={`${state.demo ? "/" : "/world"}?scene=${encodeURIComponent(result.discovery.location.id)}`}
                  className="button"
                >
                  {t("查看街区变化", "See what changed")}
                </Link>
                {existingHabit ? (
                  <Link className="button primary" to="/habits">
                    {t("打开习惯花园", "Open my habits")}
                  </Link>
                ) : (
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() =>
                      void send({
                        type: "habit-create",
                        id: crypto.randomUUID(),
                        cueId: result.discovery.cue.id,
                        at: Date.now(),
                      })
                    }
                  >
                    {t("把这个时机种成习惯", "Turn this moment into a habit")}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}
      {options.length ? (
        <div className="discoveries-grid">
          {options.map((option, index) => (
            <DiscoveryCard
              key={option.cue.id}
              discovery={option}
              featured={index === 0}
              onSaved={(discovery, status) => {
                setResult({ discovery, status });
                setNow(Date.now());
              }}
            />
          ))}
        </div>
      ) : demoEnabled ? (
        <QuickOpportunities />
      ) : (
        <section className="panel">
          <h2>{t("现在想活动一会儿？", "Want to move right now?")}</h2>
          <p>
            {t(
              "有新的日常间隙就补充到生活里，也可以直接按此刻的条件挑动作。",
              "Add a routine or pick a movement based on your current setting.",
            )}
          </p>
          <Link className="button primary" to="/movement">
            {t("此刻动一动", "Move now")}
          </Link>
        </section>
      )}
      <p className="discovery-footer">
        <Link to="/life">
          {t("更新我的目标或限制", "Update goals or limits")}
        </Link>
      </p>
    </>
  );
}
