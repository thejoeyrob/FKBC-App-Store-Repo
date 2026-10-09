# FKBC gameplay move list

Only Joe is playable in the current vertical slice. Directions are relative to
Joe's facing: forward is toward the opponent, back is away. Enter the two
cardinal directions in order within half a second, then press an attack.
No diagonal or charge is required. Lower diagonals while sliding are tolerated.

| Joe move | Input | Expected behavior |
| --- | --- | --- |
| Projectile blast | Down, forward + any punch | Grounded projectile launch |
| Rising attack | Down, back + any punch | Rising melee strike, initial invulnerability, knockdown; no projectile |
| Tornado kick | Back, forward + any kick | Advancing three-hit spin, final hit knocks down |
| Signature thrusting side kick | Down, forward + any kick | Grounded advancing heel strike, long reach, strong pushback, knockdown |

Keyboard: punches J/K/L, kicks U/I/O, directions WASD or arrows.
Touch: tap the D-pad directions, then an upper-row punch or lower-row kick.
Gamepad: X/Y/LB punches and A/B/RB kicks on a standard Xbox-style layout.

Hold away to guard; down-away blocks low attacks. Jumping normals are overheads.
Keyboard Shift, touch GUARD and either gamepad trigger also guard.
Crouch + heavy kick sweeps. Jump + an attack performs an overhead normal.
Normal contact can cancel into a special; a whiff retains its recovery.

## Character signatures

Each character has a separate special loadout in `src/fighters/roster.ts`.
Joe's side kick is implemented and unavailable to the dummy. Future signatures
below are proposals, not implemented attacks or selectable fighters:

| Fighter | Signature | Intended feature |
| --- | --- | --- |
| Joe | Thrusting side kick | Reach and space control; implemented |
| Jack | Rush punch | Fast advancing punch to close distance |
| John | Spinning backfist | Close-range two-hit turning strike |
| Justin | Counter strike | Timed defensive counter, punishable when missed |
| Paul | Power slam | Short-range grab and heavy knockdown |

## Gameplay checks

Try every Joe special from both sides. Check the named move in the BOXES/debug
label. Rising must lift Joe and must never create a projectile. Side kick must
stay grounded and extend a leg. Test side kick on an idle dummy and a guarding
dummy: knockdown on a clean hit, small chip and pushback on guard. Try a normal
contact cancelled into it. The dummy cannot perform Joe's signature.
