import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Brand } from "../components/UI";
import { GardenScene } from "../components/Art";
import { scenes, type Profile, type Scene } from "../domain/types";
import { sceneInfo } from "../data/content";
import { useStore } from "../state/Store";
export function Onboarding() {
  const { state, send } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>(
    state.profile ?? {
      name: "",
      role: "student",
      scenes: ["campus"],
      minutes: 1,
      reminder: 0,
      locale: "zh-CN",
    },
  );
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));
  const toggle = (scene: Scene) =>
    set(
      "scenes",
      profile.scenes.includes(scene)
        ? profile.scenes.filter((x) => x !== scene)
        : [...profile.scenes, scene],
    );
  const finish = async () => {
    setSaving(true);
    if (
      await send({
        type: "profile",
        profile: { ...profile, name: profile.name.trim() || "新朋友" },
      })
    )
      navigate("/");
    setSaving(false);
  };
  return (
    <div className="onboarding">
      <div className="onboard-story">
        <Brand />
        <div>
          <p className="meta">一场从日常出发的小冒险</p>
          <h2>
            不用等到有空，
            <br />
            现在就能开始。
          </h2>
          <p>
            课间、接水、等候的片刻。
            <br />
            一点点活动，让生活长出新绿。
          </p>
          <GardenScene xp={80} />
        </div>
        <small>Turn Everyday Moments into Movement.</small>
      </div>
      <main className="onboard-form">
        <div className="onboard-inner">
          <p className="meta">认识你的日常 · {step + 1} / 4</p>
          <div className="step-track">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={i <= step ? "active" : ""} />
            ))}
          </div>
          {step === 0 && (
            <>
              <h1>先认识一下你</h1>
              <p>让推荐从你的生活开始。</p>
              <label>
                怎么称呼你？
                <input
                  maxLength={24}
                  value={profile.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="给自己取个名字（可选）"
                />
              </label>
              <fieldset>
                <legend>你的日常身份</legend>
                <div className="choice-grid">
                  {(["student", "worker"] as const).map((role) => (
                    <button
                      key={role}
                      className={`choice ${profile.role === role ? "selected" : ""}`}
                      aria-pressed={profile.role === role}
                      onClick={() =>
                        setProfile((p) => ({
                          ...p,
                          role,
                          scenes: [role === "student" ? "campus" : "office"],
                        }))
                      }
                    >
                      <span>
                        {role === "student" ? "在校学生" : "办公室职员"}
                      </span>
                      <small>
                        {role === "student"
                          ? "在课堂与校园之间"
                          : "在专注与间隙之间"}
                      </small>
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          {step === 1 && (
            <>
              <h1>你常在哪里？</h1>
              <p>可以多选，之后也能随时调整。</p>
              <div className="choice-grid">
                {scenes.map((scene) => (
                  <button
                    key={scene}
                    className={`choice ${profile.scenes.includes(scene) ? "selected" : ""}`}
                    aria-pressed={profile.scenes.includes(scene)}
                    onClick={() => toggle(scene)}
                  >
                    <span>
                      {sceneInfo[scene].name}
                      {profile.scenes.includes(scene) && <Check size={18} />}
                    </span>
                    <small>{sceneInfo[scene].en}</small>
                  </button>
                ))}
              </div>
              {!profile.scenes.length && (
                <p className="field-error">请至少选择一个常见场景。</p>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <h1>留多大的小间隙？</h1>
              <p>从轻松做到的开始，不需要勉强自己。</p>
              <div className="stack">
                {[1, 2, 3].map((m) => (
                  <button
                    key={m}
                    className={`choice ${profile.minutes === m ? "selected" : ""}`}
                    aria-pressed={profile.minutes === m}
                    onClick={() => set("minutes", m)}
                  >
                    <span>{m} 分钟</span>
                    <small>
                      {m === 1
                        ? "刚刚好，给自己一个开始"
                        : m === 2
                          ? "不着急，多一点空间"
                          : "慢慢来，享受一个小片刻"}
                    </small>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h1>提醒，按你的节奏</h1>
              <p>只在应用打开时轻轻提醒。跳过也没关系。</p>
              <div className="stack">
                {[0, 30, 60].map((m) => (
                  <button
                    key={m}
                    className={`choice ${profile.reminder === m ? "selected" : ""}`}
                    aria-pressed={profile.reminder === m}
                    onClick={() => set("reminder", m)}
                  >
                    <span>{m === 0 ? "暂时不用提醒" : `每 ${m} 分钟`}</span>
                    <small>
                      {m === 0
                        ? "我想动的时候，自己来看看"
                        : "页面打开时的应用内提示"}
                    </small>
                  </button>
                ))}
              </div>
              <p className="fineprint">
                无需账号、设备或通知权限。进度保存在当前浏览器。
              </p>
            </>
          )}
          <div className="onboard-actions">
            {step > 0 && (
              <button className="button" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={17} />
                上一步
              </button>
            )}
            <button
              className="button primary"
              disabled={saving || (step === 1 && !profile.scenes.length)}
              onClick={() => (step < 3 ? setStep(step + 1) : void finish())}
            >
              {step === 3 ? (saving ? "正在保存…" : "开启微动冒险") : "下一步"}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
