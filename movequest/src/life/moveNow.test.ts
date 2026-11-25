import { expect, it } from "vitest";
import { emptyLife } from "./model";
import { eligibleMoves, type MoveContext } from "./moveNow";

const seated: MoveContext = {
  scene: "campus",
  seconds: 30,
  standing: false,
  space: "compact",
  equipment: ["chair"],
  effort: "gentle",
  lowSweat: true,
  discreet: true,
  safe: true,
  noLegs: false,
  noArms: false,
  goal: "any",
};

it.each<{
  scenario: string;
  context: Partial<MoveContext>;
  first: string | undefined;
}>([
  {
    scenario: "student seated in the library",
    context: {},
    first: "move-ankles",
  },
  {
    scenario: "office worker between meetings",
    context: {
      scene: "office",
      standing: true,
      space: "clear",
      seconds: 60,
      equipment: ["wall"],
      effort: "steady",
      lowSweat: false,
      discreet: false,
      goal: "strength",
    },
    first: "move-wall-press",
  },
  {
    scenario: "remote worker with a surface to clean",
    context: {
      scene: "home",
      standing: true,
      seconds: 60,
      equipment: ["counter"],
      goal: "household",
    },
    first: "move-counter",
  },
  {
    scenario: "commuter still in transit",
    context: { scene: "outdoors", safe: false },
    first: undefined,
  },
  {
    scenario: "video break without formal exercise",
    context: {
      scene: "home",
      goal: "household",
    },
    first: "move-fold",
  },
  {
    scenario: "discreet movement with arm and leg limits",
    context: {
      scene: "office",
      noArms: true,
      noLegs: true,
    },
    first: "move-neck-turn",
  },
])("matches a $scenario", ({ context, first }) => {
  expect(eligibleMoves({ ...seated, ...context }, emptyLife())[0]?.id).toBe(
    first,
  );
});
