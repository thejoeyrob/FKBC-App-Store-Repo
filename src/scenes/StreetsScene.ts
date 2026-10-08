import { PlayScene } from "./PlayScene";
import { Fighter } from "../fighters/Fighter";
import { CombatWorld } from "../combat/CombatWorld";
import { FighterView } from "../ui/FighterView";
import { Hud } from "../ui/Hud";
import { input } from "../input/InputManager";
import { emptyInput } from "../combat/types";
export class StreetsScene extends PlayScene {
  private joe!: Fighter;
  private enemy!: Fighter;
  private world!: CombatWorld;
  private views: FighterView[] = [];
  private hud!: Hud;
  private cameraTarget!: Phaser.GameObjects.Zone;
  private defeated = false;
  constructor() {
    super("Streets");
  }
  create(): void {
    this.cameras.main.setBackgroundColor("#0b1424");
    this.cameras.main.setBounds(0, 0, 3200, 720);
    this.drawStreet();
    this.joe = new Fighter("joe", "Joe", 300, 1, 0xc5fb76);
    this.enemy = new Fighter("enemy", "Street Dummy", 1200, -1, 0xf1a66a);
    for (const f of [this.joe, this.enemy]) {
      f.maxX = 3125;
      f.floor = 460;
      f.y = 460;
      f.depth = 460;
      f.groundMoveSpeed = 4;
    }
    this.world = new CombatWorld([this.joe, this.enemy]);
    this.world.onImpact = (e) => this.impact(e);
    this.views = [
      new FighterView(this, this.joe),
      new FighterView(this, this.enemy),
    ];
    this.hud = new Hud(this, "FKBC streets / prototype");
    this.cameraTarget = this.add.zone(640, 360, 1, 1);
    this.cameras.main.startFollow(this.cameraTarget, true, 0.12, 1);
    this.setupControls(false);
    this.resetSession();
  }
  private drawStreet(): void {
    const g = this.add.graphics();
    g.fillStyle(0x111f31);
    g.fillRect(0, 210, 3200, 130);
    g.fillStyle(0x17283a);
    g.fillRect(0, 340, 3200, 175);
    g.fillStyle(0x091220);
    g.fillRect(0, 515, 3200, 205);
    for (let x = 0; x < 3200; x += 320) {
      g.fillStyle(0x1f354b);
      g.fillRect(x + 15, 230, 275, 100);
      g.lineStyle(2, 0x31516a);
      g.strokeRect(x + 15, 230, 275, 100);
      for (let w = 0; w < 4; w++) {
        g.fillStyle(w % 2 ? 0x537450 : 0x354c62, 0.65);
        g.fillRect(x + 35 + w * 62, 250, 42, 50);
      }
      g.lineStyle(1, 0x314860, 0.6);
      g.lineBetween(x, 340, x, 515);
      g.fillStyle(0x466249);
      g.fillRect(x + 125, 420, 65, 5);
    }
    g.lineStyle(2, 0x526c57);
    g.lineBetween(0, 340, 3200, 340);
    g.lineBetween(0, 515, 3200, 515);
    for (let x = 400; x < 3200; x += 800)
      this.add.text(x, 285, "FKBC STREETS", {
        fontFamily: "Arial",
        fontSize: "23px",
        fontStyle: "bold",
        color: "#99b985",
      });
    this.add.text(2940, 370, "END OF\nTEST STREET", {
      fontFamily: "monospace",
      fontSize: "23px",
      color: "#96b984",
      align: "center",
    });
    const mask = this.add.graphics().setScrollFactor(0).setDepth(19000);
    mask.fillStyle(0x080f1c, 0.96);
    mask.fillRect(0, 518, 1280, 202);
  }
  protected resetSession(): void {
    this.defeated = false;
    this.joe.floor = 460;
    this.enemy.floor = 455;
    this.joe.depth = 460;
    this.enemy.depth = 455;
    this.joe.reset(300, 1);
    this.enemy.reset(1200, -1);
    this.world.reset();
    input.clear();
    this.cameraTarget.x = 640;
    this.cameras.main.scrollX = 0;
  }
  protected step(): void {
    const player = input.sample(),
      enemyInput = emptyInput(),
      dist = Math.abs(this.joe.x - this.enemy.x);
    // Vertical walking adjusts the ground plane. Airborne feet keep their original plane.
    if (
      this.world.hitstop === 0 &&
      !this.joe.locked &&
      !this.joe.move &&
      this.joe.grounded
    ) {
      this.joe.floor = Math.min(
        500,
        Math.max(
          365,
          this.joe.floor + (Number(player.down) - Number(player.up)) * 2.6,
        ),
      );
      this.joe.y = this.joe.floor;
      this.joe.depth = this.joe.floor;
    }
    if (!this.defeated && dist < 650 && this.enemy.health > 0) {
      if (
        this.world.hitstop === 0 &&
        !this.enemy.locked &&
        !this.enemy.move &&
        this.enemy.grounded
      ) {
        this.enemy.floor +=
          Math.sign(this.joe.floor - this.enemy.floor) *
          Math.min(1.5, Math.abs(this.joe.floor - this.enemy.floor));
        this.enemy.y = this.enemy.floor;
        this.enemy.depth = this.enemy.floor;
      }
      if (dist > 95) {
        enemyInput.left = this.joe.x < this.enemy.x;
        enemyInput.right = !enemyInput.left;
      } else if (this.world.frame % 90 === 0) enemyInput.pressed.add("LP");
      else if (this.world.frame % 90 === 30) enemyInput.pressed.add("MK");
    }
    player.down = false;
    player.up = false;
    player.jumpPressed = false;
    this.world.tick([player, enemyInput], false, 38);
    this.defeated = this.enemy.health === 0;
    this.cameraTarget.x = Math.max(640, Math.min(2560, this.joe.x + 140));
    if (this.joe.health === 0) {
      this.paused = true;
      input.setEnabled(false);
      this.showNotice(
        "DOWN ON THE STREET",
        "Reset to try the placeholder encounter again.",
        "RETRY",
        () => {
          this.hideNotice();
          this.paused = false;
          input.setEnabled(true);
          this.resetSession();
        },
      );
    }
  }
  protected renderGame(): void {
    this.views.forEach((v) => v.render(this.debug));
    this.hud.update(
      this.joe,
      this.enemy,
      "01",
      [0, 0],
      this.debug,
      this.defeated
        ? "ENEMY DOWN · EXPLORE TO THE END OF THE TEST STREET"
        : "↑ / ↓: DEPTH · ← / →: WALK · ATTACK AT THE SAME DEPTH",
    );
  }
}
