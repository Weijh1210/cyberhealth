import { Link } from "react-router-dom";
import { BookOpen, MapPin, Sprout } from "lucide-react";
import { PageTitle } from "../components/UI";
import { activeLife, categoryNames } from "../life/model";
import { useStore } from "../state/Store";
import { growthTitles, worldGrowth } from "../life/worldGrowth";
import { movementEvidence } from "../life/evidence";

export function Journal() {
  const { state } = useStore();
  const life = activeLife(state);
  const growth = worldGrowth(life);
  return (
    <>
      <PageTitle
        title="探索图鉴"
        description="你确认过的地点和通过尝试解锁的城镇变化。"
      />
      <section className="panel journal-places">
        <h2>
          <MapPin size={19} /> 已发现地点
        </h2>
        {life.locations.length ? (
          <ul>
            {life.locations.map((location) => {
              const progress = growth.get(location.id);
              return (
                <li key={location.id}>
                  <Link to={`/?scene=${encodeURIComponent(location.id)}`}>
                    {location.name}
                  </Link>
                  <span>
                    {categoryNames[location.category]}{" "}
                    {progress && (
                      <>
                        · <Sprout size={14} /> {growthTitles[progress.level]}
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>
            确认第一个地点后，这里会留下它的足迹。
            <Link to="/life">描述生活</Link>
          </p>
        )}
      </section>
      <section className="panel journal-places">
        <h2>
          <BookOpen size={19} /> 发现背后的知识
        </h2>
        <p>{movementEvidence.explanation}</p>
        <p>{movementEvidence.limitations}</p>
        <a href={movementEvidence.url} target="_blank" rel="noreferrer">
          {movementEvidence.title} · 世卫组织指南
        </a>
      </section>
    </>
  );
}
