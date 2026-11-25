import { useLanguage } from "../i18n/language";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, SlidersHorizontal } from "lucide-react";
import { PageTitle } from "../components/UI";
import { useStore } from "../state/Store";
import { decode, STORAGE_KEY } from "../storage/repository";
import {
  emptyState,
  scenes,
  type Locale,
  type Profile as ProfileType,
  type Scene,
  type State,
} from "../domain/types";
import { sceneInfo } from "../data/content";
export function Profile() {
  const { locale, t } = useLanguage();
  const { state, send, error } = useStore();
  const [profile, setProfile] = useState<ProfileType>(
    state.profile ?? {
      name: "新朋友",
      role: "student",
      scenes: ["campus"],
      minutes: 1,
      reminder: 0,
      locale,
    },
  );
  const [languageChoice, setLanguageChoice] = useState<Locale>();
  const [message, setMessage] = useState("");
  const [backup, setBackup] = useState<State | null>(null);
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof ProfileType>(k: K, v: ProfileType[K]) =>
    setProfile((p) => ({ ...p, [k]: v }));
  const save = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile.scenes.length) return;
    if (
      await send({
        type: "profile",
        profile: {
          ...profile,
          name: profile.name.trim() || t("新朋友", "New explorer"),
          locale: languageChoice ?? locale,
        },
      })
    )
      setMessage(
        (languageChoice ?? locale) === "en"
          ? "Preferences saved."
          : "偏好已保存。",
      );
  };
  const exportData = () => {
    let raw: string | null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      setMessage("无法访问存储，请检查浏览器权限。");
      return;
    }
    const blob = new Blob([raw ?? JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MoveQuest-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("数据已导出，请妥善保管。");
  };
  const clear = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyState()));
      window.location.assign("/onboarding");
    } catch {
      setMessage("清除失败，请检查存储权限。");
    }
  };
  return (
    <>
      <PageTitle
        title={t("按自己的节奏来。", "Preferences")}
        description={t(
          "日常偏好和你的本机数据。",
          "Your routines, preferences and local data.",
        )}
      />
      <section className="settings-row">
        <div>
          <h2>{t("我的生活城镇", "My living town")}</h2>
          <p>生活日程、推荐反馈和 Plus 意向。</p>
        </div>
        <div className="panel form-stack">
          <Link className="button" to="/life">
            {t("编辑日常与发现地点", "Edit routines and places")}
          </Link>
          <Link className="button" to="/rhythm">
            {t("节奏、限制与推荐反馈", "Activity limits and feedback")}
          </Link>
          <Link className="button" to="/plus">
            {t("了解 Plus 与登记意向", "Learn about Plus")}
          </Link>
        </div>
      </section>
      <section className="settings-row">
        <div>
          <h2>{t("我的日常", "My routine")}</h2>
          <p>推荐会优先考虑你选择的场景与时长。</p>
          <SlidersHorizontal size={24} />
        </div>
        <form className="panel form-stack" onSubmit={(e) => void save(e)}>
          <label>
            {t("怎么称呼你", "Display name")}
            <input
              maxLength={24}
              value={profile.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </label>
          <div className="form-pair">
            <label>
              {t("日常身份", "Role")}
              <select
                value={profile.role}
                onChange={(e) =>
                  set("role", e.target.value as ProfileType["role"])
                }
              >
                <option value="student">在校学生</option>
                <option value="worker">办公室职员</option>
              </select>
            </label>
            <label>
              偏好时长
              <select
                value={profile.minutes}
                onChange={(e) => set("minutes", Number(e.target.value))}
              >
                {[1, 2, 3].map((m) => (
                  <option key={m} value={m}>
                    {m} 分钟
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset>
            <legend>常见场景（至少一个）</legend>
            <div className="scene-checks">
              {scenes.map((scene: Scene) => (
                <label key={scene}>
                  <input
                    type="checkbox"
                    checked={profile.scenes.includes(scene)}
                    onChange={() =>
                      set(
                        "scenes",
                        profile.scenes.includes(scene)
                          ? profile.scenes.filter((x) => x !== scene)
                          : [...profile.scenes, scene],
                      )
                    }
                  />
                  {sceneInfo[scene].name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-pair">
            <label>
              {t("活动提醒", "Activity reminders")}
              <select
                value={profile.reminder}
                onChange={(e) => set("reminder", Number(e.target.value))}
              >
                <option value={0}>{t("暂时不用提醒", "Off")}</option>
                <option value={30}>
                  {t("每 30 分钟", "Every 30 minutes")}
                </option>
                <option value={60}>
                  {t("每 60 分钟", "Every 60 minutes")}
                </option>
              </select>
            </label>
            <label>
              {t("语言", "Language")}
              <select
                value={languageChoice ?? locale}
                onChange={(e) => setLanguageChoice(e.target.value as Locale)}
              >
                <option value="zh-CN">
                  {t("简体中文 · 完整", "简体中文")}
                </option>
                <option value="zh-TW">繁體中文 · 導航預覽</option>
                <option value="en">
                  {t("English · Navigation preview", "English")}
                </option>
              </select>
            </label>
          </div>
          <p className="fineprint">
            {t(
              "提醒只在应用打开期间显示。",
              "Reminders only appear while the app is open.",
            )}
          </p>
          <button className="button primary" disabled={!profile.scenes.length}>
            {t("保存偏好", "Save preferences")}
          </button>
          <p role="status">{message}</p>
        </form>
      </section>
      {state.demo && (
        <section className="settings-row">
          <div>
            <h2>路演演示空间</h2>
            <p>体验完整流程，不用等待真实活动时长。</p>
          </div>
          <div className="panel">
            <label className="switch-row">
              <span>
                <strong>演示模式</strong>
                <small>模拟活动 · 计时 3 秒 · 独立 XP 与成长记录</small>
              </span>
              <input
                type="checkbox"
                aria-label="演示模式"
                checked={state.demo}
                onChange={(e) =>
                  void send({ type: "demo", value: e.target.checked })
                }
              />
            </label>
            <p className="fineprint">
              切换会暂停当前计时。退出演示后，个人花园和活动统计保持独立。
            </p>
            <Link className="button" to="/">
              {state.demo ? "去演示花园" : "回到个人花园"}
            </Link>
          </div>
        </section>
      )}

      <section className="settings-row">
        <div>
          <h2>你的数据，留在本机</h2>
          <p>无需账号。不采集设备运动数据，不上传活动记录。</p>
        </div>
        <div className="panel">
          <p>
            localStorage
            数据与当前浏览器、访问地址绑定。换设备、清理浏览器或使用隐私模式可能无法保留。
          </p>
          <button className="button" onClick={exportData}>
            <Download size={17} />
            {error
              ? t("导出原始数据", "Export original data")
              : t("导出我的数据（JSON）", "Export my data (JSON)")}
          </button>
          <label className="section-spaced">
            导入 MoveQuest JSON 备份
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 5_000_000) throw Error("备份超过 5 MB");
                  setBackup(decode(await file.text()));
                  setMessage("备份校验通过，请检查后确认恢复。");
                } catch {
                  setBackup(null);
                  setMessage("备份结构无效，未修改当前数据。");
                }
              }}
            />
          </label>
          {backup && (
            <div className="notice">
              <p>
                备份包含 {backup.life?.locations.length ?? 0} 个个人地点、
                {backup.sessions.length} 条活动。恢复会替换当前 MoveQuest
                本机资料，请先导出当前数据。
              </p>
              <button
                className="button"
                onClick={async () => {
                  if (await send({ type: "restore", state: backup })) {
                    setBackup(null);
                    window.location.assign("/");
                  }
                }}
              >
                确认恢复此备份并替换本机数据
              </button>
              <button className="text-button" onClick={() => setBackup(null)}>
                取消导入
              </button>
            </div>
          )}
          <p className="fineprint">
            备份只保存在你选择的位置；不代表跨设备自动同步。
          </p>
        </div>
      </section>
      <section className="settings-row">
        <div>
          <h2>重新开始</h2>
          <p>只清除当前访问地址下的 MoveQuest 本地数据，不能撤销。</p>
        </div>
        <div className="panel">
          {!confirm ? (
            <button className="button danger" onClick={() => setConfirm(true)}>
              {t("清除 MoveQuest 数据…", "Clear MoveQuest data…")}
            </button>
          ) : (
            <>
              <p>
                确定删除这台设备上的全部 MoveQuest 记录和偏好吗？建议先导出。
              </p>
              <div className="action-row">
                <button className="button danger" onClick={clear}>
                  {t(
                    "确认清除 MoveQuest 数据",
                    "Confirm clearing MoveQuest data",
                  )}
                </button>
                <button className="button" onClick={() => setConfirm(false)}>
                  {t("取消", "Cancel")}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
