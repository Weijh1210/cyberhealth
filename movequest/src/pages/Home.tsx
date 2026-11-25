import { PersonalTown } from "../components/PersonalTown";
import { LifeDashboard } from "../components/LifeDashboard";
import { activityPolicy } from "../life/activities";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Sprout, ArrowUpRight } from "lucide-react";
import { useStore } from "../state/Store";
import { garden, stats } from "../domain/engine";
import { scenes, type Scene } from "../domain/types";
import { sceneInfo, quests, lessons } from "../data/content";
import { GardenScene, SceneArt } from "../components/Art";
import { Meter, PageTitle, QuestCard } from "../components/UI";
export function Home() {
  const { state } = useStore();
  return state.demo ? <LegacyHome /> : <PersonalTown />;
}
export function LegacyHome() {
  const { state } = useStore();
  const a = stats(state);
  const g = garden(a.xp);
  const name = state.profile?.name || "新朋友";
  const recommendation = quests
    .filter(
      (q) =>
        activityPolicy(q).eligible && state.profile?.scenes.includes(q.scene),
    )
    .sort(
      (x, y) =>
        Math.abs(x.seconds / 60 - (state.profile?.minutes ?? 1)) -
        Math.abs(y.seconds / 60 - (state.profile?.minutes ?? 1)),
    );
  const remaining = recommendation.filter(
    (q) => !a.today.some((x) => x.questId === q.id),
  );
  const chosen = (remaining.length ? remaining : recommendation).slice(0, 2);
  const active = state.sessions.findLast(
    (x) =>
      x.demo === state.demo && !["completed", "skipped"].includes(x.status),
  );
  return (
    <>
      <PageTitle
        title={`${name}，让今天长出一点新绿。`}
        description={new Date().toLocaleDateString("zh-CN", {
          timeZone: state.demo
            ? state.demoLife?.timezone
            : state.life?.timezone,
          month: "long",
          day: "numeric",
          weekday: "long",
        })}
        action={
          <Link className="button" to="/own-move">
            <Plus size={17} />
            记录我的微动
          </Link>
        }
      />
      <LifeDashboard />
      <details className="legacy-garden">
        <summary>我的微动成长与今日记录</summary>
        <div className="home-grid">
          <section className="garden-panel">
            <div className="section-heading">
              <div>
                <h2>我的日常花园</h2>
                <p>每一次轻动，都在这里留下生长。</p>
              </div>
              <span className="badge">Lv. {1 + Math.floor(a.xp / 100)}</span>
            </div>
            <GardenScene xp={a.xp} />
            <div className="garden-caption">
              <div>
                <span className="meta">成长阶段 {g.index + 1} / 5</span>
                <h3>{g.name}</h3>
              </div>
              <span className="xp-label">{a.xp} XP</span>
            </div>
            <Meter
              label="植物成长"
              value={a.xp - g.xp}
              max={g.next ? g.next.xp - g.xp : Math.max(1, a.xp - g.xp)}
            />
            <div className="progress-caption">
              <span>
                {g.next
                  ? `距离「${g.next.name}」还差 ${g.next.xp - a.xp} XP`
                  : "花园已经盛放，每次微动依然值得记录。"}
              </span>
              <Link to="/learn">
                查看奖励 <ArrowUpRight size={14} />
              </Link>
            </div>
          </section>
          <aside className="today-panel panel">
            <div className="section-heading">
              <h2>今天的小进展</h2>
              <span className="meta">慢慢来也很好</span>
            </div>
            <div className="today-xp">
              <strong data-testid="today-xp">{a.todayXP}</strong>
              <span>今日 XP</span>
            </div>
            <div className="daily-stats">
              <div>
                <strong>{a.today.length}</strong>
                <span>次微动</span>
              </div>
              <div>
                <strong>
                  {(
                    a.today.reduce((n, x) => n + x.elapsedMs, 0) / 60000
                  ).toFixed(1)}
                </strong>
                <span>活动分钟</span>
              </div>
            </div>
            <div className="daily-note">
              <Sprout size={21} />
              <p>
                {a.today.length
                  ? "你已经为今天留下一点绿意。"
                  : "先完成一个小行动，看看花园的变化。"}
              </p>
            </div>
            <Link
              className="button primary"
              to={
                active
                  ? `/quest/${active.questId}?session=${active.id}`
                  : `/quest/${chosen[0]?.id ?? quests[0].id}`
              }
            >
              {active ? "继续我的挑战" : "开始今天的微动"}
              <ArrowRight size={17} />
            </Link>
            <p className="fineprint">完成后由你确认，跳过不会扣分。</p>
          </aside>
        </div>
      </details>
      <details className="legacy-garden">
        <summary>主动探索活动与知识</summary>
        <div className="section-heading section-spaced">
          <div>
            <h2>日常活动库</h2>
            <p>可以主动探索；此处不是根据此刻场景的自动推荐。</p>
          </div>
          <Link to="/explore">
            探索全部 <ArrowRight size={16} />
          </Link>
        </div>
        <div className="quest-grid">
          {chosen.map((q) => (
            <QuestCard key={q.id} quest={q} />
          ))}
        </div>
        <div className="bottom-pair">
          <Link className="discovery-panel" to="/own-move">
            <Plus size={24} />
            <div>
              <h3>下一个机会，由你发现。</h3>
              <p>Create Your Own Move · 记录生活里自己的新发现。</p>
            </div>
            <ArrowUpRight size={23} />
          </Link>
          <Link to="/learn" className="learning-teaser">
            <BookIllustration />
            <div>
              <span className="meta">一点知识，一点收获</span>
              <h3>{lessons[0].title}</h3>
              <span className="text-link">
                打开知识卡 <ArrowRight size={15} />
              </span>
            </div>
          </Link>
        </div>
      </details>
    </>
  );
}
function BookIllustration() {
  return (
    <svg viewBox="0 0 70 70" width="70" height="70" aria-hidden="true">
      <path
        d="M12 18q12-8 23 0 11-8 23 0v37q-13-5-23 0-12-5-23 0Z"
        fill="#e9dfc1"
        stroke="#78896c"
        strokeWidth="2"
      />
      <path
        d="M35 18v37m-16-28 9 2m-9 5 9 2m16-8 9-2m-9 9 9-2"
        stroke="#78896c"
        strokeWidth="2"
      />
    </svg>
  );
}
export function Explore() {
  const [scene, setScene] = useState<Scene | "all">("all");
  const [duration, setDuration] = useState(0);
  const [query, setQuery] = useState("");
  const filtered = quests.filter(
    (q) =>
      activityPolicy(q).eligible &&
      (scene === "all" || q.scene === scene) &&
      (!duration || q.seconds <= duration * 60) &&
      `${q.title}${q.context}`.includes(query.trim()),
  );
  return (
    <>
      <PageTitle
        title="生活里，处处有微动。"
        description="不必专门腾出时间，先看看你现在的场景。"
      />
      <div className="scene-grid">
        {scenes.map((s) => (
          <button
            key={s}
            className={`scene-card ${scene === s ? "selected" : ""}`}
            aria-pressed={scene === s}
            onClick={() => setScene(scene === s ? "all" : s)}
          >
            <SceneArt scene={s} />
            <div>
              <span>{sceneInfo[s].name}</span>
              <small>{sceneInfo[s].en}</small>
            </div>
          </button>
        ))}
      </div>
      <div className="filter-row">
        <div className="tabs" role="group" aria-label="任务场景">
          <button
            aria-pressed={scene === "all"}
            className={scene === "all" ? "active" : ""}
            onClick={() => setScene("all")}
          >
            全部场景
          </button>
          {scenes.map((s) => (
            <button
              key={s}
              aria-pressed={scene === s}
              className={scene === s ? "active" : ""}
              onClick={() => setScene(s)}
            >
              {sceneInfo[s].name}
            </button>
          ))}
        </div>
        <div className="filter-inputs">
          <input
            aria-label="搜索微动"
            placeholder="搜索微动…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="活动时长"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            <option value={0}>所有时长</option>
            {[1, 2, 3].map((m) => (
              <option key={m} value={m}>
                {m} 分钟以内
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="meta result-count">
        找到 {filtered.length} 个日常机会 · 日常建议与休息
      </p>
      <div className="quest-grid explore-quests">
        {filtered.map((q) => (
          <QuestCard key={q.id} quest={q} />
        ))}
      </div>
      {!filtered.length && (
        <div className="empty">
          暂时没有符合条件的微动。
          <button
            className="text-button"
            onClick={() => {
              setQuery("");
              setDuration(0);
              setScene("all");
            }}
          >
            清除筛选
          </button>
        </div>
      )}
    </>
  );
}
