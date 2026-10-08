import Phaser from "phaser";
import { STEP } from "../config";
import { input } from "../input/InputManager";
import { audio } from "../audio/AudioManager";
import { clearUI, controls, ui } from "../ui/Overlay";
import type { Impact } from "../combat/CombatWorld";
export abstract class PlayScene extends Phaser.Scene {
  protected accumulator = 0;
  protected paused = false;
  protected debug = true;
  protected overlay!: ReturnType<typeof controls>;
  private cleanup: (() => void)[] = [];
  protected setupControls(training: boolean): void {
    this.accumulator = 0;
    this.paused = false;
    this.overlay = controls(
      () => this.scene.start("Menu"),
      () => {
        this.hideNotice();
        this.paused = false;
        this.overlay.pause.textContent = "PAUSE";
        input.setEnabled(true);
        this.resetSession();
      },
      training,
    );
    this.overlay.pause.onclick = () => this.togglePause();
    const key = (e: KeyboardEvent) => {
      if (e.code === "Escape") this.togglePause();
      if (e.code === "KeyR" && !(e.target instanceof HTMLSelectElement)) {
        this.hideNotice();
        this.paused = false;
        this.overlay.pause.textContent = "PAUSE";
        input.setEnabled(true);
        this.resetSession();
      }
      if (e.code === "F2") {
        e.preventDefault();
        this.overlay.debug.checked = !this.overlay.debug.checked;
      }
      audio.unlock();
    };
    const hide = () => {
      if (document.hidden && !this.paused) this.togglePause();
    };
    const blur = () => {
      if (!this.paused) this.togglePause();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", blur);
    window.addEventListener("keydown", key);
    this.cleanup = [
      () => document.removeEventListener("visibilitychange", hide),
      () => window.removeEventListener("blur", blur),
      () => window.removeEventListener("keydown", key),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanup.forEach((fn) => fn());
      clearUI();
    });
  }
  update(_time: number, delta: number): void {
    input.pollGamepad();
    this.overlay.status.textContent =
      input.padLabel === "No gamepad" ? "KEYBOARD / TOUCH" : input.padLabel;
    this.debug = this.overlay.debug.checked;
    if (!this.paused) {
      this.accumulator += Math.min(delta, 100);
      let ticks = 0;
      while (this.accumulator >= STEP && ticks++ < 6) {
        this.step();
        this.accumulator -= STEP;
        if (this.paused) {
          this.accumulator = 0;
          break;
        }
      }
    } else this.accumulator = 0;
    this.renderGame();
  }
  protected impact(effect: Impact): void {
    audio.hit(effect.blocked);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      this.cameras.main.shake(
        effect.blocked ? 35 : 65,
        effect.blocked ? 0.001 : 0.003,
      );
    const ring = this.add
      .circle(effect.x, effect.y, 12, effect.blocked ? 0x65d4ed : 0xffda75, 0.7)
      .setDepth(9000);
    this.tweens.add({
      targets: ring,
      scale: 2.6,
      alpha: 0,
      duration: 180,
      onComplete: () => ring.destroy(),
    });
  }
  protected togglePause(): void {
    if (this.hasNotice() && !this.paused) return;
    if (this.hasNotice() && this.paused && !ui.querySelector("[data-pause]"))
      return;
    this.paused = !this.paused;
    input.setEnabled(!this.paused);
    this.overlay.pause.textContent = this.paused ? "RESUME" : "PAUSE";
    if (this.paused)
      this.showNotice(
        "PAUSED",
        "Take a breath. Your round is waiting.",
        "RESUME",
        () => this.togglePause(),
        true,
      );
    else this.hideNotice();
  }
  protected showNotice(
    title: string,
    body: string,
    label: string,
    action: () => void,
    pause = false,
  ): void {
    this.hideNotice();
    const notice = document.createElement("div");
    notice.className = "notice";
    if (pause) notice.dataset.pause = "true";
    const panel = document.createElement("div"),
      heading = document.createElement("h2"),
      p = document.createElement("p"),
      button = document.createElement("button");
    heading.textContent = title;
    p.textContent = body;
    button.textContent = label;
    button.onclick = action;
    panel.append(heading, p, button);
    notice.append(panel);
    ui.append(notice);
  }
  protected hasNotice(): boolean {
    return !!ui.querySelector(".notice");
  }
  protected hideNotice(): void {
    ui.querySelector(".notice")?.remove();
  }
  protected abstract step(): void;
  protected abstract renderGame(): void;
  protected abstract resetSession(): void;
}
