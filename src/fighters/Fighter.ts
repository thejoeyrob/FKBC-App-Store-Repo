import { specialMovesFor } from "./roster";
import { FLOOR, MAX_HEALTH } from "../config";
import { MotionBuffer } from "../input/MotionBuffer";
import { activeWindow, duration, getMove, canCancel } from "../combat/moves";
import type {
  Facing,
  FighterState,
  InputFrame,
  Move,
  Rect,
  Stance,
} from "../combat/types";
export class Fighter {
  x: number;
  y: number = FLOOR;
  floor = FLOOR;
  vx = 0;
  vy = 0;
  facing: Facing;
  health = MAX_HEALTH;
  state: FighterState = "idle";
  stateFrames = 0;
  move: Move | null = null;
  moveFrame = 0;
  attackStance: Stance = "stand";
  hitWindows = new Set<number>();
  confirmed = false;
  spawned = false;
  combo = 0;
  comboDamage = 0;
  comboTTL = 0;
  buffer = new MotionBuffer();
  lastInput: InputFrame | null = null;
  minX = 75;
  maxX = 1205;
  depth = 0;
  groundMoveSpeed = 4.5;
  private airAttackUsed = false;
  constructor(
    public id: string,
    public name: string,
    x: number,
    facing: Facing,
    public color: number,
  ) {
    this.x = x;
    this.facing = facing;
  }
  get grounded(): boolean {
    return this.y >= this.floor;
  }
  get stance(): Stance {
    if (this.move) return this.attackStance;
    return !this.grounded ? "air" : this.lastInput?.down ? "crouch" : "stand";
  }
  get locked(): boolean {
    return [
      "hitstun",
      "blockstun",
      "knockdown",
      "getup",
      "landing",
      "ko",
    ].includes(this.state);
  }
  get invulnerable(): boolean {
    return (
      this.state === "getup" ||
      this.state === "ko" ||
      this.state === "knockdown" ||
      !!(this.move?.invulnerable && this.moveFrame < this.move.invulnerable)
    );
  }
  reset(x: number, facing: Facing): void {
    this.x = x;
    this.y = this.floor;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.health = MAX_HEALTH;
    this.state = "idle";
    this.stateFrames = 0;
    this.move = null;
    this.moveFrame = 0;
    this.combo = 0;
    this.comboDamage = 0;
    this.comboTTL = 0;
    this.airAttackUsed = false;
    this.buffer.clear();
    this.lastInput = null;
  }
  hurtbox(): Rect {
    const down = this.state === "knockdown" || this.state === "ko";
    const crouch =
      this.state === "crouch" ||
      (this.move && this.attackStance === "crouch") ||
      (!this.move && this.lastInput?.down && this.grounded);
    const h = down ? 28 : crouch ? 78 : 132;
    return { x: this.x - 27, y: this.y - h, width: 54, height: h };
  }
  hitbox(): Rect | null {
    if (
      !this.move ||
      this.move.projectile ||
      activeWindow(this.move, this.moveFrame) < 0
    )
      return null;
    const m = this.move;
    const y =
      this.attackStance === "air"
        ? this.y - 55
        : this.attackStance === "crouch"
          ? this.y - (m.level === "low" ? 35 : 69)
          : this.y -
            (m.id === "rising" ? 145 : m.level === "overhead" ? 130 : 100);
    return {
      x: this.facing === 1 ? this.x + 12 : this.x - 12 - m.reach,
      y,
      width: m.reach,
      height: m.height,
    };
  }
  canBlock(move: Move, sourceX: number): boolean {
    if (
      !this.grounded ||
      (this.locked && this.state !== "blockstun" && this.state !== "landing") ||
      this.move ||
      !this.lastInput
    )
      return false;
    const i = this.lastInput;
    const away = sourceX >= this.x ? i.left : i.right;
    const toward = sourceX >= this.x ? i.right : i.left;
    const guarding = i.guard || (away && !toward);
    if (!guarding) return false;
    if (move.level === "low") return i.down;
    if (move.level === "overhead") return !i.down;
    return true;
  }
  startMove(move: Move): void {
    const stance = this.stance;
    this.attackStance =
      move.cancelRank === 4 && this.grounded ? "stand" : stance;
    if (stance === "air") this.airAttackUsed = true;
    this.move = move;
    this.moveFrame = 0;
    this.state = "attack";
    this.hitWindows.clear();
    this.confirmed = false;
    this.spawned = false;
    if (move.id === "rising") {
      this.vy = -12.5;
      this.y -= 1;
    }
  }
  tick(i: InputFrame, opponentX: number, allowSpecials = true): void {
    this.lastInput = i;
    if (this.grounded && !this.move && !this.locked)
      this.facing = opponentX >= this.x ? 1 : -1;
    this.buffer.record(i, this.facing);
    if (this.comboTTL > 0 && --this.comboTTL === 0) {
      this.combo = 0;
      this.comboDamage = 0;
    }
    if (this.state === "ko") {
      this.physics();
      return;
    }
    if (this.locked) {
      this.stateFrames--;
      if (this.stateFrames <= 0) {
        if (this.state === "knockdown") {
          this.state = "getup";
          this.stateFrames = 24;
        } else this.state = this.grounded ? "idle" : "air";
      }
      this.physics();
      return;
    }
    if (this.move) {
      this.moveFrame++;
      const requested = this.buffer.peek(
        allowSpecials,
        specialMovesFor(this.id),
      );
      if (
        this.confirmed &&
        requested &&
        this.moveFrame >= this.move.startup &&
        this.attackStance !== "air"
      ) {
        const next = getMove(requested, this.stance);
        if (
          canCancel(this.move, next, this.moveFrame) &&
          (allowSpecials || next.cancelRank < 4)
        ) {
          this.startMove(next);
          this.buffer.consume();
        }
      }
      if (this.move && this.moveFrame >= duration(this.move)) {
        this.move = null;
        this.state = this.grounded ? "idle" : "air";
      } else if (this.move?.id === "tornado") {
        this.x += this.facing * 3.8;
      } else if (
        this.move?.id === "sidekick" &&
        this.moveFrame >= this.move.startup &&
        this.moveFrame < this.move.startup + this.move.active
      ) {
        this.x += this.facing * 5;
      }
    }
    if (!this.move) {
      if (this.buffer.peekJump() && this.grounded && !i.down) {
        this.buffer.consumeJump();
        this.vy = -14.5;
        this.y -= 1;
        this.vx = (Number(i.right) - Number(i.left)) * 4.5;
        this.state = "air";
      }
      const requested = this.buffer.peek(
        allowSpecials,
        specialMovesFor(this.id),
      );
      if (
        requested &&
        (this.grounded || !this.airAttackUsed) &&
        (allowSpecials ||
          !["projectile", "tornado", "rising", "sidekick"].includes(
            requested,
          )) &&
        !(
          this.stance === "air" &&
          ["projectile", "tornado", "rising", "sidekick"].includes(requested)
        )
      ) {
        this.startMove(getMove(requested, this.stance));
        this.buffer.consume();
      } else {
        if (this.grounded) {
          const dx = Number(i.right) - Number(i.left);
          this.state = i.down ? "crouch" : dx ? "walk" : "idle";
          if (!i.down && !i.guard)
            this.x +=
              dx * this.groundMoveSpeed * (dx === this.facing ? 1 : 0.75);
        } else this.state = "air";
      }
    }
    this.physics();
  }
  private physics(): void {
    this.x += this.vx;
    if (this.grounded) this.vx *= 0.72;
    if (!this.grounded || this.vy !== 0) {
      this.vy += 0.65;
      this.y += this.vy;
      if (this.y >= this.floor) {
        this.y = this.floor;
        this.vy = 0;
        this.airAttackUsed = false;
        if (this.move && this.attackStance === "air") {
          this.move = null;
          this.state = "landing";
          this.stateFrames = 4;
        }
        // Landing ends the air command buffer; an unspent aerial input must not
        // turn into a surprise ground attack.
        this.buffer.clear();
        this.vx *= 0.5;
      }
    }
    this.x = Math.min(this.maxX, Math.max(this.minX, this.x));
  }
  receive(
    move: Move,
    blocked: boolean,
    direction: Facing,
    lastHit: boolean,
  ): number {
    const damage = blocked
      ? move.cancelRank === 4
        ? Math.ceil(move.damage * 0.1)
        : 0
      : move.damage;
    this.health = Math.max(0, this.health - damage);
    this.move = null;
    this.vx = direction * move.push * (blocked ? 0.13 : 0.2);
    if (this.health === 0) {
      this.state = "ko";
      this.stateFrames = 9999;
      this.vy = 0;
    } else if (!blocked && ((move.knockdown && lastHit) || !this.grounded)) {
      this.state = "knockdown";
      this.stateFrames = 48;
      this.vy = -5;
      this.y -= 1;
    } else {
      this.state = blocked ? "blockstun" : "hitstun";
      this.stateFrames = blocked ? move.blockstun : move.hitstun;
    }
    return damage;
  }
}
