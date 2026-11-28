import { placeName } from "../i18n/lifeLabels";
import { productText, questTitle } from "../i18n/productContent";
import { useLanguage } from "../i18n/language";
import {
  earnedDecorations,
  englishGrowth,
  growthTitles,
  isDecorationUnlocked,
  worldGrowth,
} from "../life/worldGrowth";
import { roadPoints, districtFor } from "../life/worldLayout";
import { useRef, useState, useEffect, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trees,
  Flower2,
  Armchair,
  Footprints,
  Coffee,
  ArrowRight,
  LampDesk,
  Waves,
  Sprout,
  Undo2,
  Trash2,
  Flag,
  Store,
} from "lucide-react";
import {
  type Decoration,
  type LifeState,
  type WorldNode,
  type Category,
} from "../life/model";
import type { Opportunity } from "../life/recommend";
import { useStore } from "../state/Store";
const p = (x: number, z: number, h = 0) => [
  x * 0.82 - z * 0.82,
  (x + z) * 0.41 - h,
];
const decorationSlots = [
  [-64, 67],
  [-21, 86],
  [28, 77],
  [77, 47],
  [-83, 22],
  [55, -21],
];
const pts = (points: number[][]) => points.map((v) => v.join(",")).join(" ");
function Box({
  x = 0,
  z = 0,
  w = 90,
  d = 70,
  h = 60,
  y = 0,
  colors = ["#f0e8d4", "#d9cdb5", "#b7bda5"],
}: {
  x?: number;
  z?: number;
  w?: number;
  d?: number;
  h?: number;
  y?: number;
  colors?: string[];
}) {
  const a = p(x, z, y + h),
    b = p(x + w, z, y + h),
    c = p(x + w, z + d, y + h),
    e = p(x, z + d, y + h);
  return (
    <g>
      <polygon
        points={pts([e, c, p(x + w, z + d, y), p(x, z + d, y)])}
        fill={colors[1]}
      />
      <polygon
        points={pts([b, c, p(x + w, z + d, y), p(x + w, z, y)])}
        fill={colors[2]}
      />
      <polygon points={pts([a, b, c, e])} fill={colors[0]} />
      <polyline
        points={pts([a, b, c, e])}
        fill="none"
        stroke="#fff9e7"
        strokeWidth="1.2"
        opacity=".55"
      />
      <line
        x1={c[0]}
        y1={c[1]}
        x2={p(x + w, z + d, y)[0]}
        y2={p(x + w, z + d, y)[1]}
        stroke="#294b3d"
        opacity=".16"
        strokeWidth=".85"
      />
    </g>
  );
}
function Tree({
  x = 0,
  y = 0,
  scale = 1,
  pink = false,
}: {
  x?: number;
  y?: number;
  scale?: number;
  pink?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="8" cy="3" rx="22" ry="9" fill="#547b5b" opacity=".17" />
      <path
        d="M0 0V-42M0-18l-12-13M0-23l13-12"
        stroke="#9b7a58"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <ellipse
        className="world-leaves"
        cy="-49"
        rx="23"
        ry="26"
        fill={pink ? "#d9a8a3" : "#719d68"}
      />
      <ellipse
        cx="-13"
        cy="-40"
        rx="17"
        ry="20"
        fill={pink ? "#e7bcb5" : "#8cb57b"}
      />
      <ellipse
        cx="7"
        cy="-56"
        rx="16"
        ry="21"
        fill={pink ? "url(#town-blossom)" : "url(#town-canopy)"}
      />
    </g>
  );
}
function Bench({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-18-7 9 7 22 0-5-14Z" fill="#cba579" />
      <path d="M-18-16 9-2v8l-27-14Z" fill="#dbb78c" />
      <path d="M-14-6v13M8 6v11M19 0v11" stroke="#577269" strokeWidth="3" />
    </g>
  );
}
function Flowers({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[-12, 0, 12].map((n, i) => (
        <g key={n} transform={`translate(${n} ${Math.abs(n) * 0.3})`}>
          <path d="M0 0v-10m0 7 5-4" stroke="#5b8b60" strokeWidth="2" />
          <circle cy="-11" r="4" fill={i === 1 ? "#f4d27f" : "#dfa9a7"} />
          <circle cy="-11" r="1.5" fill="#fff4cb" />
        </g>
      ))}
    </g>
  );
}
function Building({
  category,
  variant,
}: {
  category: Category;
  variant: number;
}) {
  const { t } = useLanguage();
  if (category === "park")
    return (
      <g>
        <Box
          x={-58}
          z={-48}
          w={116}
          d={96}
          h={5}
          colors={["#b7cb8d", "#9ebc78", "#8ba96c"]}
        />
        <ellipse cy="-3" rx="31" ry="14" fill="#8fbbb7" />
        <ellipse cy="-4" rx="26" ry="10" fill="url(#town-pond)" />
        <path
          className="pond-ripple"
          d="M-19-4q9-6 19 0m1 4q8-4 17-1"
          fill="none"
          stroke="#e5f1da"
          strokeWidth="1.5"
          opacity=".8"
        />
        <path
          d="M-31-3q-6-5-2-10m1 13v-9m62 4q3-9 8-10m-6 13 7-6"
          stroke="#638a63"
          strokeWidth="2"
          fill="none"
        />
        <g transform="translate(8 -4)">
          <ellipse rx="5" ry="2.1" fill="#679969" />
          <circle cy="-2" r="1.9" fill="#f1beb6" />
        </g>
        <path
          d="M-48 9q38-20 76 17"
          fill="none"
          stroke="#f1e1bb"
          strokeWidth="12"
        />
        <Tree x={-47} y={-13} scale={0.8} />
        <Tree x={40} y={-8} scale={0.95} pink />
        <Bench x={9} y={31} />
        <Flowers x={-35} y={24} />
      </g>
    );
  if (category === "library")
    return (
      <g>
        <Box
          x={-56}
          z={-43}
          w={112}
          d={86}
          h={65}
          colors={["#bebea5", "#78a69e", "#4c7b76"]}
        />
        <Box
          x={-60}
          z={-47}
          w={120}
          d={94}
          y={65}
          h={8}
          colors={["#b9d0c3", "#71938d", "#52716c"]}
        />
        <Box
          x={-40}
          z={-26}
          w={67}
          d={52}
          y={73}
          h={6}
          colors={["#e8ddc4", "#d6c4a1", "#b5a17e"]}
        />
        <polygon
          points={pts([
            p(-52, -40, 74),
            p(-14, -40, 74),
            p(-14, -19, 83),
            p(-52, -19, 83),
          ])}
          fill="url(#town-glass)"
          stroke="#e3dfc6"
          strokeWidth="1.5"
        />
        {[-47, -35, -23].map((x) => (
          <line
            key={x}
            x1={p(x, -40, 74)[0]}
            y1={p(x, -40, 74)[1]}
            x2={p(x, -19, 83)[0]}
            y2={p(x, -19, 83)[1]}
            stroke="#dde8d4"
            strokeWidth="1"
          />
        ))}
        {[-32, -12, 8, 28].map((z) => (
          <polygon
            key={z}
            points={pts([
              p(57, z, 22),
              p(57, z + 13, 22),
              p(57, z + 13, 49),
              p(57, z, 49),
            ])}
            fill="url(#town-glass)"
            stroke="#3d6863"
            strokeWidth="1.7"
          />
        ))}
        <Box
          x={-22}
          z={43}
          w={46}
          d={22}
          y={39}
          h={5}
          colors={["#eee0bb", "#c8b692", "#a99775"]}
        />
        <polygon
          points={pts([
            p(-9, 44, 6),
            p(11, 44, 6),
            p(11, 44, 39),
            p(-9, 44, 39),
          ])}
          fill="url(#town-glass)"
          stroke="#49736d"
          strokeWidth="2"
        />
        {[-44, -23, 7, 28].map((x) => (
          <polygon
            key={x}
            points={pts([
              p(x, 44, 21),
              p(x + 16, 44, 21),
              p(x + 16, 44, 52),
              p(x, 44, 52),
            ])}
            fill="#e4e5c4"
            stroke="#638681"
            strokeWidth="2"
          />
        ))}
        <Box
          x={-20}
          z={40}
          w={43}
          d={17}
          h={7}
          colors={["#e4d5bc", "#c9bda5", "#b3a991"]}
        />
        <text
          y="-77"
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          fill="#2c514a"
        >
          {t("图书馆", "LIBRARY")}
        </text>
        <WorldDecoration kind="planter" x={-29} y={31} />
        <WorldDecoration kind="planter" x={30} y={37} />
      </g>
    );
  if (category === "campus")
    return (
      <g>
        <Box
          x={-56}
          z={-42}
          w={112}
          d={84}
          h={83}
          colors={["#d9c9ad", "#cf9b7f", "#b17e6c"]}
        />
        <Box
          x={-63}
          z={-49}
          w={126}
          d={98}
          y={83}
          h={10}
          colors={["#90978e", "#78867e", "#64786c"]}
        />
        <polygon
          points={pts([p(-55, 48, 88), p(0, 48, 122), p(55, 48, 88)])}
          fill="#e8d9b7"
        />
        <Box
          x={-18}
          z={-8}
          w={36}
          d={24}
          y={93}
          h={10}
          colors={["#d6d3c1", "#b8bfad", "#a1ae9a"]}
        />
        {[-38, -17, 4, 25].map((x) => (
          <g key={x}>
            <polygon
              points={pts([
                p(x, 43, 20),
                p(x + 12, 43, 20),
                p(x + 12, 43, 64),
                p(x, 43, 64),
              ])}
              fill="#e9dfc1"
            />
            <polygon
              points={pts([
                p(x + 2, 44, 33),
                p(x + 10, 44, 33),
                p(x + 10, 44, 61),
                p(x + 2, 44, 61),
              ])}
              fill="#739f9f"
            />
          </g>
        ))}
        <Box
          x={-27}
          z={44}
          w={54}
          d={16}
          h={8}
          colors={["#e9dcbf", "#c9baa0", "#b0aa94"]}
        />
        <Box
          x={-31}
          z={55}
          w={62}
          d={13}
          h={4}
          colors={["#e9dcbf", "#c9baa0", "#b0aa94"]}
        />
        <text
          x="0"
          y="-91"
          fill="#4a6855"
          fontSize="9"
          fontWeight="700"
          textAnchor="middle"
        >
          {t("学校", "ACADEMY")}
        </text>
        <Tree x={-74} y={12} scale={0.55} />
        <Tree x={65} y={34} scale={0.55} />
      </g>
    );
  if (category === "subway" || category === "bus")
    return (
      <g>
        <Box
          x={-52}
          z={-36}
          w={104}
          d={72}
          h={9}
          colors={["#e9dfcd", "#c9bfad", "#b3b9a7"]}
        />
        <Box
          x={-42}
          z={-22}
          w={84}
          d={44}
          h={48}
          colors={["#bed6cf", "#8db6b2", "#638f91"]}
        />
        <Box
          x={-48}
          z={-28}
          w={96}
          d={56}
          y={48}
          h={7}
          colors={["#e7e9d8", "#d3dbca", "#a1bbaf"]}
        />
        <path
          d="M-30-16 4 2 31-12"
          stroke="#e9ead8"
          strokeWidth="3"
          fill="none"
        />
        <text
          y="-33"
          textAnchor="middle"
          fill="#294d4d"
          fontWeight="700"
          fontSize="12"
        >
          {category === "subway" ? t("地铁", "METRO") : t("公交", "BUS")}
        </text>
        <Bench x={-38} y={16} />
      </g>
    );
  const tall = category === "office";
  const house = category === "home";
  const h = tall ? 140 : house ? 88 : 64,
    w = tall ? 100 : 94,
    d = tall ? 76 : 78;
  const palette = house
    ? ["#f7e9c9", "#e7d4ae", "#c8d5c2"]
    : tall
      ? ["#dbe6dd", "#94b9bb", "#67969d"]
      : ["#eddfbd", "#dfbc8a", "#b7c5a6"];
  return (
    <g>
      <Box
        x={-w / 2 - 9}
        z={-d / 2 - 9}
        w={w + 18}
        d={d + 18}
        h={6}
        colors={["#ede5d3", "#cfc2aa", "#b5bba5"]}
      />
      <Box x={-w / 2} z={-d / 2} w={w} d={d} y={6} h={h} colors={palette} />
      {tall ? (
        <g>
          <Box
            x={-w / 2 - 4}
            z={-d / 2 - 4}
            w={w + 8}
            d={d + 8}
            y={h + 6}
            h={7}
            colors={["#eef0df", "#c9d6ca", "#aabfb7"]}
          />
          <Box
            x={-20}
            z={-18}
            w={31}
            d={25}
            y={h + 13}
            h={15}
            colors={["#c1cec2", "#a4b5ae", "#8a9d98"]}
          />
          {[0, 1, 2, 3].flatMap((row) =>
            [0, 1, 2, 3].map((col) => {
              const y = 27 + row * 29;
              const a = p(-w / 2 + 8 + col * 23, d / 2, y),
                b = p(-w / 2 + 25 + col * 23, d / 2, y + 20);
              const c = p(w / 2, -d / 2 + 7 + col * 17, y),
                e = p(w / 2, -d / 2 + 19 + col * 17, y + 20);
              return (
                <g key={`${row}-${col}`}>
                  <polygon
                    points={pts([
                      a,
                      p(-w / 2 + 25 + col * 23, d / 2, y),
                      b,
                      p(-w / 2 + 8 + col * 23, d / 2, y + 20),
                    ])}
                    fill={
                      (row + col + variant) % 5 === 0 ? "#f1dfa3" : "#d0e5dd"
                    }
                    stroke="#abc8c3"
                    strokeWidth="1.2"
                  />
                  <polygon
                    points={pts([
                      c,
                      p(w / 2, -d / 2 + 19 + col * 17, y),
                      e,
                      p(w / 2, -d / 2 + 7 + col * 17, y + 20),
                    ])}
                    fill="#a6cbc8"
                    stroke="#83abae"
                    strokeWidth="1"
                  />
                </g>
              );
            }),
          )}
        </g>
      ) : house ? (
        <g>
          <polygon
            points={pts([
              p(-57, -48, h + 5),
              p(0, -48, h + 47),
              p(0, 48, h + 47),
              p(-57, 48, h + 5),
            ])}
            fill="#e6a08a"
          />
          <polygon
            points={pts([
              p(0, -48, h + 47),
              p(57, -48, h + 5),
              p(57, 48, h + 5),
              p(0, 48, h + 47),
            ])}
            fill="#c67e70"
          />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              d={`M${p(0, -46 + i * 18, h + 47).join(" ")}L${p(57, -46 + i * 18, h + 5).join(" ")}`}
              stroke="#b96e62"
              strokeWidth="2"
            />
          ))}
          <polygon
            points={pts([
              p(-47, 39, h + 6),
              p(0, 39, h + 43),
              p(47, 39, h + 6),
            ])}
            fill="#f4deb2"
          />
          {[25, 65].map((y) => (
            <g key={y}>
              {[-27, 12].map((x) => (
                <polygon
                  key={x}
                  points={pts([
                    p(x, 40, y),
                    p(x + 18, 40, y),
                    p(x + 18, 40, y + 20),
                    p(x, 40, y + 20),
                  ])}
                  fill="#8bafb0"
                  stroke="#fbefcf"
                  strokeWidth="4"
                />
              ))}
            </g>
          ))}
          <Box
            x={17}
            z={-24}
            w={14}
            d={16}
            y={h + 25}
            h={28}
            colors={["#d9ae91", "#bd927b", "#ae8274"]}
          />
        </g>
      ) : (
        <g>
          <Box
            x={-53}
            z={-45}
            w={106}
            d={90}
            y={h + 6}
            h={12}
            colors={["#ad927d", "#967b65", "#7e715e"]}
          />
          {[-34, -14, 6, 26].map((x, i) => (
            <polygon
              key={x}
              points={pts([
                p(x, 39, 46),
                p(x + 20, 39, 46),
                p(x + 20, 55, 34),
                p(x, 55, 34),
              ])}
              fill={i % 2 ? "#faf0d5" : "#91b49b"}
            />
          ))}
          <polygon
            points={pts([
              p(-33, 40, 10),
              p(33, 40, 10),
              p(33, 40, 43),
              p(-33, 40, 43),
            ])}
            fill="#7d9f94"
            stroke="#f4e9cc"
            strokeWidth="4"
          />
          <text
            x="0"
            y={-h - 14}
            textAnchor="middle"
            fill="#fff9e8"
            fontSize="10"
            fontWeight="700"
          >
            {category === "cafe"
              ? t("咖啡馆", "CAFÉ")
              : category === "restaurant"
                ? t("餐厅", "KITCHEN")
                : category === "shop"
                  ? t("商店", "MARKET")
                  : category === "gym"
                    ? t("运动场", "STUDIO")
                    : t("生活", "LIFE")}
          </text>
        </g>
      )}
      <polygon
        points={pts([
          p(-7, d / 2 + 1, 7),
          p(10, d / 2 + 1, 7),
          p(10, d / 2 + 1, 34),
          p(-7, d / 2 + 1, 34),
        ])}
        fill="#557f79"
      />
      <Tree x={-65} y={14} scale={0.47} />
      <Flowers x={36} y={39} />
    </g>
  );
}
function WorldDecoration({
  kind,
  x,
  y,
}: {
  kind: Decoration["kind"];
  x: number;
  y: number;
}) {
  if (kind === "tree") return <Tree x={x} y={y} scale={0.6} />;
  if (kind === "flowers") return <Flowers x={x} y={y} />;
  if (kind === "bench") return <Bench x={x} y={y} />;
  if (kind === "pennant")
    return (
      <g transform={`translate(${x} ${y})`}>
        <ellipse cx="4" rx="14" ry="5" fill="#47684f" opacity=".24" />
        <path
          d="M-12 0v-35M12 7v-33"
          stroke="#886e51"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M-12-32Q0-22 12-26"
          fill="none"
          stroke="#b0935d"
          strokeWidth="1.5"
        />
        <path d="m-10-31 7 3-5 7z" fill="#d78264" />
        <path d="m-3-28 7 2-4 7z" fill="#e8ba57" />
        <path d="m4-26 7-1-2 8z" fill="#6b9d87" />
      </g>
    );
  if (kind === "pergola")
    return (
      <g transform={`translate(${x} ${y}) scale(.78)`}>
        <Box
          x={-19}
          z={-17}
          w={38}
          d={34}
          h={5}
          colors={["#ecce9a", "#c8a470", "#b19167"]}
        />
        <path
          d="M-28-3v-26M0 12v-25M27-4v-24"
          stroke="#946d52"
          strokeWidth="4"
        />
        <Box
          x={-21}
          z={-19}
          w={42}
          d={38}
          y={31}
          h={8}
          colors={["#dd967e", "#b77263", "#a66859"]}
        />
        <path
          d="M-27-29Q-10-34 3-17Q13-14 29-25"
          fill="none"
          stroke="#689367"
          strokeWidth="3"
        />
        <circle cx="-15" cy="-29" r="3" fill="#f5d1ce" />
        <circle cx="9" cy="-19" r="3" fill="#ead683" />
      </g>
    );
  if (kind === "lamp")
    return (
      <g transform={`translate(${x} ${y})`}>
        <ellipse rx="9" ry="4" fill="#75937a" />
        <path d="M0 0v-49m-8 0H8" stroke="#6f8979" strokeWidth="4" />
        <path
          d="M-8-49v-13H8v13Z"
          fill="#f5d28c"
          stroke="#66806f"
          strokeWidth="2"
        />
        <path d="m-11-62 11-9 11 9Z" fill="#7d9a86" />
      </g>
    );
  if (kind === "fountain")
    return (
      <g transform={`translate(${x} ${y})`}>
        <ellipse rx="24" ry="12" fill="#d4d4be" />
        <ellipse cy="-3" rx="20" ry="8" fill="#83b7b8" />
        <ellipse cy="-5" rx="13" ry="5" fill="#b2d9d2" />
        <path
          className="fountain-water"
          d="M0-6v-24m0 7q-9-13-13 0m13 0q9-13 13 0"
          stroke="#d6ece2"
          strokeWidth="2.5"
          fill="none"
        />
      </g>
    );
  return (
    <g transform={`translate(${x} ${y})`}>
      <Box
        x={-14}
        z={-10}
        w={28}
        d={20}
        h={11}
        colors={["#927961", "#b79a76", "#987e60"]}
      />
      <Tree y={-8} scale={0.35} />
      <Flowers x={-9} y={-9} />
    </g>
  );
}
export function LifeWorld({
  life,
  opportunities,
  discoveryLocations = [],
  districtOpportunities,
  onSelect,
  onExplore,
  frameToDistricts = false,
  focusId,
  selected,
}: {
  life: LifeState;
  opportunities: Opportunity[];
  discoveryLocations?: string[];
  districtOpportunities?: ReadonlyMap<
    string,
    { total: number; changed: boolean }
  >;
  onSelect: (id: string) => void;
  onExplore?: (id: string) => void;
  frameToDistricts?: boolean;
  focusId?: string;
  selected: string;
}) {
  const { locale, t } = useLanguage();
  const { send, busy } = useStore();
  const growth = worldGrowth(life);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [decor, setDecor] = useState<Decoration["kind"]>("tree");
  const [editing, setEditing] = useState("");
  const decorationPointer = useRef<{ x: number; y: number } | null>(null);
  const mapLayer = useRef<SVGGElement>(null);
  const item = life.decorations.find((d) => d.id === editing);
  const freeSlots = (nodeId: string) =>
    decorationSlots
      .map((_, slot) => slot)
      .filter(
        (slot) =>
          !life.decorations.some((d) => d.nodeId === nodeId && d.slot === slot),
      );
  const moveDecoration = async (id: string, nodeId: string, slot: number) => {
    if (busy || !freeSlots(nodeId).includes(slot)) return;
    if (await send({ type: "decoration-move", id, nodeId, slot }))
      setMessage(t("装饰已移到新位置。", "Decoration moved."));
  };
  const nextSlot = selected
    ? freeSlots(selected).sort(
        (a, b) =>
          ((a - (item?.slot ?? -1) + 6) % 6) -
          ((b - (item?.slot ?? -1) + 6) % 6),
      )[0]
    : undefined;
  const animation = useRef(0);
  useEffect(() => () => cancelAnimationFrame(animation.current), []);
  const [message, setMessage] = useState("");
  const drag = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    distance?: number;
    scale: number;
  } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const ground = life.nodes.length
    ? {
        x: Math.min(...life.nodes.map((node) => node.x)) - 100,
        z: Math.min(...life.nodes.map((node) => node.z)) - 100,
        right: Math.max(...life.nodes.map((node) => node.x)) + 100,
        back: Math.max(...life.nodes.map((node) => node.z)) + 100,
      }
    : undefined;
  const groundCorners = ground
    ? [
        p(ground.x, ground.z, -8),
        p(ground.right, ground.z, -20),
        p(ground.x, ground.back, -20),
        p(ground.right, ground.back, -20),
      ]
    : [];
  const projected = life.nodes.map((n) => p(n.x, n.z));
  const fit = frameToDistricts && projected.length > 0;
  const minX = Math.min(
    fit ? Infinity : -210,
    ...projected.map((v) => v[0] - 173),
    ...groundCorners.map(([x]) => x - 32),
  );
  const maxX = Math.max(
    fit ? -Infinity : 210,
    ...projected.map((v) => v[0] + 173),
    ...groundCorners.map(([x]) => x + 32),
  );
  const minY = Math.min(
    fit ? Infinity : -190,
    ...projected.map((v) => v[1] - 216),
    ...groundCorners.map(([, y]) => y - 32),
  );
  const maxY = Math.max(
    fit ? -Infinity : 160,
    ...projected.map((v) => v[1] + 129),
    ...groundCorners.map(([, y]) => y + 44),
  );
  const width = maxX - minX,
    height = maxY - minY;
  const center = [(minX + maxX) / 2, (minY + maxY) / 2];
  const focus = life.nodes.find((node) => node.id === focusId);
  const destination = focus ? p(focus.x, focus.z) : null;
  const dx = destination ? center[0] - destination[0] : null;
  const dy = destination ? center[1] - destination[1] + 26 : null;
  useEffect(() => {
    if (dx === null || dy === null) return;
    const frame = requestAnimationFrame(() =>
      setView({ x: dx * 1.2, y: dy * 1.2, scale: 1.2 }),
    );
    return () => cancelAnimationFrame(frame);
  }, [dx, dy]);
  const animateView = (target: typeof view) => {
    cancelAnimationFrame(animation.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setView(target);
      return;
    }
    const from = { ...view },
      started = performance.now();
    const frame = (at: number) => {
      const t = Math.min(1, (at - started) / 320),
        ease = 1 - (1 - t) ** 3;
      setView({
        x: from.x + (target.x - from.x) * ease,
        y: from.y + (target.y - from.y) * ease,
        scale: from.scale + (target.scale - from.scale) * ease,
      });
      if (t < 1) animation.current = requestAnimationFrame(frame);
    };
    animation.current = requestAnimationFrame(frame);
  };
  const zoom = (factor: number) =>
    animateView({
      ...view,
      scale: Math.min(2.8, Math.max(0.6, view.scale * factor)),
    });
  const select = (id: string) => {
    onSelect(id);
    onExplore?.(id);
    const node = life.nodes.find((n) => n.id === id);
    if (node) {
      const [x, y] = p(node.x, node.z);
      const scale = Math.max(view.scale, 1.1);
      animateView({
        x: (center[0] - x) * scale,
        y: (center[1] - y + 30) * scale,
        scale,
      });
    }
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest("[data-interactive]")) return;
    cancelAnimationFrame(animation.current);
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const values = [...pointers.current.values()];
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      vx: view.x,
      vy: view.y,
      scale: view.scale,
      distance:
        values.length === 2
          ? Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y)
          : undefined,
    };
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag.current || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = [...pointers.current.values()],
      d = drag.current;
    if (v.length === 2 && d.distance) {
      setView((old) => ({
        ...old,
        scale: Math.min(
          2.8,
          Math.max(
            0.6,
            (d.scale * Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y)) /
              d.distance!,
          ),
        ),
      }));
      return;
    }
    const r = e.currentTarget.getBoundingClientRect(),
      factor = Math.max(width / r.width, height / r.height);
    setView((old) => ({
      ...old,
      x: d.vx + (e.clientX - d.x) * factor,
      y: d.vy + (e.clientY - d.y) * factor,
    }));
  };
  const end = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    drag.current = null;
  };
  const gardens: { x: number; z: number }[] = [];
  if (life.nodes.length) {
    for (
      let x = Math.min(...life.nodes.map((n) => n.x));
      x <= Math.max(...life.nodes.map((n) => n.x));
      x += 190
    )
      for (
        let z = Math.min(...life.nodes.map((n) => n.z));
        z <= Math.max(...life.nodes.map((n) => n.z));
        z += 190
      )
        if (
          !life.nodes.some((n) => n.x === x && n.z === z) &&
          gardens.length < 20
        )
          gardens.push({ x, z });
  }
  const sorted = [...life.nodes].sort((a, b) => a.x + a.z - b.x - b.z);
  function nodeById(id: string): WorldNode {
    return life.nodes.find((n) => n.id === id)!;
  }
  return (
    <section
      className={`life-world ${life.theme ?? "garden"}`}
      aria-label={t("我的生活城镇", "My living town")}
    >
      <div className="world-top">
        <div>
          <h2>{t("我的生活城镇", "My living town")}</h2>
          <p>
            {t(
              "你的日常，在这里慢慢展开。",
              "A town that grows with your day.",
            )}
          </p>
        </div>
        <span>
          {t(
            `${life.locations.length} 个地点 · ${life.edges.length} 条连接`,
            `${life.locations.length} places · ${life.edges.length} links`,
          )}
        </span>
      </div>
      <div className="world-theme">
        <button
          aria-pressed={life.theme !== "twilight"}
          onClick={() => void send({ type: "life-theme", theme: "garden" })}
        >
          {t("日光花园", "Daylight")}
        </button>
        <button
          aria-pressed={life.theme === "twilight"}
          onClick={() => void send({ type: "life-theme", theme: "twilight" })}
        >
          {t("暮色街区", "Twilight")}
        </button>
      </div>
      <div className="world-canvas">
        <svg
          viewBox={`${minX} ${minY} ${width} ${height}`}
          role="group"
          aria-label={t(
            "可拖动、缩放的等距生活地图",
            "Isometric map. Drag to pan or use the zoom buttons.",
          )}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            const delta: Record<string, number[]> = {
              ArrowLeft: [25, 0],
              ArrowRight: [-25, 0],
              ArrowUp: [0, 25],
              ArrowDown: [0, -25],
            };
            if (delta[e.key]) {
              e.preventDefault();
              setView((v) => ({
                ...v,
                x: v.x + delta[e.key][0],
                y: v.y + delta[e.key][1],
              }));
            }
            if (e.key === "+") zoom(1.2);
            if (e.key === "-") zoom(1 / 1.2);
          }}
          tabIndex={0}
        >
          <defs>
            <linearGradient
              id="town-grass"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
              gradientUnits="objectBoundingBox"
            >
              <stop stopColor="#e0e8b3" />
              <stop offset="1" stopColor="#9dbb82" />
            </linearGradient>
            <radialGradient id="town-canopy" cx=".3" cy=".24" r=".75">
              <stop stopColor="#c0d998" />
              <stop offset="1" stopColor="#79a978" />
            </radialGradient>
            <radialGradient id="town-blossom" cx=".3" cy=".24" r=".75">
              <stop stopColor="#ffe7cc" />
              <stop offset="1" stopColor="#d89d9a" />
            </radialGradient>
            <linearGradient id="town-pond" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#bce5d8" />
              <stop offset="1" stopColor="#659eab" />
            </linearGradient>
            <linearGradient id="town-glass" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#c2e8de" />
              <stop offset=".43" stopColor="#7eadaf" />
              <stop offset=".47" stopColor="#c6ded0" />
              <stop offset="1" stopColor="#6c8a88" />
            </linearGradient>
            <pattern
              id="town-paving"
              width="12"
              height="6"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0 0H12M0 3H12M6 0v3M2 3v3"
                stroke="#6d8263"
                strokeOpacity=".22"
                strokeWidth=".5"
              />
            </pattern>
            <filter
              id="world-shadow"
              x="-40%"
              y="-40%"
              width="180%"
              height="200%"
            >
              <feDropShadow
                dx="4"
                dy="14"
                stdDeviation="9"
                floodColor="#446d60"
                floodOpacity=".15"
              />
            </filter>
          </defs>
          <g
            ref={mapLayer}
            transform={`translate(${view.x + center[0]} ${view.y + center[1]}) scale(${view.scale}) translate(${-center[0]} ${-center[1]})`}
          >
            {ground && (
              <g>
                <Box
                  x={ground.x}
                  z={ground.z}
                  w={ground.right - ground.x}
                  d={ground.back - ground.z}
                  h={12}
                  y={-20}
                  colors={["url(#town-grass)", "#8ca881", "#617f65"]}
                />
                {gardens.some((n) => n.x === 0 && n.z === 0) && (
                  <>
                    <WorldDecoration kind="fountain" x={0} y={-4} />
                    <Tree x={-48} y={-20} scale={0.6} />
                    <Bench x={45} y={17} />
                  </>
                )}
              </g>
            )}
            {gardens.map(({ x, z }, i) => (
              <g
                key={`garden_${x}_${z}`}
                transform={`translate(${p(x, z).join(" ")})`}
                aria-hidden="true"
              >
                <path
                  d="M-54 4Q0-25 55 14"
                  stroke="#dcd9bc"
                  strokeWidth="11"
                  fill="none"
                />
                <Tree x={-44} y={-12} scale={0.85} pink={i % 3 === 0} />
                <Tree x={21} y={-31} scale={0.72} />
                <Tree x={55} y={14} scale={0.55} />
                <Flowers x={-22} y={23} />
                <Flowers x={-4} y={32} />
                <Bench x={27} y={31} />
                {i % 3 === 0 && (
                  <g transform="translate(8 14)">
                    <g className="town-resident">
                      <ellipse
                        cy="3"
                        rx="6"
                        ry="3"
                        fill="#5f7a5d"
                        opacity=".24"
                      />
                      <path
                        d="M-2-4v6M2-4v6"
                        stroke="#47584e"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path d="M-5-3L-3-12H3L5-3Z" fill="#ce8769" />
                      <circle cy="-15" r="4.4" fill="#bb875f" />
                      <path
                        d="M-4-15Q-3-22 4-17"
                        stroke="#5b4c3e"
                        strokeWidth="2"
                      />
                    </g>
                  </g>
                )}
              </g>
            ))}
            {sorted.map((n) => (
              <g
                key={`tile-${n.id}`}
                transform={`translate(${p(n.x, n.z).join(" ")})`}
              >
                <Box
                  x={-94}
                  z={-94}
                  w={188}
                  d={188}
                  h={14}
                  y={-14}
                  colors={["url(#town-grass)", "#91ab80", "#68896f"]}
                />
                <polygon
                  points={pts([
                    p(-84, -84, 1),
                    p(70, -84, 1),
                    p(70, 65, 1),
                    p(-84, 65, 1),
                  ])}
                  fill="#c9dbac"
                />
                <path
                  d={`M${p(-85, 75).join(" ")}L${p(85, 75).join(" ")}M${p(75, -85).join(" ")}L${p(75, 85).join(" ")}`}
                  stroke="#e5ddc5"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                <path
                  d={`M${p(-85, 75).join(" ")}L${p(85, 75).join(" ")}M${p(75, -85).join(" ")}L${p(75, 85).join(" ")}`}
                  stroke="url(#town-paving)"
                  strokeWidth="14"
                  fill="none"
                />
              </g>
            ))}
            {life.edges.map((edge) => {
              const a = nodeById(edge.from),
                b = nodeById(edge.to);
              if (!a || !b) return null;
              const route = roadPoints(a, b).map(([x, z]) => p(x, z));
              const d = route
                .map((v, i) => `${i ? "L" : "M"}${v.join(" ")}`)
                .join(" ");
              const newLink = life.unvisitedDistricts?.some(
                (id) => id === edge.from || id === edge.to,
              );
              const from = placeName(
                life.locations.find((l) => l.id === edge.from),
                locale,
              );
              const to = placeName(
                life.locations.find((l) => l.id === edge.to),
                locale,
              );
              const decorative =
                edge.kind === "decorative" ||
                (!edge.kind && edge.mode === "unknown");
              const kind = decorative
                ? t("景观连接", "Decorative path")
                : t("日常路线", "Routine route");
              return (
                <g
                  key={edge.id}
                  data-interactive="true"
                  role="button"
                  tabIndex={0}
                  aria-label={t(
                    `${from}到${to}的${kind}`,
                    `${kind} from ${from} to ${to}`,
                  )}
                  onClick={() => {
                    select(edge.to);
                    setMessage(
                      decorative
                        ? t(
                            "景观步道，不代表真实出行距离。",
                            "Decorative path. It does not represent actual travel distance.",
                          )
                        : t(
                            "来自已确认生活事件的连接，不代表真实距离。",
                            "Connection from confirmed events. It does not represent actual travel distance.",
                          ),
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      select(edge.to);
                    }
                  }}
                >
                  <path
                    d={d}
                    fill="none"
                    stroke="#e5ddc5"
                    strokeWidth="27"
                    strokeLinejoin="round"
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke="#a6b6b0"
                    strokeWidth="19"
                    strokeLinejoin="round"
                  />
                  {newLink && (
                    <path
                      d={d}
                      fill="none"
                      stroke="#e9be69"
                      opacity=".7"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="2 9"
                      pointerEvents="none"
                    />
                  )}

                  <path
                    d={d}
                    fill="none"
                    stroke="#f4efdc"
                    strokeWidth="1.5"
                    strokeDasharray="7 8"
                  />
                  {life.edges.indexOf(edge) < 2 && (
                    <g className="transit-car" aria-hidden="true">
                      <rect
                        x="-7"
                        y="-5"
                        width="14"
                        height="7"
                        rx="2"
                        fill="#d6b88d"
                      />
                      <rect x="-4" y="-4" width="8" height="3" fill="#719997" />
                      <animateMotion
                        dur={`${18 + life.edges.indexOf(edge) * 5}s`}
                        repeatCount="indefinite"
                        path={d}
                      />
                    </g>
                  )}
                </g>
              );
            })}
            {sorted.map((n) => {
              const location = life.locations.find((l) => l.id === n.id)!;
              const [x, y] = p(n.x, n.z);
              const opportunity = opportunities.find(
                (o) => o.location.id === n.id,
              );
              const districtPlan = districtOpportunities?.get(n.id);
              const level = growth.get(n.id)?.level ?? 0;
              return (
                <g
                  key={n.id}
                  transform={`translate(${x} ${y})`}
                  className={`world-district ${life.unvisitedDistricts?.includes(n.id) ? "new-district" : ""}`}
                  data-node={n.id}
                  data-position={`${n.x},${n.z}`}
                >
                  <Tree x={-95} y={-7} scale={0.65} pink={n.variant === 1} />
                  <Tree x={80} y={19} scale={0.6} />
                  <Bench x={-53} y={62} />
                  <Flowers x={15} y={68} />
                  <g
                    data-interactive="true"
                    role="button"
                    tabIndex={0}
                    aria-label={t(
                      `选择${placeName(location, locale)}`,
                      `Select ${placeName(location, locale)}`,
                    )}
                    aria-pressed={selected === n.id}
                    onClick={() => select(n.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        select(n.id);
                      }
                    }}
                    className={`world-building ${selected === n.id ? "selected" : ""}`}
                  >
                    {selected === n.id && (
                      <ellipse
                        cy="12"
                        rx="87"
                        ry="42"
                        fill="#f5e4a6"
                        opacity=".7"
                      />
                    )}
                    <g
                      className="world-architecture"
                      filter="url(#world-shadow)"
                    >
                      <g
                        transform={
                          level >= 2 ? "translate(0 -5) scale(1.06)" : undefined
                        }
                        data-building-level={level}
                      >
                        <Building
                          category={location.category}
                          variant={n.variant}
                        />
                      </g>
                      {level >= 2 && (
                        <WorldDecoration kind="pennant" x={-69} y={4} />
                      )}
                      {level === 3 && (
                        <WorldDecoration kind="planter" x={49} y={14} />
                      )}
                    </g>
                    <g transform="translate(0 91)">
                      <rect
                        x="-51"
                        y="-13"
                        width="102"
                        height="26"
                        rx="13"
                        fill="#fff9e9"
                      />
                      <text
                        textAnchor="middle"
                        y="5"
                        fill="#3b5949"
                        fontSize="12"
                        fontWeight="600"
                      >
                        {location.name.length > (locale === "en" ? 13 : 7)
                          ? location.name.slice(0, locale === "en" ? 13 : 7) +
                            "…"
                          : placeName(location, locale)}
                      </text>
                    </g>
                  </g>
                  {growth.get(n.id) && (
                    <g
                      className="world-district-growth"
                      data-growth={n.id}
                      role="img"
                      aria-label={t(
                        `${placeName(location, locale)}解锁${growthTitles[growth.get(n.id)!.level]}`,
                        `${placeName(location, locale)} unlocked ${englishGrowth[growth.get(n.id)!.level]}`,
                      )}
                    >
                      <path
                        d="M-76 37 Q-46 80 -10 75 Q11 73 39 60"
                        fill="none"
                        stroke="#91b56d"
                        strokeWidth="20"
                        strokeLinecap="round"
                      />
                      <path
                        d="M-76 37 Q-46 80 -10 75 Q11 73 39 60"
                        fill="none"
                        stroke="#f4dd93"
                        strokeWidth="10"
                        strokeDasharray="5 5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M-78 33Q-49 59 -50 71Q-70 72 -79 55Z"
                        fill="#79a372"
                      />
                      <path d="M32 60l26-13 14 7-26 13Z" fill="#e6d3a7" />
                      <Flowers x={-66} y={54} />
                      <Flowers x={22} y={71} />
                      {growth.get(n.id)!.level >= 2 && (
                        <WorldDecoration kind="lamp" x={35} y={62} />
                      )}
                      {growth.get(n.id)!.level >= 3 && (
                        <>
                          <Tree x={-59} y={30} scale={0.65} pink />
                          <Bench x={59} y={51} />
                          <WorldDecoration kind="planter" x={52} y={28} />
                        </>
                      )}
                    </g>
                  )}
                  {life.unvisitedDistricts?.includes(n.id) && (
                    <g
                      className="town-new-marker"
                      aria-hidden="true"
                      transform="translate(35 -112)"
                    >
                      <path d="M0 11L6 17L12 11" fill="#805b29" />
                      <rect
                        x="-12"
                        y="-9"
                        width="39"
                        height="22"
                        rx="7"
                        fill="#ffe5a8"
                        stroke="#926836"
                        strokeWidth="1.3"
                      />
                      <text
                        x="7.5"
                        y="6"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fill="#563b20"
                      >
                        {t("新址", "NEW")}
                      </text>
                    </g>
                  )}
                  {!opportunity &&
                    (districtPlan || discoveryLocations.includes(n.id)) && (
                      <g
                        transform={`translate(0 ${location.category === "campus" || location.category === "office" ? -148 : -111})`}
                      >
                        <g
                          data-interactive="true"
                          role="button"
                          tabIndex={0}
                          aria-label={t(
                            `查看${placeName(location, locale)}的微运动`,
                            `See movements at ${placeName(location, locale)}`,
                          )}
                          aria-description={
                            districtPlan
                              ? t(
                                  `${districtPlan.total} 个可用机会${districtPlan.changed ? "，含新增或更新" : ""}`,
                                  `${districtPlan.total} available ${districtPlan.total === 1 ? "opportunity" : "opportunities"}${districtPlan.changed ? ", including new or updated recommendations" : ""}`,
                                )
                              : undefined
                          }
                          data-district-plans={districtPlan?.total}
                          className="world-v7-marker"
                          onClick={() => select(n.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              select(n.id);
                            }
                          }}
                        >
                          <path
                            d="m-6 12 6 8 6-8"
                            fill={districtPlan?.changed ? "#79531e" : "#345b44"}
                          />
                          <circle
                            r="15"
                            fill={districtPlan?.changed ? "#79531e" : "#345b44"}
                            stroke="#fff7dc"
                            strokeWidth="2"
                          />
                          {districtPlan ? (
                            <text
                              y="5"
                              textAnchor="middle"
                              fontSize="13"
                              fontWeight="700"
                              fill="#fff7dc"
                              aria-hidden="true"
                            >
                              {districtPlan.total}
                            </text>
                          ) : (
                            <Sprout x={-8} y={-8} size={16} color="#fff7dc" />
                          )}
                        </g>
                      </g>
                    )}
                  {opportunity && (
                    <g
                      transform={`translate(0 ${location.category === "office" || location.category === "campus" ? -189 : -148})`}
                      className="world-opportunity"
                      data-interactive="true"
                      role="button"
                      tabIndex={0}
                      aria-label={t(
                        `${placeName(location, locale)}的活动机会：${opportunity.quest.title}`,
                        `Movement at ${placeName(location, locale)}: ${questTitle(opportunity.quest, locale)}`,
                      )}
                      onClick={() => select(n.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          select(n.id);
                        }
                      }}
                    >
                      <path d="m-7 12 7 12 7-12" fill="#3d7766" />
                      <circle
                        r="18"
                        fill={
                          opportunity.policy.category === "rest"
                            ? "#8d7057"
                            : "#3d7766"
                        }
                      />
                      {opportunity.policy.category === "rest" ? (
                        <Coffee x={-9} y={-9} size={18} color="#fff9e9" />
                      ) : (
                        <Footprints x={-9} y={-9} size={18} color="#fff9e9" />
                      )}
                    </g>
                  )}
                </g>
              );
            })}
            {life.decorations.map((d) => {
              const node = life.nodes.find((n) => n.id === d.nodeId);
              if (!node) return null;
              const [nodeX, nodeY] = p(node.x, node.z);
              const [x, y] = decorationSlots[d.slot];
              return (
                <g
                  key={d.id}
                  transform={`translate(${nodeX} ${nodeY})`}
                  data-interactive="true"
                  role="button"
                  tabIndex={0}
                  aria-label={t(
                    `选择装饰 ${d.kind}`,
                    `Select decoration ${d.kind}`,
                  )}
                  aria-pressed={editing === d.id}
                  className="placed-decoration"
                  onClick={() => setEditing(d.id)}
                  onPointerDown={(e) => {
                    if (!e.isPrimary || e.button !== 0 || busy) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    decorationPointer.current = {
                      x: e.clientX,
                      y: e.clientY,
                    };
                    setEditing(d.id);
                  }}
                  onPointerCancel={() => {
                    decorationPointer.current = null;
                  }}
                  onPointerUp={(e) => {
                    const start = decorationPointer.current;
                    decorationPointer.current = null;
                    const matrix = mapLayer.current?.getScreenCTM();
                    if (
                      !start ||
                      !matrix ||
                      Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6
                    )
                      return;
                    const nodeIds = new Set(
                      [d.nodeId, selected].filter(Boolean),
                    );
                    const targets = life.nodes
                      .filter((node) => nodeIds.has(node.id))
                      .flatMap((node) => {
                        const [nx, ny] = p(node.x, node.z);
                        return freeSlots(node.id).map((slot) => {
                          const [sx, sy] = decorationSlots[slot];
                          const point = new DOMPoint(
                            nx + sx,
                            ny + sy,
                          ).matrixTransform(matrix);
                          return {
                            nodeId: node.id,
                            slot,
                            distance: Math.hypot(
                              point.x - e.clientX,
                              point.y - e.clientY,
                            ),
                          };
                        });
                      })
                      .sort((a, b) => a.distance - b.distance);
                    if (targets[0] && targets[0].distance <= 44)
                      void moveDecoration(
                        d.id,
                        targets[0].nodeId,
                        targets[0].slot,
                      );
                    else
                      setMessage(
                        t(
                          "请把装饰拖到虚线标出的空位。",
                          "Drag the decoration to a marked slot.",
                        ),
                      );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setEditing(d.id);
                    }
                  }}
                >
                  <ellipse
                    cx={x}
                    cy={y}
                    rx="18"
                    ry="10"
                    fill="transparent"
                    stroke={editing === d.id ? "#225c44" : "none"}
                    strokeWidth="2"
                  />
                  <WorldDecoration kind={d.kind} x={x} y={y} />
                </g>
              );
            })}
            {item &&
              life.nodes
                .filter(
                  (node) => node.id === item.nodeId || node.id === selected,
                )
                .flatMap((node) => {
                  const [nx, ny] = p(node.x, node.z);
                  return freeSlots(node.id).map((slot) => {
                    const [sx, sy] = decorationSlots[slot];
                    return (
                      <g
                        key={`${node.id}-slot-${slot}`}
                        transform={`translate(${nx + sx} ${ny + sy})`}
                        className="decoration-target"
                        data-interactive="true"
                        role="button"
                        tabIndex={0}
                        aria-label={t(
                          `移到${placeName(
                            life.locations.find((l) => l.id === node.id),
                            locale,
                          )}空位 ${slot + 1}`,
                          `Move to slot ${slot + 1} in ${placeName(
                            life.locations.find((l) => l.id === node.id),
                            locale,
                          )}`,
                        )}
                        onClick={() =>
                          void moveDecoration(item.id, node.id, slot)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            void moveDecoration(item.id, node.id, slot);
                          }
                        }}
                      >
                        <circle
                          r="15"
                          fill="#fffdf3"
                          stroke="#346850"
                          strokeWidth="2"
                          strokeDasharray="3 2"
                        />
                        <path
                          d="M-5 0H5M0 -5V5"
                          stroke="#346850"
                          strokeWidth="1.8"
                        />
                      </g>
                    );
                  });
                })}
            {!life.nodes.length && (
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fill="#3d5f50"
                fontSize="16"
              >
                {t(
                  "从一个真实的生活地点开始。",
                  "Start with a place from your day.",
                )}
              </text>
            )}
          </g>
        </svg>
        <div className="world-controls">
          <button
            aria-label={t("放大地图", "Zoom in")}
            onClick={() => zoom(1.2)}
          >
            <ZoomIn size={18} />
          </button>
          <button
            aria-label={t("缩小地图", "Zoom out")}
            onClick={() => zoom(1 / 1.2)}
          >
            <ZoomOut size={18} />
          </button>
          <button
            aria-label={t("重置视角", "Reset view")}
            onClick={() => animateView({ x: 0, y: 0, scale: 1 })}
          >
            <Maximize2 size={18} />
          </button>
        </div>
        {!life.nodes.length && (
          <Link className="button primary world-empty" to="/life">
            {t("描述我的一天", "Describe my day")} <ArrowRight size={16} />
          </Link>
        )}
        <span className="world-hint">
          {t(
            "拖动平移 · 双指缩放 · 键盘方向键",
            "Drag to pan · Pinch to zoom · Arrow keys to move",
          )}
        </span>
      </div>
      <div className="world-bottom">
        <span>
          {growth.size
            ? t(
                `${growth.size} 处街区已成长`,
                `${growth.size} districts upgraded`,
              )
            : t(
                "完成一次行动，解锁新芽步道与街区彩旗",
                "Finish an action to unlock a seedling path and pennant.",
              )}
        </span>
        <Link to="/life">
          {t("发现新地点", "Discover a place")} <ArrowRight size={15} />
        </Link>
      </div>
      {selected && (
        <div className="decoration-toolbar">
          <span>
            {t(
              `装饰${placeName(
                life.locations.find((l) => l.id === selected),
                locale,
              )}`,
              `Decorate ${placeName(
                life.locations.find((l) => l.id === selected),
                locale,
              )}`,
            )}
          </span>
          {(
            [
              ["tree", Trees, t("树木", "Tree")],
              ["flowers", Flower2, t("花丛", "Flowers")],
              ["bench", Armchair, t("长椅", "Bench")],
              ["lamp", LampDesk, t("路灯", "Lamp")],
              ["fountain", Waves, t("喷泉", "Fountain")],
              ["planter", Sprout, t("花箱", "Planter")],
              ["pennant", Flag, t(earnedDecorations.pennant.label, "Pennant")],
              [
                "pergola",
                Store,
                t(earnedDecorations.pergola.label, "Garden pavilion"),
              ],
            ] as const
          ).map(([kind, Icon, label]) => (
            <button
              key={kind}
              aria-pressed={decor === kind}
              disabled={!isDecorationUnlocked(life, kind)}
              onClick={() => setDecor(kind)}
            >
              <Icon size={16} />
              {label}
              {!isDecorationUnlocked(life, kind)
                ? kind === "pennant"
                  ? t(" · 1 次解锁", " · unlock with 1 action")
                  : t(" · 3 次解锁", " · unlock with 3 actions")
                : ""}
            </button>
          ))}
          <button
            className="button"
            disabled={
              busy ||
              freeSlots(selected).length === 0 ||
              !isDecorationUnlocked(life, decor)
            }
            onClick={async () => {
              const slot = freeSlots(selected)[0];
              if (slot === undefined) return;
              const id = `decor_${crypto.randomUUID()}`;
              if (
                await send({
                  type: "life-decorate",
                  id,
                  nodeId: selected,
                  kind: decor,
                  slot,
                })
              ) {
                setEditing(id);
                setMessage(
                  t(
                    "已放置。拖动装饰到虚线空位，或轻点空位移动。",
                    "Placed. Drag or tap a marked slot to move it.",
                  ),
                );
              }
            }}
          >
            {freeSlots(selected).length
              ? t("放置装饰", "Place decoration")
              : t("这块地已放满", "No free slots")}
          </button>
        </div>
      )}
      {(selected || item || !!life.decorationHistory?.length) && (
        <div className="decoration-editor">
          {selected && (
            <span>
              {productText(
                districtFor(
                  life.locations.find((l) => l.id === selected)!.category,
                ),
                locale,
              )}
            </span>
          )}
          <button
            className="text-button"
            disabled={busy || !life.decorationHistory?.length}
            onClick={() => void send({ type: "decoration-undo" })}
          >
            <Undo2 size={15} />
            {t("撤销装饰操作", "Undo decoration change")}
          </button>
          {item && (
            <>
              <button
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  if (await send({ type: "decoration-remove", id: editing }))
                    setEditing("");
                }}
              >
                <Trash2 size={15} />
                {t("移除所选装饰", "Remove decoration")}
              </button>
              <button className="text-button" onClick={() => setEditing("")}>
                {t("完成移动", "Finish moving")}
              </button>
              <button
                className="text-button"
                disabled={busy || nextSlot === undefined}
                onClick={() => {
                  if (nextSlot !== undefined)
                    void moveDecoration(item.id, selected, nextSlot);
                }}
              >
                {t("移到下一位置", "Move to next slot")}
              </button>
            </>
          )}
        </div>
      )}
      <p role="status" className="world-message">
        {message}
      </p>
    </section>
  );
}

export function WorldPreview({ life }: { life: LifeState }) {
  const { locale, t } = useLanguage();
  const preview = life.locations.filter((l) => l.confirmed).slice(0, 3);
  if (!preview.length) return null;
  return (
    <svg
      className="today-town-preview"
      viewBox="0 0 396 136"
      role="img"
      aria-label={
        t("城镇预览", "Town preview") +
        " · " +
        preview.map((l) => placeName(l, locale)).join(" · ")
      }
    >
      <path d="M30 111 101 78 367 90 293 125Z" fill="#d8e1b5" />
      {preview.map((location, index) => (
        <g
          key={location.id}
          transform={`translate(${100 + index * 96} ${88 + (index % 2) * 10}) scale(.7)`}
        >
          <Building
            category={location.category}
            variant={life.nodes.find((n) => n.id === location.id)?.variant ?? 0}
          />
        </g>
      ))}
    </svg>
  );
}
