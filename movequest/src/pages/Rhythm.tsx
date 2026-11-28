import { productText, questTitle } from "../i18n/productContent";
import { findMove } from "../life/moveNow";
import { sceneInfo } from "../data/content";
import { useLanguage } from "../i18n/language";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageTitle } from "../components/UI";
import { useStore } from "../state/Store";
import { clockAt, activeLife } from "../life/model";
import { quests } from "../data/content";
import { activityPolicy } from "../life/activities";
export function Rhythm() {
  const { locale, t } = useLanguage();
  const { state, send, busy } = useStore(),
    life = activeLife(state);
  const [settings, setSettings] = useState(life.settings),
    [timezone, setTimezone] = useState(life.timezone),
    [message, setMessage] = useState("");
  const titles = new Map(
    quests.map((quest) => [quest.id, questTitle(quest, locale)]),
  );
  const history = life.feedback.filter((f) => f.demo === state.demo);
  const rejected = history.filter((f) =>
    ["not_suitable", "too_repetitive", "never_recommend"].includes(f.type),
  );
  const rest = state.sessions.filter(
    (s) =>
      s.demo === state.demo &&
      s.status === "completed" &&
      s.questId.startsWith("rest-"),
  );
  const categoryName = (category: string) =>
    ({
      natural: t("日常活动", "Everyday movement"),
      guided: t("引导活动", "Guided movement"),
      rest: t("休息", "Rest"),
      routine: t("组合活动", "Combined routine"),
    })[category] ?? category;
  const equipmentName = (item: string) =>
    ({
      chair: t("稳固无轮椅", "Stable, non-wheeled chair"),
      wall: t("稳固墙面", "Solid wall"),
      counter: t("台面和布", "Surface and cloth"),
    })[item] ?? productText(item, locale);
  return (
    <>
      <PageTitle
        title={t("找到适合你的节奏。", "Activity limits")}
        description={t(
          "日程来自你的描述，偏好来自你的真实反馈。",
          "Manage your routine, limits and feedback.",
        )}
        action={
          <Link className="button" to="/">
            {t("返回城镇", "Back to my town")}
          </Link>
        }
      />
      <div className="rhythm-layout">
        <form
          className="panel form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
              if (await send({ type: "life-settings", settings, timezone }))
                setMessage(t("节奏设置已保存。", "Settings saved."));
            } catch {
              setMessage(
                t(
                  "时区无效，请输入如 Asia/Shanghai 的 IANA 时区。",
                  "Enter a valid IANA time zone such as Asia/Shanghai.",
                ),
              );
            }
          }}
        >
          <h2>{t("推荐边界", "Recommendation settings")}</h2>
          {(
            [
              ["enabled", t("开启地图机会", "Show opportunities on the map")],
              ["walking", t("可以走动", "Allow walking")],
              ["standing", t("可以站立", "Allow standing")],
            ] as const
          ).map(([key, label]) => (
            <label className="inline-check" key={key}>
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, [key]: e.target.checked }))
                }
              />
              {label}
            </label>
          ))}
          <div className="form-pair">
            <label>
              {t("静默开始", "Quiet hours start")}
              <input
                type="time"
                required
                value={settings.quietStart}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, quietStart: e.target.value }))
                }
              />
            </label>
            <label>
              {t("静默结束", "Quiet hours end")}
              <input
                type="time"
                required
                value={settings.quietEnd}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, quietEnd: e.target.value }))
                }
              />
            </label>
          </div>
          <label>
            {t("每天最多接受的机会数", "Daily opportunity limit")}
            <input
              type="number"
              min={0}
              max={30}
              required
              value={settings.dailyCap}
              onChange={(e) =>
                setSettings((s) => ({ ...s, dailyCap: Number(e.target.value) }))
              }
            />
          </label>
          <label>
            {t("生活时区", "Time zone")}
            <input
              required
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </label>
          <p>
            {t(
              "静默起止相同表示全天不静默。忙碌日程不自动推荐；手动选择场景代表你主动开启的空闲。",
              "Set the same start and end to turn quiet hours off. Busy periods block automatic suggestions.",
            )}
          </p>
          <button className="button primary" disabled={busy}>
            {t("保存节奏", "Save settings")}
          </button>
          <p role="status">{message}</p>
        </form>
        <section className="panel form-stack">
          <h2>{t("系统正在怎样学习", "How recommendations adapt")}</h2>
          <p>
            {t(
              "自然活动优先；同类拒绝以 14 天衰减降权，单项拒绝另行降权。“现在不想”暂停 10 分钟，“30 分钟后”暂停 30 分钟。“以后不推荐”持续排除。",
              "Everyday activities come first. Skipping similar activities lowers their ranking for up to 14 days. Not now hides a suggestion for 10 minutes, Remind me later hides it for 30 minutes, and Never recommend hides it indefinitely.",
            )}
          </p>
          <dl className="feedback-stats">
            <div>
              <dt>{t("已展示机会", "Suggestions shown")}</dt>
              <dd>
                {
                  (life.impressions ?? []).filter((i) => i.demo === state.demo)
                    .length
                }
              </dd>
            </div>
            <div>
              <dt>{t("已记录反馈", "Feedback submitted")}</dt>
              <dd>{history.length}</dd>
            </div>
            <div>
              <dt>{t("拒绝或排除", "Skipped or excluded")}</dt>
              <dd>{rejected.length}</dd>
            </div>
            <div>
              <dt>{t("自报休息完成", "Self-reported rests")}</dt>
              <dd>{rest.length}</dd>
            </div>
          </dl>
          <p>
            {t(
              "休息不计入运动分钟。开始活动不等于完成；活动计时结束后仍需你确认。没有数据时，不推测你的健康变化。",
              "Rest does not count toward activity minutes. Confirm that you finished after the timer ends. These records do not measure health changes.",
            )}
          </p>
          <button
            className="button"
            disabled={busy || !history.length}
            onClick={async () => {
              if (await send({ type: "life-reset" }))
                setMessage(
                  t(
                    "推荐偏好已重置。活动完成记录与生活日程保留。",
                    "Recommendation preferences reset. Completed activities and routines are still saved.",
                  ),
                );
            }}
          >
            {t("重置推荐偏好与排除项", "Reset recommendations and exclusions")}
          </button>
          <Link to="/profile" className="text-link">
            {t("导出或删除我的数据", "Export or delete my data")}
          </Link>
        </section>
      </div>
      <section className="panel section-spaced">
        <h2>{t("反馈记录", "Feedback history")}</h2>
        {!history.length ? (
          <p>
            {t(
              "还在认识你的节奏。到城镇选择一个机会，反馈会真实改变下一次排序。",
              "Explore a suggestion in your town. Your feedback helps rank future suggestions.",
            )}
          </p>
        ) : (
          <div className="feedback-history">
            {history
              .slice(-30)
              .reverse()
              .map((f) => (
                <div key={f.id}>
                  <time>
                    {new Date(f.at).toLocaleString(locale, {
                      timeZone: life.timezone,
                    })}
                  </time>
                  <strong>{titles.get(f.activityId) ?? f.activityId}</strong>
                  <span>
                    {
                      {
                        interested: t("感兴趣", "Interested"),
                        started: t("开始", "Started"),
                        completed: t("自报完成", "Self-reported completion"),
                        not_now: t("现在不想", "Not now"),
                        remind_later: t("稍后提醒", "Remind me later"),
                        not_suitable: t("不适合", "Unsuitable"),
                        too_repetitive: t("太重复", "Too repetitive"),
                        never_recommend: t("永久排除", "Never recommend"),
                      }[f.type]
                    }{" "}
                    · {categoryName(f.category)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>
      <section className="panel section-spaced">
        <h2>{t("活动条件与来源", "Activity requirements and sources")}</h2>
        <p>
          {t(
            "查看公开活动的适用条件与来源。",
            "Review the requirements and sources for published activities.",
          )}
        </p>
        <div className="catalog">
          {quests
            .filter((q) => activityPolicy(q).eligible)
            .map((q) => {
              const policy = activityPolicy(q);
              return (
                <details key={q.id}>
                  <summary>
                    {questTitle(q, locale)} ·{" "}
                    {policy.category === "guided"
                      ? t(
                          "引导动作 / 来源核对",
                          "Guided activity / Source checked",
                        )
                      : t(
                          "日常建议 / 编辑核对",
                          "Everyday activity / Editorially checked",
                        )}
                  </summary>
                  <p>
                    {categoryName(policy.category)} ·{" "}
                    {t(`层级 ${policy.level}`, `Level ${policy.level}`)} ·{" "}
                    {t(`${q.seconds} 秒`, `${q.seconds} sec`)} ·{" "}
                    {t(sceneInfo[q.scene].name, sceneInfo[q.scene].en)}
                  </p>
                  <p>
                    {policy.space === "seat"
                      ? t("原位空间", "Compact space")
                      : t("空旷场地", "Clear space")}{" "}
                    ·{" "}
                    {policy.equipment.map(equipmentName).join(t("、", ", ")) ||
                      t("无需器材", "No equipment")}{" "}
                    ·{" "}
                    {policy.walking
                      ? t("需要步行", "Requires walking")
                      : t("无需步行", "No walking required")}
                  </p>
                  <p>
                    {findMove(q.id)?.safety[locale === "en" ? 1 : 0] ??
                      productText(policy.cautions, locale)}
                  </p>
                  <p>
                    {t("来源", "Source")} · {productText(policy.source, locale)}{" "}
                    · {t("核对日期", "Reviewed")} {policy.reviewDate} ·{" "}
                    {productText(policy.reviewer, locale)}
                  </p>
                </details>
              );
            })}
        </div>
      </section>
    </>
  );
}
export function Pricing() {
  const { t } = useLanguage();
  const { state, send, busy } = useStore();
  const life = activeLife(state);
  const price = [69, 99, 149][life.seed % 3];
  const [email, setEmail] = useState(""),
    [consent, setConsent] = useState(false),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState(false);
  const register = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, price, consent: true }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw Error();
      if (
        await send({
          type: "life-interest",
          interest: { price, at: Date.now(), status: "registered" },
        })
      )
        setMessage(
          t(
            "意向已登记到服务端。没有扣款，也没有开通订阅。",
            "Interest registered. No payment was taken and no subscription was created.",
          ),
        );
    } catch {
      if (
        await send({
          type: "life-interest",
          interest: { price, at: Date.now(), status: "local" },
        })
      )
        setMessage(
          t(
            "服务端暂不可用。仅保存本机意向，可在偏好页导出；邮箱未保存，不会收到联系。",
            "The service is unavailable. Your interest is saved locally and can be exported in Preferences. Your email was not saved.",
          ),
        );
    } finally {
      setPending(false);
    }
  };
  return (
    <>
      <PageTitle
        title={t("为你的小世界，留一点想象。", "Explore MoveQuest Plus")}
        description={t(
          "MoveQuest Plus · 正在验证的会员方案",
          "MoveQuest Plus · Proposed membership",
        )}
        action={
          <Link className="button" to="/">
            {t("回到城镇", "Back to my town")}
          </Link>
        }
      />
      <div className="pricing-layout">
        <section className="panel form-stack">
          <h2>{t("Free，日常一直在。", "Free")}</h2>
          <p>
            {t(
              "生活资料、程序化城镇、活动机会、偏好学习、基础装饰、活动记录、数据导出和全部隐私控制均可使用。",
              "Includes routines, a personal town, movement suggestions, preferences, basic decorations, activity records, data export and privacy controls.",
            )}
          </p>
          <h2>{t("Plus，未来的更多可能。", "Plus")}</h2>
          <p>
            {t(
              "计划探索更多世界主题、装饰与高级洞察。这些权益尚未上线，登记不会解锁虚拟会员。",
              "Proposed benefits include additional town themes, decorations and insights. Register interest to hear if Plus launches.",
            )}
          </p>
          <p>{t("当前订阅：Free · 无有效付费订阅。", "Current plan: Free")}</p>
          <Link className="button" to="/life">
            {t("继续探索我的生活", "Keep exploring my routines")}
          </Link>
        </section>
        <form className="panel form-stack" onSubmit={(e) => void register(e)}>
          <h2>{t("登记 Plus 意向", "Register interest in Plus")}</h2>
          <div className="price">
            ¥{price}
            <span> {t("/ 年 · 实验价格", "/ year · Proposed price")}</span>
          </div>
          <p>
            {t(
              "这是产品假设，不是购买页面。当前没有支付接入，不收款。",
              "This form registers interest. No payment is collected.",
            )}
          </p>
          <label>
            {t("联系邮箱", "Contact email")}
            <input
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="inline-check">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            {t(
              "我同意仅为 Plus 上线通知登记邮箱与价格意向",
              "I agree to share my email and price preference for Plus launch updates.",
            )}
          </label>
          <button
            className="button primary"
            disabled={!consent || pending || busy}
          >
            {pending
              ? t("正在登记…", "Registering…")
              : t("提交意向（不付款）", "Register interest (free)")}
          </button>
          <p role="status">{message}</p>
          {life.interest && (
            <p>
              {life.interest.status === "registered"
                ? t("服务端登记", "Registered online")
                : t("本机意向", "Saved locally")}{" "}
              ·{" "}
              {t(
                `¥${life.interest.price} / 年`,
                `¥${life.interest.price} / year`,
              )}{" "}
              · {clockAt(life.interest.at, life.timezone).day}
            </p>
          )}
        </form>
      </div>
    </>
  );
}
