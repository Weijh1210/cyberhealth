import type { LifeEvent } from "./model";
export const contexts = [
  ["desk", "桌前工作"],
  ["meeting_end", "会议刚结束"],
  ["lunch_end", "午饭刚结束"],
  ["water", "准备接水"],
  ["phone", "适合走动的电话"],
  ["break", "任务间隙"],
  ["commute", "地点转换"],
  ["leisure", "周末／居家闲暇"],
  ["busy", "会议中／忙碌"],
] as const;
export type EventContext = (typeof contexts)[number][0];
// Deterministic normalization of user-confirmed titles; no claim of live event detection.
export function eventContext(event: LifeEvent): EventContext {
  if (event.busy) return "busy";
  if (/午饭|午餐|lunch/i.test(event.title)) return "lunch_end";
  if (/接水|茶水|refill/i.test(event.title)) return "water";
  if (/会议|meeting/i.test(event.title)) return "meeting_end";
  if (/工作|学习|work|study|desk/i.test(event.title)) return "desk";
  return event.transport !== "unknown" ? "commute" : "leisure";
}
