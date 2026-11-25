import { useLanguage } from "../i18n/language";
import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useStore } from "../state/Store";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function PwaStatus() {
  const { t } = useLanguage();
  const { state } = useStore();
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    const listener = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);
  const running = state.sessions.some((s) => s.status === "running");
  if (!needRefresh && !offlineReady && (!install || dismissed) && !message)
    return null;
  return (
    <div className="notice pwa-status" role="status">
      {needRefresh ? (
        <>
          <span>
            {t("新版本已就绪。", "An update is ready.")}
            {running
              ? t(
                  "请先暂停活动再更新。",
                  "Pause your activity before updating.",
                )
              : t("你的本地进度会保留。", "Your local progress will stay.")}
          </span>
          <button
            className="text-button"
            disabled={running}
            onClick={() => void updateServiceWorker(true)}
          >
            {t("更新应用", "Update app")}
          </button>
        </>
      ) : offlineReady ? (
        <>
          <span>{t("已准备好离线使用。", "Ready for offline use.")}</span>
          <button
            className="text-button"
            onClick={() => setOfflineReady(false)}
          >
            {t("知道了", "Got it")}
          </button>
        </>
      ) : install && !dismissed ? (
        <>
          <span>
            {t(
              "把微动花园放到桌面，随时回来。",
              "Install MoveQuest for easy access.",
            )}
          </span>
          <button
            className="text-button"
            onClick={() => {
              void install
                .prompt()
                .then(() => install.userChoice)
                .then((choice) => {
                  setInstall(null);
                  setMessage(
                    choice.outcome === "accepted"
                      ? "安装请求已接受，请在系统中查看。"
                      : "你可以稍后从浏览器菜单安装。",
                  );
                });
            }}
          >
            {t("安装应用", "Install app")}
          </button>
          <button className="text-button" onClick={() => setDismissed(true)}>
            {t("稍后", "Later")}
          </button>
        </>
      ) : (
        <>
          <span>{message}</span>
          <button className="text-button" onClick={() => setMessage("")}>
            {t("知道了", "Got it")}
          </button>
        </>
      )}
    </div>
  );
}
