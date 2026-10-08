import type { Button, Move, MoveId, Stance } from "./types";
const normals: Record<Button, Move> = {
  LP: {
    id: "LP",
    name: "Light punch",
    startup: 4,
    active: 3,
    recovery: 9,
    damage: 35,
    hitstun: 17,
    blockstun: 10,
    push: 12,
    reach: 76,
    height: 28,
    level: "mid",
    cancelRank: 1,
  },
  MP: {
    id: "MP",
    name: "Medium punch",
    startup: 7,
    active: 4,
    recovery: 13,
    damage: 65,
    hitstun: 23,
    blockstun: 14,
    push: 20,
    reach: 103,
    height: 34,
    level: "mid",
    cancelRank: 2,
  },
  HP: {
    id: "HP",
    name: "Heavy punch",
    startup: 11,
    active: 5,
    recovery: 20,
    damage: 100,
    hitstun: 29,
    blockstun: 18,
    push: 30,
    reach: 124,
    height: 40,
    level: "mid",
    cancelRank: 3,
  },
  LK: {
    id: "LK",
    name: "Light kick",
    startup: 5,
    active: 4,
    recovery: 10,
    damage: 40,
    hitstun: 18,
    blockstun: 11,
    push: 14,
    reach: 94,
    height: 26,
    level: "mid",
    cancelRank: 1,
  },
  MK: {
    id: "MK",
    name: "Medium kick",
    startup: 9,
    active: 5,
    recovery: 16,
    damage: 75,
    hitstun: 25,
    blockstun: 15,
    push: 24,
    reach: 129,
    height: 32,
    level: "mid",
    cancelRank: 2,
  },
  HK: {
    id: "HK",
    name: "Heavy kick",
    startup: 14,
    active: 5,
    recovery: 23,
    damage: 115,
    hitstun: 30,
    blockstun: 20,
    push: 40,
    reach: 148,
    height: 44,
    level: "overhead",
    cancelRank: 3,
  },
};
const specials: Record<"projectile" | "tornado" | "rising", Move> = {
  projectile: {
    id: "projectile",
    name: "Quarter-circle blast",
    startup: 13,
    active: 1,
    recovery: 26,
    damage: 85,
    hitstun: 26,
    blockstun: 18,
    push: 32,
    reach: 40,
    height: 40,
    level: "mid",
    projectile: true,
    cancelRank: 4,
  },
  tornado: {
    id: "tornado",
    name: "Tornado kick",
    startup: 10,
    active: 25,
    recovery: 20,
    damage: 40,
    hitstun: 22,
    blockstun: 13,
    push: 12,
    reach: 110,
    height: 68,
    level: "mid",
    knockdown: true,
    windows: [
      { from: 10, to: 14 },
      { from: 20, to: 24 },
      { from: 30, to: 34 },
    ],
    cancelRank: 4,
  },
  rising: {
    id: "rising",
    name: "Rising attack",
    startup: 5,
    active: 12,
    recovery: 28,
    damage: 130,
    hitstun: 32,
    blockstun: 20,
    push: 45,
    reach: 90,
    height: 100,
    level: "mid",
    knockdown: true,
    invulnerable: 12,
    cancelRank: 4,
  },
};
export function getMove(id: MoveId, stance: Stance): Move {
  const base =
    id in normals
      ? normals[id as Button]
      : specials[id as keyof typeof specials];
  if (id in specials || stance === "stand") return { ...base };
  if (stance === "air")
    return {
      ...base,
      name: `Jump ${base.name.toLowerCase()}`,
      level: "overhead",
    };
  return {
    ...base,
    name: `Crouching ${base.name.toLowerCase()}`,
    level: id.endsWith("K") ? "low" : "mid",
    knockdown: id === "HK",
    startup: Math.max(3, base.startup - 1),
  };
}
export function duration(move: Move): number {
  return move.startup + move.active + move.recovery;
}
export function activeWindow(move: Move, frame: number): number {
  if (move.windows)
    return move.windows.findIndex((w) => frame >= w.from && frame <= w.to);
  return frame >= move.startup && frame < move.startup + move.active ? 0 : -1;
}
export function phase(move: Move, frame: number): string {
  if (frame < move.startup) return "STARTUP";
  if (frame < move.startup + move.active) return "ACTIVE";
  return "RECOVERY";
}
