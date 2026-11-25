import type { Discovery } from "./discoveries";

const plans = {
  desk_hands: {
    title: "Gently move your fingers between tasks",
    action:
      "When the activity you mentioned ends, take your hands off your device and slowly spread and release your fingers.",
    minimum: "Try once within a comfortable range or take your usual break.",
  },
  commute_leg: {
    title: "Use the walk already part of your trip",
    action:
      "Once off the vehicle, use half a minute of the familiar route you already take, away from traffic.",
    minimum:
      "Use part of your usual walk. Carry on as usual if conditions are unsuitable.",
  },
  seated_reset: {
    title: "Try seated knee lifts at a natural break",
    action:
      "After your task or meeting ends, try a few gentle alternating knee lifts if you are already sitting in a stable, non-wheeled chair.",
    minimum: "Try one small lift or keep your usual break.",
  },
  household_slice: {
    title: "Fold one item at the end of a task",
    action:
      "At the end of the task you mentioned, fold one light garment that was already within reach and due to be folded.",
    minimum: "Fold just one item. Skip it if there’s nothing handy.",
  },
  stable_rise: {
    title: "Try one controlled sit-to-stand",
    action:
      "If you have a stable chair and can rise safely, use a pause at the end of the routine to stand up and sit back down with control.",
    minimum:
      "One repetition is enough. Skip it if balance or comfort is uncertain.",
  },
  recall_walk: {
    title: "Review what you learned on a walk",
    action:
      "On a familiar, accessible route after class or study, pocket your phone and recall one to three ideas you just learned. Give the route your full attention when needed.",
    minimum: "Recall a single idea on the walk you were already making.",
  },
  extend_route: {
    title: "Add a turnaround point to a familiar route",
    action:
      "Pick one unhurried trip. Along a route you already know is safe and accessible, choose a place to turn back, walk up to five extra minutes, then rejoin your usual route.",
    minimum:
      "Walk to the next familiar landmark and turn back. Stick to your usual route when time is tight.",
  },
  close_loop: {
    title: "Walk a short loop after finishing a task",
    action:
      "Finish the task and leave yourself a note about where to resume. If you know a safe, level route nearby, walk a short loop and return to the note.",
    minimum:
      "Walk just a short stretch if you only have half a minute. Skip it when the route is unsuitable.",
  },
  light_reset: {
    title: "Put away a light item when screen time ends",
    action:
      "When you finish a video or task, put away a few light, easy-to-reach things you were already going to tidy. You can do this seated.",
    minimum: "Put away just one item. Skip it if there’s nothing handy.",
  },
} as const;

export function englishPlan(d: Discovery) {
  return d.method ? plans[d.method] : undefined;
}

export const englishSkip = {
  busy: "Too busy",
  forgot: "Forgot",
  timing: "Wrong time",
  too_tiring: "Too tiring",
  social: "Uncomfortable here",
  repetitive: "Too repetitive",
  inconvenient: "Didn't fit my routine",
  uninterested: "Not interested",
  other: "Other / prefer not to say",
} as const;
