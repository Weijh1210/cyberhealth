import { localizedQuest, productText } from "../i18n/productContent";
import { useLanguage } from "../i18n/language";
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
  const { locale, t } = useLanguage();
  const { state } = useStore();
  const a = stats(state);
  const g = garden(a.xp);
  const name = state.profile?.name || t("新朋友", "New explorer");
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
        title={t(`${name}，让今天长出一点新绿。`, `Welcome back, ${name}.`)}
        description={new Date().toLocaleDateString(locale, {
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
            {t("记录我的微动", "Create a movement")}
          </Link>
        }
      />
      <LifeDashboard />
      <details className="legacy-garden">
        <summary>
          {t("我的微动成长与今日记录", "My growth and today's records")}
        </summary>
        <div className="home-grid">
          <section className="garden-panel">
            <div className="section-heading">
              <div>
                <h2>{t("我的日常花园", "My everyday garden")}</h2>
                <p>
                  {t(
                    "每一次轻动，都在这里留下生长。",
                    "Your garden grows with the activities you record.",
                  )}
                </p>
              </div>
              <span className="badge">Lv. {1 + Math.floor(a.xp / 100)}</span>
            </div>
            <GardenScene xp={a.xp} />
            <div className="garden-caption">
              <div>
                <span className="meta">
                  {t("成长阶段", "Growth stages")}
                  {g.index + 1} / 5
                </span>
                <h3>{productText(g.name, locale)}</h3>
              </div>
              <span className="xp-label">{a.xp} XP</span>
            </div>
            <Meter
              label={t("植物成长", "Plant growth")}
              value={a.xp - g.xp}
              max={g.next ? g.next.xp - g.xp : Math.max(1, a.xp - g.xp)}
            />
            <div className="progress-caption">
              <span>
                {g.next
                  ? t(
                      `距离「${g.next.name}」还差 ${g.next.xp - a.xp} XP`,
                      `${g.next.xp - a.xp} XP until ${productText(g.next.name, locale)}`,
                    )
                  : t(
                      "花园已经盛放，每次微动依然值得记录。",
                      "Your garden is in bloom. Keep recording activities that fit your day.",
                    )}
              </span>
              <Link to="/learn">
                {t("查看奖励", "View rewards")}
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </section>
          <aside className="today-panel panel">
            <div className="section-heading">
              <h2>{t("今天的小进展", "Today's progress")}</h2>
              <span className="meta">
                {t("慢慢来也很好", "Go at your own pace")}
              </span>
            </div>
            <div className="today-xp">
              <strong data-testid="today-xp">{a.todayXP}</strong>
              <span>{t("今日 XP", "XP today")}</span>
            </div>
            <div className="daily-stats">
              <div>
                <strong>{a.today.length}</strong>
                <span>{t("次微动", "Movements")}</span>
              </div>
              <div>
                <strong>
                  {(
                    a.today.reduce((n, x) => n + x.elapsedMs, 0) / 60000
                  ).toFixed(1)}
                </strong>
                <span>{t("活动分钟", "Movement minutes")}</span>
              </div>
            </div>
            <div className="daily-note">
              <Sprout size={21} />
              <p>
                {a.today.length
                  ? t(
                      "你已经为今天留下一点绿意。",
                      "You recorded movement today.",
                    )
                  : t(
                      "先完成一个小行动，看看花园的变化。",
                      "Record one movement to see how your garden changes.",
                    )}
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
              {active
                ? t("继续我的挑战", "Continue my activity")
                : t("开始今天的微动", "Start a movement")}
              <ArrowRight size={17} />
            </Link>
            <p className="fineprint">
              {t(
                "完成后由你确认，跳过不会扣分。",
                "Confirm after you finish. Skipping costs no points.",
              )}
            </p>
          </aside>
        </div>
      </details>
      <details className="legacy-garden">
        <summary>
          {t("主动探索活动与知识", "Explore activities and guides")}
        </summary>
        <div className="section-heading section-spaced">
          <div>
            <h2>{t("日常活动库", "Everyday activity library")}</h2>
            <p>
              {t(
                "可以主动探索；此处不是根据此刻场景的自动推荐。",
                "Browse activities by setting and duration.",
              )}
            </p>
          </div>
          <Link to="/explore">
            {t("探索全部", "Browse all")}
            <ArrowRight size={16} />
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
              <h3>{t("下一个机会，由你发现。", "Create your own movement")}</h3>
              <p>
                {t(
                  "Create Your Own Move · 记录生活里自己的新发现。",
                  "Save a movement you found in your own routine.",
                )}
              </p>
            </div>
            <ArrowUpRight size={23} />
          </Link>
          <Link to="/learn" className="learning-teaser">
            <BookIllustration />
            <div>
              <span className="meta">
                {t("一点知识，一点收获", "Knowledge cards")}
              </span>
              <h3>{productText(lessons[0].title, locale)}</h3>
              <span className="text-link">
                {t("打开知识卡", "Open knowledge card")}
                <ArrowRight size={15} />
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
  const { locale, t } = useLanguage();
  const [scene, setScene] = useState<Scene | "all">("all");
  const [duration, setDuration] = useState(0);
  const [query, setQuery] = useState("");
  const filtered = quests.filter(
    (q) =>
      activityPolicy(q).eligible &&
      (scene === "all" || q.scene === scene) &&
      (!duration || q.seconds <= duration * 60) &&
      `${localizedQuest(q, locale).title} ${productText(q.context, locale)}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title={t("生活里，处处有微动。", "Everyday activity library")}
        description={t(
          "不必专门腾出时间，先看看你现在的场景。",
          "Choose an activity that fits where you are and the time you have.",
        )}
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
              <span>{t(sceneInfo[s].name, sceneInfo[s].en)}</span>
              <small>{productText(sceneInfo[s].description, locale)}</small>
            </div>
          </button>
        ))}
      </div>
      <div className="filter-row">
        <div
          className="tabs"
          role="group"
          aria-label={t("任务场景", "Activity setting")}
        >
          <button
            aria-pressed={scene === "all"}
            className={scene === "all" ? "active" : ""}
            onClick={() => setScene("all")}
          >
            {t("全部场景", "All settings")}
          </button>
          {scenes.map((s) => (
            <button
              key={s}
              aria-pressed={scene === s}
              className={scene === s ? "active" : ""}
              onClick={() => setScene(s)}
            >
              {t(sceneInfo[s].name, sceneInfo[s].en)}
            </button>
          ))}
        </div>
        <div className="filter-inputs">
          <input
            aria-label={t("搜索微动", "Search activities")}
            placeholder={t("搜索微动…", "Search activities…")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label={t("活动时长", "Duration")}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            <option value={0}>{t("所有时长", "Any duration")}</option>
            {[1, 2, 3].map((m) => (
              <option key={m} value={m}>
                {t(`${m} 分钟以内`, `Up to ${m} min`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="meta result-count">
        {t(
          `找到 ${filtered.length} 个日常机会 · 日常建议与休息`,
          `${filtered.length} everyday activities and rest breaks`,
        )}
      </p>
      <div className="quest-grid explore-quests">
        {filtered.map((q) => (
          <QuestCard key={q.id} quest={q} />
        ))}
      </div>
      {!filtered.length && (
        <div className="empty">
          {t("暂时没有符合条件的微动。", "No activities match these filters.")}
          <button
            className="text-button"
            onClick={() => {
              setQuery("");
              setDuration(0);
              setScene("all");
            }}
          >
            {t("清除筛选", "Clear filters")}
          </button>
        </div>
      )}
    </>
  );
}
