import Phaser from "phaser";
import { Fighter } from "../fighters/Fighter";
import { phase } from "../combat/moves";
export class FighterView {
  private graphics: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  constructor(
    scene: Phaser.Scene,
    public fighter: Fighter,
  ) {
    this.graphics = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#a4b4ca",
        align: "center",
      })
      .setOrigin(0.5);
  }
  render(debug: boolean): void {
    const f = this.fighter,
      g = this.graphics;
    g.clear();
    g.setDepth(f.depth + 10);
    this.label.setDepth(f.depth + 11);
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(f.x, f.floor + 4, 85, 16);
    const down = f.state === "knockdown" || f.state === "ko";
    const crouch = f.stance === "crouch" && f.grounded;
    const h = down ? 26 : crouch ? 75 : 126,
      y = f.y - h;
    const stun = f.state === "hitstun",
      block = f.state === "blockstun";
    const color = stun ? 0xffffff : block ? 0x55bfff : f.color;
    g.fillStyle(color, 0.18);
    g.fillRoundedRect(f.x - 27, y, 54, h, 8);
    g.lineStyle(3, color, 1);
    g.strokeRoundedRect(f.x - 27, y, 54, h, 8);
    if (!down) {
      g.fillStyle(color, 1);
      g.fillCircle(f.x, y + 18, 13);
      g.lineStyle(6, color);
      g.lineBetween(f.x, y + 33, f.x, f.y - 35);
      const extend =
        f.move && phase(f.move, f.moveFrame) === "ACTIVE"
          ? Math.min(f.move.reach, f.move.id === "sidekick" ? 158 : 95)
          : 31;
      const kick =
        !!f.move &&
        (f.move.id.endsWith("K") ||
          ["tornado", "sidekick"].includes(f.move.id));
      g.lineBetween(f.x, y + 47, f.x + f.facing * (kick ? 25 : extend), y + 55);
      g.lineBetween(f.x, y + 47, f.x - f.facing * 22, y + 65);
      g.lineBetween(f.x, f.y - 35, f.x - f.facing * 18, f.y);
      g.lineBetween(
        f.x,
        f.y - 35,
        f.x + f.facing * (kick ? extend : 18),
        kick ? f.y - (f.move?.id === "sidekick" ? 80 : 45) : f.y,
      );
      g.fillStyle(0x080d18);
      g.fillRect(f.x + f.facing * 6 - 2, y + 14, 4, 4);
    }
    if (f.move?.id === "rising") {
      // An upward striking arm makes this visibly different from a projectile.
      g.lineStyle(7, 0xffdd77);
      g.lineBetween(f.x, y + 47, f.x + f.facing * 35, y - 20);
    }
    if (f.move?.id === "tornado") {
      g.lineStyle(3, 0xc5fb76, 0.7);
      g.strokeEllipse(f.x, f.y - 65, 170, 72);
    }
    if (f.invulnerable && f.state !== "ko") {
      g.lineStyle(2, 0xffdd77, 0.65);
      g.strokeEllipse(f.x, f.y - h / 2, 80, h + 20);
    }
    if (debug) {
      const hurt = f.hurtbox();
      g.lineStyle(1, 0x49d9f2, 0.7);
      g.strokeRect(hurt.x, hurt.y, hurt.width, hurt.height);
      const hit = f.hitbox();
      if (hit) {
        g.fillStyle(0xff4560, 0.22);
        g.fillRect(hit.x, hit.y, hit.width, hit.height);
        g.lineStyle(2, 0xff4560);
        g.strokeRect(hit.x, hit.y, hit.width, hit.height);
      }
    }
    this.label
      .setPosition(f.x, f.y - h - 22)
      .setText(
        debug
          ? `${f.name.toUpperCase()} · ${f.state.toUpperCase()}${f.move ? `\n${f.move.name.toUpperCase()} · ${phase(f.move, f.moveFrame)} ${f.moveFrame}` : ""}`
          : f.name.toUpperCase(),
      );
  }
}
