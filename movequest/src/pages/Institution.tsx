import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Pencil, Plus, Check } from "lucide-react";
import { institutionStats, sampleCampaigns } from "../data/institution";
import { sceneInfo } from "../data/content";
import { type Campaign } from "../domain/types";
import { useStore } from "../state/Store";
import { Meter, PageTitle } from "../components/UI";
export function Institution() {
  const { state, send } = useStore();
  const [audience, setAudience] = useState<"campus" | "office">("campus");
  const [days, setDays] = useState(7);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const a = institutionStats(audience, days);
  const rate = (v: number, n: number) =>
    n ? `${((v / n) * 100).toFixed(1)}%` : "—";
  const all = [
    ...sampleCampaigns.filter(
      (c) => !state.campaigns.some((x) => x.id === c.id),
    ),
    ...state.campaigns,
  ];
  const campaigns = all.filter((x) => x.audience === audience);
  const create = () => {
    setMessage("");
    setEditing({
      id: crypto.randomUUID(),
      name: "",
      audience,
      goal: 100,
      status: "draft",
      createdAt: new Date().toISOString(),
    });
  };
  const save = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing?.name.trim()) return;
    setPending(true);
    if (await send({ type: "campaign", campaign: editing })) {
      setEditing(null);
      setMessage("Demo 活动已保存在本机，没有发布或发送通知。");
    }
    setPending(false);
  };
  const exportData = () => {
    const data = {
      label: "Demo Data · 合成示例，不代表真实客户或试点成果",
      asOf: a.to,
      from: a.from,
      audience,
      participants: a.people.length,
      started: a.started.length,
      completed: a.completed.length,
      learned: a.learned.length,
      byScene: a.byScene,
      daily: a.daily,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "MoveQuest-Institution-Demo-Data.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("已导出带 Demo Data 标识的示例数据。");
  };
  return (
    <>
      <Link className="back-link" to="/">
        <ArrowLeft size={16} />
        回到个人花园
      </Link>
      <PageTitle
        title="让微动，发生在一起的日常。"
        description="机构活动概览 · Demo Data · 全部为合成示例"
        action={
          <button className="button" onClick={exportData}>
            <Download size={16} />
            导出 Demo 数据
          </button>
        }
      />
      <div className="institution-notice">
        <strong>Demo Data · 模拟数据</strong>
        <p>
          以下为固定合成数据，用于展示学校与企业的活动管理方式，不代表真实客户、参与者或试点成果。数据快照：2026-11-19。
        </p>
      </div>
      <div className="institution-toolbar">
        <div className="tabs" role="group" aria-label="机构类型">
          <button
            className={audience === "campus" ? "active" : ""}
            aria-pressed={audience === "campus"}
            onClick={() => {
              setAudience("campus");
              setEditing(null);
            }}
          >
            校园计划
          </button>
          <button
            className={audience === "office" ? "active" : ""}
            aria-pressed={audience === "office"}
            onClick={() => {
              setAudience("office");
              setEditing(null);
            }}
          >
            企业计划
          </button>
        </div>
        <label>
          统计周期
          <select
            aria-label="机构统计周期"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>快照最近 7 天</option>
            <option value={14}>快照最近 14 天</option>
          </select>
        </label>
      </div>
      <p className="meta institution-period">
        Demo Data · {a.from} 至 {a.to} ·{" "}
        {audience === "campus" ? "校园" : "企业"}示例
      </p>
      <section className="metric-strip">
        <div>
          <span>活动参与人数 · Demo</span>
          <strong data-testid="institution-people">
            {a.people.length}
            <small> 人</small>
          </strong>
        </div>
        <div>
          <span>已完成任务 · Demo</span>
          <strong>
            {a.completed.length}
            <small> / {a.started.length} 次</small>
          </strong>
        </div>
        <div>
          <span>任务完成率 · Demo</span>
          <strong>{rate(a.completed.length, a.started.length)}</strong>
        </div>
        <div>
          <span>知识学习率 · Demo</span>
          <strong>{rate(a.learned.length, a.people.length)}</strong>
        </div>
      </section>
      <div className="progress-grid institution-charts">
        <section className="panel">
          <div className="section-heading">
            <h2>每天发生的小行动</h2>
            <span className="meta">Demo Data · 完成次数</span>
          </div>
          <div
            className="week-chart"
            role="img"
            aria-label={a.daily.map((x) => `${x.day}：${x.count}次`).join("；")}
          >
            {a.daily.map((d, i) => (
              <div key={d.day}>
                <span>{d.count}</span>
                <div className="bar-space">
                  <div
                    className="week-bar"
                    style={{
                      height: `${(d.count / Math.max(1, ...a.daily.map((x) => x.count))) * 100}%`,
                    }}
                  />
                </div>
                <small>{days === 14 && i % 2 ? "" : d.day.slice(5)}</small>
              </div>
            ))}
          </div>
          <p className="fineprint">
            Demo Data · 总计 {a.completed.length}{" "}
            次完成，来自所选周期内加入活动的合成参与者。
          </p>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>微动发生在哪里</h2>
            <span className="meta">Demo Data</span>
          </div>
          <div className="scene-progress">
            {a.byScene.map((s) => (
              <div key={s.scene}>
                <div>
                  <span>{sceneInfo[s.scene].name}</span>
                  <span className="meta">
                    {s.completed} / {s.started} 次完成
                  </span>
                </div>
                <Meter
                  label={`${sceneInfo[s.scene].name}任务完成率`}
                  value={s.completed}
                  max={s.started || 1}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="progress-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>学习参与情况</h2>
            <span className="meta">Demo Data</span>
          </div>
          <div className="learning-summary">
            <strong>
              {a.learned.length}
              <span> / {a.people.length} 人</span>
            </strong>
            <p>完成指定知识互动的合成参与者</p>
          </div>
          <Meter
            label="Demo 知识学习率"
            value={a.learned.length}
            max={a.people.length || 1}
          />
          <details className="source-details">
            <summary>查看指标口径</summary>
            <p>
              参与人数：所选周期内加入活动的合成人数。任务完成率：这些参与者在周期内完成次数
              / 开始次数。学习率：这些参与者中完成指定知识互动人数 /
              参与人数。场景栏为完成数 / 开始数。
            </p>
            <p>所有数字从固定合成明细计算；不与个人活动数据关联。</p>
          </details>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>活动管理示例</h2>
            <button className="button compact-button" onClick={create}>
              <Plus size={15} />
              新建活动
            </button>
          </div>
          <p className="fineprint">
            Demo Data · 只保存本地示例，不发布活动或邀请参与者。
          </p>
          <div className="campaign-list">
            {campaigns.length ? (
              campaigns.map((c) => (
                <div className="campaign-row" key={c.id}>
                  <div>
                    <strong>{c.name}</strong>
                    <small>
                      目标 {c.goal} 次微动 ·{" "}
                      {c.status === "draft" ? "草稿" : "模拟进行中"} · Demo
                    </small>
                  </div>
                  <button
                    className="edit-button"
                    aria-label={`编辑${c.name}`}
                    onClick={() => setEditing(c)}
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              ))
            ) : (
              <p className="empty">暂无示例活动，可以新建一个草稿。</p>
            )}
          </div>
        </section>
      </div>
      {editing && (
        <section className="panel campaign-editor">
          <div className="section-heading">
            <h2>编辑 Demo 活动</h2>
            <span className="meta">仅当前浏览器</span>
          </div>
          <form className="form-stack" onSubmit={(e) => void save(e)}>
            <label>
              活动名称
              <input
                required
                maxLength={60}
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <div className="form-pair">
              <label>
                目标完成次数
                <input
                  type="number"
                  min={1}
                  max={10000}
                  required
                  value={editing.goal}
                  onChange={(e) =>
                    setEditing({ ...editing, goal: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                示例状态
                <select
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      status: e.target.value as Campaign["status"],
                    })
                  }
                >
                  <option value="draft">草稿</option>
                  <option value="active">模拟进行中</option>
                </select>
              </label>
            </div>
            <div className="action-row">
              <button
                className="button primary"
                disabled={pending || !editing.name.trim() || editing.goal < 1}
              >
                <Check size={16} />
                保存 Demo 活动
              </button>
              <button
                type="button"
                className="button"
                onClick={() => setEditing(null)}
              >
                取消
              </button>
            </div>
            <p className="fineprint">本地活动草稿不会改变上方固定合成统计。</p>
          </form>
        </section>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </>
  );
}
