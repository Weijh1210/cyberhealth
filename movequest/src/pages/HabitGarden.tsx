import { englishPlan, englishSkip } from "../life/planEnglish";
import { englishCues } from "../i18n/lifeLabels";
import { productText, questTitle } from "../i18n/productContent";
import { useLanguage } from "../i18n/language";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Leaf, Sprout } from "lucide-react";
import { PageTitle } from "../components/UI";
import { useStore } from "../state/Store";
import { activeLife, type LifeState } from "../life/model";
import {
  habitOpportunity,
  habitStage,
  skipLabels,
  type Habit,
} from "../life/habits";
import { AttemptForm } from "./Discovery";

const englishHabitStage: Record<string, string> = {
  探索中: "Exploring",
  正在尝试: "Trying it",
  重复练习: "Repeating",
  主动发起过: "Initiated on your own",
  逐渐熟悉: "Getting familiar",
};
function HabitCard({ habit, life }: { habit: Habit; life: LifeState }) {
  const { locale, t } = useLanguage();
  const { send, busy, state } = useStore();
  const [recording, setRecording] = useState(false);
  const [saved, setSaved] = useState("");
  const [days, setDays] = useState<3 | 5 | 7>(3);
  const opportunity = habitOpportunity(life, habit);
  const alternative = habitOpportunity(life, habit, true);
  const translated =
    locale === "en" && opportunity ? englishPlan(opportunity) : undefined;
  const records = (life.attempts ?? []).filter((a) => a.habitId === habit.id);
  const initiated = records.filter((a) => a.selfInitiated).length;
  const experiment = habit.experiment;
  const end = experiment && experiment.startsAt + experiment.days * 86400000;
  const finished = end !== undefined && Date.now() >= end;
  useEffect(() => {
    if (finished && experiment)
      void send({
        type: "local-events",
        events: [
          {
            name: "experiment_completed",
            key: `${habit.id}:${experiment.startsAt}`,
            at: Date.now(),
          },
        ],
      });
  }, [experiment, finished, habit.id, send]);
  const inExperiment =
    experiment && end
      ? records.filter((a) => a.at >= experiment.startsAt && a.at < end)
      : [];
  const easy = inExperiment.filter((a) => a.convenience === "easy").length;
  const reported = inExperiment.filter((a) => a.convenience).length;
  const latest = records.at(-1);
  const adaptation =
    latest?.status === "skipped" && latest.reason
      ? {
          busy: t(
            "等手头这件事真的结束，有余裕再试。",
            "Wait until the task is finished and you have a moment.",
          ),
          forgot: t(
            "把这个时机和一个看得见的线索连起来，比如关上书本。",
            "Link this moment to a visible cue, such as closing a book.",
          ),
          timing: t(
            "换到下一次任务自然收尾时再试。",
            "Try again when the next task naturally ends.",
          ),
          too_tiring: t(
            "可以只走几步，或先跳过，按舒适程度来。",
            "Walk only a few steps or skip it if that feels better.",
          ),
          social: t(
            "可以等到了自己觉得自在的地方再试。",
            "Try it in a place where you feel comfortable.",
          ),
          repetitive: t(
            "可先暂停这个计划，再从今日发现挑一个不同的时机。",
            "Pause this habit and choose a different cue from your action plan.",
          ),
          inconvenient: t(
            "先确认路段或空间是否适合，条件不便就跳过。",
            "Check the route or space first. Skip if conditions do not suit the activity.",
          ),
          uninterested: t(
            "可以归档这个习惯，保留尝试记录。",
            "Archive this habit to keep its history.",
          ),
          other: t(
            "下次可以用同一个时机再试，或者先停一停。",
            "Try the same cue next time or pause for now.",
          ),
        }[latest.reason]
      : undefined;
  const canRecord =
    opportunity?.quest.id === habit.activityId && !habit.archived;
  return (
    <article className="panel habit-card">
      <p className="discovery-context">
        <Leaf size={16} />
        {habit.archived
          ? t("已归档", "Archived")
          : t(
              habitStage(records, life.timezone),
              englishHabitStage[habitStage(records, life.timezone)] ??
                "Exploring",
            )}
      </p>
      <h2>
        {translated?.title ??
          (opportunity && questTitle(opportunity.quest, locale)) ??
          t("已保存的微动习惯", "Saved movement habit")}
      </h2>
      {opportunity && (
        <>
          <p>
            <strong>{t("当我", "When I")}</strong>{" "}
            {productText(opportunity.cue.evidence, locale) ||
              t(opportunity.trigger, englishCues[opportunity.cue.kind])}
            {t("，", ", ")}
            <strong>{t("我可以", "I can")}</strong>
            {t("试一段短活动。", "try a short activity.")}
          </p>
          <p>{translated?.action ?? productText(opportunity.action, locale)}</p>
          <p className="fineprint">
            {t("最小动作", "Smallest version")} ·{" "}
            {translated?.minimum ?? productText(opportunity.minimum, locale)}
          </p>
          {!state.demo && (
            <div className="action-row">
              <Link
                className="button primary"
                to={`/move/${opportunity.quest.id}?cue=${encodeURIComponent(habit.cueId)}&habit=${encodeURIComponent(habit.id)}`}
              >
                {t("开始引导", "Start guide")}
              </Link>
              {alternative && (
                <Link
                  to={`/move/${alternative.quest.id}?cue=${encodeURIComponent(habit.cueId)}&habit=${encodeURIComponent(habit.id)}&alternative=1`}
                >
                  {t("换个动作", "Try the alternative")} ·{" "}
                  {questTitle(alternative.quest, locale)}
                </Link>
              )}
            </div>
          )}
        </>
      )}
      {!canRecord && !habit.archived && (
        <p>
          {t(
            "原场景或动作目前不可用，可以保留历史并从今日发现挑一个新时机。",
            "This action is currently unavailable. Keep the history and pick a new moment from your action plan.",
          )}
        </p>
      )}
      <p className="habit-count">
        {t(
          `${records.filter((a) => a.status === "done").length} 次确认 · ${initiated} 次自报主动发起`,
          `${records.filter((a) => a.status === "done").length} completed · ${initiated} self-initiated`,
        )}
      </p>
      {adaptation && <p className="habit-adaptation">{adaptation}</p>}
      {initiated > 1 &&
        ((state.profile?.reminder ?? 0) > 0 ? (
          <p>
            {t(
              "你已经多次主动想起来。",
              "You have remembered this activity on your own several times.",
            )}
            <Link to="/profile">
              {t("可以调低提醒频率", "Lower reminder frequency")}
            </Link>
            。
          </p>
        ) : (
          <p>
            {t(
              "你已经多次主动想起来，继续按自己的节奏就好。",
              "You have remembered it on your own several times. Keep going at your own pace.",
            )}
          </p>
        ))}
      {canRecord &&
        (recording ? (
          <AttemptForm
            opportunity={opportunity}
            habitId={habit.id}
            onSaved={(status) => {
              setRecording(false);
              setSaved(
                status === "done"
                  ? t("已记录这次确认。", "Completion saved.")
                  : t("已记录跳过。", "Skip saved."),
              );
            }}
          />
        ) : (
          <button className="button primary" onClick={() => setRecording(true)}>
            {t(state.demo ? "记一次尝试" : "补记这次尝试", "Log an attempt")}
          </button>
        ))}
      {saved && <p role="status">{saved}</p>}
      <details className="habit-exp">
        <summary>{t("做个小实验", "Try a short experiment")}</summary>
        <p>
          {t(
            "看看同一个生活时机是否方便。只记录你自己体验过的尝试。",
            "See how easily this moment fits. Log only what you actually try.",
          )}
        </p>
        {experiment && end ? (
          <>
            <p>
              {Date.now() < end
                ? t("进行中", "In progress")
                : t("本轮结束", "Finished")}{" "}
              ·{" "}
              {t(
                `${experiment.days} 天 · ${inExperiment.length} 次记录`,
                `${experiment.days} days · ${inExperiment.length} attempts`,
              )}
            </p>
            <p>
              {reported
                ? t(
                    `${reported} 次已评价，其中 ${easy} 次觉得容易。`,
                    `${reported} rated, ${easy} marked easy.`,
                  )
                : t("还没有足够的便利度记录。", "No ease ratings yet.")}
            </p>
          </>
        ) : null}
        {canRecord && (!end || Date.now() >= end) && (
          <div className="action-row">
            <select
              aria-label={t("实验天数", "Experiment duration")}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) as typeof days)}
            >
              <option value={3}>{t("3 天", "3 days")}</option>
              <option value={5}>{t("5 天", "5 days")}</option>
              <option value={7}>{t("7 天", "7 days")}</option>
            </select>
            <button
              className="button"
              disabled={busy}
              onClick={() =>
                void send({
                  type: "habit-experiment",
                  id: habit.id,
                  days,
                  at: Date.now(),
                })
              }
            >
              {t("开始实验", "Start experiment")}
            </button>
          </div>
        )}
      </details>
      {records.length > 0 && (
        <details className="habit-exp">
          <summary>{t("尝试记录", "Attempt history")}</summary>
          <ul>
            {records
              .slice(-10)
              .reverse()
              .map((a) => (
                <li key={a.id}>
                  {new Date(a.at).toLocaleDateString(locale, {
                    timeZone: life.timezone,
                  })}{" "}
                  ·{" "}
                  {a.status === "done"
                    ? a.selfInitiated
                      ? t("主动发起并完成", "Self-initiated and completed")
                      : t("确认完成", "Completed")
                    : t(
                        skipLabels[a.reason ?? "other"],
                        englishSkip[a.reason ?? "other"],
                      )}
                </li>
              ))}
          </ul>
        </details>
      )}
      {!habit.archived && (
        <button
          className="text-button"
          disabled={busy}
          onClick={() => void send({ type: "habit-archive", id: habit.id })}
        >
          {t("归档这个习惯", "Archive this habit")}
        </button>
      )}
    </article>
  );
}

export function HabitGarden() {
  const { t } = useLanguage();
  const { state, busy, send } = useStore();
  const life = activeLife(state);
  return (
    <>
      <PageTitle
        title={t("习惯花园", "My habits")}
        description={t(
          "把一次好用的尝试，放回同一个生活时机。",
          "Repeat a useful action at a moment that already fits your day.",
        )}
        action={
          <Link to="/progress" className="button">
            {t("查看活动记录", "Activity history")}
          </Link>
        }
      />
      {life.habits?.length ? (
        <div className="habit-grid">
          {[...life.habits]
            .sort((a, b) => Number(a.archived) - Number(b.archived))
            .map((habit) => (
              <HabitCard key={habit.id} habit={habit} life={life} />
            ))}
        </div>
      ) : (
        <section className="panel habit-empty">
          <Sprout size={30} />
          <h2>
            {t(
              "先找一件适合自己的小事",
              "Start with one small action that fits",
            )}
          </h2>
          <p>
            {t(
              "完成一次发现后，把当时的生活时机种成习惯。",
              "After trying an action, save that opportunity as a habit.",
            )}
          </p>
          <Link className="button primary" to="/explore">
            {t("去今日发现", "See my action plan")}
          </Link>
        </section>
      )}
      {state.demo &&
        life.habits?.some(
          (h) =>
            !h.archived &&
            life.cues?.some((c) => c.id === h.cueId && c.source === "example"),
        ) && (
          <div className="notice">
            <span>
              {t(
                "可查看独立演示中的模拟后续记录。",
                "Explore simulated follow-up records in the separate demo.",
              )}
            </span>
            <button
              className="button"
              disabled={
                busy ||
                life.attempts?.some((a) => a.id.startsWith("sim-history-"))
              }
              onClick={() =>
                void send({ type: "demo-habit-history", at: Date.now() })
              }
            >
              {t("加载模拟习惯记录", "Load sample habit records")}
            </button>
          </div>
        )}
    </>
  );
}
