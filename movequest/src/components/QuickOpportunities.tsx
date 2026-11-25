import { useLanguage } from "../i18n/language";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { activeLife } from "../life/model";
import { useStore } from "../state/Store";

const english: Record<string, string> = {
  下课后: "After class",
  通勤路上: "On my commute",
  看完视频: "After a video",
  把复盘放到离开教室的路上: "Review on the way out of class",
  给熟悉路线留一个可折返的拐点: "Pick a turnaround point on a familiar route",
  "下一条视频前，顺手归位一件轻物": "Put one light item away between videos",
  "在原本就要走的路上，手机先放口袋，回想一个刚学到的关键词。需要留意路况时，先专心走。":
    "Pocket your phone and recall one thing you just learned while walking somewhere you already planned to go. Give the route your full attention when it needs it.",
  "挑一趟不赶时间的通勤，在本来就要走、且你确认安全的路上，多走到下一个熟悉地标就折返。":
    "On an unhurried commute, try walking to the next familiar landmark and back along a route you already know is safe.",
  "如果手边本来就有要收的轻物，趁这一条播完顺手归位，再决定要不要继续看。坐着也可以。":
    "When a video ends, put away a light item that is already within reach. You can do this seated.",
  "适合本来就要步行去下一站的人，不用特意绕路。":
    "This fits a trip you were already going to make on foot.",
  "适合已经有一段步行的行程。赶时间就按原路线。":
    "This fits a commute with an existing walk. In a hurry, stick to your usual route.",
  "物品要轻巧、伸手可及。不用为了做这件事找东西。":
    "Keep it light and within reach. Skip it if there’s nothing handy.",
};
const situations = [
  {
    label: "下课后",
    title: "把复盘放到离开教室的路上",
    idea: "在原本就要走的路上，手机先放口袋，回想一个刚学到的关键词。需要留意路况时，先专心走。",
    fit: "适合本来就要步行去下一站的人，不用特意绕路。",
    walking: true,
  },
  {
    label: "通勤路上",
    title: "给熟悉路线留一个可折返的拐点",
    idea: "挑一趟不赶时间的通勤，在本来就要走、且你确认安全的路上，多走到下一个熟悉地标就折返。",
    fit: "适合已经有一段步行的行程。赶时间就按原路线。",
    walking: true,
  },
  {
    label: "看完视频",
    title: "下一条视频前，顺手归位一件轻物",
    idea: "如果手边本来就有要收的轻物，趁这一条播完顺手归位，再决定要不要继续看。坐着也可以。",
    fit: "物品要轻巧、伸手可及。不用为了做这件事找东西。",
    walking: false,
  },
] as const;

export function QuickOpportunities({
  inlineChat = false,
}: {
  inlineChat?: boolean;
}) {
  const { t } = useLanguage();
  const { state } = useStore();
  const life = activeLife(state);
  const [choice, setChoice] = useState<number | null>(null);
  const canWalk =
    life.settings.walking &&
    life.settings.standing &&
    life.constraints?.walkingAllowed !== false &&
    life.constraints?.standingAllowed !== false;
  const shown = situations.filter((s) => canWalk || !s.walking);
  const selected = choice === null ? undefined : shown[choice];
  return (
    <section
      className="panel quick-opportunities"
      aria-label={t(
        "快速查看生活里的运动机会",
        "Browse everyday movement ideas",
      )}
    >
      <h2>{t("看看生活里的运动机会", "Browse movement ideas")}</h2>
      <p>
        {t(
          "点一个像你今天的场景。",
          "Pick a moment that sounds like your day.",
        )}
      </p>
      <div className="quick-situations">
        {shown.map((s, i) => (
          <button
            key={t(s.label, english[s.label])}
            className="button"
            type="button"
            aria-pressed={choice === i}
            onClick={() => setChoice(i)}
          >
            {t(s.label, english[s.label])}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {selected && (
          <article className="quick-idea">
            <h3>{t(selected.title, english[selected.title])}</h3>
            <p>{t(selected.idea, english[selected.idea])}</p>
            <p className="fineprint">
              {t(selected.fit, english[selected.fit])}
            </p>
            {inlineChat ? (
              <a className="text-link" href="#life-description">
                {t("按我的情况调整", "Fit this to my day")}{" "}
                <ArrowRight size={15} />
              </a>
            ) : (
              <Link className="text-link" to="/life#life-description">
                {t("按我的情况调整", "Fit this to my day")}{" "}
                <ArrowRight size={15} />
              </Link>
            )}
          </article>
        )}
      </div>
    </section>
  );
}
