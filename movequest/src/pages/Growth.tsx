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
import { lessons, sceneInfo } from "../data/content";
import { useStore } from "../state/Store";
import { GardenScene } from "../components/Art";
import { Empty, Meter, PageTitle } from "../components/UI";
export function Learn() {
  const { state, send } = useStore();
  const [params, setParams] = useSearchParams();
  const selected =
    lessons.find((l) => l.id === params.get("lesson")) ?? lessons[0];
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
        title="让知识，也生根发芽。"
        description="认识日常活动的小道理，带着发现回到生活。"
      />
      <div className="learn-layout">
        <aside className="lesson-nav panel">
          <h2>微动知识册</h2>
          <p className="meta">
            已学习 {a.learned.size} / {lessons.length}
          </p>
          <nav aria-label="知识卡列表">
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
                <span>{l.title}</span>
                {a.learned.has(l.id) && <Check size={16} />}
              </button>
            ))}
          </nav>
          <div className="fineprint">
            每张知识卡首次答对 +5 XP。重读与重试不扣分。
          </div>
        </aside>
        <article className="panel lesson-card">
          <div className="section-heading">
            <span className="meta">
              知识卡 · {lessons.indexOf(selected) + 1} / {lessons.length}
            </span>
            <span className="badge">{unlocked ? "已收获 +5 XP" : "+5 XP"}</span>
          </div>
          <h2>{selected.title}</h2>
          <p className="lesson-body">{selected.body}</p>
          <div className="question">
            <h3>{selected.question}</h3>
            <fieldset>
              <legend className="sr-only">选择你的答案</legend>
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
                ? "正在记录…"
                : unlocked
                  ? "再想一想，巩固知识"
                  : "提交答案"}
            </button>
            {last && (
              <div
                className={`answer-feedback ${last.correct ? "correct" : ""}`}
                role="status"
              >
                <strong>
                  {last.correct
                    ? "答对了。" + (unlocked ? "知识已记入成长足迹。" : "")
                    : "再想一想，可以重新选择。"}
                </strong>
                <p>
                  {last.correct
                    ? selected.explanation
                    : "答案就在上面的知识卡里。这里不扣分，按自己的节奏学习。"}
                </p>
              </div>
            )}
          </div>
          <details className="source-details">
            <summary>查看知识来源与适用范围</summary>
            <a href={selected.url} target="_blank" rel="noreferrer">
              {selected.source}
              <ExternalLink size={13} />
            </a>
            <p>{selected.scope}</p>
            <p>链接与内容核验：2026-11-19。仅作概述，不转载原图或原文。</p>
          </details>
        </article>
      </div>
      <div className="section-heading section-spaced">
        <div>
          <h2>成长，有自己的样子。</h2>
          <p>
            {g.name} · {a.xp} XP · 不需要连续打卡，植物也不会枯萎。
          </p>
        </div>
        <Link to="/progress">
          查看足迹 <ArrowRight size={16} />
        </Link>
      </div>
      <div className="rewards-grid">
        <section className="mini-garden panel">
          <GardenScene xp={a.xp} />
          <h3>
            {g.next ? `下一个阶段：${g.next.name}` : "满园生机，继续发现日常。"}
          </h3>
          <p className="meta">
            {g.next ? `${a.xp} / ${g.next.xp} XP` : "每一次轻动，都值得记录。"}
          </p>
        </section>
        <section className="panel">
          <h2>我的成就</h2>
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
                  <strong>{item.name}</strong>
                  <small>{item.description}</small>
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
  const { state } = useStore();
  const a = stats(state);
  const [range, setRange] = useState("all");
  const now = Date.now();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - 6 + i);
    return {
      day: localDay(d.getTime()),
      label: d.toLocaleDateString("zh-CN", { weekday: "short" }),
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
        title="每一点，都有被看见。"
        description={
          state.demo
            ? "演示成长足迹 · 这里只展示模拟活动"
            : "记录的是你的行动与发现，不是一张连续打卡成绩单。"
        }
        action={
          <Link className="button" to="/own-move">
            <Plus size={16} />
            记录我的微动
          </Link>
        }
      />
      <section className="metric-strip" aria-label="累计成长">
        <div>
          <span>完成活动</span>
          <strong data-testid="total-count">
            {a.total}
            <small> 次</small>
          </strong>
        </div>
        <div>
          <span>活动时间</span>
          <strong data-testid="total-minutes">
            {a.minutes.toFixed(1)}
            <small> 分钟</small>
          </strong>
        </div>
        <div>
          <span>探索场景</span>
          <strong>
            {a.explored.size}
            <small> / 4</small>
          </strong>
        </div>
        <div>
          <span>知识学习</span>
          <strong>
            {a.learned.size}
            <small> / {lessons.length}</small>
          </strong>
        </div>
      </section>
      <div className="progress-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>最近七天的小行动</h2>
            <span className="meta">单位：次</span>
          </div>
          <div
            className="week-chart"
            role="img"
            aria-label={weekDays
              .map((d) => `${d.day}：${d.count} 次`)
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
            没有活动的日子也很正常。图中保留真实的零记录。
          </p>
        </section>
        <section className="panel">
          <h2>日常场景地图</h2>
          <div className="scene-progress">
            {scenes.map((scene) => {
              const count = a.done.filter((x) => x.scene === scene).length;
              return (
                <div key={scene}>
                  <div>
                    <span>{sceneInfo[scene].name}</span>
                    <span className="meta">
                      {count} 次 · {count ? "已探索" : "还未探索"}
                    </span>
                  </div>
                  <Meter
                    label={`${sceneInfo[scene].name}探索`}
                    value={count ? 1 : 0}
                    max={1}
                  />
                </div>
              );
            })}
          </div>
          <Link className="text-link" to="/explore">
            去发现一个新场景 <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <div className="progress-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>我的微动手记</h2>
            <select
              aria-label="活动记录时间范围"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="all">全部记录</option>
              <option value="week">最近七天</option>
            </select>
          </div>
          {!records.length ? (
            <Empty>
              还没有完成记录。
              <Link className="text-link" to="/explore">
                从一个小机会开始 <ArrowRight size={14} />
              </Link>
            </Empty>
          ) : (
            <div className="record-list">
              {records.map((s) => (
                <Link
                  to={`/quest/${s.questId}?session=${s.id}`}
                  key={s.id}
                  className="record-row"
                >
                  <div>
                    <strong>{s.title}</strong>
                    <small>
                      {s.day} · {sceneInfo[s.scene].name}
                      {s.seated ? " · 坐姿替代" : ""}
                      {s.kind === "steps" ? " · 自报时长" : ""}
                      {s.demo ? " · 模拟" : ""}
                    </small>
                  </div>
                  <div>
                    <strong>{(s.elapsedMs / 60000).toFixed(1)} 分钟</strong>
                    <small>+{s.xp} XP</small>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>我发现的活动机会</h2>
            <span className="meta">{a.own.length} 个</span>
          </div>
          <p className="panel-description">从跟随建议，到发现自己的日常。</p>
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
            <Empty>接水、等人、课间……你留意到什么新机会了吗？</Empty>
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
        title="下一个机会，由你发现。"
        description="Create Your Own Move · 把你生活里独有的微动机会，变成自己的小任务。"
      />
      <div className="quest-layout">
        <section className="panel">
          {saved ? (
            <div className="saved-move" role="status">
              <Sprout size={40} />
              <h2>你的发现，已经记下了。</h2>
              <p>
                「{title}」已加入成长足迹。记录发现不发重复
                XP；完成自建活动每天最多奖励一次。
              </p>
              <div className="action-row">
                <button
                  className="button primary"
                  onClick={() => navigate(`/quest/${saved}`)}
                >
                  现在试试 <ArrowRight size={16} />
                </button>
                <Link className="button" to="/progress">
                  看看我的发现
                </Link>
                <button
                  className="text-button"
                  onClick={() => {
                    setSaved("");
                    setTitle("");
                    setContext("");
                  }}
                >
                  再记一个机会
                </button>
              </div>
            </div>
          ) : (
            <form className="form-stack" onSubmit={(e) => void submit(e)}>
              <label>
                什么时刻，你发现可以动一动？
                <textarea
                  required
                  maxLength={140}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="例如：每次从宿舍走去上课之前…"
                />
              </label>
              <label>
                你想做的小行动
                <input
                  required
                  maxLength={48}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：提前出门，轻走到校园的小花圃"
                />
              </label>
              <div className="form-pair">
                <label>
                  发生在哪里
                  <select
                    value={scene}
                    onChange={(e) => setScene(e.target.value as Scene)}
                  >
                    {scenes.map((s) => (
                      <option key={s} value={s}>
                        {sceneInfo[s].name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  想留多少时间
                  <select
                    value={seconds}
                    onChange={(e) => setSeconds(Number(e.target.value))}
                  >
                    {[60, 120, 180].map((s) => (
                      <option key={s} value={s}>
                        {s / 60} 分钟
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="fineprint">
                选择轻松、无负重、环境安全的活动。不要在道路上看屏幕，不需要挑战身体极限。
              </p>
              <button
                className="button primary"
                disabled={pending || !title.trim() || !context.trim()}
                type="submit"
              >
                {pending ? "正在记录…" : "保存我的发现"}
                <Plus size={17} />
              </button>
            </form>
          )}
        </section>
        <aside className="panel own-aside">
          <span className="meta">从游戏里的任务，到生活里的本能</span>
          <h2>
            你比任何人，
            <br />
            都更了解自己的日常。
          </h2>
          <p>
            MoveQuest
            的目的，是让你渐渐不用等待提醒，也能认出那些本来就存在的活动机会。
          </p>
          <div className="advice-box">
            <h3>一个小小的灵感</h3>
            <p>
              “当我 ______ 的时候，
              <br />
              我可以顺便 ______。”
            </p>
          </div>
          <p className="fineprint">
            发现机会会解锁「自主发现」成就。无需分享，不做公开排名。
          </p>
        </aside>
      </div>
    </>
  );
}
