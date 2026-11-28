import {
  categoryNames,
  type Category,
  type LifeEvent,
  type LifeLocation,
} from "../life/model";
import type { Locale } from "../domain/types";
import type { Cue, ContextFact } from "../life/context";

export const englishCategories: Record<Category, string> = {
  home: "Home",
  office: "Office",
  campus: "School",
  library: "Library",
  subway: "Metro station",
  bus: "Bus stop",
  restaurant: "Restaurant",
  cafe: "Café",
  park: "Park",
  shop: "Shop",
  gym: "Sports venue",
  other: "Other",
};
export function placeName(location: LifeLocation | undefined, locale: Locale) {
  if (!location) return "";
  return locale === "en" &&
    location.source === "manual" &&
    location.name === categoryNames[location.category]
    ? englishCategories[location.category]
    : location.name;
}

export const englishTravel: Record<LifeEvent["transport"], string> = {
  unknown: "Not specified",
  walk: "On foot",
  subway: "Metro",
  bus: "Bus",
  bike: "Bicycle",
  car: "Car",
};
export const englishCues: Record<Cue["kind"], string> = {
  phone_break: "A phone break during study or work",
  screen_break: "A video or screen break ends",
  task_end: "A task wraps up",
  meeting_end: "A meeting ends",
  class_end: "Leaving class",
  refill: "Already getting water",
  errand: "An errand you already make",
  commute_end: "Getting off transit",
  waiting: "A suitable pause while waiting",
  meal_end: "Finishing a meal",
};
export const englishFacts: Record<ContextFact["kind"], string> = {
  sedentary: "Sedentary context",
  existing_movement: "Existing movement",
  low_sweat: "Prefers not to sweat",
  dislikes_workout: "Prefers movement within daily life",
  barrier: "Barrier",
  social: "Social context",
  space: "Space",
  equipment: "Equipment",
  goal: "Goal",
  environment: "Conditions",
  limitation: "Activity limit",
};
