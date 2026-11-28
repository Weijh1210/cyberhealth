import { localizedQuest } from "../i18n/productContent";
import { useLanguage } from "../i18n/language";
import { activityPolicy } from "../life/activities";
import { ArrowUpRight, Clock3, Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import type { Quest } from "../domain/types";
import { localDay } from "../domain/engine";
import { sceneInfo } from "../data/content";
import { useStore } from "../state/Store";
export function Brand() {
  const { t } = useLanguage();
  return (
    <Link
      className="brand"
      to="/"
      aria-label={t("MoveQuest 首页", "MoveQuest home")}
    >
      <Sprout size={30} strokeWidth={1.8} />
      <span>
        MoveQuest<small>{t("微动冒险", "Everyday movement")}</small>
      </span>
    </Link>
  );
}
export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function QuestCard({ quest }: { quest: Quest }) {
  const { locale, t } = useLanguage();
  const display = localizedQuest(quest, locale);
  const { state } = useStore();
  const done = state.sessions.some(
    (s) =>
      s.questId === quest.id &&
      s.demo === state.demo &&
      s.status === "completed" &&
      s.day === localDay(Date.now()),
  );
  if (!activityPolicy(quest).eligible) return null;
  return (
    <Link to={`/quest/${quest.id}`} className="quest-card">
      <div className="flex items-center justify-between gap-2">
        <span className="meta">
          {t(sceneInfo[quest.scene].name, sceneInfo[quest.scene].en)} ·{" "}
          {quest.kind === "steps"
            ? t("步骤引导", "Step-by-step")
            : t("轻松计时", "Timed")}
        </span>
        <span className="xp-label">
          {done
            ? t("今日已获奖励", "Reward earned today")
            : quest.id.startsWith("rest-")
              ? t("+5 XP · 休息", "+5 XP · Rest")
              : "+20 XP"}
        </span>
      </div>
      <h3>{display.title}</h3>
      <p>{display.context}</p>
      <div className="card-foot">
        <span>
          <Clock3 size={14} />
          {quest.seconds / 60} {t("分钟", "minutes")}
        </span>
        <ArrowUpRight size={20} />
      </div>
    </Link>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function Meter({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  return (
    <div
      className="meter"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <span
        style={{ width: `${Math.min(100, Math.max(0, (value / max) * 100))}%` }}
      />
    </div>
  );
}
