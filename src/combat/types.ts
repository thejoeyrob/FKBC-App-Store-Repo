export type Facing = 1 | -1;
export type Button = "LP" | "MP" | "HP" | "LK" | "MK" | "HK";
export const BUTTONS: Button[] = ["LP", "MP", "HP", "LK", "MK", "HK"];
export type Action = Button | "left" | "right" | "up" | "down" | "guard";
export type MoveId = Button | "projectile" | "tornado" | "rising" | "sidekick";
export type Stance = "stand" | "crouch" | "air";
export type FighterState =
  | "idle"
  | "walk"
  | "crouch"
  | "air"
  | "landing"
  | "attack"
  | "hitstun"
  | "blockstun"
  | "knockdown"
  | "getup"
  | "ko";
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface AttackWindow {
  from: number;
  to: number;
}
export interface Move {
  id: MoveId;
  name: string;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  push: number;
  reach: number;
  height: number;
  level: "mid" | "low" | "overhead";
  knockdown?: boolean;
  invulnerable?: number;
  projectile?: boolean;
  windows?: AttackWindow[];
  cancelRank: number;
}
export interface DirectionInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}
export type MotionEvent =
  | { type: "direction"; direction: DirectionInput }
  | { type: "button"; button: Button };
export interface InputFrame {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  guard: boolean;
  pressed: Set<Button>;
  jumpPressed: boolean;
  directionChanges?: DirectionInput[];
  motionEvents?: MotionEvent[];
}
export function emptyInput(): InputFrame {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    guard: false,
    pressed: new Set(),
    jumpPressed: false,
  };
}
export function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
