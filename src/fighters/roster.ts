import type { MoveId } from "../combat/types";

export interface FighterProfile {
  id: string;
  name: string;
  status: "playable" | "planned";
  specials: readonly MoveId[];
  signature: { name: string; description: string; move?: MoveId };
}

// Future signatures are proposals, not playable moves or approved character designs.
export const roster: readonly FighterProfile[] = [
  {
    id: "joe",
    name: "Joe",
    status: "playable",
    specials: ["projectile", "tornado", "rising", "sidekick"],
    signature: {
      name: "Thrusting side kick",
      move: "sidekick",
      description:
        "An advancing long-range kick that knocks down and pushes the opponent away.",
    },
  },
  {
    id: "jack",
    name: "Jack",
    status: "planned",
    specials: [],
    signature: {
      name: "Rush punch",
      description: "Proposed: a fast advancing punch for closing distance.",
    },
  },
  {
    id: "john",
    name: "John",
    status: "planned",
    specials: [],
    signature: {
      name: "Spinning backfist",
      description: "Proposed: a close-range two-hit turning strike.",
    },
  },
  {
    id: "justin",
    name: "Justin",
    status: "planned",
    specials: [],
    signature: {
      name: "Counter strike",
      description:
        "Proposed: a timed defensive counter with a punishable whiff.",
    },
  },
  {
    id: "paul",
    name: "Paul",
    status: "planned",
    specials: [],
    signature: {
      name: "Power slam",
      description: "Proposed: a short-range grab and heavy knockdown.",
    },
  },
];

export function specialMovesFor(id: string): readonly MoveId[] {
  return (
    roster.find((fighter) => fighter.id === id)?.specials ?? [
      "projectile",
      "tornado",
      "rising",
    ]
  );
}
