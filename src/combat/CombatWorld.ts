import { MAX_HEALTH } from "../config";
import { Fighter } from "../fighters/Fighter";
import { activeWindow } from "./moves";
import {
  overlaps,
  type Facing,
  type InputFrame,
  type Move,
  type Rect,
} from "./types";
export interface Projectile {
  x: number;
  y: number;
  facing: Facing;
  owner: Fighter;
  move: Move;
  life: number;
}
export interface Impact {
  x: number;
  y: number;
  blocked: boolean;
  damage: number;
  combo: number;
  name: string;
}
export class CombatWorld {
  projectiles: Projectile[] = [];
  hitstop = 0;
  frame = 0;
  lastImpact: Impact | null = null;
  onImpact: ((impact: Impact) => void) | null = null;
  constructor(public fighters: [Fighter, Fighter]) {}
  reset(): void {
    this.projectiles = [];
    this.hitstop = 0;
    this.lastImpact = null;
    this.frame = 0;
  }
  tick(
    inputs: [InputFrame, InputFrame],
    allowSpecials = true,
    depthLimit = Infinity,
  ): void {
    this.frame++;
    // Buffer inputs even during hit-stop; no animation, motion, or stun advances.
    if (this.hitstop > 0) {
      this.hitstop--;
      this.fighters.forEach((f, i) =>
        f.buffer.record(inputs[i], f.facing, false),
      );
      return;
    }
    const [a, b] = this.fighters;
    a.tick(inputs[0], b.x, allowSpecials);
    b.tick(inputs[1], a.x, allowSpecials);
    this.resolveBodies(depthLimit);
    for (const f of this.fighters) {
      if (f.move?.projectile && !f.spawned && f.moveFrame >= f.move.startup) {
        this.projectiles.push({
          x: f.x + f.facing * 55,
          y: f.y - 86,
          facing: f.facing,
          owner: f,
          move: f.move,
          life: 105,
        });
        f.spawned = true;
      }
    }
    // Snapshot melee contacts before resolving, so simultaneous strikes can trade.
    const contacts: {
      attacker: Fighter;
      target: Fighter;
      move: Move;
      window: number;
    }[] = [];
    for (const attacker of this.fighters) {
      const target = attacker === a ? b : a,
        box = attacker.hitbox();
      if (
        box &&
        attacker.move &&
        !target.invulnerable &&
        Math.abs(attacker.depth - target.depth) <= depthLimit
      ) {
        const window = activeWindow(attacker.move, attacker.moveFrame);
        if (!attacker.hitWindows.has(window) && overlaps(box, target.hurtbox()))
          contacts.push({ attacker, target, move: attacker.move, window });
      }
    }
    for (const c of contacts) {
      c.attacker.hitWindows.add(c.window);
      this.hit(c.attacker, c.target, c.move, c.window);
    }
    this.projectiles = this.projectiles.filter((p) => {
      p.x += p.facing * 9;
      p.life--;
      const target = p.owner === a ? b : a;
      if (
        !target.invulnerable &&
        Math.abs(p.owner.depth - target.depth) <= depthLimit &&
        overlaps(this.projectileBox(p), target.hurtbox())
      ) {
        this.hit(p.owner, target, p.move, 0);
        return false;
      }
      return p.life > 0 && p.x > -50 && p.x < Math.max(a.maxX, b.maxX) + 100;
    });
  }
  projectileBox(p: Projectile): Rect {
    return { x: p.x - 22, y: p.y - 20, width: 44, height: 40 };
  }
  private resolveBodies(depthLimit: number): void {
    const [a, b] = this.fighters;
    if (
      Math.abs(a.depth - b.depth) > depthLimit ||
      !a.grounded ||
      !b.grounded ||
      a.state === "knockdown" ||
      b.state === "knockdown"
    )
      return;
    const gap = b.x - a.x,
      overlap = 58 - Math.abs(gap);
    if (overlap > 0) {
      const sign = gap >= 0 ? 1 : -1;
      a.x -= (sign * overlap) / 2;
      b.x += (sign * overlap) / 2;
      a.x = Math.max(a.minX, Math.min(a.maxX, a.x));
      b.x = Math.max(b.minX, Math.min(b.maxX, b.x));
      if (Math.abs(b.x - a.x) < 58) {
        if (a.x === a.minX || a.x === a.maxX) b.x = a.x + sign * 58;
        else a.x = b.x - sign * 58;
      }
    }
  }
  private hit(
    attacker: Fighter,
    target: Fighter,
    move: Move,
    window: number,
  ): void {
    const blocked = target.canBlock(move, attacker.x),
      direction: Facing = target.x >= attacker.x ? 1 : -1;
    // Count chains only while the defender is still stunned *at contact*, not
    // at the start of a tick that may finish their recovery.
    const chainable =
      target.state === "hitstun" || target.state === "knockdown";
    const lastHit = !move.windows || window === move.windows.length - 1;
    const damage = target.receive(move, blocked, direction, lastHit);
    // A delayed projectile must not give a newer whiffed normal a cancel.
    if (attacker.move === move) attacker.confirmed = true;
    if (blocked) {
      attacker.vx -= direction * 1.5;
    } else {
      if (!chainable) {
        attacker.combo = 0;
        attacker.comboDamage = 0;
      }
      attacker.combo++;
      attacker.comboDamage += damage;
      attacker.comboTTL = 100;
    }
    this.hitstop = Math.max(
      this.hitstop,
      blocked ? 4 : move.cancelRank >= 3 ? 9 : 6,
    );
    this.lastImpact = {
      x: target.x,
      y: target.y - 80,
      blocked,
      damage,
      combo: attacker.combo,
      name: move.name,
    };
    this.onImpact?.(this.lastImpact);
  }
  refill(): void {
    this.fighters.forEach((f) => (f.health = MAX_HEALTH));
  }
}
