import type { Quest, Scene } from "../domain/types.js";
import type { Category, LifeState } from "./model.js";
import { additionalMoves } from "../data/guidedMoves.js";

const sitting = "https://www.nhs.uk/live-well/exercise/sitting-exercises/";
const strength = "https://www.nhs.uk/live-well/exercise/strength-exercises/";
const aerobic =
  "https://www.nhs.uk/live-well/exercise/how-to-warm-up-before-exercising/";
const everyday =
  "https://www.who.int/news-room/fact-sheets/detail/physical-activity";
type Pair = [string, string];
type Equipment = "chair" | "wall" | "counter" | "none";
type Effort = "gentle" | "steady";
export type Move = {
  id: string;
  name: Pair;
  instructions: [Pair, Pair, Pair];
  seconds: number;
  category: "mobility" | "strength" | "aerobic" | "household" | "routine";
  position: "seated" | "standing";
  scenes: Scene[];
  equipment: Equipment;
  space: "compact" | "clear";
  effort: Effort;
  sweat: "low" | "variable";
  visibility: "discreet" | "visible";
  safety: Pair;
  source: string;
  review: "source_checked";
  usesArms: boolean;
  usesLegs: boolean;
  walking?: boolean;
  sequence?: readonly string[];
  demonstration:
    | "ankles"
    | "march"
    | "open"
    | "rise"
    | "push"
    | "heels"
    | "household"
    | "fingers"
    | "elbow"
    | "reach"
    | "twist"
    | "neck"
    | "shoulder"
    | "knee"
    | "squat"
    | "side"
    | "back"
    | "step"
    | "calf";
};
const all: Scene[] = ["campus", "office", "home", "outdoors"];
const indoor: Scene[] = ["campus", "office", "home"];
const supported = (zh: string, en: string): Pair => [zh, en];
const stableChair: Pair = [
  "用不会滑动、没有轮子的稳固座椅；动作须在舒适范围内。",
  "Use a stable, non-wheeled chair that cannot slide. Stay within a comfortable range.",
];
const stableStanding: Pair = [
  "仅在站立稳定、地面平整、周围无障碍且动作不引起不适时尝试。",
  "Try only if you can stand steadily on a level, clear surface without discomfort.",
];
const homeOnly: Scene[] = ["home"];
export const moveLibrary: Move[] = [
  {
    id: "move-ankles",
    name: ["坐姿脚踝活动", "Seated ankle movement"],
    seconds: 30,
    category: "mobility",
    position: "seated",
    scenes: all,
    equipment: "chair",
    space: "compact",
    effort: "gentle",
    sweat: "low",
    visibility: "discreet",
    safety: stableChair,
    source: sitting,
    usesArms: true,
    usesLegs: true,
    review: "source_checked",
    demonstration: "ankles",
    instructions: [
      [
        "坐稳并扶住座面两侧，双脚平放。",
        "Sit steadily, hold the sides of the chair and plant your feet.",
      ],
      [
        "一只脚轻轻离地，在舒适范围内把脚尖向前指，再勾回。",
        "Lift one foot slightly. Gently point the toes away and draw them back within a comfortable range.",
      ],
      [
        "把脚放回地面，再换边。次数随舒适度，不用赶。",
        "Set the foot down and switch sides. Do not rush to reach a repetition count.",
      ],
    ],
  },
  {
    id: "move-seat-march",
    name: ["坐姿交替抬膝", "Seated alternating knee lifts"],
    seconds: 60,
    category: "aerobic",
    position: "seated",
    scenes: indoor,
    equipment: "chair",
    space: "compact",
    effort: "gentle",
    sweat: "low",
    visibility: "discreet",
    safety: stableChair,
    source: sitting,
    usesArms: true,
    usesLegs: true,
    review: "source_checked",
    demonstration: "march",
    instructions: [
      [
        "坐直并扶好稳固座椅两侧。",
        "Sit upright and hold the sides of a stable chair.",
      ],
      [
        "一侧膝盖保持弯曲，轻轻抬起这只脚，再慢慢落地。",
        "With the knee bent, gently lift one foot and lower it with control.",
      ],
      [
        "换另一侧。慢慢做，感觉不适即停。",
        "Switch sides. Keep an easy pace and stop if uncomfortable.",
      ],
    ],
  },
  {
    id: "move-chest-open",
    name: ["坐姿轻展胸肩", "Seated chest and shoulder opening"],
    seconds: 45,
    category: "mobility",
    position: "seated",
    scenes: indoor,
    equipment: "chair",
    space: "clear",
    effort: "gentle",
    sweat: "low",
    visibility: "visible",
    safety: stableChair,
    source: sitting,
    usesArms: true,
    usesLegs: false,
    review: "source_checked",
    demonstration: "open",
    instructions: [
      [
        "坐直，脚掌着地，确认身旁有空间。",
        "Sit upright with feet grounded and clearance on either side.",
      ],
      [
        "放松肩膀，舒适地向两侧打开手臂，轻抬胸口；不要拉到疼。",
        "Relax the shoulders, open the arms comfortably and gently raise the chest. Do not stretch into pain.",
      ],
      [
        "保持几秒后放下手臂，休息一下再决定是否重复。",
        "Lower the arms after a few seconds. Rest before deciding whether to repeat.",
      ],
    ],
  },
  {
    id: "move-sit-rise",
    name: ["扶稳后坐站转换", "Controlled sit-to-stand"],
    seconds: 60,
    category: "strength",
    position: "standing",
    scenes: indoor,
    equipment: "chair",
    space: "clear",
    effort: "steady",
    sweat: "variable",
    visibility: "visible",
    safety: stableStanding,
    source: strength,
    usesArms: true,
    usesLegs: true,
    review: "source_checked",
    demonstration: "rise",
    instructions: [
      [
        "用稳固不会滑动的无轮椅，坐在前部，双脚分开平放。",
        "Use a stable, non-wheeled chair. Sit toward the front with feet flat and apart.",
      ],
      [
        "稍微前倾，确认能稳定起身后缓缓站起。需要支撑就用手辅助，不稳便停止。",
        "Lean forward slightly and rise slowly if you can do so steadily. Use your hands if needed. Stop if unsteady.",
      ],
      [
        "缓缓坐下。先做一次，稳定且舒适时再重复。",
        "Lower gently into the chair. Try one repetition before deciding to repeat.",
      ],
    ],
  },
  {
    id: "move-wall-press",
    name: ["靠墙推撑", "Wall press"],
    seconds: 60,
    category: "strength",
    position: "standing",
    scenes: ["home", "office"],
    equipment: "wall",
    space: "clear",
    effort: "steady",
    sweat: "variable",
    visibility: "visible",
    safety: stableStanding,
    source: strength,
    usesArms: true,
    usesLegs: true,
    review: "source_checked",
    demonstration: "push",
    instructions: [
      [
        "面向稳固墙面，双手与胸口约同高按墙，双脚站稳。",
        "Face a solid wall with hands around chest height and feet steady.",
      ],
      [
        "轻弯手肘，让身体靠近墙一点，不要强撑。",
        "Bend the elbows to move slightly toward the wall without straining.",
      ],
      [
        "轻推回起始位置。保持呼吸，随时停下。",
        "Gently press back to the starting position. Breathe and stop whenever needed.",
      ],
    ],
  },
  {
    id: "move-heel-lift",
    name: ["扶椅缓抬脚跟", "Supported heel raises"],
    seconds: 45,
    category: "strength",
    position: "standing",
    scenes: indoor,
    equipment: "chair",
    space: "compact",
    effort: "gentle",
    sweat: "low",
    visibility: "discreet",
    safety: stableStanding,
    source: strength,
    usesArms: true,
    usesLegs: true,
    review: "source_checked",
    demonstration: "heels",
    instructions: [
      [
        "扶住稳固、不会滑动的椅背，双脚平放。",
        "Hold the back of a stable chair that cannot slide, with both feet flat.",
      ],
      [
        "双脚脚跟舒适地稍微抬起，脚尖留在地面。",
        "Gently raise both heels a comfortable amount while keeping the toes down.",
      ],
      [
        "缓缓落下脚跟。需要靠大力支撑才能站稳时停止。",
        "Lower the heels slowly. Stop if you need heavy support to stay steady.",
      ],
    ],
  },
  {
    id: "move-place-march",
    name: ["原地低幅抬脚", "Low-impact marching in place"],
    seconds: 90,
    category: "aerobic",
    position: "standing",
    scenes: ["home", "outdoors"],
    equipment: "none",
    space: "clear",
    effort: "steady",
    sweat: "variable",
    visibility: "visible",
    safety: stableStanding,
    source: aerobic,
    usesArms: false,
    usesLegs: true,
    review: "source_checked",
    demonstration: "march",
    instructions: [
      [
        "确认脚下平整、无障碍，站稳。",
        "Check for a level, clear surface and stand steadily.",
      ],
      [
        "交替轻抬一只脚再落下，保持缓慢，不跳跃。",
        "Alternate lifting and lowering one foot at an easy pace, with no jumping.",
      ],
      [
        "随时缩小动作或停下来，不必跟上节奏。",
        "Make the steps smaller or stop whenever you need to.",
      ],
    ],
  },
  {
    id: "move-fold",
    name: ["顺手叠一件衣物", "Fold one item already at hand"],
    seconds: 30,
    category: "household",
    position: "seated",
    scenes: homeOnly,
    equipment: "chair",
    space: "compact",
    effort: "gentle",
    sweat: "low",
    visibility: "discreet",
    safety: supported(
      "只选放在近处的轻物。无需弯腰探身。",
      "Choose a light item already within reach. Do not lean to reach it.",
    ),
    source: everyday,
    usesArms: true,
    usesLegs: false,
    review: "source_checked",
    demonstration: "household",
    instructions: [
      [
        "坐稳，选一件原本要叠且近处可及的衣物。",
        "Sit steadily and pick one light garment you were already going to fold.",
      ],
      [
        "慢慢摊开、折起，动作保持在手边。",
        "Unfold and fold it slowly, keeping it within reach.",
      ],
      [
        "在手边放好。没有合适的衣物就换一个活动。",
        "Place it nearby. If there is nothing suitable, choose a different activity.",
      ],
    ],
  },
  {
    id: "move-counter",
    name: [
      "擦一小块本来要清理的台面",
      "Wipe one small surface already due for cleaning",
    ],
    seconds: 60,
    category: "household",
    position: "standing",
    scenes: homeOnly,
    equipment: "counter",
    space: "compact",
    effort: "gentle",
    sweat: "low",
    visibility: "discreet",
    safety: stableStanding,
    source: everyday,
    usesArms: true,
    usesLegs: true,
    review: "source_checked",
    demonstration: "household",
    instructions: [
      [
        "只在本来就要清理时做，台面应易够到且不烫手。",
        "Do this only when you already planned to clean an easy-to-reach, cool surface.",
      ],
      [
        "用手边的布擦一小块，不搬重物，不跨步探身。",
        "Wipe a small patch with a cloth you have. Do not lift heavy items or stretch to reach.",
      ],
      [
        "擦完这一块即可；如果环境不安全就跳过。",
        "Stop after that patch. Skip it if conditions are unsafe.",
      ],
    ],
  },
  ...additionalMoves,
];
export const findMove = (id: string) => moveLibrary.find((m) => m.id === id);
export const moveQuests: Quest[] = moveLibrary.map((m) => ({
  id: m.id,
  scene: m.scenes[0],
  title: m.name[0],
  steps: m.instructions.map((s) => s[0]),
  context: m.safety[0],
  description: m.instructions[1][0],
  seconds: m.seconds,
  seated: "",
  lessonId: "everyday",
  kind: "timer",
}));
export const categoryScene: Record<Category, Scene> = {
  home: "home",
  office: "office",
  campus: "campus",
  library: "campus",
  park: "outdoors",
  subway: "outdoors",
  bus: "outdoors",
  restaurant: "outdoors",
  cafe: "outdoors",
  shop: "outdoors",
  gym: "outdoors",
  other: "home",
};

export type MoveContext = {
  scene: Scene;
  seconds: number;
  standing: boolean;
  space: "compact" | "clear";
  equipment: Equipment[];
  effort: Effort;
  lowSweat: boolean;
  discreet: boolean;
  safe: boolean;
  environment?: "unknown" | "stationary" | "unsafe";
  noWalking?: boolean;
  noLegs: boolean;
  noArms: boolean;
  goal: "any" | Move["category"];
};
export type MovePreferences = Pick<
  MoveContext,
  "goal" | "lowSweat" | "discreet" | "effort"
>;

export function eligibleMoves(context: MoveContext, life: LifeState) {
  if (!context.safe || context.environment === "unsafe") return [];
  const {
    standing,
    space,
    equipment,
    effort,
    lowSweat,
    discreet,
    seconds,
    scene,
    noLegs,
    noArms,
    goal,
  } = context;
  return moveLibrary
    .filter(
      (m) =>
        m.seconds <= seconds &&
        m.scenes.includes(scene) &&
        (m.position === "seated" ||
          (standing &&
            life.settings.standing &&
            life.constraints?.standingAllowed !== false)) &&
        (m.space === "compact" || space === "clear") &&
        (m.equipment === "none" || equipment.includes(m.equipment)) &&
        (effort === "steady" || m.effort === "gentle") &&
        (!lowSweat || m.sweat === "low") &&
        (!discreet || m.visibility === "discreet") &&
        (!m.walking ||
          (!context.noWalking &&
            life.settings.walking &&
            life.constraints?.walkingAllowed !== false)) &&
        ((!noLegs && life.constraints?.legsAllowed !== false) || !m.usesLegs) &&
        ((!noArms && life.constraints?.armsAllowed !== false) || !m.usesArms),
    )
    .sort(
      (a, b) =>
        scoreMove(b, life, context, goal) - scoreMove(a, life, context, goal),
    );
}
function scoreMove(
  m: Move,
  life: LifeState,
  context: MoveContext,
  goal: MoveContext["goal"],
) {
  const feedback = (life.attempts ?? [])
    .filter((a) => a.activityId === m.id)
    .slice(-5);
  const contextual =
    context.scene === "campus" && m.category === "mobility" ? 6 : 0;
  return (
    (m.category === goal ? 30 : 0) +
    (context.scene === "office" && context.discreet && m.id === "office-hands"
      ? 5
      : 0) +
    (context.scene === "outdoors" && context.standing && m.id === "move-route"
      ? 4
      : 0) +
    contextual +
    Math.min(6, m.seconds / 15) +
    feedback.reduce(
      (score, a) =>
        score +
        (a.status === "skipped" ? -4 : a.convenience === "easy" ? 3 : 0),
      0,
    )
  );
}
