import { input } from "../input/InputManager";
import { audio } from "../audio/AudioManager";
import type { Action } from "../combat/types";
export const ui = document.querySelector<HTMLDivElement>("#ui")!;
export function clearUI(): void {
  input.setEnabled(false);
  ui.replaceChildren();
}
export function controls(
  onMenu: () => void,
  onReset: () => void,
  training: boolean,
): {
  status: HTMLElement;
  debug: HTMLInputElement;
  dummy: HTMLSelectElement | null;
  pause: HTMLButtonElement;
  mute: HTMLButtonElement;
} {
  clearUI();
  input.setEnabled(true);
  ui.innerHTML = `<div class="toolbar"><button id="home" title="Return to mode select">← MODES</button><button id="reset">RESET</button><button id="pause">PAUSE</button><button id="mute">SOUND ON</button><label><input id="debug" type="checkbox" checked> BOXES</label>${training ? '<label>DUMMY <select id="dummy"><option value="idle">Idle</option><option value="guard">Stand guard</option><option value="low">Crouch guard</option><option value="spar">Spar</option></select></label>' : ""}<span id="device">KEYBOARD / TOUCH</span></div>
  <div class="controller"><div class="dpad"><button data-action="up" class="up" aria-label="Jump or move up">▲</button><button data-action="left" class="left" aria-label="Move left">◀︎</button><span class="center">＋</span><button data-action="right" class="right" aria-label="Move right">▶︎</button><button data-action="down" class="down" aria-label="Crouch or move down">▼</button></div><button data-action="guard" class="guard" aria-label="Block">GUARD</button><div class="six-buttons">${["LP", "MP", "HP", "LK", "MK", "HK"].map((b) => `<button data-action="${b}" class="attack ${b.endsWith("P") ? "punch" : "kick"}" aria-label="${b}">${b}</button>`).join("")}</div><div class="control-hint">MOVE: WASD / ARROWS · PUNCH: J K L · KICK: U I O · GUARD: SHIFT</div></div>`;
  const find = <T extends HTMLElement>(id: string) =>
    ui.querySelector<T>(`#${id}`)!;
  find("home").onclick = onMenu;
  find("reset").onclick = onReset;
  for (const button of ui.querySelectorAll<HTMLButtonElement>(
    ".six-buttons [data-action], .guard[data-action]",
  )) {
    button.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      audio.unlock();
      button.setPointerCapture(e.pointerId);
      input.setTouch(e.pointerId, button.dataset.action as Action);
      button.classList.add("held");
    });
    const release = (e: PointerEvent) => {
      input.releaseTouch(e.pointerId);
      button.classList.remove("held");
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  }
  // One thumb can slide through diagonals while a second presses an attack.
  const dpad = ui.querySelector<HTMLDivElement>(".dpad")!;
  const pointers = new Map<number, Action[]>();
  const updatePad = (e: PointerEvent) => {
    const rect = dpad.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    const actions: Action[] = [];
    if (x < -0.28) actions.push("left");
    else if (x > 0.28) actions.push("right");
    if (y < -0.28) actions.push("up");
    else if (y > 0.28) actions.push("down");
    pointers.set(e.pointerId, actions);
    input.setTouchActions(e.pointerId, actions);
    const held = new Set([...pointers.values()].flat());
    dpad
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((b) =>
        b.classList.toggle("held", held.has(b.dataset.action as Action)),
      );
  };
  dpad.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    audio.unlock();
    dpad.setPointerCapture(e.pointerId);
    updatePad(e);
  });
  dpad.addEventListener("pointermove", (e) => {
    if (pointers.has(e.pointerId)) updatePad(e);
  });
  const releasePad = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    input.releaseTouch(e.pointerId);
    const held = new Set([...pointers.values()].flat());
    dpad
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((b) =>
        b.classList.toggle("held", held.has(b.dataset.action as Action)),
      );
  };
  dpad.addEventListener("pointerup", releasePad);
  dpad.addEventListener("pointercancel", releasePad);
  dpad.addEventListener("lostpointercapture", releasePad);
  const mute = find<HTMLButtonElement>("mute");
  mute.onclick = () => {
    audio.unlock();
    audio.muted = !audio.muted;
    mute.textContent = audio.muted ? "SOUND OFF" : "SOUND ON";
  };
  find<HTMLInputElement>("debug").onchange = () =>
    find<HTMLInputElement>("debug").blur();
  return {
    status: find("device"),
    debug: find<HTMLInputElement>("debug"),
    dummy: training ? find<HTMLSelectElement>("dummy") : null,
    pause: find<HTMLButtonElement>("pause"),
    mute,
  };
}
