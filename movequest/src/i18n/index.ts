import type { Locale } from "../domain/types";
const zhCN = {
  today: "今日",
  movement: "微运动",
  home: "我的世界",
  explore: "行动计划",
  habits: "习惯花园",
  journal: "探索图鉴",
  life: "我的生活",
  learn: "学习与奖励",
  progress: "成长足迹",
  profile: "我的偏好",
  institution: "机构演示",
  own: "记录我的微动",
  start: "开始挑战",
};
export type TranslationKey = keyof typeof zhCN;
const dictionaries: Record<Locale, Partial<Record<TranslationKey, string>>> = {
  "zh-CN": zhCN,
  "zh-TW": {
    today: "今日",
    movement: "微運動",
    home: "我的世界",
    explore: "行動計畫",
    habits: "習慣花園",
    journal: "探索圖鑑",
    life: "我的生活",
    learn: "學習與獎勵",
    progress: "成長足跡",
    profile: "我的偏好",
    institution: "機構示範",
    own: "記錄我的微動",
    start: "開始挑戰",
  },
  en: {
    today: "Today",
    movement: "Movement",
    home: "My world",
    explore: "Action plan",
    habits: "Habit garden",
    journal: "Discovery journal",
    life: "My life",
    learn: "Learn & rewards",
    progress: "Progress",
    profile: "Preferences",
    institution: "Institution demo",
    own: "Create your own move",
    start: "Start quest",
  },
};
export const translate = (locale: Locale, key: TranslationKey) =>
  dictionaries[locale][key] ?? zhCN[key];
