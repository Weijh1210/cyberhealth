import { productText } from "../i18n/productContent";
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
      name: "",
      role: "student",
      scenes: ["campus"],
      minutes: 1,
      reminder: 0,
      locale,
    },
  );
  const [languageChoice, setLanguageChoice] = useState<Locale>();
  const [message, setMessage] = useState("");
  const [preferencesSaved, setPreferencesSaved] = useState(false);
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
      setPreferencesSaved(true);
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
          <p>
            {t(
              "生活日程、推荐反馈和 Plus 意向。",
              "Routines, recommendation feedback and Plus interest.",
            )}
          </p>
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
          <p>
            {t(
              "推荐会优先考虑你选择的场景与时长。",
              "Recommendations prioritize your preferred settings and duration.",
            )}
          </p>
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
                <option value="student">{t("在校学生", "Student")}</option>
                <option value="worker">
                  {t("办公室职员", "Office worker")}
                </option>
              </select>
            </label>
            <label>
              {t("偏好时长", "Preferred duration")}
              <select
                value={profile.minutes}
                onChange={(e) => set("minutes", Number(e.target.value))}
              >
                {[1, 2, 3].map((m) => (
                  <option key={m} value={m}>
                    {m} {t("分钟", "minutes")}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset>
            <legend>
              {t(
                "常见场景（至少一个）",
                "Usual settings (select at least one)",
              )}
            </legend>
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
                  {t(sceneInfo[scene].name, sceneInfo[scene].en)}
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
                  {t("简体中文", "Simplified Chinese")}
                </option>
                <option value="zh-TW">
                  {t("繁體中文 · 导航", "Traditional Chinese · Navigation")}
                </option>
                <option value="en">{t("英文", "English")}</option>
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
          <p role="status">
            {preferencesSaved ? t("偏好已保存。", "Preferences saved.") : ""}
          </p>
        </form>
      </section>
      {state.demo && (
        <section className="settings-row">
          <div>
            <h2>{t("路演演示空间", "Demo space")}</h2>
            <p>
              {t(
                "体验完整流程，不用等待真实活动时长。",
                "Explore the full flow with shortened activity timers.",
              )}
            </p>
          </div>
          <div className="panel">
            <label className="switch-row">
              <span>
                <strong>{t("演示模式", "Demo mode")}</strong>
                <small>
                  {t(
                    "模拟活动 · 计时 3 秒 · 独立 XP 与成长记录",
                    "Simulated activity · 3-second timer · Separate XP and growth",
                  )}
                </small>
              </span>
              <input
                type="checkbox"
                aria-label={t("演示模式", "Demo mode")}
                checked={state.demo}
                onChange={(e) =>
                  void send({ type: "demo", value: e.target.checked })
                }
              />
            </label>
            <p className="fineprint">
              {t(
                "切换会暂停当前计时。退出演示后，个人花园和活动统计保持独立。",
                "Switching pauses the timer. Personal records and growth are saved separately.",
              )}
            </p>
            <Link className="button" to="/">
              {state.demo
                ? t("去演示花园", "Open the demo garden")
                : t("回到个人花园", "Back to my garden")}
            </Link>
          </div>
        </section>
      )}

      <section className="settings-row">
        <div>
          <h2>{t("你的数据，留在本机", "Your data stays on this device")}</h2>
          <p>
            {t(
              "无需账号。不采集设备运动数据，不上传活动记录。",
              "No account required. MoveQuest does not read device motion data or upload activity records.",
            )}
          </p>
        </div>
        <div className="panel">
          <p>
            {t(
              "localStorage 数据与当前浏览器、访问地址绑定。换设备、清理浏览器或使用隐私模式可能无法保留。",
              "Local data is tied to this browser and web address. Switching devices, clearing browser data or using private browsing may remove access.",
            )}
          </p>
          <button className="button" onClick={exportData}>
            <Download size={17} />
            {error
              ? t("导出原始数据", "Export original data")
              : t("导出我的数据（JSON）", "Export my data (JSON)")}
          </button>
          {message && <p role="status">{productText(message, locale)}</p>}
          <label className="section-spaced">
            {t("导入 MoveQuest JSON 备份", "Import a MoveQuest JSON backup")}
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 5_000_000)
                    throw Error(t("备份超过 5 MB", "The backup exceeds 5 MB."));
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
                {t(
                  `备份包含 ${backup.life?.locations.length ?? 0} 个个人地点和 ${backup.sessions.length} 条活动。恢复前请先导出当前资料。`,
                  `This backup contains ${backup.life?.locations.length ?? 0} places and ${backup.sessions.length} activities. Export your current data before restoring.`,
                )}
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
                {t(
                  "确认恢复此备份并替换本机数据",
                  "Restore this backup and replace local data",
                )}
              </button>
              <button className="text-button" onClick={() => setBackup(null)}>
                {t("取消导入", "Cancel import")}
              </button>
            </div>
          )}
          <p className="fineprint">
            {t(
              "备份只保存在你选择的位置；不代表跨设备自动同步。",
              "Backups are stored where you save them. Devices do not sync automatically.",
            )}
          </p>
        </div>
      </section>
      <section className="settings-row">
        <div>
          <h2>{t("重新开始", "Start over")}</h2>
          <p>
            {t(
              "只清除当前访问地址下的 MoveQuest 本地数据，不能撤销。",
              "This permanently clears the MoveQuest data stored at this web address.",
            )}
          </p>
        </div>
        <div className="panel">
          {!confirm ? (
            <button className="button danger" onClick={() => setConfirm(true)}>
              {t("清除 MoveQuest 数据…", "Clear MoveQuest data…")}
            </button>
          ) : (
            <>
              <p>
                {t(
                  "确定删除这台设备上的全部 MoveQuest 记录和偏好吗？建议先导出。",
                  "Delete all MoveQuest activity and preferences on this device? Export a backup first if you want to keep them.",
                )}
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
