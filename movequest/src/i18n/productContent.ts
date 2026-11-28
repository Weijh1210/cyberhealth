import type { Locale, Lesson, Quest } from "../domain/types";
import { everydayNames } from "../data/everydayNames";
import { findMove } from "../life/moveNow";

const englishContent: Record<string, string> = {
  住宅区: "Residential district",
  工作区: "Work district",
  学习区: "Study district",
  交通区: "Transit district",
  绿地区: "Green district",
  生活街区: "Neighborhood",

  "你偏好轻松、少出汗的方式，可以只试一次短的。":
    "You prefer gentle activity that keeps sweat low. Try one short movement.",
  "把它放在你本来就会遇到的转换里，随时可以结束。":
    "Try this during a transition you already have. Stop whenever you like.",
  "先试一次或做半分钟，保持舒服。":
    "Try one repetition or half a minute, and stay comfortable.",
  "只做最短的一小段，条件不合适就保留原来的安排。":
    "Try just a small part. Keep your usual routine if the conditions do not suit you.",
  "选一次本来要刷手机的间隙，先把手机收起来，在允许走动的安全平坦路段慢走，然后再决定想怎么休息。":
    "During a break when you would normally scroll, put your phone away, walk on a safe, level route, then choose how to rest.",
  "等这段视频结束或你主动暂停时，放下屏幕，在家沿一段安全、无障碍的路线慢走，再回去继续。":
    "At the end of a video or when you pause it, put the screen aside and walk briefly along a clear route at home.",
  "等这一小项任务结束、内容保存好之后，沿熟悉且安全的路线慢走一段，然后开始下一项。":
    "After wrapping up and saving one task, take a short walk on a familiar, safe route.",
  "等会议结束，收好东西，在切换到下一项任务前，沿安全平坦的路线轻松走一段。":
    "When the meeting ends, put your things away and take an easy walk on a safe, level route.",
  "等下课后，沿实际要走的安全路线慢走一段。没有下一间教室也可选择去自己本来要去的地方。":
    "After class, walk at a comfortable pace along the safe route to your next destination.",
  "等你本来就要接水时，如果有你已经知道且可安全到达的接水点，把这小段走路融入去程。":
    "When you already plan to refill water, walk to a familiar, safely accessible refill point.",
  "只在本来就要出门办这件事时，沿已确认安全、可达的平坦路线慢走一段，照常完成原来的事。":
    "When you already need to run the errand, walk part of a route you know is safe, level and accessible.",
  "在离开交通工具后，若前方有你确认安全、平坦且允许步行的路段，可把平常就要走的一段试成轻松步行。":
    "Once off transit, walk an easy stretch of your usual route if it is safe, level and pedestrian-friendly.",
  "等在安全的地方、手边事务可以停下时，留半分钟活动。":
    "During a pause in a safe place, take half a minute to move.",
  "吃完饭以后，若你感觉舒服，在下一件事开始前沿安全平坦路线轻松走一段。":
    "After a meal, if you feel comfortable, take an easy walk on a safe, level route.",
  "演示模拟场景，非实时观察": "Based on a simulated setting.",
  你手动选择了这个生活场景: "You selected this setting.",
  "来自你确认的日程窗口（不是实时定位）":
    "Matches a confirmed time in your routine.",
  休息不计作运动: "Rest does not count as movement.",
  优先自然日常活动: "Everyday movements are prioritized.",
  "根据你偏好更短选项的反馈，降低较长活动优先级":
    "Longer activities rank lower because you prefer shorter options.",

  "无法访问存储，请检查浏览器权限。":
    "Unable to access storage. Check your browser permissions.",
  "数据已导出，请妥善保管。": "Data exported. Keep the backup somewhere safe.",
  "清除失败，请检查存储权限。":
    "Unable to clear data. Check your browser permissions.",
  "备份校验通过，请检查后确认恢复。":
    "Backup validated. Review it before restoring.",
  "备份结构无效，未修改当前数据。":
    "The backup format is invalid. Your current data is unchanged.",

  "在课与课之间，找一点轻盈。": "Find a moment to move between classes.",
  "下课了，下一站去哪？": "Class is over. Where are you going next?",
  "让忙碌的工作，多一点间隙。": "Make room for small breaks on a busy workday.",
  "刚忙完一件事，歇一下吧。": "Just finished a task? Take a break.",
  "熟悉的小角落，也藏着新机会。": "Find movement in familiar spaces.",
  "等待的片刻，可以动一动。": "Move a little while you wait.",
  "走出去，收集身边的绿色。": "Step outside and notice the greenery.",
  "天气与路况合适，出去看看。":
    "Go outside when the weather and route are suitable.",
  "身体活动，藏在日常里": "Physical activity in everyday life",
  "身体活动不只发生在健身房。步行、主动出行和家务等日常活动，也可以是身体活动。先找到一个适合自己的小机会。":
    "Walking, active travel and household chores are all examples of physical activity. Start with an opportunity that suits you.",
  "下面哪一项也属于日常身体活动？":
    "Which of these is also everyday physical activity?",
  只有在健身房训练才算: "Only working out at a gym",
  步行去接水或整理房间: "Walking to refill water or tidying a room",
  必须戴运动手表才算: "Only movement tracked by a fitness watch",
  "身体活动包含多种日常活动。MoveQuest 的时长是体验设计，不代表医学推荐剂量。":
    "Physical activity includes many everyday tasks. The times in MoveQuest are design choices, not clinical recommendations.",
  "支持日常活动的定义，不验证本应用的具体任务剂量。":
    "Supports the definition of everyday physical activity. It does not validate the specific activity durations in the app.",
  从一点点开始: "Start with a little",
  "有活动总比完全不活动好。可以从自己能做到的程度开始，再根据实际情况慢慢调整；不需要把一次短活动变成一场比赛。":
    "Some activity is better than none. Start with what you can do and adjust gradually. A short break does not need to be a race.",
  "面对今天的活动机会，更合适的想法是？":
    "What is a helpful way to approach an activity today?",
  适合自己的小行动也值得记录: "Small activities that fit are worth recording",
  少于半小时就没有意义: "Anything under half an hour is pointless",
  "为了积分，必须忍着不适完成": "Finish even if it hurts to earn points",
  "从适合自己的活动开始。不适时停止，跳过任务不会扣分。":
    "Start with an activity that suits you. Stop if you feel discomfort. Skipping costs no points.",
  "概述逐步开始活动的原则，不承诺个体健康效果。":
    "Describes how to start gradually. Individual outcomes can vary.",
  "坐着，也有轻动的选择": "Ways to move while seated",
  "当不方便起身时，可以选择坐姿活动。使用稳固的椅子，脚有支撑，只在舒服的范围内轻动；按自己的能力调整。":
    "If standing is inconvenient, try seated movement. Use a stable chair, support your feet and stay within a comfortable range.",
  "做坐姿活动时，应选择什么？": "What should you choose for seated movement?",
  "带轮子、容易滑动的椅子": "A wheeled chair that slides easily",
  稳固的椅子与舒服的活动范围:
    "A stable chair and a comfortable range of motion",
  幅度越大越好: "The largest possible range of motion",
  "稳固支撑、舒适范围比追求幅度更重要。有不适就停止。":
    "Stable support and comfort matter. Stop if you feel discomfort.",
  "支持坐姿活动和稳定座椅原则，不作为康复或个体处方。":
    "Supports seated movement and stable support as general principles.",
  把步行放进生活: "Make walking part of your day",
  "步行可以从短距离开始。接水、去下一个教室、到附近走走，都是发现机会的起点。先确认路面平坦、安全，走动时收起手机。":
    "Start with a short walk to refill water, get to class or go somewhere nearby. Check that the route is level and safe, then put your phone away.",
  "开始一段短步行前，先做什么？":
    "What should you do before starting a short walk?",
  一直看着手机计时: "Keep watching the timer on your phone",
  "先确认路线安全，再收起手机":
    "Check the route is safe, then put your phone away",
  为了奖励尽量走快: "Walk as fast as possible to earn a reward",
  "先选安全路线，按自己的节奏走。任务计时不是竞速要求。":
    "Choose a safe route and walk at your own pace.",
  "支持从短距离步行开始的常识性引导，不声称本任务已被临床验证。":
    "Supports general guidance on starting with short walks.",
  "先确认脚下与前方通道平坦、没有障碍。":
    "Make sure the route is level and clear.",
  "收起手机，按自己舒服的速度走一小段。":
    "Put your phone away and walk a short distance at a comfortable pace.",
  "回到安全位置，再查看计时并确认完成。":
    "Stop somewhere safe before checking the timer and confirming.",
  "如果不方便起身：坐在稳固的椅子上，双脚有支撑，轻松交替抬起脚跟，再落下。只在舒服范围活动。":
    "If standing is inconvenient, use a stable chair with your feet supported. Gently lift and lower one heel at a time within a comfortable range.",
  一节课刚结束: "A class just ended",
  "让课间的空白，变成自己的轻动时间。":
    "Use part of the break between classes for an easy walk.",
  "水杯空了，准备去接水":
    "Your water bottle is empty and you are about to refill it",
  "选一条安全的短路线，给水杯和自己都续一点能量。":
    "Choose a short, safe route to refill your water.",
  刚结束一场会议: "You just finished a meeting",
  "离开屏幕一小会儿，在安全空间里轻走。":
    "Take a short walk in a safe space away from your screen.",
  准备去茶水间: "You are heading to the break room",
  "把本来要做的小事，变成一个自然的活动机会。":
    "Use an errand already in your day as a chance to move.",
  刚看完一集节目: "You just finished an episode",
  "先不点下一集，在家里的安全空间走一小段。":
    "Take a short walk in a clear space at home before starting the next episode.",
  桌面有一点点乱: "Your desk needs a small tidy-up",
  "只整理轻巧、够得到的东西，不搬重物、不登高。":
    "Tidy only light, easy-to-reach objects. Avoid lifting heavy items or climbing.",
  "选一个小范围，把手机放到安全位置。":
    "Choose a small area and put your phone somewhere safe.",
  "站起或坐着整理三件轻巧物品。":
    "Put away three light objects while sitting or standing.",
  "整理完成，放下物品，再确认记录。":
    "When finished, put down the items and confirm the record.",
  刚好路过一处公园: "You are passing a park",
  "挑一段平坦的短路，舒服地走，不追求距离。":
    "Choose a short, level route and walk at a comfortable pace.",
  在户外等人或休息: "You are waiting or taking a break outdoors",
  "离开车流和拥挤路段，沿安全步道慢慢走。":
    "Choose a quiet path away from traffic and crowds, and walk slowly.",
  想看看身边的环境: "You want to explore your surroundings",
  "安全停下时观察绿植，再走向下一个可达的位置。不采摘。":
    "Stop somewhere safe to look at the plants, then move to the next accessible spot. Leave the plants in place.",
  "选一条平坦、可达的短路线，收起手机。":
    "Choose a short, level, accessible route and put your phone away.",
  "慢慢走，安全停下后观察附近三处绿色植物。":
    "Walk slowly and stop in a safe place to look at three spots of greenery.",
  "回到安全位置，在心里记下喜欢的那一处。":
    "Stop in a safe place and remember the spot you liked best.",
  "按自己的能力轻动，出现不适请停止。可以随时跳过，或选择休息。此处为一般活动教育，不提供诊断或治疗。":
    "Move within your ability and stop if you feel discomfort. You can skip or rest at any time. This is general activity education.",
  给屏幕留一个间隙: "Take a break from the screen",
  "工作间隙，可以暂停一下": "You have a natural pause at work",
  安静坐一会儿: "Sit quietly for a moment",
  暂时不想走动: "You prefer to stay still for now",
  "在家，留一点安静": "Take a quiet moment at home",
  家里的休息时间: "You are resting at home",
  看看窗外: "Look out the window",
  想暂时放下屏幕: "You want to put down the screen",
  "课间，安静片刻": "Take a quiet moment between classes",
  "有空闲时，可以休息": "You have a moment to rest",
  坐下欣赏绿意: "Sit and enjoy the greenery",
  "有安全、稳固的座位": "A safe, stable seat is available",
  "可以随时结束。这是休息机会，不计为运动。":
    "End whenever you like. Rest time does not count toward movement.",
  "选择安全、舒适的位置，放下手边事务。":
    "Find a safe, comfortable place and pause what you are doing.",
  "按自己的方式安静休息，不要求呼吸节奏或固定姿势。":
    "Rest quietly in your own way. Breathe and sit naturally.",
  "准备好后再继续；不适时停止。":
    "Continue when ready. Stop if you feel uncomfortable.",
  "可在安全、稳固的座位上休息。": "Rest in a safe, stable seat.",
  "确认前方路线平坦、可达，远离车辆和障碍。":
    "Check that the route is level, accessible and clear of vehicles and obstacles.",
  "放下手机，按自己舒服的速度走一小段；随时可以结束。":
    "Put your phone away and walk at a comfortable pace. Stop whenever you like.",
  "回到安全位置，再决定是否记录完成。":
    "Stop in a safe place before confirming whether you finished.",
  "选择安全、舒适的位置。": "Find a safe, comfortable place.",
  "暂停手边事务，按自己的方式休息，不要求固定呼吸或姿势。":
    "Pause what you are doing and rest in any comfortable posture.",
  "准备好后再继续，不必为了奖励延长休息。":
    "Continue when ready. There is no need to extend the break to earn a reward.",
  原本就要离开课堂或结束一段学习:
    "You are already leaving class or ending a study session",
  "已有一段步行或确定的目的地，且不赶时间":
    "You already have a route or destination and are not in a hurry",
  "一项明确任务结束，下一件事还没开始":
    "One task has ended and the next has not started",
  有自己已确认轻巧且伸手可及的物品:
    "There are light objects you can easily reach",
  "只选轻巧、容易拿到的物品。": "Choose only light, easy-to-reach items.",
  "挑几件就近归位，也可以坐着完成。":
    "Put a few items away nearby. You can stay seated.",
  "不登高、不搬重物，不方便时直接跳过。":
    "Do not climb or lift heavy items. Skip if the conditions do not suit you.",
  "完成一段学习后，你本来就打算暂停":
    "You planned to take a break after studying",
  "完成一小段学习任务，下一件事还没开始":
    "You finished a short study task and have a moment before the next one",
  一段视频结束或主动暂停之后: "A video ended or you chose to pause it",
  "在家完成一个任务后，下一项任务开始前":
    "You finished a task at home and have a moment before the next one",
  会议或任务刚结束: "A meeting or task just ended",
  你确认午饭已经结束: "You have finished lunch",
  你确认有安全路线和充足时间: "You have a safe route and enough time",
  你确认这通电话不需要看屏幕或记笔记:
    "The call does not require watching a screen or taking notes",
  你确认附近目的地可以安全步行到达:
    "You can walk safely to a nearby destination",
  "确认电话适合走动，不需要看屏幕、保密空间或记录。":
    "Choose a call that does not require a screen, privacy or notes.",
  下课后的地点转换: "You are changing locations after class",
  "只选轻巧、容易够到的三件物品，不登高、不搬重物。":
    "Choose three light items within reach. Do not climb or lift heavy objects.",
  "按自己的节奏归位，可以坐着完成。":
    "Put the items away at your own pace. Stay seated if you prefer.",
  "放下物品，准备好后确认记录。":
    "Put down the items and confirm when you are ready.",
  桌前任务的自然间隙: "A natural pause in desk work",
  "工作任务已经暂停，你本来就准备休息":
    "Your work is paused and you already planned to rest",
  阅读或屏幕使用的间隙: "A break from reading or using a screen",
  "合上书页，放松片刻": "Close your book and take a break",
  "忙完以后，安静听一会儿": "Take a quiet break to listen after work",
  "等候时，留一点安静": "Take a quiet moment while waiting",
  "课间，暂时放下屏幕": "Put away your screen between classes",
  安全停留且不妨碍通行: "You can safely stop without blocking the path",
  课间休息: "A break between classes",
  "居家闲暇，物品在舒适可及范围":
    "You have time at home and objects are within easy reach",
  "你主动留出三分钟，适合安全走动":
    "You have set aside three minutes and are somewhere suitable for walking",
  你主动选择的居家小间隙: "You chose a short break at home",
  "先确认路线安全，放下屏幕和手机。":
    "Check the route is safe, then put your phone and screen away.",
  "按自己的节奏走一小段，再在安全位置安静休息；不要求走满三分钟。":
    "Walk a short distance at your own pace, then rest somewhere safe. You can finish before three minutes.",
  "准备好后结束。计时是空闲预算，不是运动剂量。":
    "Finish when ready. The timer shows the available break time.",
  "选择几件轻巧且容易够到的物品。":
    "Choose a few light objects within easy reach.",
  "按自己节奏整理，再在舒适位置短暂休息；不搬重物。":
    "Tidy at your own pace, then take a brief rest. Leave heavy objects where they are.",
  "选择平坦可达的短路线。": "Choose a short, level, accessible route.",
  "慢慢走，在安全位置停留看看绿意；不追求距离。":
    "Walk slowly and stop somewhere safe to enjoy the greenery.",
  "可以提前结束。只有你确认完成才记录。":
    "End early if you like. The activity is saved only after you confirm it.",
  "可以随时提前结束。时长是产品选项，不是医学建议剂量。":
    "End whenever you like. The duration is a product setting.",
  "可跳过或选择休息。": "Skip or choose a rest break.",
  "只有你确认完成才记录。": "The activity is saved only after you confirm it.",
  一片期待: "A seed waiting to grow",
  初见新芽: "First sprout",
  枝叶舒展: "Spreading leaves",
  花开有时: "In bloom",
  满园生机: "A thriving garden",
  第一颗种子: "First seed",
  完成一次微动: "Complete one movement",
  校园漫游者: "Campus explorer",
  工作间隙家: "Workday mover",
  居家发现家: "Home explorer",
  绿意收集者: "Greenery explorer",
  完成对应场景的微动: "Complete a movement in this setting",
  生活探索者: "Everyday explorer",
  体验四种不同场景: "Explore all four settings",
  好奇的芽: "Curious sprout",
  完成一次知识互动: "Complete one knowledge card",
  自主发现: "Find your own movement",
  记录自己的日常活动机会: "Save a movement opportunity from your own day",
  用适合自己的活动替代部分久坐:
    "Replace some sitting with movement that suits you",
  "世界卫生组织建议成年人减少久坐。以任何强度的身体活动替代部分久坐，包括轻强度活动，可以带来健康益处。":
    "The World Health Organization recommends that adults limit sedentary time. Replacing some sitting with physical activity of any intensity, including light activity, can benefit health.",
  "成年人身体活动与久坐指南。推荐以能够做到的身体活动替代部分久坐。":
    "WHO guidance for adults recommends replacing some sedentary time with activity that fits their ability.",
  公共卫生指南: "Public health guidance",
  "成年人一般性建议，应按个人能力和环境调整。":
    "General advice for adults. Adapt to your ability and surroundings.",
  "指南没有为单次一分钟行动设定确定的健康效果，也不能评估你的个人身体状况。":
    "The guidance does not establish a specific benefit from a single one-minute activity or assess your personal health.",
  "在安全、可达的环境中按舒适程度活动；不适时停止。":
    "Move at a comfortable level in a safe, accessible environment. Stop if you feel discomfort.",
  "只在安全、舒适且适合自己的条件下进行；有不适就停止。不是个体医疗处方。":
    "Move only when conditions are safe and comfortable for you. Stop if you feel discomfort. This is general activity guidance.",
  "一般休息提示，无运动处方": "General rest guidance",
  开发内容核对: "Editorial content check",
  公共指南来源核对: "Public guidance source check",
  稳固座椅: "Stable chair",
  "本地数据无法读取。原数据已保留，请先导出原始数据；本次不会覆盖它。":
    "Local data could not be read. Export the original data first. It has been preserved.",
  "保存失败：原有数据仍保留。请检查浏览器存储空间与权限，导出数据后重试。":
    "Changes could not be saved. Your previous data is still available. Check browser storage and permissions, then export a backup before retrying.",
  用户手动录入: "Entered manually",
};

export function productText(text: string, locale: Locale) {
  return locale === "en" ? (englishContent[text] ?? text) : text;
}

export function questTitle(quest: Quest, locale: Locale) {
  return locale === "en"
    ? (findMove(quest.id)?.name[1] ??
        everydayNames[quest.id] ??
        productText(quest.title, locale))
    : quest.title;
}

export function localizedQuest(quest: Quest, locale: Locale): Quest {
  if (locale !== "en") return quest;
  const move = findMove(quest.id);
  return {
    ...quest,
    title: questTitle(quest, locale),
    context: productText(quest.context, locale),
    description: move?.safety[1] ?? productText(quest.description, locale),
    steps: move
      ? move.instructions.map((step) => step[1])
      : quest.steps.map((step) => productText(step, locale)),
    seated: productText(quest.seated, locale),
  };
}

export function localizedLesson(lesson: Lesson, locale: Locale): Lesson {
  if (locale !== "en")
    return {
      ...lesson,
      source: lesson.source
        .replace("WHO · Physical activity", "世界卫生组织 · 身体活动")
        .replace("NHS · Sitting exercises", "英国国民保健署 · 坐姿活动")
        .replace("NHS · Walking for health", "英国国民保健署 · 健康步行"),
    };
  return {
    ...lesson,
    title: productText(lesson.title, locale),
    body: productText(lesson.body, locale),
    question: productText(lesson.question, locale),
    options: lesson.options.map((option) => productText(option, locale)),
    explanation: productText(lesson.explanation, locale),
    scope: productText(lesson.scope, locale),
  };
}
