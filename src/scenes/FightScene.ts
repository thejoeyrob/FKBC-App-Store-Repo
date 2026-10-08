import { PlayScene } from "./PlayScene";
import { Fighter } from "../fighters/Fighter";
import { CombatWorld } from "../combat/CombatWorld";
import { FighterView } from "../ui/FighterView";
import { Hud } from "../ui/Hud";
import { input } from "../input/InputManager";
import { emptyInput, type InputFrame } from "../combat/types";
import { FLOOR, MAX_HEALTH, type Mode } from "../config";
export class FightScene extends PlayScene {
  private mode: Mode = "training";
  private joe!: Fighter;
  private dummy!: Fighter;
  private world!: CombatWorld;
  private views: FighterView[] = [];
  private hud!: Hud;
  private ticks = 0;
  private round = 1;
  private wins: [number, number] = [0, 0];
  private roundEnd = 0;
  private refillCountdown = 0;
  private message = "";
  constructor() {
    super("Fight");
  }
  init(data: { mode?: Mode }): void {
    this.mode = data.mode ?? "training";
  }
  create(): void {
    this.cameras.main.setBackgroundColor("#0b1424");
    this.drawStage();
    this.joe = new Fighter("joe", "Joe", 390, 1, 0xc5fb76);
    this.dummy = new Fighter("dummy", "Training Dummy", 890, -1, 0x65d4ed);
    this.world = new CombatWorld([this.joe, this.dummy]);
    this.world.onImpact = (e) => this.impact(e);
    this.views = [
      new FighterView(this, this.joe),
      new FighterView(this, this.dummy),
    ];
    this.hud = new Hud(
      this,
      this.mode === "training"
        ? "training / combat laboratory"
        : "arcade fight / joe vs training dummy",
    );
    this.setupControls(this.mode === "training");
    this.resetSession();
    if (this.overlay.dummy)
      this.overlay.dummy.onchange = () => {
        this.dummy.buffer.clear();
        this.overlay.dummy?.blur();
        input.clear();
      };
  }
  private drawStage(): void {
    const g = this.add.graphics();
    g.fillStyle(0x111f32);
    g.fillRect(0, 305, 1280, 210);
    g.lineStyle(1, 0x29405d, 0.7);
    for (let x = 0; x <= 1280; x += 80) g.lineBetween(x, 180, x, FLOOR);
    for (let y = 200; y < FLOOR; y += 60) g.lineBetween(0, y, 1280, y);
    g.fillStyle(0x0a1220);
    g.fillRect(0, FLOOR, 1280, 208);
    g.lineStyle(3, 0x73954d);
    g.lineBetween(0, FLOOR, 1280, FLOOR);
    g.lineStyle(1, 0x1e334b);
    for (let x = 0; x <= 1280; x += 100)
      g.lineBetween(640 + (x - 640) * 0.75, FLOOR, x, 720);
    g.lineBetween(0, 610, 1280, 610);
    g.lineBetween(0, 705, 1280, 705);
    this.add
      .text(640, 305, "FKBC", {
        fontFamily: "Arial",
        fontSize: "88px",
        fontStyle: "bold",
        color: "#20344a",
        letterSpacing: 18,
      })
      .setOrigin(0.5);
    this.add
      .text(640, 380, "COMBAT DEVELOPMENT FLOOR", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#38516e",
        letterSpacing: 4,
      })
      .setOrigin(0.5);
  }
  protected resetSession(): void {
    this.wins = [0, 0];
    this.round = 1;
    this.roundEnd = 0;
    this.refillCountdown = 0;
    this.resetRound();
  }
  private resetRound(): void {
    this.joe.reset(390, 1);
    this.dummy.reset(890, -1);
    this.world.reset();
    this.ticks = 0;
    this.roundEnd = 0;
    this.refillCountdown = 0;
    input.clear();
    this.message =
      this.mode === "training"
        ? "TRAINING · RESET: R · PAUSE: ESC · F2: BOXES"
        : `ROUND ${this.round} · FIRST TO TWO`;
  }
  private dummyInput(): InputFrame {
    const i = emptyInput();
    if (this.dummy.health === 0) return i;
    const type =
      this.mode === "arcade" ? "spar" : (this.overlay.dummy?.value ?? "idle");
    if (type === "guard" || type === "low") {
      i.guard = true;
      i.down = type === "low";
      return i;
    }
    if (type === "spar") {
      const dist = Math.abs(this.joe.x - this.dummy.x),
        beat = this.world.frame % 130;
      if (dist > 135) {
        i.left = this.joe.x < this.dummy.x;
        i.right = !i.left;
      } else if (beat < 35) {
        i.guard = true;
        i.down = this.joe.stance === "crouch";
      } else if (beat === 40) i.pressed.add("LP");
      else if (beat === 57) i.pressed.add("MP");
      else if (beat === 85) i.pressed.add("MK");
      else if (beat === 115) {
        i.down = true;
        i.pressed.add("HK");
      }
    }
    return i;
  }
  protected step(): void {
    if (this.roundEnd > 0) {
      input.sample();
      this.world.tick([emptyInput(), emptyInput()]);
      this.roundEnd--;
      if (this.roundEnd === 0) this.finishRound();
      return;
    }
    const wasStopped = this.world.hitstop > 0;
    this.world.tick([input.sample(), this.dummyInput()]);
    if (!wasStopped) this.ticks++;
    if (this.mode === "arcade") {
      if (
        this.joe.health === 0 ||
        this.dummy.health === 0 ||
        this.ticks >= 99 * 60
      ) {
        this.roundEnd = 100;
        const winner =
          this.joe.health === this.dummy.health
            ? -1
            : this.joe.health > this.dummy.health
              ? 0
              : 1;
        if (winner === 0 || winner === 1) this.wins[winner]++;
        this.message =
          winner < 0
            ? "DRAW"
            : winner === 0
              ? "JOE WINS THE ROUND"
              : "DUMMY WINS THE ROUND";
      }
    } else if (this.joe.health === 0 || this.dummy.health === 0) {
      if (++this.refillCountdown >= 90) {
        this.joe.reset(390, 1);
        this.dummy.reset(890, -1);
        this.world.reset();
        this.refillCountdown = 0;
        input.clear();
      }
      this.message = "KNOCKOUT · TRAINING RESET IN 1.5 SECONDS";
    } else {
      this.refillCountdown = 0;
      if (this.world.lastImpact)
        this.message = `${this.world.lastImpact.blocked ? "BLOCK" : "HIT"} · ${this.world.lastImpact.name.toUpperCase()} · ${this.world.lastImpact.damage} DAMAGE`;
      // Refill a recovered training dummy after the combo display has expired.
      if (this.joe.comboTTL === 0 && !this.dummy.locked && !this.dummy.move)
        this.dummy.health = MAX_HEALTH;
    }
  }
  private finishRound(): void {
    if (this.wins.some((w) => w >= 2)) {
      this.paused = true;
      input.setEnabled(false);
      this.overlay.pause.textContent = "PAUSE";
      const win = this.wins[0] >= 2;
      this.showNotice(
        win ? "JOE WINS" : "TRY AGAIN",
        `Final rounds: Joe ${this.wins[0]} — Dummy ${this.wins[1]}. This is the first playable matchup.`,
        "REMATCH",
        () => {
          this.hideNotice();
          this.paused = false;
          input.setEnabled(true);
          this.resetSession();
        },
      );
    } else {
      this.round++;
      this.resetRound();
    }
  }
  protected renderGame(): void {
    this.views.forEach((v) => v.render(this.debug));
    // Projectiles are redrawn in one graphics object; no per-frame object churn.
    let g = this.children.getByName(
      "projectiles",
    ) as Phaser.GameObjects.Graphics | null;
    if (!g) g = this.add.graphics().setName("projectiles").setDepth(100);
    g.clear();
    for (const p of this.world.projectiles) {
      g.fillStyle(0xc5fb76, 0.8);
      g.fillEllipse(p.x, p.y, 44, 36);
      g.lineStyle(2, 0xf0ffd8);
      g.strokeEllipse(p.x, p.y, 44, 36);
      if (this.debug) {
        const r = this.world.projectileBox(p);
        g.lineStyle(1, 0xff4560);
        g.strokeRect(r.x, r.y, r.width, r.height);
      }
    }
    this.hud.update(
      this.joe,
      this.dummy,
      this.mode === "training"
        ? "∞"
        : String(Math.max(0, 99 - Math.floor(this.ticks / 60))).padStart(
            2,
            "0",
          ),
      this.wins,
      this.debug,
      this.message,
    );
  }
}
