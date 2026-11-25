import type { Move } from "../life/moveNow";

const nhs = "https://www.nhs.uk/live-well/exercise/";
const sitting = nhs + "sitting-exercises/";
const strength = nhs + "strength-exercises/";
const flexibility = nhs + "flexibility-exercises/";
const balance = nhs + "balance-exercises/";
const warmup = nhs + "how-to-warm-up-before-exercising/";
const chair =
  "https://www.uhsussex.nhs.uk/resources/chair-exercises-with-seated-arm-exercises/";
const hand =
  "https://www.plymouthhospitals.nhs.uk/display-pil/pil-hand-exercises-6145";
const everyday =
  "https://www.who.int/news-room/fact-sheets/detail/physical-activity";
const indoor: Move["scenes"] = ["campus", "office", "home"];

type MoveDetails = Pick<
  Move,
  | "id"
  | "name"
  | "instructions"
  | "source"
  | "demonstration"
  | "usesArms"
  | "usesLegs"
> &
  Partial<Omit<Move, "review">>;

function seated(move: MoveDetails): Move {
  return {
    seconds: 30,
    category: "mobility",
    position: "seated",
    scenes: indoor,
    equipment: "chair",
    space: "compact",
    effort: "gentle",
    sweat: "low",
    visibility: "discreet",
    safety: [
      "坐在稳固无轮椅上，双脚有支撑。避开近期受伤、术后或医嘱限制的部位，有疼痛或头晕就停止。",
      "Use a stable non-wheeled chair with your feet supported. Skip movements restricted by a recent injury, surgery or care advice. Stop for pain or dizziness.",
    ],
    review: "source_checked",
    ...move,
  };
}

function standing(move: MoveDetails): Move {
  return {
    seconds: 60,
    category: "strength",
    position: "standing",
    scenes: ["home", "office"],
    equipment: "chair",
    space: "clear",
    effort: "gentle",
    sweat: "low",
    visibility: "visible",
    safety: [
      "只在地面平整、周围无障碍、站立稳定时尝试。需要支撑时使用不会滑动的支撑物。疼痛或头晕时立即停止。",
      "Use a clear, level surface and try this only if you can stand steadily. Use a support that cannot slip when needed. Stop for pain or dizziness.",
    ],
    review: "source_checked",
    ...move,
  };
}

export const additionalMoves: Move[] = [
  seated({
    id: "campus-ankle",
    name: ["坐姿脚跟脚尖交替抬起", "Seated heel and toe lifts"],
    source: chair,
    demonstration: "heels",
    usesArms: false,
    usesLegs: true,
    instructions: [
      ["坐稳，双脚平放。", "Sit steadily with both feet on the floor."],
      [
        "脚尖留地，缓缓抬、落脚跟。",
        "Keep the toes down as you gently lift and lower your heels.",
      ],
      [
        "脚跟留地，轻抬脚尖再放回，舒服时可重复。",
        "Keep the heels down as you gently lift and lower the toes. Repeat if comfortable.",
      ],
    ],
  }),
  seated({
    id: "office-hands",
    scenes: ["office", "campus", "home"],
    name: ["手指张合", "Finger spread and release"],
    source: hand,
    demonstration: "fingers",
    usesArms: true,
    usesLegs: false,
    instructions: [
      [
        "离开键盘，让前臂放松，手腕自然伸直。",
        "Take your hands off the keyboard, relax your forearms and keep your wrists neutral.",
      ],
      [
        "轻轻分开手指，再让它们自然靠拢。",
        "Gently spread your fingers and bring them together again.",
      ],
      [
        "舒服时慢慢重复几次，不需要用另一只手拉。",
        "Repeat a few times if comfortable, without pulling with your other hand.",
      ],
    ],
  }),
  seated({
    id: "move-thumb-touch",
    name: ["拇指轻碰指尖", "Thumb-to-fingertip touches"],
    source: hand,
    demonstration: "fingers",
    usesArms: true,
    usesLegs: false,
    instructions: [
      ["让手腕保持舒服的姿势。", "Rest your wrist in a comfortable position."],
      [
        "拇指轻碰食指指尖，再分开。",
        "Lightly touch your thumb to your index fingertip, then release.",
      ],
      [
        "试试其他能轻松碰到的指尖，再换手。",
        "Try the other fingertips you can comfortably reach, then switch hands.",
      ],
    ],
  }),
  seated({
    id: "move-neck-turn",
    name: ["坐姿缓慢转头", "Seated head turns"],
    source: sitting,
    demonstration: "neck",
    usesArms: false,
    usesLegs: false,
    instructions: [
      [
        "坐直，放松双肩，目视前方。",
        "Sit upright, relax your shoulders and look ahead.",
      ],
      [
        "头缓缓转向一边，只转到舒服的位置。",
        "Turn your head slowly to one side within a comfortable range.",
      ],
      [
        "回到中间再转向另一侧，头晕时立即停。",
        "Return to centre before changing sides. Stop immediately if dizzy.",
      ],
    ],
  }),
  seated({
    id: "move-seated-turn",
    name: ["坐姿轻转上身", "Seated upper-body turns"],
    source: sitting,
    demonstration: "twist",
    usesArms: true,
    usesLegs: false,
    visibility: "visible",
    seconds: 45,
    instructions: [
      [
        "脚掌平放，双手轻搭对侧肩膀。",
        "Plant your feet and rest each hand on the opposite shoulder.",
      ],
      [
        "保持臀部朝前，上身轻转向一侧。",
        "Keep your hips facing forward and rotate your upper body gently to one side.",
      ],
      [
        "回正后换边。幅度小一点也可以。",
        "Return to centre and switch sides. A small range is enough.",
      ],
    ],
  }),
  seated({
    id: "move-knee-extend",
    name: ["坐姿交替伸膝", "Seated alternating knee extensions"],
    source: chair,
    demonstration: "knee",
    usesArms: false,
    usesLegs: true,
    space: "clear",
    category: "strength",
    seconds: 45,
    instructions: [
      [
        "坐稳，确认脚前留有空间。",
        "Sit steadily with room in front of your feet.",
      ],
      [
        "缓缓伸直一侧膝盖，到舒服的位置就停一下。",
        "Straighten one knee slowly and pause within a comfortable range.",
      ],
      [
        "慢慢把脚放回地面，再换腿。",
        "Lower that foot slowly, then switch legs.",
      ],
    ],
  }),
  seated({
    id: "move-elbow-bend",
    name: ["坐姿徒手屈肘", "Seated elbow bends"],
    source: chair,
    demonstration: "elbow",
    usesArms: true,
    usesLegs: false,
    instructions: [
      [
        "坐稳，上臂自然靠近身体。",
        "Sit steadily with your upper arms near your sides.",
      ],
      [
        "慢慢弯一侧手肘，让手朝肩部靠近。",
        "Slowly bend one elbow, bringing the hand toward your shoulder.",
      ],
      [
        "缓缓放下手，换另一侧。",
        "Lower the hand slowly and repeat on the other side.",
      ],
    ],
  }),
  seated({
    id: "move-arm-reach",
    name: ["坐姿单臂上举", "Seated single-arm reach"],
    source: chair,
    demonstration: "reach",
    usesArms: true,
    usesLegs: false,
    visibility: "visible",
    space: "clear",
    instructions: [
      [
        "坐稳，确认头顶和两侧有空间。",
        "Sit steadily and make sure there is room overhead and at your sides.",
      ],
      [
        "把一只手慢慢向上举，到肩部舒服的高度即可。",
        "Raise one hand slowly to a height that feels comfortable for your shoulder.",
      ],
      [
        "缓缓放下再换侧。无需举到头顶。",
        "Lower it slowly before switching sides. You can stop below head height.",
      ],
    ],
  }),
  standing({
    id: "move-shoulder-roll",
    name: ["站姿轻绕肩", "Gentle standing shoulder rolls"],
    source: warmup,
    demonstration: "shoulder",
    usesArms: true,
    usesLegs: true,
    category: "mobility",
    equipment: "none",
    space: "compact",
    seconds: 30,
    instructions: [
      [
        "双脚站稳，手臂自然垂放。",
        "Stand steadily and let your arms hang loosely.",
      ],
      [
        "双肩舒适地向前绕几个小圈。",
        "Roll your shoulders forward in a few small, comfortable circles.",
      ],
      [
        "停一下，反方向慢慢绕，再放松。",
        "Pause, roll them back slowly and relax.",
      ],
    ],
  }),
  standing({
    id: "move-mini-squat",
    name: ["扶椅小幅屈膝", "Supported mini-squat"],
    source: strength,
    demonstration: "squat",
    usesArms: true,
    usesLegs: true,
    instructions: [
      [
        "双手扶稳固椅背，双脚分开约与髋同宽。",
        "Hold a stable chair back and stand with feet about hip-width apart.",
      ],
      [
        "膝盖朝着脚尖方向，缓缓小幅弯曲。",
        "Bend your knees a little, slowly, keeping them in line with your toes.",
      ],
      [
        "平稳站直，先试一两次。",
        "Return smoothly to standing and start with one or two repetitions.",
      ],
    ],
  }),
  standing({
    id: "move-side-leg",
    name: ["扶椅侧抬腿", "Supported side leg lift"],
    source: strength,
    demonstration: "side",
    usesArms: true,
    usesLegs: true,
    instructions: [
      [
        "扶稳椅背，确认脚侧有空位。",
        "Hold a stable chair back and check for room at your sides.",
      ],
      [
        "把一条腿向侧面抬一点，躯干维持直立。",
        "Lift one leg a little to the side while keeping your torso upright.",
      ],
      [
        "轻轻放回，双脚站稳再换侧。",
        "Set the foot down gently and regain a steady stance before switching.",
      ],
    ],
  }),
  standing({
    id: "move-back-leg",
    name: ["扶椅向后伸腿", "Supported backward leg lift"],
    source: strength,
    demonstration: "back",
    usesArms: true,
    usesLegs: true,
    instructions: [
      [
        "扶住稳固椅背，身后留出空间。",
        "Hold a stable chair back with some space behind you.",
      ],
      [
        "腿轻轻向后伸一点，上身保持直立，腰背放松。",
        "Reach one leg slightly behind you, keeping your torso upright without arching your back.",
      ],
      [
        "脚放回地面站稳，再换侧。",
        "Bring the foot back to a steady stance before switching.",
      ],
    ],
  }),
  standing({
    id: "move-calf-stretch",
    name: ["扶墙轻伸小腿", "Wall-supported calf stretch"],
    source: flexibility,
    demonstration: "calf",
    usesArms: true,
    usesLegs: true,
    equipment: "wall",
    category: "mobility",
    instructions: [
      [
        "双手扶稳墙面，一只脚往后迈一小步。",
        "Place your hands on a solid wall and step one foot slightly back.",
      ],
      [
        "前膝稍弯，后脚跟留地，到小腿刚有拉伸感即可。",
        "Soften the front knee and keep the rear heel down until you feel an easy stretch.",
      ],
      [
        "回到双脚并立，再换边。不要弹动或拉到疼。",
        "Return to a steady stance and switch sides. Stay still and stop short of pain.",
      ],
    ],
  }),
  standing({
    id: "move-side-step",
    name: ["扶墙小步横移", "Small supported side steps"],
    source: balance,
    demonstration: "step",
    usesArms: true,
    usesLegs: true,
    equipment: "wall",
    category: "aerobic",
    walking: true,
    instructions: [
      [
        "在平整空地靠稳固墙面站好，一只手轻扶墙。",
        "Stand on a level, clear surface next to a solid wall and use one hand for support.",
      ],
      [
        "侧向迈一小步，另一脚跟上，不交叉双脚。",
        "Take a small step sideways and bring the other foot in without crossing.",
      ],
      [
        "站稳后往回迈。以能轻松停下的速度做。",
        "Pause steadily before stepping back the other way. Keep the pace easy to stop.",
      ],
    ],
  }),
  standing({
    id: "home-wait",
    name: ["站姿交替脚跟前点", "Standing alternating heel taps"],
    source: warmup,
    demonstration: "step",
    usesArms: false,
    usesLegs: true,
    scenes: ["home"],
    equipment: "none",
    category: "aerobic",
    instructions: [
      [
        "离开热源和电器，在空地上站稳。",
        "Move away from heat and appliances and stand steadily in a clear area.",
      ],
      [
        "一侧脚跟向前轻点地，重心留在支撑腿。",
        "Tap one heel lightly in front, keeping your weight on the supporting leg.",
      ],
      [
        "把脚收回站稳再换侧，不跳，不抢速度。",
        "Bring the foot back and regain balance before switching. Keep it slow, with no jumping.",
      ],
    ],
  }),
  seated({
    id: "move-sort-paper",
    name: ["坐着归拢手边纸张", "Sort papers already within reach"],
    source: everyday,
    demonstration: "household",
    usesArms: true,
    usesLegs: false,
    scenes: ["home", "office", "campus"],
    category: "household",
    instructions: [
      [
        "选几张你原本就要整理、够得着的纸。",
        "Choose a few papers you already planned to sort and can reach easily.",
      ],
      [
        "坐稳，把纸按用途分好，轻轻叠起来。",
        "Sit steadily, sort the papers and make a small pile.",
      ],
      [
        "放到手边的安全位置。没有合适的纸就换动作。",
        "Place the pile safely nearby. Choose another move if there are no suitable papers.",
      ],
    ],
  }),
  standing({
    id: "move-water-plant",
    name: ["给手边的小盆栽浇水", "Water a small plant within reach"],
    source: everyday,
    demonstration: "household",
    usesArms: true,
    usesLegs: true,
    scenes: ["home"],
    equipment: "none",
    space: "compact",
    category: "household",
    visibility: "discreet",
    seconds: 30,
    instructions: [
      [
        "只选原本要浇水、在手边高度的小盆栽和轻便水杯。",
        "Choose a small plant already due for watering, at an easy height, and use a light cup.",
      ],
      [
        "站稳，少量慢浇，不搬盆、不探身。",
        "Stand steadily and pour slowly. Keep the pot in place and avoid reaching.",
      ],
      [
        "放回杯子，确认地面干燥。",
        "Put the cup back and make sure the floor stays dry.",
      ],
    ],
  }),
  standing({
    id: "move-route",
    name: ["沿原路线轻走半分钟", "Walk half a minute of your usual route"],
    category: "aerobic",
    seconds: 30,
    scenes: ["outdoors", "office", "campus"],
    equipment: "none",
    walking: true,
    source: everyday,
    demonstration: "march",
    usesArms: false,
    usesLegs: true,
    visibility: "discreet",
    safety: [
      "只在平坦、可达、与车流分开且你熟悉的步行路段尝试。收起手机；过街或乘车时不要开始。",
      "Use a familiar, level, accessible route separated from traffic. Put the phone away. Do not start while crossing or riding in a vehicle.",
    ],
    instructions: [
      [
        "选原本要走、已经确认安全的一段路。",
        "Pick a safe stretch you were already going to walk.",
      ],
      [
        "收起手机，沿原路线以舒服的速度走。",
        "Pocket your phone and walk at an easy pace along your usual route.",
      ],
      [
        "到安全的位置停稳后，再确认记录。",
        "Stop in a safe spot before confirming the record.",
      ],
    ],
  }),
  seated({
    id: "move-seated-pair",
    name: ["坐姿手脚两段活动", "Two-part seated hands and feet break"],
    source: chair,
    demonstration: "fingers",
    usesArms: true,
    usesLegs: true,
    seconds: 60,
    category: "routine",
    sequence: ["office-hands", "campus-ankle"],
    instructions: [
      [
        "先坐稳，慢慢张合手指。",
        "Sit steadily and gently spread and release your fingers.",
      ],
      [
        "再把双脚放平，交替抬脚跟和脚尖。",
        "Next, plant both feet and alternate lifting your heels and your toes.",
      ],
      [
        "每段约 30 秒，按舒适度决定次数。",
        "Allow about 30 seconds for each part and move at a comfortable pace.",
      ],
    ],
  }),
  standing({
    id: "move-chair-pair",
    name: ["扶椅抬脚跟与小幅屈膝", "Supported heel raises and mini-squats"],
    source: strength,
    demonstration: "heels",
    usesArms: true,
    usesLegs: true,
    seconds: 105,
    category: "routine",
    sequence: ["move-heel-lift", "move-mini-squat"],
    instructions: [
      [
        "先扶稳椅背，慢抬脚跟再放下。",
        "Start with supported heel raises, lowering the heels slowly.",
      ],
      [
        "双脚落稳后换成小幅屈膝。",
        "Once both feet are steady, switch to shallow supported knee bends.",
      ],
      [
        "任何一段不舒服或站不稳就停止。",
        "Stop if either part feels uncomfortable or unsteady.",
      ],
    ],
  }),
];
