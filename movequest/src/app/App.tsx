import { LanguageSwitch, useLanguage } from "../i18n/language";
import { TodayDiscoveries } from "../pages/Discovery";
import { HabitGarden } from "../pages/HabitGarden";
import { Journal } from "../pages/Journal";
import { Demo } from "../pages/Demo";
import { demoEnabled } from "./release";
import { LifeDiscovery } from "../pages/Life";
import { Rhythm, Pricing } from "../pages/Rhythm";
import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { House, Activity, CalendarDays, SlidersHorizontal } from "lucide-react";
import { Brand } from "../components/UI";
import { useStore } from "../state/Store";
import { translate, type TranslationKey } from "../i18n";

import { Home, Explore, LegacyHome } from "../pages/Home";
import { QuestPage } from "../pages/Quest";
import { Learn, Progress, OwnMovePage } from "../pages/Growth";
import { Profile } from "../pages/Profile";
import { Institution } from "../pages/Institution";
import { Today } from "../pages/Today";
import { GuidedMovement, Movement } from "../pages/Movement";
import { PersonalTown } from "../components/PersonalTown";
import { PwaStatus } from "../components/PwaStatus";
const nav = [
  ["/", "today", CalendarDays],
  ["/world", "home", House],
  ["/movement", "movement", Activity],
  ["/life", "life", SlidersHorizontal],
] as const;
export function App() {
  const { state, error, busy, send } = useStore();
  const location = useLocation();
  const { locale, t } = useLanguage();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const [remind, setRemind] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
    const key: TranslationKey | undefined = nav.find(
      (x) => x[0] === location.pathname,
    )?.[1];
    document.title = key
      ? `MoveQuest · ${translate(locale, key)}`
      : "MoveQuest";
  }, [location.pathname, locale]);
  useEffect(() => {
    const minutes = state.profile?.reminder;
    if (!minutes) return;
    const timer = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !state.sessions.some(
          (s) => s.demo === state.demo && s.status === "running",
        )
      )
        setRemind(true);
    }, minutes * 60000);
    return () => clearInterval(timer);
  }, [state.profile?.reminder, state.demo, state.sessions]);
  if (["/demo", "/institution"].includes(location.pathname) && !demoEnabled)
    return <Navigate to="/" replace />;
  if (location.pathname === "/onboarding")
    return (
      <>
        {error && (
          <div className="notice danger" role="alert">
            {error}
            <Link to="/profile">导出或管理原始数据</Link>
          </div>
        )}
        <LifeDiscovery onboarding />
      </>
    );
  if (
    !state.profile &&
    !state.demo &&
    location.pathname !== "/demo" &&
    location.pathname !== "/institution" &&
    !(error && location.pathname === "/profile")
  )
    return <Navigate to="/onboarding" replace />;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t("跳至主要内容", "Skip to main content")}
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="nav-caption">
          {t("给生活，一点新绿", "A town shaped by your day")}
        </div>
        <nav aria-label={t("主要导航", "Main navigation")}>
          {nav.map(([path, key, Icon]) => (
            <NavLink key={path} to={path} end={path === "/"}>
              <Icon size={19} />
              {translate(locale, key)}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/profile" className="user-row">
            <span className="avatar">
              {(state.profile?.name || "新朋友").slice(0, 1)}
            </span>
            <span>
              {state.profile?.name || "新朋友"}
              <small>{t("本机个人资料", "Local profile")}</small>
            </span>
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <div className="mobile-top">
          <Brand />
          <LanguageSwitch />
        </div>
        <div className="topline">
          <span>Discover Movement in Everyday Life.</span>
          <div className="topline-actions">
            <LanguageSwitch />
            <span className="local-status">
              {busy ? t("正在保存", "Saving") : t("本机保存", "Saved locally")}{" "}
              · {state.demo ? t("演示空间", "Demo") : t("个人空间", "Personal")}
            </span>
          </div>
        </div>
        {state.demo && (
          <div className="notice demo-banner" role="status">
            {t(
              "演示空间 · 记录与个人数据分开。",
              "Demo records are stored separately.",
            )}
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void send({ type: "demo", value: false })}
            >
              {t("回到个人空间", "Return to personal space")}
            </button>
          </div>
        )}
        {error && (
          <div role="alert" className="notice danger">
            {error}
            <Link to="/profile">{t("导出本地数据", "Export local data")}</Link>
          </div>
        )}
        {remind && (
          <div role="status" className="notice">
            {t(
              "有空的话，给自己一个轻动间隙。",
              "Take a movement break if now works for you.",
            )}
            <Link to="/explore" onClick={() => setRemind(false)}>
              {t("看看机会", "See options")}
            </Link>
            <button className="text-button" onClick={() => setRemind(false)}>
              {t("稍后再说", "Not now")}
            </button>
          </div>
        )}
        <PwaStatus />
        <main id="main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={state.demo ? <Home /> : <Today />} />
            <Route path="/world" element={<PersonalTown />} />
            <Route path="/movement" element={<Movement />} />
            <Route path="/move/:id" element={<GuidedMovement />} />
            {demoEnabled && <Route path="/demo" element={<Demo />} />}
            <Route path="/life" element={<LifeDiscovery />} />
            <Route path="/rhythm" element={<Rhythm />} />
            <Route path="/plus" element={<Pricing />} />
            <Route path="/explore" element={<TodayDiscoveries />} />
            <Route path="/activity-library" element={<Explore />} />
            <Route path="/habits" element={<HabitGarden />} />
            <Route path="/world-legacy" element={<LegacyHome />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/quest/:questId" element={<QuestPage />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/own-move" element={<OwnMovePage />} />
            <Route path="/profile" element={<Profile />} />
            {demoEnabled && (
              <Route path="/institution" element={<Institution />} />
            )}
            <Route
              path="*"
              element={
                <div className="panel">
                  <h1>这条小路还没开辟</h1>
                  <p>回到花园，再选一个方向吧。</p>
                  <Link className="button primary" to="/">
                    回到花园
                  </Link>
                </div>
              }
            />
          </Routes>
        </main>
        <footer className="page-footer">
          {t("MoveQuest 微动冒险", "MoveQuest")}
          <span>
            {t("跟着自己的节奏，每一点都算数。", "Move at your own pace.")}
          </span>
        </footer>
      </div>
      <nav
        className="bottom-nav"
        aria-label={t("手机导航", "Mobile navigation")}
      >
        {nav.map(([path, key, Icon]) => (
          <NavLink key={path} to={path} end={path === "/"}>
            <Icon size={21} />
            <span>{translate(locale, key)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
