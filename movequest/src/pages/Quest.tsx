import { localizedQuest, productText } from "../i18n/productContent";
import { useLanguage } from "../i18n/language";
import { activeLife } from "../life/model";
import { activityPolicy, fitsMovementLimits } from "../life/activities";
import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Pause,
  Play,
  RefreshCw,
  Sprout,
} from "lucide-react";
import { findQuest, quests, sceneInfo, safety } from "../data/content";
import { useStore } from "../state/Store";
import { GardenScene } from "../components/Art";
import { Meter, PageTitle } from "../components/UI";
import { findMove } from "../life/moveNow";
import { totalXP } from "../domain/engine";
export function QuestPage() {
  const { locale, t } = useLanguage();
  const { questId = "" } = useParams();
  const { state, send, owner } = useStore();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const seated = false;
  const [pending, setPending] = useState(false);
  const original = findQuest(questId);
  const quest = original && localizedQuest(original, locale);
  const own = state.ownMoves.find(
    (x) => x.id === questId && x.demo === state.demo,
  );
  const selected = state.sessions.find(
    (x) =>
      x.id === params.get("session") &&
      x.questId === questId &&
      x.demo === state.demo,
  );
  const session =
    selected ??
    state.sessions.findLast(
      (x) =>
        x.questId === questId &&
        x.demo === state.demo &&
        !["completed", "skipped"].includes(x.status),
    );
  const sessionId = session?.id;
  const isTicking = session?.status === "running" && session.owner === owner;
  useEffect(() => {
    if (!sessionId || !isTicking) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible")
        void send({ type: "tick", id: sessionId, owner, now: Date.now() });
    }, 250);
    const pause = () => {
      if (document.visibilityState === "hidden")
        void send({ type: "pause", id: sessionId });
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", pause);
      void send({ type: "pause", id: sessionId });
    };
  }, [sessionId, isTicking, owner, send]);
  if (findMove(questId) && !session)
    return (
      <Navigate replace to={`/movement?pick=${encodeURIComponent(questId)}`} />
    );
  if (
    quest &&
    !fitsMovementLimits(activityPolicy(quest), activeLife(state)) &&
    !session
  )
    return (
      <>
        <PageTitle
          title={t(
            "这项活动与你的行动设置不匹配",
            "This activity does not fit your settings",
          )}
          description={t(
            "可以调整设置，或选择适合当前情况的其他活动。",
            "Change your settings or choose another activity that fits.",
          )}
        />
        <Link className="button" to="/rhythm">
          {t("查看行动设置", "Review activity settings")}
        </Link>
      </>
    );
  if (!quest && !own)
    return (
      <>
        <PageTitle title={t("这个微动还没被发现", "Movement not found")} />
        <Link className="button primary" to="/explore">
          {t("回到探索", "Back to activities")}
        </Link>
      </>
    );
  const title = quest?.title ?? own!.title;
  const scene = quest?.scene ?? own!.scene;
  const seconds = quest?.seconds ?? own!.seconds;
  const steps = session?.seated
    ? [
        t(
          "坐在稳固的椅子上，双脚平放、有支撑。",
          "Sit in a stable chair with your feet flat and supported.",
        ),
        t(
          "在舒服范围内，轻松交替抬起脚跟再放下。",
          "Lift and lower one heel at a time in a comfortable range.",
        ),
        t(
          "放松双脚，有不适就停止。",
          "Relax your feet. Stop if you feel discomfort.",
        ),
      ]
    : (quest?.steps ?? [
        t("确认周围环境安全。", "Check that your surroundings are safe."),
        t(
          "按照自己的记录，舒服地活动。",
          "Follow your own movement plan at a comfortable pace.",
        ),
        t(
          "回到安全位置，再确认完成。",
          "Stop somewhere safe before confirming that you finished.",
        ),
      ]);
  const withPending = async (work: () => Promise<unknown>) => {
    setPending(true);
    try {
      await work();
    } finally {
      setPending(false);
    }
  };
  const start = () =>
    void withPending(async () => {
      const id = crypto.randomUUID();
      if (
        await send({
          type: "start",
          questId,
          id,
          owner,
          now: Date.now(),
          seated,
        })
      )
        setParams({ session: id });
    });
  const alternative =
    quests.find(
      (q) =>
        q.scene === scene && q.id !== questId && activityPolicy(q).eligible,
    ) ?? quests[0];
  const replace = () =>
    void withPending(async () => {
      if (session && !(await send({ type: "skip", id: session.id }))) return;
      navigate(`/quest/${alternative.id}`);
    });
  const timeLeft = session
    ? Math.max(0, Math.ceil((session.targetMs - session.elapsedMs) / 1000))
    : seconds;
  if (session?.status === "completed")
    return (
      <>
        <PageTitle
          title={t("小小的行动，已经发芽。", "Movement saved")}
          description={
            session.demo
              ? t(
                  "演示结果 · 模拟活动，未计入个人成长记录",
                  "Demo result · Simulated activity saved separately",
                )
              : t(
                  "这次活动由你确认完成，已保存在当前浏览器。",
                  "You confirmed this activity. It is saved in this browser.",
                )
          }
        />
        <div className="reward-layout">
          <section className="reward-panel panel">
            <div className="reward-mark">
              <Check size={30} />
            </div>
            <h2>{t(`完成了「${title}」`, `Completed: ${title}`)}</h2>
            <div className="reward-xp" data-testid="reward-xp">
              +{session.xp} <span>XP</span>
            </div>
            <p>
              {session.xp
                ? t(
                    "这份小努力，让花园又长大了一点。",
                    "Your garden has grown.",
                  )
                : t(
                    "今天已经领取过这项奖励。这次活动仍被认真记录。",
                    "You already earned this reward today. This activity has been recorded.",
                  )}
            </p>
            <GardenScene xp={totalXP(state)} />
            <div className="action-row">
              <Link
                className="button primary"
                to={`/learn?lesson=${quest?.lessonId ?? "everyday"}`}
              >
                {t("收下这张知识卡", "Open the knowledge card")}
                <ArrowRight size={17} />
              </Link>
              <Link className="button" to="/">
                {t("回到花园", "Back to the garden")}
              </Link>
            </div>
          </section>
          <aside className="panel reward-aside">
            <Sprout size={30} />
            <h2>
              {t("下一个机会，也许就在身边。", "Find another moment to move")}
            </h2>
            <p>
              {t(
                "刚才的活动，让你想到其他可以微动的时刻了吗？把自己的发现记下来。",
                "Did the activity bring another opportunity to mind? Record it for later.",
              )}
            </p>
            <Link className="text-link" to="/own-move">
              Create Your Own Move <ArrowRight size={16} />
            </Link>
            <Link className="text-link" to="/progress">
              {t("查看成长足迹", "View progress")}
              <ArrowRight size={16} />
            </Link>
          </aside>
        </div>
      </>
    );
  if (session?.status === "skipped")
    return (
      <>
        <PageTitle
          title={t("换个时刻，也没关系。", "Try another time")}
          description={t(
            "跳过不会扣分。你可以继续探索，或稍后再来。",
            "Skipping costs no points. Explore another activity or try again later.",
          )}
        />
        <div className="action-row">
          <button className="button primary" onClick={start}>
            {t("重新开始", "Start again")}
          </button>
          <Link className="button" to="/explore">
            {t("看看其他机会", "Explore other activities")}
          </Link>
        </div>
      </>
    );
  return (
    <>
      <Link className="back-link" to="/explore">
        <ArrowLeft size={16} />
        {t("返回发现微动", "Back to activities")}
      </Link>
      <PageTitle
        title={title}
        description={[
          questId.startsWith("routine-") &&
            t(
              "自然活动与休息组合 · 不计入运动分钟",
              "Movement and rest combination · Excluded from movement minutes",
            ),
          t(sceneInfo[scene].name, sceneInfo[scene].en),
          t(`${seconds / 60} 分钟`, `${seconds / 60} min`),
          quest?.kind === "steps"
            ? t(
                "步骤引导 · 时长为自报估计",
                "Step-by-step · Self-reported time",
              )
            : t("轻松计时", "Timed"),
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <div className="quest-layout">
        <section className="panel quest-main">
          {!session ? (
            <>
              <span className="meta">
                {t("现在的情境", "When to try this")}
              </span>
              <h2>{quest?.context ?? own!.context}</h2>
              <p className="quest-description">
                {quest?.description ??
                  t(
                    "这是你发现的活动机会。确认环境安全后，按自己的节奏轻动。",
                    "This is your own activity. Check that the environment is safe and move at a comfortable pace.",
                  )}
              </p>
              <div className="advice-box">
                <h3>{t("你可以这样开始", "How to start")}</h3>
                <ol>
                  {(seated
                    ? [
                        t(
                          "坐稳，双脚有支撑。",
                          "Sit securely with your feet supported.",
                        ),
                        t(
                          "轻轻交替抬起脚跟，再落下。",
                          "Gently lift and lower one heel at a time.",
                        ),
                        t(
                          "在舒服范围内活动，随时可以停下。",
                          "Stay within a comfortable range and stop whenever you like.",
                        ),
                      ]
                    : steps
                  ).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
              <p className="fineprint">
                {t(
                  "不方便走动时，可以跳过，或去动作库选择坐姿活动。",
                  "If walking is inconvenient, skip this activity or choose a seated one in the library.",
                )}
              </p>
              <button
                className="button primary wide"
                onClick={start}
                disabled={pending}
              >
                <Play size={17} />
                {quest?.kind === "steps"
                  ? t("开始步骤引导", "Start step-by-step guide")
                  : t("开始计时", "Start timer")}
              </button>
              <button className="text-button wide" onClick={replace}>
                <RefreshCw size={15} />
                {t("换个微动", "Choose another activity")}
              </button>
            </>
          ) : (
            <>
              <div className="section-heading">
                <span className="badge">
                  {session.status === "ready"
                    ? t("可以确认完成", "Ready to confirm")
                    : isTicking
                      ? t("正在轻动", "In progress")
                      : session.status === "running"
                        ? t("在另一页面计时", "Running in another tab")
                        : t("已暂停", "Paused")}
                </span>
                <span className="meta">
                  {session.seated
                    ? t("坐姿替代", "Seated alternative")
                    : t("按建议活动", "Suggested activity")}
                </span>
              </div>
              {session.kind === "timer" ? (
                <>
                  <div
                    className="timer"
                    role="timer"
                    aria-label={t("剩余时间", "Time left")}
                    data-testid="timer"
                  >
                    {String(Math.floor(timeLeft / 60)).padStart(2, "0")}
                    <span>:</span>
                    {String(timeLeft % 60).padStart(2, "0")}
                  </div>
                  <p className="timer-caption">
                    {session.status === "ready"
                      ? t(
                          "计时结束。如果确实完成了活动，再确认记录。",
                          "The timer has ended. Confirm if you finished the activity.",
                        )
                      : t(
                          "收起手机，按自己的节奏。离开本页或切到后台会暂停。",
                          "Put your phone away and move at your own pace. The timer pauses if you leave the page or switch tabs.",
                        )}
                  </p>
                  <Meter
                    label={t("活动计时进度", "Activity timer progress")}
                    value={session.elapsedMs}
                    max={session.targetMs}
                  />
                  <div className="action-row timer-actions">
                    {session.status === "running" && (
                      <button
                        className="button"
                        onClick={() =>
                          void send({ type: "pause", id: session.id })
                        }
                      >
                        <Pause size={17} />
                        {t("暂停", "Pause")}
                      </button>
                    )}
                    {session.status === "paused" && (
                      <button
                        className="button primary"
                        onClick={() =>
                          void send({
                            type: "resume",
                            id: session.id,
                            owner,
                            now: Date.now(),
                          })
                        }
                      >
                        <Play size={17} />
                        {t("继续计时", "Resume timer")}
                      </button>
                    )}
                    {session.status === "running" && !isTicking && (
                      <button
                        className="button"
                        onClick={() =>
                          void send({ type: "pause", id: session.id })
                        }
                      >
                        {t("暂停并转到此页", "Pause and continue here")}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="step-list">
                  {steps.map((step, index) => (
                    <div
                      key={step}
                      className={`guide-step ${session.steps > index ? "done" : ""}`}
                    >
                      <span className="step-number">
                        {session.steps > index ? (
                          <Check size={17} />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div>
                        <p>{step}</p>
                        {index === session.steps &&
                          session.status !== "ready" && (
                            <button
                              className="button"
                              disabled={pending}
                              onClick={() =>
                                void send({
                                  type: "step",
                                  id: session.id,
                                  index,
                                })
                              }
                            >
                              {t("这一步完成了", "Step complete")}
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                  <p className="fineprint">
                    {t(
                      "步骤任务为用户自报完成，记录参考时长",
                      "Confirm the completed steps. The displayed duration is an estimate.",
                    )}{" "}
                    {session.demo
                      ? t("3 秒（演示）", "3 seconds (demo)")
                      : t(`${seconds / 60} 分钟`, `${seconds / 60} min`)}
                  </p>
                </div>
              )}
              {session.kind === "timer" && (
                <div className="advice-box">
                  <h3>{t("轻动提示", "Movement tips")}</h3>
                  <p>{steps[1]}</p>
                </div>
              )}
              <button
                className="button primary wide"
                disabled={pending || session.status !== "ready"}
                onClick={() =>
                  void withPending(() =>
                    send({ type: "complete", id: session.id, now: Date.now() }),
                  )
                }
              >
                <Check size={18} />
                {t("我已完成，确认记录", "I finished. Save my record")}
              </button>
              <p className="fineprint">
                {session.status !== "ready"
                  ? t(
                      "完成计时或全部步骤后才可确认。",
                      "Confirm after the timer or all steps are complete.",
                    )
                  : t(
                      "由你确认完成；设备没有检测你的动作。",
                      "The app relies on your confirmation to record movement.",
                    )}
              </p>
              <div className="secondary-actions">
                <button
                  className="text-button"
                  onClick={() => void send({ type: "skip", id: session.id })}
                >
                  {t("今天先跳过", "Skip for today")}
                </button>
                <button className="text-button" onClick={replace}>
                  {t("替换任务", "Choose another task")}
                </button>
              </div>
            </>
          )}
        </section>
        <aside className="quest-side">
          <section className="panel">
            <Clock3 size={23} />
            <h2>{t("一点点，也算数。", "Every movement counts")}</h2>
            <p>
              {state.demo
                ? t(
                    "演示模式将计时缩短到 3 秒；这次活动和奖励只进入演示空间。",
                    "The demo uses a 3-second timer and saves rewards to the demo space.",
                  )
                : questId.startsWith("rest-")
                  ? t(
                      "自报休息完成 +5 XP；不计入运动分钟。",
                      "Confirming a rest earns 5 XP. It does not add movement minutes.",
                    )
                  : t(
                      "完成活动 +20 XP；同一任务每天奖励一次。重复活动可以记录，重复确认不会多领积分。",
                      "A completed activity earns 20 XP once per day. Repeat sessions still count toward your activity history.",
                    )}
            </p>
            <div className="safety-note">{productText(safety, locale)}</div>
          </section>
          <div className="quiet-note">
            {t(
              "你的花园不会因为休息而枯萎。",
              "Your garden stays the same when you rest.",
            )}
            <br />
            {t("今天，按自己的节奏来。", "Move at your own pace today.")}
          </div>
        </aside>
      </div>
    </>
  );
}
