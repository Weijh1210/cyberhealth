import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowRight, Play, RotateCcw, LogOut } from "lucide-react";
import { useStore } from "../state/Store";
import { demoPark, demoDescription } from "../life/demo";
import { activeLife } from "../life/model";
import { PageTitle } from "../components/UI";
export function Demo() {
  const { state, send, busy } = useStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const life = activeLife(state);
  async function begin() {
    if (await send({ type: "demo-reset" })) navigate("/?event=meeting_end");
  }
  return (
    <>
      <PageTitle
        title="一分钟找到可试的日常微动"
        description="MoveQuest · Your Life, Your World."
      />
      <section className="demo-intro v7-demo-intro">
        <div>
          <h2>把一次图书馆休息，变成自己的习惯</h2>
          <p>
            从说清日常，到找到想试的微动，再回到城镇看变化。演示资料和个人空间分开保存。
          </p>
          <div className="action-row">
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await send({
                    type: "demo-reset",
                    v7: true,
                    blank: true,
                    at: Date.now(),
                  })
                )
                  navigate("/life?v7=1");
              }}
            >
              从真实 AI 对话开始
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={async () => {
                if (
                  await send({ type: "demo-reset", v7: true, at: Date.now() })
                )
                  navigate("/explore");
              }}
            >
              载入 V7 示例（无需 AI）
            </button>
          </div>
        </div>
        <div className="demo-route">
          <span>行为线索</span>
          <ArrowRight />
          <span>微动尝试</span>
          <ArrowRight />
          <span>习惯与街区成长</span>
        </div>
      </section>
      <section className="demo-legacy">
        <button className="button" disabled={busy} onClick={() => void begin()}>
          <Play size={17} /> 载入示例演示世界
        </button>
        <details>
          <summary>经典城镇演示步骤</summary>
          <ol className="demo-steps">
            {[
              [
                "认识我的一天",
                "语音或文字输入后发送，检查时间、地点和事件再确认。",
                "/life?example=1",
                "描述我的一天",
              ],
              [
                "我的世界诞生",
                "选择地点、缩放或拖动地图。场景来自确认资料，地图布局由算法生成。",
                "/",
                "探索生活城镇",
              ],
              [
                "发现一个间隙",
                "选择“会议刚结束”“准备接水”或“午饭刚结束”。模拟场景有醒目标记。",
                "/?event=meeting_end",
                "模拟会议结束",
              ],
              [
                "让推荐认识我",
                "选择“对这类活动没兴趣”等原因，查看排序变化；其他子类型继续保留。",
                "/rhythm",
                "查看节奏与反馈",
              ],
              [
                "世界向外生长",
                "确认一个周末公园，比较旧建筑位置，再放置、移动或撤销装饰。",
                "/life",
                "发现新场景",
              ],
            ].map(([title, description, path, action]) => (
              <li key={title}>
                <h2>{title}</h2>
                <p>{description}</p>
                <Link className="text-link" to={path}>
                  {action}
                  <ArrowRight size={16} />
                </Link>
              </li>
            ))}
          </ol>
        </details>
      </section>
      {state.demo && (
        <section className="panel form-stack">
          <h2>演示控制台</h2>
          <p>
            当前是独立演示空间 · {life.locations.length} 个示例地点。预置描述：
            {demoDescription}
          </p>
          <div className="action-row">
            <button
              className="button"
              disabled={
                busy || life.locations.some((l) => l.id === "demo_park")
              }
              onClick={async () => {
                if (await send({ type: "life-confirm", delta: demoPark })) {
                  setStatus("周末公园已确认，其他建筑坐标保持不变。");
                  navigate("/?event=leisure");
                }
              }}
            >
              确认周末公园示例并扩展
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => void begin()}
            >
              <RotateCcw size={16} />
              重置演示
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={async () => {
                if (await send({ type: "demo", value: false })) navigate("/");
              }}
            >
              <LogOut size={16} />
              退出演示，回到个人空间
            </button>
          </div>
          <p role="status">{status}</p>
        </section>
      )}
      <p className="fineprint">
        浏览器语音是否可用取决于设备与权限；文字输入始终可用。
      </p>
    </>
  );
}
