# FKBC Fight Arcade — first playable

Fresh Phaser 3 + TypeScript + Vite implementation. No previous PWA, service worker,
legacy code, downloaded fighter art, or external runtime asset dependency.
All fighters and stages are temporary procedural debug graphics.

## Run

Node 24+, npm.

```sh
npm install
npm run dev
# http://localhost:5173
npm test
npm run test:browser  # starts/reuses Vite; needs Chromium
npm run build
npm run preview
```

Browser tests use system `/usr/bin/chromium` when present, otherwise Playwright's
bundled Chromium (`npx playwright install chromium`). Set `CHROMIUM_PATH` to use a
specific binary. Most tests use the Canvas renderer on GPU-less runners, with a
separate test of the default WebGL path. Production output is `dist/`. The app targets a fixed 1280×720
landscape canvas, FIT scaling with letterboxing and no cropping, and a fixed
60 Hz combat simulation. Rendering targets 60 FPS; actual FPS depends on hardware.
A capped accumulator prevents runaway simulation after suspension. Pause/visibility
handling prevents input from sticking after switching apps.

## Playable modes

- **Arcade Fight:** Joe versus a training dummy with basic sparring AI, best of
  three rounds, 99-second active-play timer, health bars, KO, round scoring,
  match result, and rematch. This is the first matchup, not an arcade campaign.
- **Training:** Joe versus dummy; unlimited time; idle, stand guard, crouch guard,
  and spar dummy settings; health reset after a recovered combo; automatic reset
  after a KO; frame phase, move timing, hitboxes/hurtboxes, damage, and combo display.
- **FKBC Streets:** 3200-unit scrolling test street, horizontal and up/down depth
  movement, six normal attacks, a single placeholder enemy that approaches and
  attacks, depth-based collision (38-unit tolerance), health/KO, and reset.
  No enemy waves, pickups, boss, progression, jump, or specials in this basic scene.

Joe is the only playable character. Jack, John, Justin, and Paul are planned roster
entries, clearly marked unavailable in the menu. No final fighter art is included.

## Controls

| Action                                | Keyboard           | Standard browser gamepad    | Touch               |
| ------------------------------------- | ------------------ | --------------------------- | ------------------- |
| Left / right                          | A / D or arrows    | Left stick / D-pad          | Sliding D-pad       |
| Jump (fight) / depth up (Streets)     | W or ↑             | Stick/D-pad up              | D-pad up            |
| Crouch (fight) / depth down (Streets) | S or ↓             | Stick/D-pad down            | D-pad down          |
| LP / MP / HP                          | J / K / L          | X / Y / LB                  | Upper three buttons |
| LK / MK / HK                          | U / I / O          | A / B / RB                  | Lower three buttons |
| Guard                                 | Shift or hold away | Either trigger or hold away | GUARD or hold away  |
| Reset                                 | R                  | —                           | RESET               |
| Pause                                 | Escape             | —                           | PAUSE / RESUME      |
| Toggle debug boxes                    | F2                 | —                           | BOXES checkbox      |

The touch D-pad supports sliding diagonals and multiple simultaneous pointers.
Standard gamepad button indices are 2/3/4 for punches and 0/1/5 for kicks; triggers
6/7 guard; D-pad 12–15. Gamepads must be connected and activated with a button
press for browser discovery. Nonstandard mappings may require future remapping.
Stand guard blocks mids and overheads. Crouch guard blocks mids and lows but loses
to overheads. You cannot block while attacking, airborne, hit-stunned, or knocked down.

## Joe's specials

See [the gameplay move list](docs/MOVE_LIST.md) for phone controls and character signatures.

Directions are relative to Joe's current facing. Enter within 30 simulation frames
(~500 ms), then an attack button. A 7-frame attack buffer tolerates inputs just
before recovery ends and during hit-stop.

| Move                 | Motion            | Behavior                                          |
| -------------------- | ----------------- | ------------------------------------------------- |
| Projectile blast     | ↓ → + any punch | Traveling projectile; special chip on block       |
| Tornado kick         | ← → + any kick  | Advancing three-hit spin; last hit knocks down    |
| Thrusting side kick  | ↓ → + any kick  | Joe’s signature advancing kick; pushback and knockdown |
| Rising attack        | ↓ ← + any punch | Rising strike; initial invulnerability; knockdown |

Motions are quick sequential taps, not simultaneous holds; no diagonal or charge
is required. Sliding through a lower diagonal is tolerated. Motions mirror when
facing left. Standing, crouching, and airborne normals have appropriate
heights/guard levels; crouching HK is a knockdown sweep and jumping normals
are overheads. Standing normals can be crouch-blocked. Joe faces automatically when grounded and actionable; attack
facing is locked until the move ends. Jump over the dummy to swap sides.

### Timing and combos

Move definitions live in `src/combat/moves.ts`. Startup/active/recovery and stun
use simulation frames, independent of draw rate. Light attacks cancel on contact
into medium/heavy attacks; medium cancels into heavy; normals cancel into specials. Contact cancels must be
entered during the active frames or the next three frames; whiffs retain full recovery.
Light attacks can chain into another light attack on contact.
You can also link attacks during remaining hit stun. One normal attack is allowed per
jump; airborne normals gain five active frames and four hit-stun frames for jump-in
links. Landing ends an airborne attack with four frames of recovery. Holding guard
continues blocking through a block string, provided the high/low direction is correct. A new hit only increments
the combo if the opponent is still in hit stun/knockdown; recovered targets start
new combos. Knockdown is 48 frames followed by a 24-frame protected get-up.

| Move       | Startup |         Active | Recovery |     Damage |
| ---------- | ------: | -------------: | -------: | ---------: |
| LP         |       4 |              3 |        9 |         35 |
| MP         |       7 |              4 |       13 |         65 |
| HP         |      11 |              5 |       20 |        100 |
| LK         |       5 |              4 |       10 |         40 |
| MK         |       9 |              5 |       16 |         75 |
| HK         |      14 |              5 |       23 |        115 |
| Projectile |      13 |      1 (spawn) |       26 |         85 |
| Tornado    |      10 | 25 (3 windows) |       20 | 40 per hit |
| Rising     |       5 |             12 |       28 |        130 |

Hit-stop freezes combat for 6/9 frames on normal/heavy hits, 4 on blocks, while
still buffering inputs. Impact shake honors reduced-motion preferences. Temporary
synthesized hit/block sounds unlock on user interaction and can be muted.

## Architecture

```text
src/
  scenes/    Menu, shared fixed-step play loop, Fight, Streets
  fighters/  Renderer-independent fighter state, movement, guard, recovery
  combat/    Move data, contact resolution, projectiles, stun, hit-stop, combos
  input/     Keyboard/touch/gamepad snapshots and facing-relative motion buffer
  ui/        DOM controller/menu, Phaser HUD and temporary fighter drawing
  audio/     Gesture-unlocked synthesized debug effects
  assets/    Boundary for future original assets
```

Simulation code has no Phaser or DOM imports and is covered by deterministic
combat tests. Chromium integration tests exercise actual mode buttons, keyboard,
multitouch pointer events, synthetic Gamepad API input, scene transitions, and
landscape/portrait FIT geometry. Development inspection is stripped from the
production bundle. Physical gamepad hardware and native-device performance still
need device testing.

## Capacitor readiness

`@capacitor/core` and CLI are installed. `capacitor.config.ts` declares
`com.fkbc.fightarcade`, `dist/` output, and the native background/inset configuration.
Browser and native wrappers use the same frontend bundle, with no PWA dependency.
Native platform projects are intentionally not generated in this slice.

On a machine with the required SDKs:

```sh
npm install @capacitor/ios@7 @capacitor/android@7
npx cap add ios
npx cap add android
npm run build
npm run cap:sync
```

Set supported orientations to landscape left/right in the generated iOS target
and `android:screenOrientation="sensorLandscape"` on Android's activity. Configure
signing and safe-area/device testing before release. Native packaging, App Store
submission, and production game content are later milestones.

The original project brief is preserved in `README`.

## Combat-feel pass (six-button controls)

The SNES fighting-game control reference is six attacks: LP/MP/HP and LK/MK/HK.
This pass keeps FKBC's original moves and refines guard strings, rapid light chains,
contact cancel windows, jump-in attack reach, and landing recovery. Up plus attack
in the same input sample starts a jump attack. Attack stance stays fixed, so holding
down midway through a standing attack does not shrink its hurtbox. A buffered move
is resolved when its button is pressed; later directions cannot reinterpret it.
The combat is inspired by that control style, not an exact reproduction of another
game's frame data.

Standard gamepads now match the SNES button positions: left/top/left shoulder for
punches, bottom/right/right shoulder for kicks (Xbox X/Y/LB and A/B/RB). Backward
walking is 75% of forward speed while holding away remains directional guard.

## Artwork preparation

See [the artist brief](docs/ART_BRIEF.md) for the Joe pilot, complete animation
inventory, dummy reactions, effects, stage layers, UI, naming, and PNG handoff.
Use [ASSET_CHECKLIST.csv](docs/ASSET_CHECKLIST.csv) to track the batches. Technical
SVG guides in `docs/templates/` illustrate alignment and screen reservations;
they are not final game art.

### Input and recovery follow-up

Buttons and directions now retain their exact order within a browser render frame,
so a direction entered after a punch cannot retroactively turn that punch into a
special. Jump taps share the seven-frame input buffer and stay alive through
hit-stop. Combo accounting checks stun at the moment of contact; a recovered
opponent starts a fresh combo. A previously launched projectile cannot grant a
newer whiffed normal a contact cancel.


### Character signatures

Joe's thrusting side kick is playable with down → forward + any kick. It stays
grounded, advances during its active frames, and has long reach and knockdown.
Rising remains down → back + punch: an upward melee strike with no projectile.
The fighter debug label displays the move name to make input testing clear.

Per-character special loadouts live in `src/fighters/roster.ts`. Only Joe is
playable. Proposed future signatures (not implemented): Jack — rush punch;
John — spinning backfist; Justin — counter strike; Paul — power slam.
These are editable design proposals for roster expansion.
