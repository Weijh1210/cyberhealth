import { emptyLife, mergeLife, type LifeDelta, type LifeState } from "./model";
export const demoDescription =
  "工作日早上8点在我的小屋起床，8点30分到绿荫地铁站乘地铁，9点到日光工作室上班，上午10点到10点30分开会，12点30分到13点在午间食堂吃午饭，18点下班后回家。";
export const demoDelta: LifeDelta = {
  locations: [
    ["demo_home", "我的小屋", "home"],
    ["demo_office", "日光工作室", "office"],
    ["demo_metro", "绿荫地铁站", "subway"],
    ["demo_lunch", "午间食堂", "restaurant"],
    ["demo_school", "社区书院", "campus"],
  ].map(([id, name, category]) => ({
    id,
    name,
    category: category as "home",
    source: "manual",
    confirmed: false,
  })),
  events: [
    {
      id: "demo_wake",
      locationId: "demo_home",
      title: "起床",
      start: "08:00",
      end: "08:30",
      recurrence: "weekday",
      transport: "unknown",
      busy: false,
      evidence: "预置演示日程，非实时观察",
    },
    {
      id: "demo_commute",
      locationId: "demo_metro",
      title: "地铁通勤",
      start: "08:30",
      end: "09:00",
      recurrence: "weekday",
      transport: "subway",
      busy: true,
      evidence: "预置演示日程，非实时观察",
    },
    {
      id: "demo_work",
      locationId: "demo_office",
      title: "桌前工作",
      start: "09:00",
      end: "18:00",
      recurrence: "weekday",
      transport: "unknown",
      busy: false,
      evidence: "预置演示日程，非实时观察",
    },
    {
      id: "demo_meeting",
      locationId: "demo_office",
      title: "会议",
      start: "10:00",
      end: "10:30",
      recurrence: "weekday",
      transport: "unknown",
      busy: true,
      evidence: "预置演示日程，非实时观察",
    },
    {
      id: "demo_lunch_event",
      locationId: "demo_lunch",
      title: "午饭",
      start: "12:30",
      end: "13:00",
      recurrence: "weekday",
      transport: "walk",
      busy: false,
      evidence: "预置演示日程，非实时观察",
    },
  ],
  questions: [],
};
export function demoLife(): LifeState {
  const life = mergeLife(
    { ...emptyLife(), timezone: "Asia/Shanghai" },
    demoDelta,
  );
  return {
    ...life,
    settings: {
      ...life.settings,
      quietStart: "00:00",
      quietEnd: "00:00",
      dailyCap: 30,
    },
  };
}
export const demoPark: LifeDelta = {
  locations: [
    {
      id: "demo_park",
      name: "周末湖畔公园",
      category: "park",
      source: "manual",
      confirmed: false,
    },
  ],
  events: [
    {
      id: "demo_park_event",
      locationId: "demo_park",
      title: "公园散步",
      start: "15:00",
      end: "16:00",
      recurrence: "weekend",
      transport: "walk",
      busy: false,
      evidence: "演示者主动确认的示例扩展",
    },
  ],
  questions: [],
};
