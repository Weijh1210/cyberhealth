import { placeName } from "../i18n/lifeLabels";
import { questTitle } from "../i18n/productContent";
import { useState } from "react";
import { ArrowRight, MapPin, Play, Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import { WorldPreview } from "../components/LifeWorld";
import { everydayNames } from "../data/everydayNames";
import { findQuest } from "../data/content";
import { useLanguage } from "../i18n/language";
import { activityPolicy } from "../life/activities";
import { discover, type Discovery } from "../life/discoveries";
import { habitOpportunity, nextHabitMoment } from "../life/habits";
import { activeLife, clockAt } from "../life/model";
import { findMove } from "../life/moveNow";
import { englishPlan } from "../life/planEnglish";
import {
  englishGrowth,
  growthTitles,
  nextDistrictReward,
} from "../life/worldGrowth";
import { useStore } from "../state/Store";

export function Today() {
  const { locale, t } = useLanguage();
  const { state, send, busy } = useStore();
  const life = activeLife(state);
  const now = Date.now();
  const day = clockAt(now, life.timezone).day;
  const history = state.sessions
    .filter((session) => {
      const quest = findQuest(session.questId);
      return (
        !session.demo &&
        session.status === "completed" &&
        session.completedAt &&
        (session.own || (quest && activityPolicy(quest).category !== "rest"))
      );
    })
    .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!));
  const dayOf = (at: string) => clockAt(Date.parse(at), life.timezone).day;
  const lastSession = history[0];
  const lastQuest = lastSession && findQuest(lastSession.questId);
  const completed = history.filter(
    (session) => dayOf(session.completedAt!) === day,
  );
  const minutes = (sessions: typeof history) =>
    sessions.reduce((sum, session) => sum + session.elapsedMs, 0) / 60000;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const total = minutes(completed);
  const light = minutes(
    completed.filter(
      (s) => s.intensity === "light" || (!s.intensity && !!findMove(s.questId)),
    ),
  );
  const moderate = minutes(
    completed.filter(
      (s) => s.intensity === "moderate" || s.intensity === "vigorous",
    ),
  );
  const goal = life.dailyGoalMinutes ?? 0;
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(String(goal));
  const plans = discover(life, now).slice(0, 3);
  const habits = (life.habits ?? [])
    .flatMap((habit) => {
      const action = habitOpportunity(life, habit);
      return action
        ? [{ habit, action, next: nextHabitMoment(life, habit, now) }]
        : [];
    })
    .sort(
      (a, b) =>
        (a.next?.days ?? 9) - (b.next?.days ?? 9) ||
        (a.next?.time ?? "").localeCompare(b.next?.time ?? ""),
    )
    .slice(0, 3);
  const reward = nextDistrictReward(life);
  const rewardLevel = reward ? ((reward.count + 1) as 1 | 2 | 3) : undefined;
  const recentDays = Array.from({ length: 7 }, (_, index) =>
    new Date(Date.parse(day + "T00:00:00Z") - (6 - index) * 86400000)
      .toISOString()
      .slice(0, 10),
  );
  const daily = recentDays.map((date) => ({
    day: date,
    minutes: minutes(
      history.filter((session) => dayOf(session.completedAt!) === date),
    ),
  }));
  const biggestDay = Math.max(1, ...daily.map((item) => item.minutes));
  const titleFor = (action: Discovery) => {
    const move = findMove(action.quest.id);
    return move
      ? t(...move.name)
      : t(
          action.quest.title,
          englishPlan(action)?.title ??
            everydayNames[action.quest.id] ??
            action.quest.title,
        );
  };
  const guidedLink = (action: Discovery) =>
    `/move/${action.quest.id}?cue=${encodeURIComponent(action.cue.id)}`;

  return (
    <div className="today-page">
      <header className="movement-header">
        <h1>{t("今日", "Today")}</h1>
        <time dateTime={day}>
          {new Intl.DateTimeFormat(locale, {
            month: "long",
            day: "numeric",
            weekday: "long",
            timeZone: life.timezone,
          }).format(now)}
        </time>
      </header>
      <div className="today-grid">
        <section className="panel today-card today-movement">
          <div className="today-card-heading">
            <h2>{t("今天已动", "Movement today")}</h2>
            <button
              className="text-button"
              onClick={() => {
                setInput(String(goal));
                setEditing(!editing);
              }}
            >
              {t("设置目标", "Set a goal")}
            </button>
          </div>
          <p className="today-total">
            <strong>{number.format(total)}</strong> {t("分钟", "min")}
          </p>
          <dl className="today-intensity">
            <div>
              <dt>{t("轻度", "Light")}</dt>
              <dd>{number.format(light)}</dd>
            </div>
            <div>
              <dt>
                {t("中高强度 · 自报", "Moderate or vigorous · self-reported")}
              </dt>
              <dd>{number.format(moderate)}</dd>
            </div>
            {total - light - moderate > 0.001 && (
              <div>
                <dt>{t("未标注强度", "Unspecified intensity")}</dt>
                <dd>{number.format(total - light - moderate)}</dd>
              </div>
            )}
          </dl>
          {goal > 0 && (
            <>
              <progress
                value={Math.min(total, goal)}
                max={goal}
                aria-label={t("每日目标进度", "Daily goal progress")}
              />
              <p className="fineprint">
                {t(`个人目标 ${goal} 分钟`, `Personal goal ${goal} min`)}
              </p>
            </>
          )}
          {editing && (
            <form
              className="action-row"
              onSubmit={async (event) => {
                event.preventDefault();
                if (
                  await send({ type: "movement-goal", minutes: Number(input) })
                )
                  setEditing(false);
              }}
            >
              <label>
                {t("每天的分钟数（0 为取消）", "Minutes per day (0 to clear)")}
                <input
                  type="number"
                  min={0}
                  max={180}
                  required
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                />
              </label>
              <button className="button" disabled={busy}>
                {t("保存", "Save")}
              </button>
            </form>
          )}
          <Link className="button primary" to="/movement">
            <Play size={18} /> {t("此刻动一动", "Move now")}
          </Link>
        </section>
        <section className="panel today-card">
          <div className="today-card-heading">
            <h2>{t("我的行动计划", "My action plan")}</h2>
            {plans.length > 0 && (
              <Link to="/explore">{t("查看全部", "View all")}</Link>
            )}
          </div>
          {plans.length ? (
            <ul className="today-recent">
              {plans.map((plan) => (
                <li key={plan.cue.id}>
                  <div>
                    <Link to={guidedLink(plan)}>{titleFor(plan)}</Link>
                    <p className="fineprint">
                      <MapPin size={13} /> {placeName(plan.location, locale)} ·{" "}
                      {plan.cue.evidence}
                    </p>
                  </div>
                  <ArrowRight size={17} aria-hidden="true" />
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p>
                {t(
                  "说说久坐、通勤或做家务的一段日常，找个能顺手做的动作。",
                  "Share a routine to find a movement that fits.",
                )}
              </p>
              <Link className="button" to="/life#life-description">
                {t("补充日常", "Share a routine")}
              </Link>
            </>
          )}
        </section>
        <section className="panel today-card">
          <h2>{t("本周运动记录", "Movement this week")}</h2>
          <ul
            className="today-bars"
            aria-label={t(
              "最近七天每日确认分钟数",
              "Confirmed minutes over the last seven days",
            )}
          >
            {daily.map((item) => (
              <li
                key={item.day}
                title={`${item.day} · ${number.format(item.minutes)}`}
              >
                <span className="fineprint">{number.format(item.minutes)}</span>
                <span className="today-bar-track" aria-hidden="true">
                  <span
                    style={{
                      blockSize: `${(item.minutes / biggestDay) * 100}%`,
                    }}
                  />
                </span>
                <time dateTime={item.day}>{Number(item.day.slice(-2))}</time>
              </li>
            ))}
          </ul>
          {lastSession && (
            <p className="fineprint">
              {t("最近完成", "Most recent")} ·{" "}
              {lastQuest ? questTitle(lastQuest, locale) : lastSession.title}
            </p>
          )}
          <Link to="/progress">{t("查看进度", "View progress")}</Link>
        </section>
        <section className="panel today-card">
          <h2>{t("接下来的习惯", "Upcoming habits")}</h2>
          {habits.length ? (
            <ul className="today-recent">
              {habits.map(({ habit, action, next }) => (
                <li key={habit.id}>
                  <div>
                    <Link
                      to={`${guidedLink(action)}&habit=${encodeURIComponent(habit.id)}`}
                    >
                      {titleFor(action)}
                    </Link>
                    <p className="fineprint">{action.cue.evidence}</p>
                  </div>
                  <span>
                    {next
                      ? `${next.days === 0 ? t("今天", "Today") : next.day} ${next.time}`
                      : t("下次遇到时", "Next time it happens")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {t(
                "完成一次合适的活动后，可以把它连到原本就会做的事。",
                "After a movement that fits, link it to something you already do.",
              )}
            </p>
          )}
          <Link to="/habits">{t("管理习惯", "Manage habits")}</Link>
        </section>
        <section className="panel today-card today-world">
          <div>
            <h2>
              <Sprout size={21} /> {t("我的世界", "My world")}
            </h2>
            {reward && rewardLevel ? (
              <p>
                {t("下一项奖励", "Next reward")} ·{" "}
                {placeName(reward.location, locale)} ·{" "}
                <strong>
                  {t(growthTitles[rewardLevel], englishGrowth[rewardLevel])}
                </strong>
              </p>
            ) : (
              <p>
                {life.locations.length
                  ? t(
                      "已有街区奖励全部解锁。",
                      "All current district rewards are unlocked.",
                    )
                  : t(
                      "确认日常地点后，就可以建起自己的城镇。",
                      "Confirm your routine places to start building your town.",
                    )}
              </p>
            )}
            <Link
              className="button"
              to={
                reward
                  ? `/world?scene=${encodeURIComponent(reward.location.id)}`
                  : "/world"
              }
            >
              {t("打开城镇", "Open my town")} <ArrowRight size={16} />
            </Link>
          </div>
          <WorldPreview life={life} />
        </section>
      </div>
    </div>
  );
}
