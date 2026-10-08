import Phaser from "phaser";
import { clearUI, ui } from "../ui/Overlay";
import { audio } from "../audio/AudioManager";
import type { Mode } from "../config";
export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }
  create(): void {
    clearUI();
    this.cameras.main.setBackgroundColor("#080d18");
    const g = this.add.graphics();
    g.lineStyle(1, 0x26394c, 0.7);
    for (let x = 0; x < 1280; x += 80) g.lineBetween(x, 0, x, 720);
    for (let y = 0; y < 720; y += 80) g.lineBetween(0, y, 1280, y);
    g.lineStyle(3, 0xa5e367, 0.3);
    g.strokeCircle(1040, 290, 165);
    g.strokeCircle(1040, 290, 130);
    g.fillStyle(0xa5e367, 0.1);
    g.fillTriangle(1040, 140, 1145, 400, 935, 400);
    ui.innerHTML = `<section class="menu"><div class="eyebrow">FKBC / FIRST PLAYABLE / V0.1</div><h1>FIGHT<br><span>ARCADE.</span></h1><p class="intro">Step onto the floor. Learn the timing. Find your combo.<br>Original combat. Temporary debug graphics. Joe is ready.</p><div class="mode-grid"><button class="mode-card" data-mode="arcade"><small>01 / VERSUS</small><strong>Arcade Fight</strong><span>Joe vs Training Dummy.<br>Best of three · 99 second rounds.</span></button><button class="mode-card" data-mode="streets"><small>02 / SIDE SCROLLER</small><strong>FKBC Streets</strong><span>A scrolling test street.<br>Depth movement · one enemy.</span></button><button class="mode-card" data-mode="training"><small>03 / PRACTICE</small><strong>Training</strong><span>Unlimited time. Dummy settings.<br>Frame timing · boxes · combos.</span></button></div><div class="roster"><span class="available">JOE / PLAYABLE</span><span>JACK / PLANNED</span><span>JOHN / PLANNED</span><span>JUSTIN / PLANNED</span><span>PAUL / PLANNED</span></div><div class="menu-footer">KEYBOARD · TOUCH · GAMEPAD &nbsp; / &nbsp; LANDSCAPE 1280 × 720<br>Specials relative to facing: ↓ ↘ → + punch · ↓ ↙ ← + kick · → ↓ ↘ + punch<br>Six-button gamepad: A / B / RB = punches · X / Y / LB = kicks · triggers = guard</div></section>`;
    for (const button of ui.querySelectorAll<HTMLButtonElement>("[data-mode]"))
      button.onclick = () => {
        audio.unlock();
        const mode = button.dataset.mode as Mode;
        this.scene.start(mode === "streets" ? "Streets" : "Fight", { mode });
      };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, clearUI);
  }
}
