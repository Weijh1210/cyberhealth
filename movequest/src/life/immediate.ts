import type { MoveContext } from "./moveNow.js";

export const placeWords = {
  library: /图书馆|圖書館|\blibrary\b/i,
  campus: /学校|學校|校园|校園|教室|大学|\b(?:campus|school|classroom)\b/i,
  office: /办公室|辦公室|公司|工位|\b(?:office|workplace)\b/i,
  home: /在家|家里|家裡|家中|居家|厨房|廚房|客厅|客廳|\b(?:home|kitchen|living room)\b/i,
  subway: /地铁|地鐵|出站|\b(?:subway|metro)\b/i,
  bus: /公交|巴士|公車|\bbus\b/i,
  park: /公园|公園|户外|戶外|室外|\b(?:park|outdoors)\b/i,
  cafe: /咖啡馆|咖啡館|\b(?:café|cafe|coffee shop)\b/i,
  restaurant: /餐厅|餐廳|食堂|\b(?:restaurant|cafeteria)\b/i,
  shop: /超市|商店|\b(?:shop|store|supermarket)\b/i,
  gym: /健身房|运动场|運動場|\b(?:gym|sports field)\b/i,
} as const;

const smallNumbers: Record<string, number> = {
  半: 0.5,
  一: 1,
  两: 2,
  兩: 2,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
};

export function statedDuration(text: string) {
  const minutes = text.match(
    /(半|[一两兩二三四五]|\d+(?:\.\d+)?|one|two|three|four|five)\s*(?:分钟|分鐘|mins?\b|minutes?\b)/i,
  );
  const seconds = text.match(/(\d+)\s*(?:秒|secs?\b|seconds?\b)/i);
  if (!minutes && !seconds) return undefined;
  const n = minutes?.[1].toLowerCase() ?? "0";
  return Math.min(
    300,
    Math.max(
      0,
      (smallNumbers[n] ?? Number(n)) * 60 + Number(seconds?.[1] ?? 0),
    ),
  );
}

export const unsafeSituation =
  /正在(?:开车|開車|开汽车|騎|骑|过马路|過馬路|乘车|坐地铁|坐公交)|(?:我在|还在|還在)(?:开车|開車|骑车|騎車|过马路|過馬路|车上|車上|地铁上|地鐵上|公交上)|\b(?:driving|crossing (?:a |the )?(?:road|street)|on (?:a |the )?(?:bus|train|subway|metro)|riding (?:a |my )?bike)\b/i;
const noStanding =
  /(?:不能|不可|没法|無法|无法|不便)站|cannot stand|can't stand|unable to stand|stay seated|只能坐/i;
const noWalking =
  /(?:不能|不可|没法|無法|无法|不便)(?:走|步行)|cannot walk|can't walk|unable to walk/i;
export const lowSweatWords =
  /少出汗|不(?:想|要)出汗|别出汗|不流汗|low.sweat|without sweating|no sweat/i;
export const discreetWords = /不显眼|不顯眼|低调|低調|安静|安靜|\bdiscreet\b/i;

export const avoidLegs =
  /避免.{0,6}(?:腿|膝)|(?:腿|膝).{0,4}(?:不能动|不想动)|avoid (?:leg|knee)/i;
export const avoidArms =
  /避免.{0,6}(?:上肢|手臂|手腕)|(?:手臂|上肢|手腕).{0,5}(?:不能动|不能活動)|avoid (?:arm|wrist|hand)/i;

export function interpretImmediate(text: string, current: MoveContext) {
  const patch: Partial<MoveContext> = {};
  const categories = Object.entries(placeWords).filter(([, words]) =>
    words.test(text),
  );
  if (categories.length === 1) {
    const place = categories[0][0];
    patch.scene =
      place === "library" || place === "campus"
        ? "campus"
        : place === "office" || place === "home"
          ? place
          : "outdoors";
  }
  const seconds = statedDuration(text);
  if (seconds !== undefined) patch.seconds = seconds;
  if (noStanding.test(text)) patch.standing = false;
  else if (/可以站|能站|站得稳|can stand|standing is fine/i.test(text))
    patch.standing = true;
  if (noWalking.test(text)) patch.noWalking = true;
  if (
    /空间(?:很)?小|空間(?:很)?小|狭窄|狹窄|\bcompact\b|small space/i.test(text)
  )
    patch.space = "compact";
  else if (/空地|有空间|有空間|clear space|room to move/i.test(text))
    patch.space = "clear";
  const gear = new Set(current.equipment);
  const equipment = [
    [
      "chair",
      /稳固.{0,6}(?:椅|座位)|穩固.{0,6}椅|无轮椅|無輪椅|stable chair|non.wheeled chair/i,
      /没.{0,3}椅|沒有.{0,3}椅|no (?:stable )?chair|wheeled chair only|转椅|轉椅/i,
    ],
    ["wall", /稳固墙|穩固牆|solid wall/i, /没有.{0,3}墙|沒有.{0,3}牆|no wall/i],
    [
      "counter",
      /台面.{0,8}(?:布|抹布)|counter.{0,12}cloth/i,
      /没有.{0,3}台面|no counter/i,
    ],
  ] as const;
  for (const [id, have, missing] of equipment) {
    if (missing.test(text)) gear.delete(id);
    else if (have.test(text)) gear.add(id);
  }
  patch.equipment = [...gear];
  if (lowSweatWords.test(text)) patch.lowSweat = true;
  else if (/可以出汗|不介意出汗|sweat is fine/i.test(text))
    patch.lowSweat = false;
  if (discreetWords.test(text)) patch.discreet = true;
  else if (/不介意显眼|不介意顯眼|visibility is fine/i.test(text))
    patch.discreet = false;
  if (/轻松|輕鬆|很轻|很輕|\bgentle\b/i.test(text)) patch.effort = "gentle";
  else if (/稍用力|适中|適中|\bsteady\b/i.test(text)) patch.effort = "steady";
  if (avoidLegs.test(text)) patch.noLegs = true;
  if (avoidArms.test(text)) patch.noArms = true;
  if (/力量|肌力|\bstrength\b/i.test(text)) patch.goal = "strength";
  else if (/有氧|\b(?:aerobic|cardio)\b/i.test(text)) patch.goal = "aerobic";
  else if (/家务|家務|叠衣|摺衣|\b(?:chores|housework)\b/i.test(text))
    patch.goal = "household";
  else if (/放松|放鬆|活动关节|活動關節|\b(?:mobility|loosen up)\b/i.test(text))
    patch.goal = "mobility";
  if (unsafeSituation.test(text)) patch.environment = "unsafe";
  return patch;
}
