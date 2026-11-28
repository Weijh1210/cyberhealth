import { productText } from "../i18n/productContent";
import { useLanguage } from "../i18n/language";
import { garden } from "../domain/engine";
import type { Scene } from "../domain/types";
export function Plant({
  x = 0,
  y = 0,
  size = 1,
  flower = false,
}: {
  x?: number;
  y?: number;
  size?: number;
  flower?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <path
        d="M0 0 Q-9-45 2-91"
        fill="none"
        stroke="#426d4c"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M0-24 C-50-24-51-65-13-52 Q0-46 0-24" fill="#92ad74" />
      <path d="M0-45 C45-40 53-86 17-73 Q4-66 0-45" fill="#5e8d62" />
      <path d="M0-62 C-29-70-35-99-10-92 Q1-87 0-62" fill="#b2c58d" />
      {flower && (
        <g transform="translate(2 -104)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse
              key={a}
              rx="10"
              ry="18"
              transform={`rotate(${a}) translate(0 -11)`}
              fill="#edc5ab"
            />
          ))}
          <circle r="8" fill="#c69c44" />
        </g>
      )}
    </g>
  );
}
export function GardenScene({
  xp = 0,
  compact = false,
}: {
  xp?: number;
  compact?: boolean;
}) {
  const { locale, t } = useLanguage();
  const g = garden(xp);
  return (
    <svg
      className={`garden-art ${compact ? "compact" : ""}`}
      viewBox="0 0 720 340"
      role="img"
      aria-label={t(
        `花园成长：${g.name}，${xp} XP`,
        `Garden growth: ${productText(g.name, locale)}, ${xp} XP`,
      )}
    >
      <rect width="720" height="340" rx="24" fill="#eef1e5" />
      <circle cx="580" cy="67" r="29" fill="#e6d89e" />
      <path
        d="M0 238 Q100 163 217 215 T440 216 T720 196 V340 H0"
        fill="#dce4cb"
      />
      <path d="M0 273 Q160 214 332 255 T720 235 V340 H0" fill="#cbd8b7" />
      <path
        d="M346 340 Q414 296 378 253 Q359 234 393 209"
        fill="none"
        stroke="#f3ebd8"
        strokeWidth="35"
      />
      <g stroke="#b0bda0" strokeWidth="6" strokeLinecap="round">
        <path d="M62 228V183m32 41v-44m32 40v-43m-73 17 86-5m-86 23 86-5" />
        <path d="M575 214v-43m32 46v-43m32 48v-43m-74 4 86 12m-86 8 86 12" />
      </g>
      <ellipse
        cx="308"
        cy="274"
        rx="159"
        ry="34"
        fill="#b2c199"
        opacity=".45"
      />
      <path d="M159 252 292 218 447 251 316 291Z" fill="#ae8564" />
      <path d="M159 252v17l157 42v-20Z" fill="#957451" />
      <path d="m316 291 131-40v17l-131 43Z" fill="#b5906d" />
      <path d="m177 251 115-26 135 26-113 31Z" fill="#755c46" />
      <g className="plant-growth" key={g.index}>
        {g.index === 0 ? (
          <g>
            <ellipse cx="297" cy="247" rx="9" ry="5" fill="#d7b38b" />
            <path d="m301 245 4-8" stroke="#426d4c" strokeWidth="3" />
            <path d="M304 238q-15-14-15-2t15 2" fill="#8eaa71" />
          </g>
        ) : (
          <>
            <Plant
              x={293}
              y={249}
              size={g.index === 1 ? 0.65 : 0.95}
              flower={g.index >= 3}
            />
            {g.index >= 2 && (
              <>
                <Plant x={218} y={250} size={0.52} flower={g.index >= 4} />
                <Plant x={372} y={254} size={0.7} flower={g.index >= 3} />
              </>
            )}
            {g.index >= 4 && (
              <>
                <Plant x={259} y={270} size={0.52} flower />
                <Plant x={327} y={272} size={0.48} flower />
              </>
            )}
          </>
        )}
      </g>
      <g transform="translate(495 264)">
        <path d="M0-22h35l-5 34H6Z" fill="#ba8a6b" />
        <Plant x={17} y={-19} size={0.45} />
        <path d="m38-7 23-11v10L38 2" fill="#ba8a6b" />
        <path
          d="M0-14q-24-12-20 11Q-17 8 6 0"
          fill="none"
          stroke="#ba8a6b"
          strokeWidth="7"
        />
      </g>
      <g fill="#f7f8f2" opacity=".9">
        <ellipse cx="146" cy="69" rx="36" ry="11" />
        <ellipse cx="171" cy="62" rx="21" ry="15" />
        <ellipse cx="449" cy="99" rx="27" ry="9" />
      </g>
      <g fill="#8c9e74">
        <ellipse cx="80" cy="291" rx="13" ry="5" />
        <ellipse cx="610" cy="287" rx="18" ry="5" />
        <ellipse cx="565" cy="315" rx="9" ry="4" />
      </g>
    </svg>
  );
}
export function SceneArt({ scene }: { scene: Scene }) {
  return (
    <svg
      viewBox="0 0 300 110"
      aria-hidden="true"
      className={`scene-art ${scene}`}
    >
      <rect width="300" height="110" fill="currentColor" />
      {scene === "campus" ? (
        <g fill="#e2dfc9" stroke="#687c62" strokeWidth="2">
          <path d="M60 92V41l80-29 80 29v51Z" />
          <path d="M45 44h190M81 54v33m30-33v33m30-33v33m30-33v33m30-33v33" />
          <circle cx="140" cy="32" r="8" fill="#f8f6ed" />
        </g>
      ) : scene === "office" ? (
        <g fill="#e6dfce" stroke="#747c6d" strokeWidth="2">
          <path d="M68 96V19h94v77m4-59h58v59" />
          {[87, 117, 146, 183, 208].map((x, i) => (
            <path key={x} d={`M${x} ${i < 3 ? 33 : 49}v10m0 12v10m0 12v8`} />
          ))}
        </g>
      ) : scene === "home" ? (
        <g stroke="#8e7965" strokeWidth="2" fill="#ebe3d2">
          <path d="m78 48 68-38 68 38v50H78Z" />
          <path d="M128 98V63h35v35m-65-43h18v22H98m81-22h18v22h-18" />
        </g>
      ) : (
        <g>
          <path d="m20 103 67-75 59 75m-22 0 79-92 77 92" fill="#a7ba8d" />
          <path
            d="M149 110q-30-40 30-72"
            fill="none"
            stroke="#e8e3c7"
            strokeWidth="12"
          />
        </g>
      )}
      <Plant x={255} y={110} size={0.6} />
      <Plant x={42} y={111} size={0.4} />
    </svg>
  );
}
