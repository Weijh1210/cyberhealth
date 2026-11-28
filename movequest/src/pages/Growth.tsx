import {
  localizedLesson,
  productText,
  questTitle,
} from "../i18n/productContent";
import { useLanguage } from "../i18n/language";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Plus,
  LockKeyhole,
  Award,
  ExternalLink,
  Sprout,
} from "lucide-react";
import { achievements, garden, localDay, stats } from "../domain/engine";
import { scenes, type Scene } from "../domain/types";
import { findQuest, lessons, sceneInfo } from "../data/content";
import { useStore } from "../state/Store";
import { GardenScene } from "../components/Art";
import { Empty, Meter, PageTitle } from "../components/UI";
export function Learn() {
  const { locale, t } = useLanguage();
  const { state, send } = useStore();
  const [params, setParams] = useSearchParams();
  const lessonIndex = Math.max(
    0,
    lessons.findIndex((lesson) => lesson.id === params.get("lesson")),
  );
  const selected = localizedLesson(lessons[lessonIndex], locale);
  const a = stats(state);
  const g = garden(a.xp);
  const [answer, setAnswer] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const last = state.learning
    .filter((x) => x.demo === state.demo && x.lessonId === selected.id)
    .at(-1);
  const unlocked = a.learned.has(selected.id);
  const submit = async () => {
    if (answer === null) return;
    setPending(true);
    await send({
      type: "answer",
      lessonId: selected.id,
      answer,
      now: Date.now(),
    });
    setPending(false);
  };
  return (
    <>
      <PageTitle
        title={t("让知识，也生根发芽。", "Learn about everyday movement")}
        description={t(
          "认识日常活动的小道理，带着发现回到生活。",
          "Explore ways to move in daily life and try what fits your routine.",
        )}
      />
      <div className="learn-layout">
        <aside className="lesson-nav panel">
          <h2>{t("微动知识册", "Movement guide")}</h2>
          <p className="meta">
            {t("已学习", "Completed")}
            {a.learned.size} / {lessons.length}
          </p>
          <nav aria-label={t("知识卡列表", "Knowledge cards")}>
            {lessons.map((l, i) => (
              <button
                key={l.id}
                className={l.id === selected.id ? "active" : ""}
                aria-pressed={l.id === selected.id}
                onClick={() => {
                  setParams({ lesson: l.id });
                  setAnswer(null);
                }}
              >
                <span className="lesson-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{productText(l.title, locale)}</span>
                {a.learned.has(l.id) && <Check size={16} />}
              </button>
            ))}
          </nav>
          <div className="fineprint">
            {t(
              "每张知识卡首次答对 +5 XP。重读与重试不扣分。",
              "The first correct answer for each card earns 5 XP. You can reread or try again at any time.",
            )}
          </div>
        </aside>
        <article className="panel lesson-card">
          <div className="section-heading">
            <span className="meta">
              {t("知识卡 ·", "Card ·")}
              {lessonIndex + 1} / {lessons.length}
            </span>
            <span className="badge">
              {unlocked ? t("已收获 +5 XP", "Earned +5 XP") : "+5 XP"}
            </span>
          </div>
          <h2>{selected.title}</h2>
          <p className="lesson-body">{selected.body}</p>
          <div className="question">
            <h3>{selected.question}</h3>
            <fieldset>
              <legend className="sr-only">
                {t("选择你的答案", "Choose your answer")}
              </legend>
              <div className="stack">
                {selected.options.map((option, index) => (
                  <label
                    key={option}
                    className={`answer-option ${answer === index ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name={selected.id}
                      checked={answer === index}
                      onChange={() => setAnswer(index)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              className="button primary"
              disabled={answer === null || pending}
              onClick={() => void submit()}
            >
              {pending
                ? t("正在记录…", "Saving…")
                : unlocked
                  ? t("再想一想，巩固知识", "Try the question again")
                  : t("提交答案", "Submit answer")}
            </button>
            {last && (
              <div
                className={`answer-feedback ${last.correct ? "correct" : ""}`}
                role="status"
              >
                <strong>
                  {last.correct
                    ? t("答对了。", "Correct.") +
                      (unlocked
                        ? t("知识已记入成长足迹。", "Added to your progress.")
                        : "")
                    : t(
                        "再想一想，可以重新选择。",
                        "Try again. You can choose a different answer.",
                      )}
                </strong>
                <p>
                  {last.correct
                    ? selected.explanation
                    : t(
                        "答案就在上面的知识卡里。这里不扣分，按自己的节奏学习。",
                        "Check the card above and try again at your own pace.",
                      )}
                </p>
              </div>
            )}
          </div>
          <details className="source-details">
            <summary>
              {t("查看知识来源与适用范围", "View source and scope")}
            </summary>
            <a href={selected.url} target="_blank" rel="noreferrer">
              {selected.source}
              <ExternalLink size={13} />
            </a>
            <p>{selected.scope}</p>
            <p>
              {t(
                "链接与内容核验：2026-11-19。仅作概述，不转载原图或原文。",
                "Sources checked on November 19, 2026. The card summarizes the source.",
              )}
            </p>
          </details>
        </article>
      </div>
      <div className="section-heading section-spaced">
        <div>
          <h2>{t("成长，有自己的样子。", "Your garden growth")}</h2>
          <p>
            {productText(g.name, locale)} · {a.xp} XP ·{" "}
            {t(
              "不需要连续打卡，植物也不会枯萎。",
              "Your garden stays the same when you take a break.",
            )}
          </p>
        </div>
        <Link to="/progress">
          {t("查看足迹", "View progress")}
          <ArrowRight size={16} />
        </Link>
      </div>
      <div className="rewards-grid">
        <section className="mini-garden panel">
          <GardenScene xp={a.xp} />
          <h3>
            {g.next
              ? t(
                  `下一个阶段：${g.next.name}`,
                  `Next stage: ${productText(g.next.name, locale)}`,
                )
              : t(
                  "满园生机，继续发现日常。",
                  "Your garden is in full bloom. Keep exploring at your own pace.",
                )}
          </h3>
          <p className="meta">
            {g.next
              ? `${a.xp} / ${g.next.xp} XP`
              : t(
                  "每一次轻动，都值得记录。",
                  "Every movement is worth recording.",
                )}
          </p>
        </section>
        <section className="panel">
          <h2>{t("我的成就", "Achievements")}</h2>
          <div className="achievement-grid">
            {achievements(state).map((item) => (
              <div
                key={item.name}
                className={`achievement ${item.unlocked ? "unlocked" : ""}`}
              >
                {item.unlocked ? (
                  <Award size={22} />
                ) : (
                  <LockKeyhole size={20} />
                )}
                <div>
                  <strong>{productText(item.name, locale)}</strong>
                  <small>{productText(item.description, locale)}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
export function Progress() {
  const { locale, t } = useLanguage();
  const { state } = useStore();
  const a = stats(state);
  const [range, setRange] = useState("all");
  const now = Date.now();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - 6 + i);
    return {
      day: localDay(d.getTime()),
      label: d.toLocaleDateString(locale, { weekday: "short" }),
      count: a.done.filter((x) => x.day === localDay(d.getTime())).length,
    };
  });
  const records = a.done
    .filter((x) => range === "all" || weekDays.some((d) => d.day === x.day))
    .slice()
    .reverse();
  return (
    <>
      <PageTitle
        title={t("每一点，都有被看见。", "My progress")}
        description={
          state.demo
            ? t(
                "演示成长足迹 · 这里只展示模拟活动",
                "Demo progress · Simulated activities",
              )
            : t(
                "记录的是你的行动与发现，不是一张连续打卡成绩单。",
                "See the activities you completed and the opportunities you discovered.",
              )
        }
        action={
          <Link className="button" to="/own-move">
            <Plus size={16} />
            {t("记录我的微动", "Create a movement")}
          </Link>
        }
      />
      <section
        className="metric-strip"
        aria-label={t("累计成长", "Total growth")}
      >
        <div>
          <span>{t("完成活动", "Activities completed")}</span>
          <strong data-testid="total-count">
            {a.total}
            <small>{t(" 次", "")}</small>
          </strong>
        </div>
        <div>
          <span>{t("活动时间", "Movement time")}</span>
          <strong data-testid="total-minutes">
            {a.minutes.toFixed(1)}
            <small> {t("分钟", "minutes")}</small>
          </strong>
        </div>
        <div>
          <span>{t("探索场景", "Settings explored")}</span>
          <strong>
            {a.explored.size}
            <small> / 4</small>
          </strong>
        </div>
        <div>
          <span>{t("知识学习", "Cards completed")}</span>
          <strong>
            {a.learned.size}
            <small> / {lessons.length}</small>
          </strong>
        </div>
      </section>
      <div className="progress-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>
              {t("最近七天的小行动", "Activities in the last seven days")}
            </h2>
            <span className="meta">{t("单位：次", "Activities per day")}</span>
          </div>
          <div
            className="week-chart"
            role="img"
            aria-label={weekDays
              .map((d) =>
                t(`${d.day}：${d.count} 次`, `${d.day}: ${d.count} activities`),
              )
              .join("；")}
          >
            {weekDays.map((d) => (
              <div key={d.day}>
                <span>{d.count}</span>
                <div className="bar-space">
                  <div
                    className="week-bar"
                    style={{
                      height: `${(d.count / Math.max(1, ...weekDays.map((x) => x.count))) * 100}%`,
                    }}
                  />
                </div>
                <small>{d.label}</small>
              </div>
            ))}
          </div>
          <p className="fineprint">
            {t(
              "没有活动的日子也很正常。图中保留真实的零记录。",
              "The chart includes days with zero recorded activities.",
            )}
          </p>
        </section>
        <section className="panel">
          <h2>{t("日常场景地图", "Settings explored")}</h2>
          <div className="scene-progress">
            {scenes.map((scene) => {
              const count = a.done.filter((x) => x.scene === scene).length;
              return (
                <div key={scene}>
                  <div>
                    <span>{t(sceneInfo[scene].name, sceneInfo[scene].en)}</span>
                    <span className="meta">
                      {t(`${count} 次`, `${count} activities`)} ·{" "}
                      {count
                        ? t("已探索", "Explored")
                        : t("还未探索", "Not explored yet")}
                    </span>
                  </div>
                  <Meter
                    label={t(
                      `${sceneInfo[scene].name}探索`,
                      `Explored: ${sceneInfo[scene].en}`,
                    )}
                    value={count ? 1 : 0}
                    max={1}
                  />
                </div>
              );
            })}
          </div>
          <Link className="text-link" to="/explore">
            {t("去发现一个新场景", "Explore a new setting")}
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <div className="progress-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>{t("我的微动手记", "Activity history")}</h2>
            <select
              aria-label={t("活动记录时间范围", "Activity history date range")}
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="all">{t("全部记录", "All time")}</option>
              <option value="week">{t("最近七天", "Last seven days")}</option>
            </select>
          </div>
          {!records.length ? (
            <Empty>
              {t("还没有完成记录。", "No completed activities yet.")}
              <Link className="text-link" to="/explore">
                {t("从一个小机会开始", "Find an activity")}
                <ArrowRight size={14} />
              </Link>
            </Empty>
          ) : (
            <div className="record-list">
              {records.map((s) => {
                const quest = findQuest(s.questId);
                return (
                  <Link
                    to={`/quest/${s.questId}?session=${s.id}`}
                    key={s.id}
                    className="record-row"
                  >
                    <div>
                      <strong>
                        {quest ? questTitle(quest, locale) : s.title}
                      </strong>
                      <small>
                        {s.day} ·{" "}
                        {t(sceneInfo[s.scene].name, sceneInfo[s.scene].en)}
                        {s.seated
                          ? t(" · 坐姿替代", " · Seated alternative")
                          : ""}
                        {s.kind === "steps"
                          ? t(" · 自报时长", " · Self-reported time")
                          : ""}
                        {s.demo ? t(" · 模拟", " · Simulated") : ""}
                      </small>
                    </div>
                    <div>
                      <strong>
                        {(s.elapsedMs / 60000).toFixed(1)}{" "}
                        {t("分钟", "minutes")}
                      </strong>
                      <small>+{s.xp} XP</small>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>{t("我发现的活动机会", "My movement discoveries")}</h2>
            <span className="meta">{a.own.length}</span>
          </div>
          <p className="panel-description">
            {t(
              "从跟随建议，到发现自己的日常。",
              "Find opportunities in your own routine.",
            )}
          </p>
          {a.own.length ? (
            <div className="own-list">
              {a.own.map((m) => (
                <Link to={`/quest/${m.id}`} key={m.id}>
                  <Sprout size={18} />
                  <div>
                    <strong>{m.title}</strong>
                    <small>{m.context}</small>
                  </div>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty>
              {t(
                "接水、等人、课间……你留意到什么新机会了吗？",
                "Refilling water, waiting, or taking a break between classes. What opportunities have you noticed?",
              )}
            </Empty>
          )}
          <Link className="button" to="/own-move">
            <Plus size={16} />
            Create Your Own Move
          </Link>
        </section>
      </div>
    </>
  );
}
export function OwnMovePage() {
  const { t } = useLanguage();
  const { state, send } = useStore();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [scene, setScene] = useState<Scene>(
    state.profile?.scenes[0] ?? "campus",
  );
  const [seconds, setSeconds] = useState(60);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState("");
  const submit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !context.trim()) return;
    setPending(true);
    const id = crypto.randomUUID();
    if (
      await send({
        type: "own",
        move: {
          id,
          title,
          context,
          scene,
          seconds,
          demo: state.demo,
          createdAt: new Date().toISOString(),
        },
      })
    ) {
      setSaved(id);
    }
    setPending(false);
  };
  return (
    <>
      <PageTitle
        title={t("下一个机会，由你发现。", "Create your own movement")}
        description={t(
          "Create Your Own Move · 把你生活里独有的微动机会，变成自己的小任务。",
          "Save a small activity that fits your routine.",
        )}
      />
      <div className="quest-layout">
        <section className="panel">
          {saved ? (
            <div className="saved-move" role="status">
              <Sprout size={40} />
              <h2>{t("你的发现，已经记下了。", "Movement saved")}</h2>
              <p>
                {t(
                  `「${title}」已加入成长足迹。完成自建活动每天最多奖励一次。`,
                  `“${title}” is in your activity history. Completing it earns a reward once per day.`,
                )}
              </p>
              <div className="action-row">
                <button
                  className="button primary"
                  onClick={() => navigate(`/quest/${saved}`)}
                >
                  {t("现在试试", "Try it now")}
                  <ArrowRight size={16} />
                </button>
                <Link className="button" to="/progress">
                  {t("看看我的发现", "View my discoveries")}
                </Link>
                <button
                  className="text-button"
                  onClick={() => {
                    setSaved("");
                    setTitle("");
                    setContext("");
                  }}
                >
                  {t("再记一个机会", "Add another activity")}
                </button>
              </div>
            </div>
          ) : (
            <form className="form-stack" onSubmit={(e) => void submit(e)}>
              <label>
                {t(
                  "什么时刻，你发现可以动一动？",
                  "When could you add some movement?",
                )}
                <textarea
                  required
                  maxLength={140}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder={t(
                    "例如：每次从宿舍走去上课之前…",
                    "For example, before I leave my dorm for class…",
                  )}
                />
              </label>
              <label>
                {t("你想做的小行动", "What would you like to do?")}
                <input
                  required
                  maxLength={48}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t(
                    "例如：提前出门，轻走到校园的小花圃",
                    "For example, leave early and walk to the campus garden",
                  )}
                />
              </label>
              <div className="form-pair">
                <label>
                  {t("发生在哪里", "Where does it happen?")}
                  <select
                    value={scene}
                    onChange={(e) => setScene(e.target.value as Scene)}
                  >
                    {scenes.map((s) => (
                      <option key={s} value={s}>
                        {t(sceneInfo[s].name, sceneInfo[s].en)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("想留多少时间", "How much time?")}
                  <select
                    value={seconds}
                    onChange={(e) => setSeconds(Number(e.target.value))}
                  >
                    {[60, 120, 180].map((s) => (
                      <option key={s} value={s}>
                        {s / 60} {t("分钟", "minutes")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="fineprint">
                {t(
                  "选择轻松、无负重、环境安全的活动。不要在道路上看屏幕，不需要挑战身体极限。",
                  "Pick an easy activity in a safe place that requires no weights. Put your phone away around traffic and stay within a comfortable range.",
                )}
              </p>
              <button
                className="button primary"
                disabled={pending || !title.trim() || !context.trim()}
                type="submit"
              >
                {pending
                  ? t("正在记录…", "Saving…")
                  : t("保存我的发现", "Save my movement")}
                <Plus size={17} />
              </button>
            </form>
          )}
        </section>
        <aside className="panel own-aside">
          <span className="meta">
            {t("从游戏里的任务，到生活里的本能", "Find a cue in your day")}
          </span>
          <h2>{t("你最了解自己的日常。", "You know your routine best.")}</h2>
          <p>
            {t(
              "MoveQuest 的目的，是让你渐渐不用等待提醒，也能认出那些本来就存在的活动机会。",
              "MoveQuest helps you notice opportunities to move in the routines you already have.",
            )}
          </p>
          <div className="advice-box">
            <h3>{t("一个小小的灵感", "Try this")}</h3>
            <p>
              {t(
                "当我 ______ 的时候，我可以顺便 ______。",
                "When I ______, I could also ______.",
              )}
            </p>
          </div>
          <p className="fineprint">
            {t(
              "发现机会会解锁「自主发现」成就。无需分享，不做公开排名。",
              "Saving your first movement unlocks an achievement that stays on this device.",
            )}
          </p>
        </aside>
      </div>
    </>
  );
}
