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
  const { questId = "" } = useParams();
  const { state, send, owner } = useStore();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const seated = false;
  const [pending, setPending] = useState(false);
  const quest = findQuest(questId);
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
          title="这项活动与你的行动设置不匹配"
          description="可以调整设置，或选择适合当前情况的其他活动。"
        />
        <Link className="button" to="/rhythm">
          查看行动设置
        </Link>
      </>
    );
  if (!quest && !own)
    return (
      <>
        <PageTitle title="这个微动还没被发现" />
        <Link className="button primary" to="/explore">
          回到探索
        </Link>
      </>
    );
  const title = quest?.title ?? own!.title;
  const scene = quest?.scene ?? own!.scene;
  const seconds = quest?.seconds ?? own!.seconds;
  const steps = session?.seated
    ? [
        "坐在稳固的椅子上，双脚平放、有支撑。",
        "在舒服范围内，轻松交替抬起脚跟再放下。",
        "放松双脚，有不适就停止。",
      ]
    : (quest?.steps ?? [
        "确认周围环境安全。",
        "按照自己的记录，舒服地活动。",
        "回到安全位置，再确认完成。",
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
          title="小小的行动，已经发芽。"
          description={
            session.demo
              ? "演示结果 · 模拟活动，未计入个人成长记录"
              : "这次活动由你确认完成，已保存在当前浏览器。"
          }
        />
        <div className="reward-layout">
          <section className="reward-panel panel">
            <div className="reward-mark">
              <Check size={30} />
            </div>
            <h2>完成了「{title}」</h2>
            <div className="reward-xp" data-testid="reward-xp">
              +{session.xp} <span>XP</span>
            </div>
            <p>
              {session.xp
                ? "这份小努力，让花园又长大了一点。"
                : "今天已经领取过这项奖励。这次活动仍被认真记录。"}
            </p>
            <GardenScene xp={totalXP(state)} />
            <div className="action-row">
              <Link
                className="button primary"
                to={`/learn?lesson=${quest?.lessonId ?? "everyday"}`}
              >
                收下这张知识卡 <ArrowRight size={17} />
              </Link>
              <Link className="button" to="/">
                回到花园
              </Link>
            </div>
          </section>
          <aside className="panel reward-aside">
            <Sprout size={30} />
            <h2>下一个机会，也许就在身边。</h2>
            <p>
              刚才的活动，让你想到其他可以微动的时刻了吗？把自己的发现记下来。
            </p>
            <Link className="text-link" to="/own-move">
              Create Your Own Move <ArrowRight size={16} />
            </Link>
            <Link className="text-link" to="/progress">
              查看成长足迹 <ArrowRight size={16} />
            </Link>
          </aside>
        </div>
      </>
    );
  if (session?.status === "skipped")
    return (
      <>
        <PageTitle
          title="换个时刻，也没关系。"
          description="跳过不会扣分。你可以继续探索，或稍后再来。"
        />
        <div className="action-row">
          <button className="button primary" onClick={start}>
            重新开始
          </button>
          <Link className="button" to="/explore">
            看看其他机会
          </Link>
        </div>
      </>
    );
  return (
    <>
      <Link className="back-link" to="/explore">
        <ArrowLeft size={16} />
        返回发现微动
      </Link>
      <PageTitle
        title={title}
        description={`${questId.startsWith("routine-") ? "自然活动与休息组合 · 不计入运动分钟 · " : ""}${sceneInfo[scene].name} · ${seconds / 60} 分钟 · ${quest?.kind === "steps" ? "步骤引导 · 时长为自报估计" : "轻松计时"}`}
      />
      <div className="quest-layout">
        <section className="panel quest-main">
          {!session ? (
            <>
              <span className="meta">现在的情境</span>
              <h2>{quest?.context ?? own!.context}</h2>
              <p className="quest-description">
                {quest?.description ??
                  "这是你发现的活动机会。确认环境安全后，按自己的节奏轻动。"}
              </p>
              <div className="advice-box">
                <h3>你可以这样开始</h3>
                <ol>
                  {(seated
                    ? [
                        "坐稳，双脚有支撑。",
                        "轻轻交替抬起脚跟，再落下。",
                        "在舒服范围内活动，随时可以停下。",
                      ]
                    : steps
                  ).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
              <p className="fineprint">
                不方便走动时，可以跳过，或去动作库选择坐姿活动。
              </p>
              <button
                className="button primary wide"
                onClick={start}
                disabled={pending}
              >
                <Play size={17} />
                {quest?.kind === "steps" ? "开始步骤引导" : "开始计时"}
              </button>
              <button className="text-button wide" onClick={replace}>
                <RefreshCw size={15} />
                换个微动
              </button>
            </>
          ) : (
            <>
              <div className="section-heading">
                <span className="badge">
                  {session.status === "ready"
                    ? "可以确认完成"
                    : isTicking
                      ? "正在轻动"
                      : session.status === "running"
                        ? "在另一页面计时"
                        : "已暂停"}
                </span>
                <span className="meta">
                  {session.seated ? "坐姿替代" : "按建议活动"}
                </span>
              </div>
              {session.kind === "timer" ? (
                <>
                  <div
                    className="timer"
                    role="timer"
                    aria-label="剩余时间"
                    data-testid="timer"
                  >
                    {String(Math.floor(timeLeft / 60)).padStart(2, "0")}
                    <span>:</span>
                    {String(timeLeft % 60).padStart(2, "0")}
                  </div>
                  <p className="timer-caption">
                    {session.status === "ready"
                      ? "计时结束。如果确实完成了活动，再确认记录。"
                      : "收起手机，按自己的节奏。离开本页或切到后台会暂停。"}
                  </p>
                  <Meter
                    label="活动计时进度"
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
                        暂停
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
                        继续计时
                      </button>
                    )}
                    {session.status === "running" && !isTicking && (
                      <button
                        className="button"
                        onClick={() =>
                          void send({ type: "pause", id: session.id })
                        }
                      >
                        暂停并转到此页
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
                              这一步完成了
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                  <p className="fineprint">
                    步骤任务为用户自报完成，记录参考时长{" "}
                    {session.demo ? "3 秒（演示）" : `${seconds / 60} 分钟`}。
                  </p>
                </div>
              )}
              {session.kind === "timer" && (
                <div className="advice-box">
                  <h3>轻动提示</h3>
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
                我已完成，确认记录
              </button>
              <p className="fineprint">
                {session.status !== "ready"
                  ? "完成计时或全部步骤后才可确认。"
                  : "由你确认完成；设备没有检测你的动作。"}
              </p>
              <div className="secondary-actions">
                <button
                  className="text-button"
                  onClick={() => void send({ type: "skip", id: session.id })}
                >
                  今天先跳过
                </button>
                <button className="text-button" onClick={replace}>
                  替换任务
                </button>
              </div>
            </>
          )}
        </section>
        <aside className="quest-side">
          <section className="panel">
            <Clock3 size={23} />
            <h2>一点点，也算数。</h2>
            <p>
              {state.demo
                ? "演示模式将计时缩短到 3 秒；这次活动和奖励只进入演示空间。"
                : questId.startsWith("rest-")
                  ? "自报休息完成 +5 XP；不计入运动分钟。"
                  : "完成活动 +20 XP；同一任务每天奖励一次。重复活动可以记录，重复确认不会多领积分。"}
            </p>
            <div className="safety-note">{safety}</div>
          </section>
          <div className="quiet-note">
            你的花园不会因为休息而枯萎。
            <br />
            今天，按自己的节奏来。
          </div>
        </aside>
      </div>
    </>
  );
}
