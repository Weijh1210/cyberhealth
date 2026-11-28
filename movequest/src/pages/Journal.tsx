import { productText } from "../i18n/productContent";
import { englishCategories, placeName } from "../i18n/lifeLabels";
import { useLanguage } from "../i18n/language";
import { Link } from "react-router-dom";
import { BookOpen, MapPin, Sprout } from "lucide-react";
import { PageTitle } from "../components/UI";
import { activeLife, categoryNames } from "../life/model";
import { useStore } from "../state/Store";
import { englishGrowth, growthTitles, worldGrowth } from "../life/worldGrowth";
import { movementEvidence } from "../life/evidence";

export function Journal() {
  const { locale, t } = useLanguage();
  const { state } = useStore();
  const life = activeLife(state);
  const growth = worldGrowth(life);
  return (
    <>
      <PageTitle
        title={t("探索图鉴", "Discovery journal")}
        description={t(
          "你确认过的地点和通过尝试解锁的城镇变化。",
          "Explore places you confirmed and changes you unlocked in your town.",
        )}
      />
      <section className="panel journal-places">
        <h2>
          <MapPin size={19} /> {t("已发现地点", "Discovered places")}
        </h2>
        {life.locations.length ? (
          <ul>
            {life.locations.map((location) => {
              const progress = growth.get(location.id);
              return (
                <li key={location.id}>
                  <Link to={`/world?scene=${encodeURIComponent(location.id)}`}>
                    {placeName(location, locale)}
                  </Link>
                  <span>
                    {t(
                      categoryNames[location.category],
                      englishCategories[location.category],
                    )}{" "}
                    {progress && (
                      <>
                        · <Sprout size={14} />{" "}
                        {t(
                          growthTitles[progress.level],
                          englishGrowth[progress.level],
                        )}
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>
            {t(
              "确认第一个地点后，这里会留下它的足迹。",
              "Confirm a place to add it to your journal.",
            )}
            <Link to="/life">{t("描述生活", "Describe your routine")}</Link>
          </p>
        )}
      </section>
      <section className="panel journal-places">
        <h2>
          <BookOpen size={19} />{" "}
          {t("发现背后的知识", "Sources behind your discoveries")}
        </h2>
        <p>{productText(movementEvidence.explanation, locale)}</p>
        <p>{productText(movementEvidence.limitations, locale)}</p>
        <a href={movementEvidence.url} target="_blank" rel="noreferrer">
          {productText(movementEvidence.title, locale)}{" "}
          {t("· 世卫组织指南", "· World Health Organization guidance")}
        </a>
      </section>
    </>
  );
}
