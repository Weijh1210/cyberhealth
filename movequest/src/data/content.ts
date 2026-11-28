import { moveQuests } from "../life/moveNow.js";
import { extraQuests } from "./extraActivities.js";
import type { Lesson, Quest, Scene } from "../domain/types.js";
export const sceneInfo: Record<
  Scene,
  { name: string; en: string; description: string; cue: string }
> = {
  campus: {
    name: "校园",
    en: "Campus",
    description: "在课与课之间，找一点轻盈。",
    cue: "下课了，下一站去哪？",
  },
  office: {
    name: "办公室",
    en: "Office",
    description: "让忙碌的工作，多一点间隙。",
    cue: "刚忙完一件事，歇一下吧。",
  },
  home: {
    name: "居家",
    en: "Home",
    description: "熟悉的小角落，也藏着新机会。",
    cue: "等待的片刻，可以动一动。",
  },
  outdoors: {
    name: "户外",
    en: "Outdoors",
    description: "走出去，收集身边的绿色。",
    cue: "天气与路况合适，出去看看。",
  },
};
export const lessons: Lesson[] = [
  {
    id: "everyday",
    title: "身体活动，藏在日常里",
    body: "身体活动不只发生在健身房。步行、主动出行和家务等日常活动，也可以是身体活动。先找到一个适合自己的小机会。",
    question: "下面哪一项也属于日常身体活动？",
    options: [
      "只有在健身房训练才算",
      "步行去接水或整理房间",
      "必须戴运动手表才算",
    ],
    answer: 1,
    explanation:
      "身体活动包含多种日常活动。MoveQuest 的时长是体验设计，不代表医学推荐剂量。",
    source: "WHO · Physical activity",
    url: "https://www.who.int/news-room/fact-sheets/detail/physical-activity",
    scope: "支持日常活动的定义，不验证本应用的具体任务剂量。",
  },
  {
    id: "small",
    title: "从一点点开始",
    body: "有活动总比完全不活动好。可以从自己能做到的程度开始，再根据实际情况慢慢调整；不需要把一次短活动变成一场比赛。",
    question: "面对今天的活动机会，更合适的想法是？",
    options: [
      "适合自己的小行动也值得记录",
      "少于半小时就没有意义",
      "为了积分，必须忍着不适完成",
    ],
    answer: 0,
    explanation: "从适合自己的活动开始。不适时停止，跳过任务不会扣分。",
    source: "WHO · Physical activity",
    url: "https://www.who.int/news-room/fact-sheets/detail/physical-activity",
    scope: "概述逐步开始活动的原则，不承诺个体健康效果。",
  },
  {
    id: "sitting",
    title: "坐着，也有轻动的选择",
    body: "当不方便起身时，可以选择坐姿活动。使用稳固的椅子，脚有支撑，只在舒服的范围内轻动；按自己的能力调整。",
    question: "做坐姿活动时，应选择什么？",
    options: [
      "带轮子、容易滑动的椅子",
      "稳固的椅子与舒服的活动范围",
      "幅度越大越好",
    ],
    answer: 1,
    explanation: "稳固支撑、舒适范围比追求幅度更重要。有不适就停止。",
    source: "NHS · Sitting exercises",
    url: "https://www.nhs.uk/live-well/exercise/sitting-exercises/",
    scope: "支持坐姿活动和稳定座椅原则，不作为康复或个体处方。",
  },
  {
    id: "walking",
    title: "把步行放进生活",
    body: "步行可以从短距离开始。接水、去下一个教室、到附近走走，都是发现机会的起点。先确认路面平坦、安全，走动时收起手机。",
    question: "开始一段短步行前，先做什么？",
    options: [
      "一直看着手机计时",
      "先确认路线安全，再收起手机",
      "为了奖励尽量走快",
    ],
    answer: 1,
    explanation: "先选安全路线，按自己的节奏走。任务计时不是竞速要求。",
    source: "NHS · Walking for health",
    url: "https://www.nhs.uk/live-well/exercise/walking-for-health/",
    scope: "支持从短距离步行开始的常识性引导，不声称本任务已被临床验证。",
  },
];
const walkSteps = [
  "先确认脚下与前方通道平坦、没有障碍。",
  "收起手机，按自己舒服的速度走一小段。",
  "回到安全位置，再查看计时并确认完成。",
];
const seated =
  "如果不方便起身：坐在稳固的椅子上，双脚有支撑，轻松交替抬起脚跟，再落下。只在舒服范围活动。";
const q = (
  id: string,
  scene: Scene,
  title: string,
  context: string,
  description: string,
  seconds: number,
  lessonId: string,
  steps = walkSteps,
  kind: "timer" | "steps" = "timer",
): Quest => ({
  id,
  scene,
  title,
  context,
  description,
  seconds,
  steps,
  seated,
  lessonId,
  kind,
});
export const quests: Quest[] = [
  q(
    "campus-corridor",
    "campus",
    "课间，走一小段",
    "一节课刚结束",
    "让课间的空白，变成自己的轻动时间。",
    60,
    "everyday",
  ),
  q(
    "campus-water",
    "campus",
    "接水路上的小冒险",
    "水杯空了，准备去接水",
    "选一条安全的短路线，给水杯和自己都续一点能量。",
    120,
    "walking",
  ),
  q(
    "office-meeting",
    "office",
    "会议结束，起身换个节奏",
    "刚结束一场会议",
    "离开屏幕一小会儿，在安全空间里轻走。",
    60,
    "small",
  ),
  q(
    "office-water",
    "office",
    "让接水，多走几步",
    "准备去茶水间",
    "把本来要做的小事，变成一个自然的活动机会。",
    120,
    "everyday",
  ),
  q(
    "home-episode",
    "home",
    "片尾之后，室内漫步",
    "刚看完一集节目",
    "先不点下一集，在家里的安全空间走一小段。",
    120,
    "small",
  ),
  q(
    "home-tidy",
    "home",
    "整理一个小角落",
    "桌面有一点点乱",
    "只整理轻巧、够得到的东西，不搬重物、不登高。",
    60,
    "everyday",
    [
      "选一个小范围，把手机放到安全位置。",
      "站起或坐着整理三件轻巧物品。",
      "整理完成，放下物品，再确认记录。",
    ],
    "steps",
  ),
  q(
    "outdoors-park",
    "outdoors",
    "给自己一段绿意",
    "刚好路过一处公园",
    "挑一段平坦的短路，舒服地走，不追求距离。",
    180,
    "walking",
  ),
  q(
    "outdoors-break",
    "outdoors",
    "在户外，轻走片刻",
    "在户外等人或休息",
    "离开车流和拥挤路段，沿安全步道慢慢走。",
    60,
    "walking",
  ),
  q(
    "outdoors-green",
    "outdoors",
    "收集三处绿色",
    "想看看身边的环境",
    "安全停下时观察绿植，再走向下一个可达的位置。不采摘。",
    120,
    "everyday",
    [
      "选一条平坦、可达的短路线，收起手机。",
      "慢慢走，安全停下后观察附近三处绿色植物。",
      "回到安全位置，在心里记下喜欢的那一处。",
    ],
    "steps",
  ),
];
export const findQuest = (id: string) => quests.find((q) => q.id === id);
export const safety =
  "按自己的能力轻动，出现不适请停止。可以随时跳过，或选择休息。此处为一般活动教育，不提供诊断或治疗。";

// Rest is a separate category; its time is never counted as movement minutes.
export const restQuests: Quest[] = [
  [
    "rest-office-screen",
    "office",
    "给屏幕留一个间隙",
    "工作间隙，可以暂停一下",
  ],
  ["rest-office-quiet", "office", "安静坐一会儿", "暂时不想走动"],
  ["rest-home-quiet", "home", "在家，留一点安静", "家里的休息时间"],
  ["rest-home-window", "home", "看看窗外", "想暂时放下屏幕"],
  ["rest-campus-quiet", "campus", "课间，安静片刻", "有空闲时，可以休息"],
  ["rest-outdoors-quiet", "outdoors", "坐下欣赏绿意", "有安全、稳固的座位"],
].map(([id, scene, title, context]) => ({
  id,
  scene: scene as Scene,
  title,
  context,
  description: "可以随时结束。这是休息机会，不计为运动。",
  seconds: 60,
  steps: [
    "选择安全、舒适的位置，放下手边事务。",
    "按自己的方式安静休息，不要求呼吸节奏或固定姿势。",
    "准备好后再继续；不适时停止。",
  ],
  seated: "可在安全、稳固的座位上休息。",
  lessonId: "small",
  kind: "timer",
}));
quests.push(...restQuests);

quests.push(...extraQuests, ...moveQuests);
