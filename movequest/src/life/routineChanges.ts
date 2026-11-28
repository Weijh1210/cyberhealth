import { availableDiscoveries, type Discovery } from "./discoveries";
import type { Cue } from "./context";
import type { LifeState } from "./model";

export type RoutineChanges = {
  added: string[];
  updated: string[];
};

const cueDetails = (cue: Cue) => [
  cue.locationId,
  cue.kind,
  cue.evidence,
  cue.uncertain,
  cue.plan?.method,
  cue.plan?.fitEvidence,
  cue.plan?.activityId,
];

const planDetails = (plan: Discovery) => [
  plan.location.id,
  plan.cue.kind,
  plan.cue.evidence,
  plan.cue.plan?.fitEvidence,
  plan.quest.id,
  plan.method,
];

function changedLocations<T extends { id: string }>(
  before: T[],
  after: T[],
  details: (item: T) => unknown[],
  location: (item: T) => string,
) {
  const previous = new Map(before.map((item) => [item.id, item]));
  const current = new Set(after.map((item) => item.id));
  return [
    ...before.filter((item) => !current.has(item.id)).map(location),
    ...after.flatMap((item) => {
      const old = previous.get(item.id);
      if (!old) return [location(item)];
      if (JSON.stringify(details(old)) === JSON.stringify(details(item)))
        return [];
      return [location(old), location(item)];
    }),
  ];
}

export function describeRoutineChanges(
  before: LifeState,
  after: LifeState,
  at: number,
) {
  const oldNodes = new Set(before.nodes.map((node) => node.id));
  const expanded = after.nodes.find((node) => !oldNodes.has(node.id))?.id;
  const updatedPlaces = new Set([
    ...changedLocations(
      before.locations,
      after.locations,
      (place) => [place.name, place.category],
      (place) => place.id,
    ),
    ...changedLocations(
      before.events,
      after.events,
      (event) => [
        event.locationId,
        event.title,
        event.start,
        event.end,
        event.recurrence,
        event.transport,
        event.busy,
        !!event.approximate,
        event.evidence,
      ],
      (event) => event.locationId,
    ),
    ...changedLocations(
      before.cues ?? [],
      after.cues ?? [],
      cueDetails,
      (cue) => cue.locationId,
    ),
  ]);
  const previous = new Map(
    availableDiscoveries(before, at).map((plan) => [plan.cue.id, plan]),
  );
  const changes: RoutineChanges = { added: [], updated: [] };
  let changedPlanPlace: string | undefined;
  for (const plan of availableDiscoveries(after, at)) {
    if (!updatedPlaces.has(plan.location.id)) continue;
    const old = previous.get(plan.cue.id);
    if (!old) changes.added.push(plan.cue.id);
    else if (
      JSON.stringify(planDetails(old)) !== JSON.stringify(planDetails(plan))
    )
      changes.updated.push(plan.cue.id);
    else continue;
    changedPlanPlace ??= plan.location.id;
  }
  return {
    expanded,
    scene:
      changedPlanPlace ??
      after.nodes.find((node) => updatedPlaces.has(node.id))?.id,
    changes,
  };
}
