import { test } from "node:test";
import assert from "node:assert/strict";
import { Fighter } from "../src/fighters/Fighter";
import { CombatWorld } from "../src/combat/CombatWorld";
import { getMove, activeWindow, duration } from "../src/combat/moves";
import { emptyInput, type InputFrame, type Facing } from "../src/combat/types";
import { MotionBuffer } from "../src/input/MotionBuffer";
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
test("quarter circle and rising motions are relative to facing; motion priority and expiry", () => {
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
      [
        { [forward]: true },
        { down: true },
        { down: true, [forward]: true, pressed: new Set(["HP"]) },
      ],
      facing,
    );
    assert.equal(b.peek(), "rising");
    b.consume();
    motion(
      b,
      [
        { down: true },
        { down: true, [back]: true },
        { [back]: true, pressed: new Set(["MK"]) },
      ],
      facing,
    );
    assert.equal(b.peek(), "tornado");
  }
  const b = new MotionBuffer();
  b.record({ ...emptyInput(), pressed: new Set(["LP"]) }, 1);
  for (let i = 0; i < 8; i++) b.record(emptyInput(), 1);
  assert.equal(b.peek(), null);
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
  assert.equal(dummy.canBlock(getMove("HK", "stand"), 400), false);
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
  assert.equal(joe.move?.id, "LP");
});
