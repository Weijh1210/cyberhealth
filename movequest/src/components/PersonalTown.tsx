import { useLanguage } from "../i18n/language";
import { useRef, useState } from "react";
import { ArrowRight, MapPin, Sprout } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { activeLife } from "../life/model";
import { discoveryFor, discover } from "../life/discoveries";
import { englishGrowth, growthTitles, worldGrowth } from "../life/worldGrowth";
import { categoryScene, moveLibrary } from "../life/moveNow";
import { findQuest } from "../data/content";
import { activityPolicy, fitsMovementLimits } from "../life/activities";
import { useStore } from "../state/Store";
import { LifeWorld } from "./LifeWorld";

export function PersonalTown() {
  const { t } = useLanguage();
  const { state, send } = useStore();
  const [params] = useSearchParams();
  const life = activeLife(state);
  const [selection, setSelection] = useState<string>();
  const [showcase, setShowcase] = useState<string>();
  const district = useRef<HTMLElement>(null);
  const current = selection ?? params.get("expanded") ?? params.get("scene");
  const selected = life.locations.find((l) => l.id === current);
  const progress = worldGrowth(life);
  const plans = discover(life, Date.now());
  const sceneMoves = selected
    ? moveLibrary.filter((move) => {
        const quest = findQuest(move.id);
        return (
          move.scenes.includes(categoryScene[selected.category]) &&
          quest &&
          fitsMovementLimits(activityPolicy(quest), life)
        );
      })
    : [];
  const districtPlans = selected
    ? (life.cues ?? [])
        .flatMap((cue) => {
          const plan =
            cue.locationId === selected.id && discoveryFor(life, cue);
          return plan ? [plan] : [];
        })
        .slice(0, 3)
    : [];
  const categoryPriority =
    selected?.category === "home"
      ? ["household", "mobility", "strength", "aerobic"]
      : ["mobility", "strength", "aerobic", "routine"];
  const choices = categoryPriority.flatMap(
    (category) => sceneMoves.find((move) => move.category === category) ?? [],
  );
  function openMovements(id: string) {
    setSelection(id);
    requestAnimationFrame(() =>
      district.current?.scrollIntoView({ block: "nearest" }),
    );
  }
  const upgrade = selected ? progress.get(selected.id) : undefined;
  const unvisited = life.locations.filter((l) =>
    life.unvisitedDistricts?.includes(l.id),
  );
  const newlyExpanded = life.locations.find(
    (l) => l.id === params.get("expanded"),
  );
  const next = upgrade
    ? growthTitles[Math.min(3, upgrade.level + 1) as 1 | 2 | 3]
    : growthTitles[1];
  return (
    <div className="personal-town">
      <header className="town-titlebar">
        <div>
          <h1>{t("我的世界", "My world")}</h1>
          <p>
            {life.locations.length
              ? t("新行程会带来新街区。", "New routines open up new districts.")
              : t(
                  "从你真实的一天开始建城。",
                  "Start a town from your real day.",
                )}
          </p>
        </div>
        <Link
          className="button primary"
          to={plans.length ? "/explore" : "/life"}
        >
          {plans.length
            ? t("继续我的计划", "My action plan")
            : t("补充日常", "Add a routine")}{" "}
          <ArrowRight size={17} />
        </Link>
      </header>
      {newlyExpanded && (
        <div className="town-unlock" role="status">
          <Sprout size={19} />{" "}
          <span>
            {t(
              `新街区已解锁 · ${newlyExpanded.name}`,
              `District unlocked · ${newlyExpanded.name}`,
            )}
          </span>
        </div>
      )}
      {life.locations.length > 0 && (
        <p className="fineprint">
          {t(
            "这座城镇由你的生活地点组成，建筑的位置是象征性的。",
            "This town represents your routines. Building positions are symbolic.",
          )}
        </p>
      )}
      <LifeWorld
        life={life}
        opportunities={[]}
        frameToDistricts
        discoveryLocations={life.locations
          .filter((l) => l.confirmed)
          .map((l) => l.id)}
        onMovementSelect={openMovements}
        selected={selected?.id ?? ""}
        focusId={
          showcase ?? (life.nodes.length > 3 ? newlyExpanded?.id : undefined)
        }
        onSelect={(id) => setSelection(id)}
        onExplore={(id) => {
          void send({ type: "district-visit", id });
          void send({
            type: "local-events",
            events: [
              {
                name: "world_explored",
                key: `${new Date().toISOString().slice(0, 10)}:${id}`,
                at: Date.now(),
              },
            ],
          });
        }}
      />
      {unvisited.length > 0 && (
        <section
          className="town-expedition"
          aria-label={t("未探索街区", "Unexplored districts")}
        >
          <strong>{t("待探索", "To explore")}</strong>
          {unvisited.map((l) => (
            <button
              className="button"
              key={l.id}
              onClick={() => {
                setSelection(l.id);
                setShowcase(l.id);
                void send({ type: "district-visit", id: l.id });
              }}
            >
              {l.name} <ArrowRight size={14} />
            </button>
          ))}
        </section>
      )}
      {selected ? (
        <section
          ref={district}
          className="town-district panel"
          aria-label={t("街区活动", "District activities")}
        >
          <div>
            <p className="discovery-context">
              <MapPin size={16} /> {t("当前街区", "Current district")}
            </p>
            <h2>{selected.name}</h2>
            <p>
              {upgrade
                ? t(
                    `已解锁${growthTitles[upgrade.level]}`,
                    `Unlocked: ${englishGrowth[upgrade.level]}`,
                  )
                : t("还未解锁街区奖励", "No district rewards yet")}
              {upgrade?.level !== 3
                ? t(
                    ` · 下一个变化：${next}`,
                    ` · Next: ${englishGrowth[Math.min(3, (upgrade?.level ?? 0) + 1) as 1 | 2 | 3]}`,
                  )
                : ""}
            </p>
          </div>
          <div className="action-row">
            <Link
              className="button primary"
              to={`/movement?scene=${encodeURIComponent(selected.id)}`}
            >
              {t("在这里动一动", "Move in this district")}
            </Link>
          </div>
          {(districtPlans.length > 0 || choices.length > 0) && (
            <div className="town-movement-list">
              <h3>{t("这里可以做的活动", "Movement for this district")}</h3>
              <ul className="today-recent">
                {districtPlans.map((plan) => (
                  <li key={plan.cue.id}>
                    <Link
                      to={`/move/${plan.quest.id}?cue=${encodeURIComponent(plan.cue.id)}`}
                    >
                      {plan.quest.title}
                    </Link>
                    <span>{plan.cue.evidence}</span>
                  </li>
                ))}
                {choices.map((move) => (
                  <li key={move.id}>
                    <Link
                      to={`/movement?scene=${encodeURIComponent(selected.id)}&pick=${encodeURIComponent(move.id)}`}
                    >
                      {t(...move.name)}
                    </Link>
                    <span>
                      {t(`${move.seconds} 秒`, `${move.seconds} sec`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : (
        life.locations.length > 0 && (
          <p className="town-map-caption">
            <Sprout size={17} />{" "}
            {t(
              "点一栋建筑，查看街区变化和装饰。",
              "Select a building to see its upgrades and decorations.",
            )}
          </p>
        )
      )}
    </div>
  );
}
