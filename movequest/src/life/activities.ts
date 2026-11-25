import { findMove } from "./moveNow";
import type { LifeState } from "./model";
import { extraEntries } from "../data/extraActivities";
import type { Quest } from "../domain/types";
export type ActivityPolicy = {
  subtype: string;
  triggers: string[];
  category: "natural" | "guided" | "routine" | "rest";
  level: 0 | 1 | 2 | 3;
  scenes: string[];
  equipment: string[];
  space: "seat" | "clear_path";
  standing: boolean;
  usesArms: boolean;
  usesLegs: boolean;
  position: "seated" | "standing" | "either";
  intensity: "rest" | "light";
  sweat: "low" | "variable";
  visibility: "discreet" | "visible";
  walking: boolean;
  cautions: string;
  source: string;
  reviewStatus: "editorial_checked";
  reviewDate: string;
  reviewer: string;
  eligible: boolean;
  mapIcon: "walk" | "rest" | "movement";
  visualAsset: string;
};
export function activityPolicy(q: Quest): ActivityPolicy {
  const extra = extraEntries.find((e) => e.id === q.id);
  const rest = q.id.startsWith("rest-");
  const walking = !rest && q.id !== "home-tidy";
  const base: ActivityPolicy = {
    subtype: rest
      ? "quiet_rest"
      : q.id.includes("water")
        ? "water_walk"
        : q.id.includes("meeting")
          ? "transition_walk"
          : q.id.includes("hands")
            ? "hands"
            : q.id.includes("ankle")
              ? "ankle"
              : q.id === "home-tidy"
                ? "tidy"
                : "leisure_walk",
    triggers: rest
      ? ["desk", "break", "meeting_end", "lunch_end", "leisure", "water"]
      : q.id.includes("water")
        ? ["water"]
        : q.id.includes("meeting")
          ? ["meeting_end"]
          : q.id.includes("hands")
            ? ["desk"]
            : q.id.includes("campus")
              ? ["break", "desk"]
              : ["leisure", "break", "lunch_end"],
    category: rest ? "rest" : "natural",
    level: rest ? 0 : 1,
    scenes: [q.scene],
    equipment: rest ? ["稳固座椅"] : [],
    space: walking ? "clear_path" : "seat",
    standing: walking,
    usesArms: !rest && !walking,
    usesLegs: walking,
    position: rest ? "seated" : walking ? "standing" : "either",
    intensity: rest ? "rest" : "light",
    sweat: "low",
    visibility: walking ? "visible" : "discreet",
    walking,
    cautions:
      "只在安全、舒适且适合自己的条件下进行；有不适就停止。不是个体医疗处方。",
    source: rest
      ? "一般休息提示，无运动处方"
      : "https://www.who.int/news-room/fact-sheets/detail/physical-activity",
    reviewStatus: "editorial_checked",
    reviewDate: "2026-11-20",
    reviewer: "开发内容核对",
    eligible: true,
    mapIcon: rest ? "rest" : walking ? "walk" : "movement",
    visualAsset: rest ? "quiet-seat" : "walking-path",
  };
  const move = findMove(q.id);
  if (move)
    return {
      ...base,
      category:
        move.category === "routine"
          ? "routine"
          : move.category === "household"
            ? "natural"
            : "guided",
      level:
        move.category === "routine" ? 3 : move.category === "household" ? 1 : 2,
      subtype: move.id,
      walking: move.walking ?? false,
      standing: move.position === "standing",
      position: move.position,
      usesArms: move.usesArms,
      usesLegs: move.usesLegs,
      sweat: move.sweat,
      visibility: move.visibility,
      scenes: move.scenes,
      equipment: move.equipment === "none" ? [] : [move.equipment],
      space: move.space === "clear" ? "clear_path" : "seat",
      cautions: move.safety[0],
      source: move.source,
      reviewStatus: "editorial_checked",
      reviewer: "公共指南来源核对",
      reviewDate: "2026-11-25",
      eligible: true,
      mapIcon: "movement",
      visualAsset: move.demonstration,
      triggers: ["break"],
    };
  return extra
    ? {
        ...base,
        category: extra.category,
        level:
          extra.category === "routine" ? 3 : extra.category === "rest" ? 0 : 1,
        subtype: extra.subtype,
        triggers: extra.triggers,
        standing: extra.walking,
        position:
          extra.category === "rest"
            ? "seated"
            : extra.walking
              ? "standing"
              : "either",
        usesLegs: extra.walking,
        usesArms: extra.category !== "rest" && !extra.walking,
        intensity: extra.category === "rest" ? "rest" : "light",
        visibility: extra.walking ? "visible" : "discreet",
        walking: extra.walking,
        space: extra.walking ? "clear_path" : "seat",
        equipment: [],
        reviewDate: "2026-11-23",
        mapIcon: extra.category === "rest" ? "rest" : "walk",
      }
    : base;
}

export function fitsMovementLimits(policy: ActivityPolicy, life: LifeState) {
  return (
    (!policy.usesArms || life.constraints?.armsAllowed !== false) &&
    (!policy.usesLegs || life.constraints?.legsAllowed !== false) &&
    (!policy.walking ||
      (life.settings.walking && life.constraints?.walkingAllowed !== false)) &&
    (!policy.standing ||
      (life.settings.standing && life.constraints?.standingAllowed !== false))
  );
}
