import { placeName } from "../i18n/lifeLabels";
import { questTitle } from "../i18n/productContent";
import { useLanguage } from "../i18n/language";
import { useRef, useState } from "react";
import { ArrowRight, MapPin, Sprout } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { activeLife } from "../life/model";
import { availableDiscoveries } from "../life/discoveries";
import type { RoutineChanges } from "../life/routineChanges";
import { englishGrowth, growthTitles, worldGrowth } from "../life/worldGrowth";
import { categoryScene, moveLibrary } from "../life/moveNow";
import { findQuest } from "../data/content";
import { activityPolicy, fitsMovementLimits } from "../life/activities";
import { useStore } from "../state/Store";
import { LifeWorld } from "./LifeWorld";

export function PersonalTown() {
  const { locale, t } = useLanguage();
  const { state, send } = useStore();
  const [params] = useSearchParams();
  const { state: navigation } = useLocation() as {
    state: { routineChanges?: RoutineChanges } | null;
  };
  const life = activeLife(state);
  const [selection, setSelection] = useState<string>();
  const [showcase, setShowcase] = useState<string>();
  const district = useRef<HTMLElement>(null);
  const current = selection ?? params.get("expanded") ?? params.get("scene");
  const selected = life.locations.find((l) => l.id === current);
  const progress = worldGrowth(life);
  const plans = availableDiscoveries(life, Date.now());
  const changes = navigation?.routineChanges;
  const added = new Set(changes?.added);
  const updated = new Set(changes?.updated);
  const addedCount = plans.filter((plan) => added.has(plan.cue.id)).length;
  const updatedCount = plans.filter((plan) => updated.has(plan.cue.id)).length;
  const districtOpportunities = new Map<
    string,
    { total: number; changed: boolean }
  >();
  for (const plan of plans) {
    const id = plan.location.id;
    const previous = districtOpportunities.get(id);
    districtOpportunities.set(id, {
      total: (previous?.total ?? 0) + 1,
      changed:
        !!previous?.changed ||
        added.has(plan.cue.id) ||
        updated.has(plan.cue.id),
    });
  }
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
  const districtPlans = plans.filter(
    (plan) => plan.location.id === selected?.id,
  );
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
        <Link className="button primary" to="/explore">
          {t("我的行动计划", "My action plan")} <ArrowRight size={17} />
        </Link>
      </header>
      {newlyExpanded && (
        <div className="town-unlock" role="status">
          <Sprout size={19} />{" "}
          <span>
            {t(
              `新街区已解锁 · ${placeName(newlyExpanded, locale)}`,
              `District unlocked · ${placeName(newlyExpanded, locale)}`,
            )}
          </span>
        </div>
      )}
      {changes && (
        <p className="town-plan-update" role="status">
          <Sprout size={18} aria-hidden="true" />
          <span>
            <strong>
              {t(
                `新增 ${addedCount} 个运动机会`,
                `${addedCount} new movement ${addedCount === 1 ? "opportunity" : "opportunities"}`,
              )}
              {updatedCount > 0 &&
                t(` · 更新 ${updatedCount} 个`, ` · ${updatedCount} updated`)}
            </strong>
            {addedCount + updatedCount > 0 &&
              t(
                "。金色数字表示该地点有新增或更新的推荐。",
                ". Gold numbers flag places with new or updated recommendations.",
              )}
          </span>
        </p>
      )}
      {!plans.length && life.locations.length > 0 && (
        <p className="town-map-caption">
          {t(
            "暂时没有匹配的运动机会。",
            "There are no matching movement opportunities yet.",
          )}{" "}
          <Link to="/life">{t("补充日常", "Add a routine")}</Link>
        </p>
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
        districtOpportunities={districtOpportunities}
        selected={selected?.id ?? ""}
        focusId={
          showcase ?? (life.nodes.length > 3 ? newlyExpanded?.id : undefined)
        }
        onSelect={openMovements}
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
              {placeName(l, locale)} <ArrowRight size={14} />
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
            <h2>{placeName(selected, locale)}</h2>
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
              {districtPlans.length > 0 && (
                <>
                  <h4>
                    {t("来自日常的推荐", "Recommendations from your routine")}
                  </h4>
                  <ul className="today-recent">
                    {districtPlans.map((plan) => (
                      <li key={plan.cue.id}>
                        <div>
                          <Link
                            to={`/move/${plan.quest.id}?cue=${encodeURIComponent(plan.cue.id)}`}
                          >
                            {questTitle(plan.quest, locale)}
                          </Link>
                          <p className="fineprint">{plan.cue.evidence}</p>
                        </div>
                        {added.has(plan.cue.id) ? (
                          <strong className="town-plan-change">
                            {t("新增", "New")}
                          </strong>
                        ) : updated.has(plan.cue.id) ? (
                          <strong className="town-plan-change">
                            {t("已更新", "Updated")}
                          </strong>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {choices.length > 0 && (
                <h4>{t("动作库备选", "More from the movement library")}</h4>
              )}
              <ul className="today-recent">
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
              "点一栋建筑，查看可用推荐、街区变化和装饰。",
              "Select a building to see available recommendations, upgrades and decorations.",
            )}
          </p>
        )
      )}
    </div>
  );
}
