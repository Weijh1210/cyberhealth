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
    <Link className="brand" to="/" aria-label="MoveQuest 首页">
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
          {sceneInfo[quest.scene].name} ·{" "}
          {quest.kind === "steps" ? "步骤引导" : "轻松计时"}
        </span>
        <span className="xp-label">
          {done
            ? "今日已获奖励"
            : quest.id.startsWith("rest-")
              ? "+5 XP · 休息"
              : "+20 XP"}
        </span>
      </div>
      <h3>{quest.title}</h3>
      <p>{quest.context}</p>
      <div className="card-foot">
        <span>
          <Clock3 size={14} />
          {quest.seconds / 60} 分钟
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
