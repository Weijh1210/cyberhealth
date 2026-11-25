import { emptyLife, mergeLife, type LifeDelta } from "./model";

export const v7Description =
  "我每天上午去学校上课，中午在食堂吃饭，下午在图书馆写作业三四个小时。写累了就刷手机，晚上回家躺在床上看视频。我不喜欢运动，也不想出很多汗。";
const delta: LifeDelta = {
  locations: [
    {
      id: "sample_campus",
      name: "晨光学校",
      category: "campus",
      source: "manual",
      confirmed: false,
    },
    {
      id: "sample_lunch",
      name: "午间食堂",
      category: "restaurant",
      source: "manual",
      confirmed: false,
    },
    {
      id: "sample_library",
      name: "绿荫图书馆",
      category: "library",
      source: "manual",
      confirmed: false,
    },
    {
      id: "sample_home",
      name: "我的小屋",
      category: "home",
      source: "manual",
      confirmed: false,
    },
  ],
  events: [
    {
      id: "sample_class",
      locationId: "sample_campus",
      title: "上午上课",
      start: null,
      end: null,
      recurrence: "daily",
      transport: "unknown",
      busy: true,
      evidence: "每天上午去学校上课",
    },
    {
      id: "sample_meal",
      locationId: "sample_lunch",
      title: "中午吃饭",
      start: null,
      end: null,
      recurrence: "daily",
      transport: "unknown",
      busy: false,
      evidence: "中午在食堂吃饭",
    },
    {
      id: "sample_study",
      locationId: "sample_library",
      title: "下午写作业",
      start: null,
      end: null,
      recurrence: "daily",
      transport: "unknown",
      busy: true,
      evidence: "下午在图书馆写作业三四个小时",
    },
    {
      id: "sample_watch",
      locationId: "sample_home",
      title: "晚上看视频",
      start: null,
      end: null,
      recurrence: "daily",
      transport: "unknown",
      busy: false,
      evidence: "晚上回家躺在床上看视频",
    },
  ],
  cues: [
    {
      id: "sample_scroll",
      locationId: "sample_library",
      kind: "phone_break",
      evidence: "写累了就刷手机",
      source: "example",
      uncertain: false,
    },
    {
      id: "sample_video",
      locationId: "sample_home",
      kind: "screen_break",
      evidence: "晚上回家躺在床上看视频",
      source: "example",
      uncertain: false,
    },
    {
      id: "sample_after_class",
      locationId: "sample_campus",
      kind: "class_end",
      evidence: "每天上午去学校上课",
      source: "example",
      uncertain: false,
    },
  ],
  facts: [
    {
      id: "sample_sitting",
      locationId: "sample_library",
      kind: "sedentary",
      evidence: "下午在图书馆写作业三四个小时",
      source: "example",
      uncertain: true,
    },
    {
      id: "sample_sweat",
      kind: "low_sweat",
      evidence: "也不想出很多汗",
      source: "example",
      uncertain: false,
    },
    {
      id: "sample_preference",
      kind: "dislikes_workout",
      evidence: "我不喜欢运动",
      source: "example",
      uncertain: false,
    },
  ],
  questions: [],
};
export function v7DemoLife(at: number, blank = false) {
  const base = emptyLife();
  const life = {
    ...base,
    settings: { ...base.settings, quietStart: "00:00", quietEnd: "00:00" },
  };
  return blank ? life : mergeLife(life, delta, at);
}
