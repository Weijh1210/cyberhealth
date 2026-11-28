import { useSyncExternalStore } from "react";
import type { Locale } from "../domain/types";
import { useStore } from "../state/Store";

const languageKey = "movequest:language";
function readLanguage(): Locale {
  try {
    const choice = window.localStorage.getItem(languageKey);
    return choice === "en" || choice === "zh-TW" ? choice : "zh-CN";
  } catch {
    return "zh-CN";
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("movequest-language", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("movequest-language", callback);
    window.removeEventListener("storage", callback);
  };
}

export function useLanguage() {
  const { state, send } = useStore();
  const preferred = useSyncExternalStore(
    subscribe,
    readLanguage,
    () => "zh-CN" as Locale,
  );
  const locale = state.profile?.locale ?? preferred;
  const t = (zh: string, en: string) => (locale === "en" ? en : zh);
  async function setLocale(next: Locale) {
    if (state.profile && !(await send({ type: "locale", locale: next })))
      return;
    try {
      window.localStorage.setItem(languageKey, next);
    } catch {
      /* storage is optional before sign-up */
    }
    window.dispatchEvent(new Event("movequest-language"));
  }
  return { locale, t, setLocale };
}

export function LanguageSwitch() {
  const { locale, t, setLocale } = useLanguage();
  return (
    <div
      className="language-switch"
      role="group"
      aria-label={t("界面语言", "Interface language")}
    >
      <button
        type="button"
        aria-pressed={locale !== "en"}
        onClick={() => void setLocale("zh-CN")}
      >
        {t("中文", "Chinese")}
      </button>
      <button
        type="button"
        aria-pressed={locale === "en"}
        onClick={() => void setLocale("en")}
      >
        {t("英文", "English")}
      </button>
    </div>
  );
}
