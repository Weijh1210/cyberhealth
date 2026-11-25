import { useLanguage } from "../i18n/language";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageTitle } from "../components/UI";
import { useStore } from "../state/Store";
import { clockAt, activeLife } from "../life/model";
import { quests } from "../data/content";
import { activityPolicy } from "../life/activities";
export function Rhythm() {
  const { t } = useLanguage();
  const { state, send, busy } = useStore(),
    life = activeLife(state);
  const [settings, setSettings] = useState(life.settings),
    [timezone, setTimezone] = useState(life.timezone),
    [message, setMessage] = useState("");
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
          <h2>系统正在怎样学习</h2>
          <p>
            自然活动优先；同类拒绝以 14
            天衰减降权，单项拒绝另行降权。“现在不想”暂停 10 分钟，“30
            分钟后”暂停 30 分钟。“以后不推荐”持续排除。
          </p>
          <dl className="feedback-stats">
            <div>
              <dt>已展示机会</dt>
              <dd>
                {
                  (life.impressions ?? []).filter((i) => i.demo === state.demo)
                    .length
                }
              </dd>
            </div>
            <div>
              <dt>已记录反馈</dt>
              <dd>{history.length}</dd>
            </div>
            <div>
              <dt>拒绝或排除</dt>
              <dd>{rejected.length}</dd>
            </div>
            <div>
              <dt>自报休息完成</dt>
              <dd>{rest.length}</dd>
            </div>
          </dl>
          <p>
            休息不计入运动分钟。开始活动不等于完成；活动计时结束后仍需你确认。没有数据时，不推测你的健康变化。
          </p>
          <button
            className="button"
            disabled={busy || !history.length}
            onClick={async () => {
              if (await send({ type: "life-reset" }))
                setMessage("推荐偏好已重置。活动完成记录与生活日程保留。");
            }}
          >
            重置推荐偏好与排除项
          </button>
          <Link to="/profile" className="text-link">
            导出或删除我的数据
          </Link>
        </section>
      </div>
      <section className="panel section-spaced">
        <h2>反馈记录</h2>
        {!history.length ? (
          <p>
            还在认识你的节奏。到城镇选择一个机会，反馈会真实改变下一次排序。
          </p>
        ) : (
          <div className="feedback-history">
            {history
              .slice(-30)
              .reverse()
              .map((f) => (
                <div key={f.id}>
                  <time>
                    {new Date(f.at).toLocaleString("zh-CN", {
                      timeZone: life.timezone,
                    })}
                  </time>
                  <strong>
                    {quests.find((q) => q.id === f.activityId)?.title ??
                      f.activityId}
                  </strong>
                  <span>
                    {
                      {
                        interested: "感兴趣",
                        started: "开始",
                        completed: "自报完成",
                        not_now: "现在不想",
                        remind_later: "稍后提醒",
                        not_suitable: "不适合",
                        too_repetitive: "太重复",
                        never_recommend: "永久排除",
                      }[f.type]
                    }{" "}
                    · {f.category}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>
      <section className="panel section-spaced">
        <h2>活动条件与来源</h2>
        <p>查看公开活动的适用条件与来源。</p>
        <div className="catalog">
          {quests
            .filter((q) => activityPolicy(q).eligible)
            .map((q) => {
              const policy = activityPolicy(q);
              return (
                <details key={q.id}>
                  <summary>
                    {q.title} ·{" "}
                    {policy.category === "guided"
                      ? "引导动作 / 来源核对"
                      : "日常建议 / 编辑核对"}
                  </summary>
                  <p>
                    类型：{policy.category} · 层级 {policy.level} · {q.seconds}{" "}
                    秒 · 场景：{q.scene}
                  </p>
                  <p>
                    场地：{policy.space} · 设备：
                    {policy.equipment.join("、") || "无"} · 走动：
                    {policy.walking ? "需要" : "不需要"}
                  </p>
                  <p>{policy.cautions}</p>
                  <p>
                    来源：{policy.source} · 核对日期：
                    {policy.reviewDate} · 核对者：
                    {policy.reviewer}
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
        setMessage("意向已登记到服务端。没有扣款，也没有开通订阅。");
    } catch {
      if (
        await send({
          type: "life-interest",
          interest: { price, at: Date.now(), status: "local" },
        })
      )
        setMessage(
          "服务端暂不可用。仅保存本机意向，可在偏好页导出；邮箱未保存，不会收到联系。",
        );
    } finally {
      setPending(false);
    }
  };
  return (
    <>
      <PageTitle
        title="为你的小世界，留一点想象。"
        description="MoveQuest Plus · 正在验证的会员方案"
        action={
          <Link className="button" to="/">
            回到城镇
          </Link>
        }
      />
      <div className="pricing-layout">
        <section className="panel form-stack">
          <h2>Free，日常一直在。</h2>
          <p>
            生活资料、程序化城镇、活动机会、偏好学习、基础装饰、活动记录、数据导出和全部隐私控制均可使用。
          </p>
          <h2>Plus，未来的更多可能。</h2>
          <p>
            计划探索更多世界主题、装饰与高级洞察。这些权益尚未上线，登记不会解锁虚拟会员。
          </p>
          <p>当前订阅：Free · 无有效付费订阅。</p>
          <Link className="button" to="/life">
            继续探索我的生活
          </Link>
        </section>
        <form className="panel form-stack" onSubmit={(e) => void register(e)}>
          <h2>登记 Plus 意向</h2>
          <div className="price">
            ¥{price}
            <span> / 年 · 实验价格</span>
          </div>
          <p>这是产品假设，不是购买页面。当前没有支付接入，不收款。</p>
          <label>
            联系邮箱
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
            我同意仅为 Plus 上线通知登记邮箱与价格意向
          </label>
          <button
            className="button primary"
            disabled={!consent || pending || busy}
          >
            {pending ? "正在登记…" : "提交意向（不付款）"}
          </button>
          <p role="status">{message}</p>
          {life.interest && (
            <p>
              已有
              {life.interest.status === "registered"
                ? "服务端登记"
                : "本机意向"}{" "}
              · ¥{life.interest.price} / 年 ·{" "}
              {clockAt(life.interest.at, life.timezone).day}
            </p>
          )}
        </form>
      </div>
    </>
  );
}
