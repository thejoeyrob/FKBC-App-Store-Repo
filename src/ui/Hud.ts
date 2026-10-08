import Phaser from "phaser";
import { MAX_HEALTH } from "../config";
import { Fighter } from "../fighters/Fighter";
import { phase } from "../combat/moves";
export class Hud {
  private bars: Phaser.GameObjects.Graphics;
  private left: Phaser.GameObjects.Text;
  private right: Phaser.GameObjects.Text;
  private timer: Phaser.GameObjects.Text;
  private mode: Phaser.GameObjects.Text;
  private combo: Phaser.GameObjects.Text;
  private details: Phaser.GameObjects.Text;
  private prompt: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene, label: string) {
    const text = (x: number, y: number, size: number, color = "#edf3ff") =>
      scene.add
        .text(x, y, "", { fontFamily: "Arial", fontSize: `${size}px`, color })
        .setScrollFactor(0)
        .setDepth(20000);
    this.bars = scene.add.graphics().setScrollFactor(0).setDepth(20000);
    this.left = text(45, 32, 24);
    this.right = text(1235, 32, 24).setOrigin(1, 0);
    this.timer = text(640, 36, 44, "#c5fb76").setOrigin(0.5, 0);
    this.mode = text(640, 96, 13, "#88a1c1")
      .setOrigin(0.5, 0)
      .setText(label.toUpperCase());
    this.combo = text(50, 207, 27, "#c5fb76");
    this.details = text(50, 247, 14, "#87a4c6");
    this.prompt = text(640, 550, 16, "#9fb4cf").setOrigin(0.5, 0);
  }
  update(
    a: Fighter,
    b: Fighter,
    time: string,
    wins: [number, number],
    debug: boolean,
    message: string,
  ): void {
    this.left.setText(`${a.name.toUpperCase()}  ${"●".repeat(wins[0])}`);
    this.right.setText(`${"●".repeat(wins[1])}  ${b.name.toUpperCase()}`);
    this.timer.setText(time);
    const g = this.bars;
    g.clear();
    g.fillStyle(0x1c2b40);
    g.fillRoundedRect(45, 73, 480, 19, 3);
    g.fillRoundedRect(755, 73, 480, 19, 3);
    g.fillStyle(0xc5fb76);
    if (a.health > 0) g.fillRect(45, 74, (480 * a.health) / MAX_HEALTH, 17);
    g.fillStyle(0x65d4ed);
    if (b.health > 0)
      g.fillRect(
        1235 - (480 * b.health) / MAX_HEALTH,
        74,
        (480 * b.health) / MAX_HEALTH,
        17,
      );
    this.combo.setText(
      a.combo > 1 ? `${a.combo} HIT COMBO  /  ${a.comboDamage} DMG` : "",
    );
    this.details.setText(
      debug
        ? `HP ${a.health} / ${b.health}\n${a.move ? `${a.move.name.toUpperCase()}\n${phase(a.move, a.moveFrame)} · ${a.moveFrame}F · ${a.move.startup}/${a.move.active}/${a.move.recovery}` : "READY · 60 Hz combat"}\nCYAN: HURTBOX · RED: HITBOX`
        : "",
    );
    this.prompt.setText(message);
  }
}
