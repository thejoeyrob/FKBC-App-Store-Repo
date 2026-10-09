import { test } from "node:test";
import assert from "node:assert/strict";
import { Fighter } from "../src/fighters/Fighter";
import { CombatWorld } from "../src/combat/CombatWorld";
import { getMove, activeWindow, duration } from "../src/combat/moves";
import { emptyInput, type InputFrame, type Facing } from "../src/combat/types";
import { MotionBuffer } from "../src/input/MotionBuffer";
function moveId(fighter: Fighter) {
  return fighter.move?.id;
}
function setup() {
  const joe = new Fighter("joe", "Joe", 400, 1, 0);
  const dummy = new Fighter("dummy", "Dummy", 475, -1, 0);
  return { joe, dummy, world: new CombatWorld([joe, dummy]) };
}
function motion(
  buffer: MotionBuffer,
  steps: Partial<InputFrame>[],
  facing: Facing = 1,
) {
  for (const s of steps) buffer.record({ ...emptyInput(), ...s }, facing);
}
test("simple cardinal specials mirror with facing and buffered attacks expire", () => {
  for (const facing of [1, -1] as Facing[]) {
    const forward = facing === 1 ? "right" : "left",
      back = facing === 1 ? "left" : "right";
    const b = new MotionBuffer();
    motion(
      b,
      [
        { down: true },
        { down: true, [forward]: true },
        { [forward]: true, pressed: new Set(["LP"]) },
      ],
      facing,
    );
    assert.equal(b.peek(), "projectile");
    b.consume();
    assert.equal(b.peek(), null);
    motion(
      b,
      [{ down: true }, { [back]: true, pressed: new Set(["HP"]) }],
      facing,
    );
    assert.equal(b.peek(), "rising");
    b.consume();
    motion(
      b,
      [{ [back]: true }, { [forward]: true, pressed: new Set(["MK"]) }],
      facing,
    );
    assert.equal(b.peek(), "tornado");
  }
  const b = new MotionBuffer();
  b.record({ ...emptyInput(), pressed: new Set(["LP"]) }, 1);
  for (let i = 0; i < 8; i++) b.record(emptyInput(), 1);
  assert.equal(b.peek(), null);
});
test("phone specials need only cardinal taps, tolerate slides, and reject stale or reversed motions", () => {
  for (const facing of [1, -1] as Facing[]) {
    const forward = facing === 1 ? "right" : "left";
    const back = facing === 1 ? "left" : "right";
    for (const [steps, button, expected] of [
      [[{ down: true }, { [forward]: true }], "LP", "projectile"],
      [[{ down: true }, { [back]: true }], "HP", "rising"],
      [[{ [back]: true }, { [forward]: true }], "HK", "tornado"],
      [[{ down: true }, { [forward]: true }], "MK", "sidekick"],
      [
        [{ down: true }, { down: true, [back]: true }, { [back]: true }],
        "MP",
        "rising",
      ],
    ] as const) {
      const b = new MotionBuffer();
      motion(
        b,
        [...steps, { ...steps.at(-1), pressed: new Set([button]) }],
        facing,
      );
      assert.equal(b.peek(), expected);
    }
  }
  const stale = new MotionBuffer();
  motion(stale, [{ down: true }]);
  for (let i = 0; i < 31; i++) stale.record(emptyInput(), 1);
  motion(stale, [{ right: true, pressed: new Set(["LP"]) }]);
  assert.equal(stale.peek(), "LP");
  const reversed = new MotionBuffer();
  motion(reversed, [{ right: true }, { left: true, pressed: new Set(["HK"]) }]);
  assert.equal(reversed.peek(), "HK");
});
test("normal does no damage during startup and hits once in active window", () => {
  const { joe, dummy, world } = setup();
  world.tick([{ ...emptyInput(), pressed: new Set(["LP"]) }, emptyInput()]);
  assert.equal(dummy.health, 1000);
  for (let i = 0; i < 3; i++) world.tick([emptyInput(), emptyInput()]);
  assert.equal(dummy.health, 1000);
  world.tick([emptyInput(), emptyInput()]);
  assert.equal(dummy.health, 965);
  assert.equal(dummy.state, "hitstun");
  assert.equal(world.hitstop, 6);
  for (let i = 0; i < 25; i++) world.tick([emptyInput(), emptyInput()]);
  assert.equal(dummy.health, 965);
  assert.equal(activeWindow(getMove("LP", "stand"), 3), -1);
  assert.equal(duration(getMove("LP", "stand")), 16);
});
test("blocking obeys low and overhead rules and applies block stun", () => {
  const { dummy } = setup();
  dummy.lastInput = { ...emptyInput(), guard: true };
  assert.equal(dummy.canBlock(getMove("LP", "stand"), 400), true);
  assert.equal(dummy.canBlock(getMove("LK", "crouch"), 400), false);
  dummy.lastInput.down = true;
  assert.equal(dummy.canBlock(getMove("LK", "crouch"), 400), true);
  assert.equal(dummy.canBlock(getMove("HK", "stand"), 400), true);
  assert.equal(dummy.canBlock(getMove("HK", "air"), 400), false);
  dummy.lastInput = { ...emptyInput(), right: true };
  assert.equal(dummy.canBlock(getMove("LP", "stand"), 400), true);
  dummy.receive(getMove("LP", "stand"), true, 1, true);
  assert.equal(dummy.health, 1000);
  assert.equal(dummy.state, "blockstun");
  assert.equal(dummy.stateFrames, 10);
});
test("hit-stop freezes fighters while buffering a medium follow-up into a combo", () => {
  const { joe, dummy, world } = setup();
  world.tick([{ ...emptyInput(), pressed: new Set(["LP"]) }, emptyInput()]);
  for (let i = 0; i < 4; i++) world.tick([emptyInput(), emptyInput()]);
  const frame = joe.moveFrame,
    x = dummy.x,
    stun = dummy.stateFrames;
  world.tick([{ ...emptyInput(), pressed: new Set(["MP"]) }, emptyInput()]);
  assert.equal(joe.moveFrame, frame);
  assert.equal(dummy.x, x);
  assert.equal(dummy.stateFrames, stun);
  for (let i = 0; i < 20; i++) world.tick([emptyInput(), emptyInput()]);
  assert.equal(joe.combo, 2);
  assert.equal(dummy.health, 900);
});
test("knockdown gets up with immunity and then becomes actionable", () => {
  const { dummy } = setup();
  dummy.receive(getMove("HK", "crouch"), false, 1, true);
  assert.equal(dummy.state, "knockdown");
  assert.equal(dummy.invulnerable, true);
  for (let i = 0; i < 48; i++) dummy.tick(emptyInput(), 400);
  assert.equal(dummy.state, "getup");
  for (let i = 0; i < 24; i++) dummy.tick(emptyInput(), 400);
  assert.equal(dummy.state, "idle");
  assert.equal(dummy.invulnerable, false);
});
test("projectile spawns after startup and damages exactly once at range", () => {
  const { joe, dummy, world } = setup();
  dummy.x = 800;
  joe.startMove(getMove("projectile", "stand"));
  for (let i = 0; i < 12; i++) world.tick([emptyInput(), emptyInput()]);
  assert.equal(world.projectiles.length, 0);
  world.tick([emptyInput(), emptyInput()]);
  assert.equal(world.projectiles.length, 1);
  for (let i = 0; i < 70; i++) world.tick([emptyInput(), emptyInput()]);
  assert.equal(dummy.health, 915);
  assert.equal(world.projectiles.length, 0);
});
test("simultaneous strikes trade and depth separation prevents contact", () => {
  const { joe, dummy, world } = setup();
  joe.startMove(getMove("LP", "stand"));
  dummy.startMove(getMove("LP", "stand"));
  for (let i = 0; i < 4; i++) world.tick([emptyInput(), emptyInput()]);
  assert.equal(joe.health, 965);
  assert.equal(dummy.health, 965);
  joe.reset(400, 1);
  dummy.reset(475, -1);
  world.reset();
  joe.depth = 400;
  dummy.depth = 450;
  joe.startMove(getMove("HP", "stand"));
  for (let i = 0; i < 25; i++)
    world.tick([emptyInput(), emptyInput()], false, 38);
  assert.equal(dummy.health, 1000);
});
test("fighter jumps, lands, crouches, and faces the opponent without flipping during attack", () => {
  const { joe } = setup();
  joe.tick({ ...emptyInput(), jumpPressed: true, right: true }, 475);
  assert.equal(joe.grounded, false);
  for (let i = 0; i < 60; i++) joe.tick(emptyInput(), 475);
  assert.equal(joe.grounded, true);
  joe.tick({ ...emptyInput(), down: true }, 200);
  assert.equal(joe.state, "crouch");
  assert.equal(joe.facing, -1);
  joe.tick({ ...emptyInput(), pressed: new Set(["HP"]) }, 200);
  joe.tick(emptyInput(), 700);
  assert.equal(joe.facing, -1);
});

test("direction transitions between render frames still form a special, and hit-stop preserves buffered attacks", () => {
  const b = new MotionBuffer();
  b.record(
    {
      ...emptyInput(),
      right: true,
      pressed: new Set(["LP"]),
      directionChanges: [
        { left: false, right: false, down: true, up: false },
        { left: false, right: true, down: true, up: false },
        { left: false, right: true, down: false, up: false },
      ],
    },
    1,
  );
  assert.equal(b.peek(), "projectile");
  for (let i = 0; i < 12; i++) b.record(emptyInput(), 1, false);
  assert.equal(b.peek(), "projectile");
});

test("all six normal attacks resolve their configured damage, including a crouching sweep", () => {
  for (const button of ["LP", "MP", "HP", "LK", "MK", "HK"] as const) {
    const { joe, dummy, world } = setup();
    joe.startMove(getMove(button, "stand"));
    for (let i = 0; i < 45; i++) world.tick([emptyInput(), emptyInput()]);
    assert.equal(dummy.health, 1000 - getMove(button, "stand").damage, button);
  }
  const { joe, dummy, world } = setup();
  joe.startMove(getMove("HK", "crouch"));
  joe.attackStance = "crouch";
  for (let i = 0; i < 17; i++)
    world.tick([{ ...emptyInput(), down: true }, emptyInput()]);
  assert.equal(dummy.state, "knockdown");
});
test("tornado hits three distinct windows then knocks down; rising begins invulnerable", () => {
  const { joe, dummy, world } = setup();
  joe.startMove(getMove("tornado", "stand"));
  for (let i = 0; i < 75; i++) world.tick([emptyInput(), emptyInput()]);
  assert.equal(dummy.health, 880);
  assert.equal(joe.combo, 3);
  assert.equal(dummy.state, "knockdown");
  joe.reset(400, 1);
  joe.startMove(getMove("rising", "stand"));
  assert.equal(joe.invulnerable, true);
  assert.ok(joe.vy < 0);
});
test("Streets treats motion-plus-attack as a normal when specials are disabled", () => {
  const { joe } = setup();
  joe.tick(
    {
      ...emptyInput(),
      right: true,
      pressed: new Set(["LP"]),
      directionChanges: [
        { left: false, right: false, up: false, down: true },
        { left: false, right: true, up: false, down: true },
        { left: false, right: true, up: false, down: false },
      ],
    },
    475,
    false,
  );
  assert.equal(moveId(joe), "LP");
});

test("holding guard blocks all three tornado contacts during block stun", () => {
  const { joe, dummy, world } = setup();
  joe.startMove(getMove("tornado", "stand"));
  const guard = { ...emptyInput(), guard: true };
  for (let i = 0; i < 60; i++) world.tick([emptyInput(), guard]);
  assert.equal(dummy.health, 988);
  assert.equal(joe.combo, 0);
});
test("jump plus attack starts an overhead, has downward reach and cannot repeat before landing", () => {
  const { joe } = setup();
  joe.tick(
    { ...emptyInput(), jumpPressed: true, pressed: new Set(["LP"]) },
    475,
  );
  assert.equal(joe.attackStance, "air");
  assert.equal(joe.move?.level, "overhead");
  for (let i = 0; i < 5; i++) joe.tick(emptyInput(), 475);
  assert.ok(joe.hitbox()!.y > joe.y - 60);
  for (let i = 0; i < 20; i++) joe.tick(emptyInput(), 475);
  assert.equal(joe.move, null);
  assert.equal(joe.grounded, false);
  joe.tick({ ...emptyInput(), pressed: new Set(["HP"]) }, 475);
  assert.equal(joe.move, null);
  for (let i = 0; i < 40; i++) joe.tick(emptyInput(), 475);
  joe.tick({ ...emptyInput(), pressed: new Set(["HP"]) }, 475);
  assert.equal(moveId(joe), "HP");
});
test("landing ends an active jump attack and accepts a buffered ground follow-up after recovery", () => {
  const { joe } = setup();
  joe.y = joe.floor - 2;
  joe.vy = 3;
  joe.startMove(getMove("HK", "air"));
  joe.tick(emptyInput(), 475);
  assert.equal(joe.state, "landing");
  assert.equal(joe.move, null);
  joe.tick({ ...emptyInput(), pressed: new Set(["LP"]) }, 475);
  for (let i = 0; i < 4; i++) joe.tick(emptyInput(), 475);
  assert.equal(moveId(joe), "LP");
  assert.equal(joe.attackStance, "stand");
});
test("standing attack posture cannot be changed halfway through by holding down", () => {
  const { joe } = setup();
  joe.startMove(getMove("HP", "stand"));
  joe.tick({ ...emptyInput(), down: true }, 475);
  assert.equal(joe.hurtbox().height, 132);
  assert.equal(joe.stance, "stand");
});
test("buffered button keeps its command even when a motion is entered afterwards", () => {
  const b = new MotionBuffer();
  b.record({ ...emptyInput(), pressed: new Set(["LP"]) }, 1);
  motion(b, [{ down: true }, { down: true, right: true }, { right: true }]);
  assert.equal(b.peek(), "LP");
  b.record({ ...emptyInput(), right: true, pressed: new Set(["MP"]) }, 1);
  assert.equal(b.peek(), "projectile");
});
test("contact allows rapid light chains but late recovery and whiffs cannot cancel", () => {
  const { joe } = setup();
  joe.startMove(getMove("LP", "stand"));
  joe.moveFrame = 4;
  joe.confirmed = true;
  joe.tick({ ...emptyInput(), pressed: new Set(["LK"]) }, 475);
  assert.equal(moveId(joe), "LK");
  joe.startMove(getMove("HP", "stand"));
  joe.confirmed = true;
  joe.moveFrame = 21;
  joe.buffer.record({ ...emptyInput(), down: true }, 1);
  joe.buffer.record({ ...emptyInput(), down: true, right: true }, 1);
  joe.tick({ ...emptyInput(), right: true, pressed: new Set(["LP"]) }, 475);
  assert.equal(moveId(joe), "HP");
  joe.reset(400, 1);
  joe.startMove(getMove("LP", "stand"));
  joe.moveFrame = 4;
  joe.tick({ ...emptyInput(), pressed: new Set(["MP"]) }, 475);
  assert.equal(moveId(joe), "LP");
});

test("button and direction order within one render frame is preserved", () => {
  const b = new MotionBuffer();
  const down = { left: false, right: false, up: false, down: true };
  const diagonal = { ...down, right: true };
  const forward = { ...diagonal, down: false };
  b.record(
    {
      ...emptyInput(),
      right: true,
      pressed: new Set(["LP"]),
      motionEvents: [
        { type: "button", button: "LP" },
        { type: "direction", direction: down },
        { type: "direction", direction: diagonal },
        { type: "direction", direction: forward },
      ],
    },
    1,
  );
  assert.equal(b.peek(), "LP");
  b.record(
    {
      ...emptyInput(),
      right: true,
      pressed: new Set(["MP"]),
      motionEvents: [{ type: "button", button: "MP" }],
    },
    1,
  );
  assert.equal(b.peek(), "projectile");
  b.clear();
  b.record(
    {
      ...emptyInput(),
      right: true,
      pressed: new Set(["HP"]),
      motionEvents: [
        { type: "direction", direction: down },
        { type: "direction", direction: diagonal },
        { type: "direction", direction: forward },
        { type: "button", button: "HP" },
      ],
    },
    1,
  );
  assert.equal(b.peek(), "projectile");
});
test("jump tap and aerial attack survive hit-stop without holding up or repeating", () => {
  const { joe, world } = setup();
  world.hitstop = 9;
  world.tick([
    { ...emptyInput(), jumpPressed: true, pressed: new Set(["LP"]) },
    emptyInput(),
  ]);
  for (let i = 0; i < 9; i++) world.tick([emptyInput(), emptyInput()]);
  assert.equal(joe.attackStance, "air");
  assert.equal(moveId(joe), "LP");
  assert.ok(!joe.grounded);
  assert.equal(joe.buffer.peekJump(), false);
  for (let i = 0; i < 60; i++) world.tick([emptyInput(), emptyInput()]);
  assert.equal(joe.grounded, true);
});
test("combo resets when the defender becomes actionable on the contact tick", () => {
  const { joe, dummy, world } = setup();
  joe.combo = 3;
  joe.comboDamage = 120;
  joe.comboTTL = 100;
  dummy.state = "hitstun";
  dummy.stateFrames = 1;
  joe.startMove(getMove("LP", "stand"));
  joe.moveFrame = 3;
  world.tick([emptyInput(), emptyInput()]);
  assert.equal(joe.combo, 1);
  assert.equal(joe.comboDamage, 35);
});
test("an old projectile cannot confirm a newer whiffed normal", () => {
  const { joe, dummy, world } = setup();
  dummy.x = 800;
  const projectile = getMove("projectile", "stand");
  world.projectiles.push({
    x: dummy.x - 20,
    y: dummy.y - 86,
    owner: joe,
    move: projectile,
    facing: 1,
    life: 20,
  });
  joe.startMove(getMove("LP", "stand"));
  world.tick([emptyInput(), emptyInput()]);
  assert.equal(dummy.health, 915);
  assert.equal(joe.confirmed, false);
  assert.equal(moveId(joe), "LP");
});

test("rising input launches melee only, never a fireball, for both facings and every punch", () => {
  for (const facing of [1, -1] as Facing[]) {
    for (const button of ["LP", "MP", "HP"] as const) {
      const joe = new Fighter("joe", "Joe", 640, facing, 0);
      const dummy = new Fighter(
        "dummy",
        "Dummy",
        facing === 1 ? 1100 : 150,
        -facing as Facing,
        0,
      );
      const world = new CombatWorld([joe, dummy]);
      const back = facing === 1 ? "left" : "right";
      world.tick([{ ...emptyInput(), down: true }, emptyInput()]);
      world.tick([
        { ...emptyInput(), [back]: true, pressed: new Set([button]) },
        emptyInput(),
      ]);
      assert.equal(joe.move?.id, "rising");
      assert.equal(joe.move?.projectile, undefined);
      for (let i = 0; i < 20; i++) world.tick([emptyInput(), emptyInput()]);
      assert.equal(world.projectiles.length, 0);
      assert.ok(joe.y < joe.floor);
    }
  }
});

test("Joe side kick advances grounded, hits once and knocks down; dummy cannot use his signature", () => {
  const { joe, dummy, world } = setup();
  dummy.x = 590;
  world.tick([{ ...emptyInput(), down: true }, emptyInput()]);
  world.tick([
    { ...emptyInput(), right: true, pressed: new Set(["MK"]) },
    emptyInput(),
  ]);
  assert.equal(joe.move?.id, "sidekick");
  for (let i = 0; i < 40; i++) world.tick([emptyInput(), emptyInput()]);
  assert.ok(joe.x > 400);
  assert.equal(joe.y, joe.floor);
  assert.equal(dummy.health, 880);
  assert.equal(dummy.state, "knockdown");
  assert.equal(world.projectiles.length, 0);
  dummy.reset(800, -1);
  dummy.tick({ ...emptyInput(), down: true }, 400);
  dummy.tick({ ...emptyInput(), left: true, pressed: new Set(["MK"]) }, 400);
  assert.equal(dummy.move?.id, "MK");
});

test("side kick chips on guard and normal contact cancels into it", () => {
  const { joe, dummy, world } = setup();
  joe.startMove(getMove("sidekick", "stand"));
  const guard = { ...emptyInput(), guard: true };
  for (let i = 0; i < 22; i++) world.tick([emptyInput(), guard]);
  assert.equal(dummy.health, 988);
  assert.notEqual(dummy.state, "knockdown");
  joe.reset(400, 1);
  dummy.reset(475, -1);
  world.reset();
  joe.startMove(getMove("LP", "stand"));
  joe.moveFrame = 4;
  joe.confirmed = true;
  joe.tick({ ...emptyInput(), down: true }, dummy.x);
  joe.tick({ ...emptyInput(), right: true, pressed: new Set(["HK"]) }, dummy.x);
  assert.equal(joe.move?.id, "sidekick");
});
