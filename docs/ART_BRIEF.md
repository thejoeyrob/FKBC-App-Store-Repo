# FKBC Fight Arcade — artist handoff

## Start with this small pilot

Before producing a full animation library, deliver:

1. Joe's model sheet: front, side, back, and right-facing fighting stance. Include a
   palette, outfit details, height/proportions, and a face close-up.
2. Six idle poses and five standing light-punch poses, exported using the frame
   specification below. LP needs anticipation, extension/contact, and recovery.
3. One training-dummy concept and one training-floor concept at 1280×720.

This pilot lets us check identity, visual scale, foot alignment, and animation
readability in the game before you spend time on every move. It is an art handoff,
not a request to generate final artwork in this coding session.

**Joe's actual appearance is not defined yet.** Supply a chosen reference/model
sheet, outfit, and colors. Do not invent the identities or appearances of Jack,
John, Justin, or Paul. Full animation production for those four comes later.

## Visual direction

Recommended: original pixel art with the readable silhouettes, deliberate poses,
and limited shading of a SNES-era console fighter. The game keeps six attacks.
Joe's punches must visibly differ from his kicks; light/medium/heavy attacks need
increasing extension, weight, and recovery. Make the contact pose readable at a
small screen size. Keep the same face, outfit, body proportions, camera angle,
light direction, and palette throughout a clip and across clips.

Use original FKBC character and stage designs. Street Fighter is the control/feel
reference; the character costumes, logos, sprites, and effects should be FKBC's.
If you prefer illustrated rather than pixel sprites, supply one style sample
first; the frame/pivot specification still applies. Pixel art is a recommendation,
not a previously approved final art style.

## Fighter export specification — first integration target

| Item                    | Specification                                                       |
| ----------------------- | ------------------------------------------------------------------- |
| Frame cell              | **384×256 pixels**, identical for every fighter frame               |
| Foot/root anchor        | **x=192, y=224**, measured from top-left of the cell                |
| Facing                  | Right-facing; the game will mirror for left-facing                  |
| Standing visible height | Target **126–132 pixels**; keep the body near the anchor            |
| Standing body width     | About **54–64 pixels**, with room for extended arms and legs        |
| Color / alpha           | sRGB RGBA PNG, transparent background                               |
| Initial scale           | One exported pixel per logical game pixel; verify the pilot in game |
| Frame naming            | `joe__idle__000.png`, `joe__stand_lp__000.png`, etc.                |
| Numbering               | Three digits, starting at 000, sequential within each clip          |
| Editable originals      | Aseprite, PSD, Krita, or layered source in the tool you use         |

These dimensions match the current debug fighter and collision footprint. They
are an initial integration specification, not a claim that final visual scale is
locked. If we enlarge Joe later, we will deliberately retune the collision/stage
scale rather than silently stretch artwork. **The transparent cell is 384×256;
the character itself should not fill the entire cell.**

Use [the frame guide](templates/fighter-frame-guide.svg). It marks the anchor,
standing/crouching collision references, and maximum current standing kick reach.
Do not paint guides into delivered frames. The root should remain stable across
clips; turn, crouch, and recover without unintended sliding. For aerial poses,
keep the same virtual root—vertical travel is supplied by the game. Knockdown
and lying poses keep the root reference even when no foot is touching it.

Give limbs sufficient transparent margin; the current longest normal hitbox
extends 170 pixels forward from the root (including Joe’s side kick). Tornado trails and large effects belong
on separate VFX layers. Do not bake floor shadows, motion trails, hit sparks,
health bars, text, or hitboxes into the fighter image. No opaque/checkerboard
background, watermark, or per-frame automatic recentering/cropping.

Mirroring reverses outfit text and asymmetric details. Flag these on the model
sheet; either choose a design that mirrors cleanly or plan separate left-facing
frames later. Do not produce all left-facing clips for the pilot.

## Joe animation inventory

Frame counts are **suggested drawn key poses**, not simulation frames or a
requirement to draw 60 unique images per second. Combat runs at 60 Hz. The engine
will hold/reuse poses and map anticipation/contact/recovery to move timing.

| Clip name                             | Suggested poses | What to draw                                              |
| ------------------------------------- | --------------: | --------------------------------------------------------- |
| `idle`                                |               6 | Calm looping ready stance; feet stable                    |
| `walk_forward`                        |               8 | Complete step cycle toward opponent                       |
| `walk_back`                           |               8 | Complete defensive retreat cycle                          |
| `crouch_enter`                        |               3 | Stand to crouch                                           |
| `crouch_idle`                         |               2 | Low ready stance                                          |
| `crouch_exit`                         |               3 | Crouch to stand                                           |
| `jump_start`                          |               3 | Anticipation and takeoff                                  |
| `jump_rise`                           |               2 | Rising pose                                               |
| `jump_apex`                           |               2 | Apex pose                                                 |
| `jump_fall`                           |               2 | Descending pose                                           |
| `landing`                             |               3 | Contact and settling                                      |
| `block_high`                          |               2 | Standing guard and blocked-impact pose                    |
| `block_low`                           |               2 | Crouch guard and blocked-impact pose                      |
| `hit_stand`                           |               3 | Standing recoil                                           |
| `hit_crouch`                          |               3 | Crouching recoil                                          |
| `hit_air`                             |               2 | Airborne hit reaction                                     |
| `knockdown`                           |               6 | Fall/impact sequence                                      |
| `down`                                |               1 | Lying pose                                                |
| `getup`                               |               6 | Return from down to ready stance                          |
| `ko`                                  |               1 | Defeated hold pose; may reuse `down`                      |
| `victory`                             |               6 | Short celebration after a round                           |
| `stand_lp`, `stand_mp`, `stand_hp`    |       5 / 6 / 8 | Three distinct standing punches                           |
| `stand_lk`, `stand_mk`, `stand_hk`    |       5 / 6 / 8 | Three distinct standing kicks                             |
| `crouch_lp`, `crouch_mp`, `crouch_hp` |       5 / 6 / 8 | Three crouching punches                                   |
| `crouch_lk`, `crouch_mk`, `crouch_hk` |       5 / 6 / 8 | Low kicks; HK is the sweep                                |
| `air_lp`, `air_mp`, `air_hp`          |       5 / 6 / 8 | Airborne punches with readable downward contact           |
| `air_lk`, `air_mk`, `air_hk`          |       5 / 6 / 8 | Airborne kicks; all jumping normals count as overheads    |
| `special_projectile`                  |               8 | Windup, release, recovery; projectile exported separately |
| `special_tornado`                     |              12 | Three readable kick/contact sections and recovery         |
| `special_sidekick`                    |               8 | Chamber, extended horizontal heel strike, recoil/recovery |
| `special_rising`                      |              10 | Takeoff/strike, rise, descent/recovery                    |

The full recommendation is **226 drawn poses across 43 clips** (KO can reuse down).
That is a planning estimate; don't commission all of it before the pilot works.
Optional intro, taunts, throws, super moves, and fighter-specific cutscenes are
**later scope** and are not required for this slice.

Suggested attack pose breakdown: light = anticipation/contact/follow-through/
recovery; medium and heavy add stronger windup, reach, and return poses. Give the
contact pose a clear silhouette. Provide a small note or CSV identifying which
source frames are anticipation, contact, and recovery. No universal animation FPS
should override the engine's startup/active/recovery timing.

## Training Dummy

Choose an original humanoid practice robot or padded sparring dummy. It must have
an identifiable front, high/low guard, readable reactions, and roughly Joe's
standing scale. A completely immobile wooden post would not match the current
sparring and get-up behavior.

First batch: `idle` (2), `block_high` (2), `block_low` (2), `hit_stand` (3),
`hit_crouch` (3), `knockdown` (6), `down` (1), `getup` (6), `ko` (1).
These **26 poses** cover passive training; KO may reuse down.

Second batch for the already-playable sparring dummy: `walk_forward` (6),
`walk_back` (6), `stand_lp` (5), `stand_mp` (6), `stand_mk` (6), `crouch_hk` (8).
Use the same frame cell, anchor, and naming convention with `dummy__`.

Streets' single placeholder enemy can initially reuse the dummy or a clearly
marked alternate palette. A separate finalized street-enemy design comes later.

## Effects, supplied separately

| Asset               | Cell / anchor           | Suggested poses | Notes                                                   |
| ------------------- | ----------------------- | --------------: | ------------------------------------------------------- |
| `projectile_spawn`  | 64×64 / center          |               4 | Release flash at hand                                   |
| `projectile_loop`   | 64×64 / center          |               6 | Rightward travel, looping; visible core about 44×40     |
| `projectile_impact` | 96×96 / center          |               6 | Dissipates on contact                                   |
| `hit_light`         | 64×64 / center          |               4 | Small hit spark                                         |
| `hit_heavy`         | 96×96 / center          |               6 | Stronger hit spark                                      |
| `block_spark`       | 64×64 / center          |               4 | Distinct from a damaging hit                            |
| `tornado_trail`     | 192×128 / center        |               8 | Transparent, readable arcs; does not hide fighters      |
| `rising_trail`      | 128×192 / bottom-center |               6 | Separate rising streak                                  |
| `dust_land`         | 128×64 / bottom-center  |               4 | Small floor dust                                        |
| `shadow`            | 96×24 / center          |               1 | Optional neutral soft ellipse; code can keep drawing it |

Effects should not be part of fighter hitboxes. Let transparency fade naturally
at the edge. Palette accents may start with FKBC green `#c5fb76`, cyan `#65d4ed`,
and warm hit yellow; these colors are proposed UI/VFX cues, not Joe's outfit.

## Training / Arcade stage

Deliver one original FKBC gym, dojo, or training-floor concept. Master canvas:
**1280×720**. Export independent layers at the same size/registration:

- Far wall/background.
- Midground architecture and FKBC signage.
- Floor: fighter contact baseline is **y=512**.
- Optional foreground accents, placed away from the fight silhouette.

Keep the main fight area (approximately x=75–1205, y=300–512) readable and free of
high-contrast clutter. HUD/toolbar occupy the top 170 pixels. The touch controller
occupies much of **y=520–720**; keep that region visually quiet. Do not bake the
controller, health bars, timer, labels, or fighters into the stage.

The [screen-layout guide](templates/screen-layout-guide.svg) shows the current
reserved areas. Backgrounds can fill the complete 16:9 canvas; the game will FIT
scale/letterbox them without cropping. Parallax speeds and layer ordering are code
settings, not instructions to stretch the image independently.

## FKBC Streets stage — after the fight art pilot

Current prototype world: **3200×720**, horizontal scrolling. The depth walk band
is **y=365–500**, inside the road/floor area y=340–515. Deliver a layered master
plus five registered **640×720** sections per layer for easy texture loading.
Adjacent sections must meet without visible seams.

Useful layers: far buildings/skyline, shopfronts/walls, walkable road/pavement,
and optional foreground props. Reserve the same HUD/controller bands as the fight
stage. Keep the walkable strip clear; avoid painted barriers that imply collisions
we haven't implemented. Pickups, breakables, bosses, and enemy waves are later.

Joe's fight frames can support the first Streets encounter. Later depth-facing
walk poses can be commissioned separately; do not draw a second full Joe library now.

## UI and future roster — later batches

| Asset                       | Delivery size       | Notes                                                     |
| --------------------------- | ------------------- | --------------------------------------------------------- |
| FKBC Fight Arcade logo      | 512×256 transparent | Original wordmark; source vector if available             |
| Joe and Dummy portraits     | 128×128 each        | Clear face, consistent with model sheets                  |
| Title/menu background       | 1280×720            | Separate from logo and menu text                          |
| Health-bar frame            | 480×24 each side    | Transparent interior; fill remains code-driven            |
| Round marker                | 24×24               | Separate lit/unlit states                                 |
| D-pad art                   | 192×192             | Neutral and pressed accents, transparent                  |
| Six attack buttons          | 64×64 per state     | LP/MP/HP and LK/MK/HK; normal/pressed states              |
| Guard / reset / pause icons | 64×64               | Legible at small scale                                    |
| App icon master             | 1024×1024           | Full square with background; platform applies corner mask |
| Jack, John, Justin, Paul    | Model sheets first  | No full animation sets until roster expansion             |

UI skins and native icons are not prerequisites for Joe's art pilot. Text can stay
in the interface instead of being baked into images. A final title treatment and
native marketing/store screenshots come after the visuals are integrated.

## Delivery folder and checklist

```text
art-delivery/
  references/joe-model-sheet.png
  references/joe-palette.png
  sources/joe.aseprite                 # or the editable format you use
  fighters/joe/idle/joe__idle__000.png
  fighters/joe/stand_lp/joe__stand_lp__000.png
  fighters/dummy/idle/dummy__idle__000.png
  fx/projectile_loop/fx__projectile_loop__000.png
  stages/training/training__far.png
  stages/training/training__mid.png
  stages/training/training__floor.png
  notes/animation-poses.csv
```

Individual aligned PNG frames are sufficient: **you do not need to build a sprite
atlas yourself**. We can pack them. If supplying an atlas, use Phaser JSON Hash +
PNG, disable rotated frames, retain source sizes/pivot registration, and use pages
no larger than **2048×2048**. First deliveries should remain untrimmed for checking
alignment; trimming/packing can follow after the pilot is verified.

Include palette and editable originals; export images should be clean without
helper layers. An animated GIF or MP4 preview is helpful, but it does not replace
individual transparent PNG frames. Keep idle/walk loop endpoints seamless. List
intentional frame reuse (for example `ko` reusing `down`).

Use [ASSET_CHECKLIST.csv](ASSET_CHECKLIST.csv) to track batches. `P0` is the pilot,
`P1` completes Joe/Dummy for fighting, `P2` adds FX/stages/UI, and `P3` is future scope.

## Copy-and-send artist instruction

> Create an original FKBC martial-arts fighter named Joe, based on the supplied
> model sheet and palette. Use readable SNES-era pixel-art poses with consistent
> proportions, lighting, costume, and right-facing side-view camera. Start with a
> model sheet, six idle frames, and five standing light-punch frames only. Export
> each frame as transparent sRGB RGBA PNG in a 384×256 cell; the fixed foot/root
> anchor is (192,224), and standing visible height is approximately 126–132 px.
> Keep feet/root stable and retain empty margins for extended limbs. Light punch
> must clearly show anticipation, contact, and recovery. Do not include background,
> shadow, text, hit sparks, trails, or alignment guides inside fighter sprites.
> Name frames `joe__idle__000.png`, `joe__stand_lp__000.png`, etc., and include the
> editable source, palette, and a pose breakdown. Wait for the in-game pilot check
> before creating the complete animation list.
