import {
  BUTTONS,
  type Action,
  type Button,
  type InputFrame,
  type DirectionInput,
} from "../combat/types";
const keymap: Record<string, Action> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  KeyJ: "LP",
  KeyK: "MP",
  KeyL: "HP",
  KeyU: "LK",
  KeyI: "MK",
  KeyO: "HK",
  ShiftLeft: "guard",
  ShiftRight: "guard",
};
export class InputManager {
  private keyboard = new Set<Action>();
  private touch = new Map<number, Set<Action>>();
  private pending = new Set<Button>();
  private jumpPending = false;
  private previous = new Set<Action>();
  private directionChanges: DirectionInput[] = [];
  private previousDirection = 0;
  private gamepad = new Set<Action>();
  private gamepadLabel = "No gamepad";
  private enabled = false;
  private keyDown = (e: KeyboardEvent) => {
    const action = keymap[e.code];
    if (
      !action ||
      !this.enabled ||
      (e.target instanceof HTMLElement &&
        /INPUT|SELECT|TEXTAREA/.test(e.target.tagName))
    )
      return;
    e.preventDefault();
    this.keyboard.add(action);
    this.captureEdges();
  };
  private keyUp = (e: KeyboardEvent) => {
    const a = keymap[e.code];
    if (a) {
      this.keyboard.delete(a);
      this.captureEdges();
    }
  };
  private blur = () => this.clear();
  constructor() {
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    window.addEventListener("blur", this.blur);
  }
  setEnabled(value: boolean): void {
    this.enabled = value;
    this.clear();
  }
  get padLabel(): string {
    return this.gamepadLabel;
  }
  setTouch(pointer: number, action: Action): void {
    if (this.enabled) {
      this.touch.set(pointer, new Set([action]));
      this.captureEdges();
    }
  }
  setTouchActions(pointer: number, actions: Action[]): void {
    if (this.enabled) {
      this.touch.set(pointer, new Set(actions));
      this.captureEdges();
    }
  }
  releaseTouch(pointer: number): void {
    this.touch.delete(pointer);
    this.captureEdges();
  }
  clear(): void {
    this.keyboard.clear();
    this.touch.clear();
    this.gamepad.clear();
    this.previous.clear();
    this.pending.clear();
    this.jumpPending = false;
    this.directionChanges = [];
    this.previousDirection = 0;
  }
  private held(): Set<Action> {
    return new Set([
      ...this.keyboard,
      ...Array.from(this.touch.values()).flatMap((actions) => [...actions]),
      ...this.gamepad,
    ]);
  }
  private captureEdges(): void {
    const held = this.held();
    const direction = {
      left: held.has("left"),
      right: held.has("right"),
      up: held.has("up"),
      down: held.has("down"),
    };
    const bits =
      Number(direction.left) +
      Number(direction.right) * 2 +
      Number(direction.up) * 4 +
      Number(direction.down) * 8;
    if (bits !== this.previousDirection) {
      this.directionChanges.push(direction);
      this.previousDirection = bits;
    }
    for (const a of held)
      if (!this.previous.has(a)) {
        if (BUTTONS.includes(a as Button)) this.pending.add(a as Button);
        if (a === "up") this.jumpPending = true;
      }
    this.previous = held;
  }
  pollGamepad(): void {
    this.gamepad.clear();
    const pad = Array.from(navigator.getGamepads?.() ?? []).find(
      (p) => p?.connected,
    );
    this.gamepadLabel = pad
      ? `PAD ${pad.index + 1} · ${pad.mapping || "raw"}`
      : "No gamepad";
    if (pad && this.enabled) {
      const pressed = (i: number) => !!pad.buttons[i]?.pressed;
      const x = pad.axes[0] ?? 0,
        y = pad.axes[1] ?? 0;
      if (x < -0.35 || pressed(14)) this.gamepad.add("left");
      if (x > 0.35 || pressed(15)) this.gamepad.add("right");
      if (y < -0.35 || pressed(12)) this.gamepad.add("up");
      if (y > 0.35 || pressed(13)) this.gamepad.add("down");
      const bindings: [number, Button][] = [
        [0, "LP"],
        [1, "MP"],
        [5, "HP"],
        [2, "LK"],
        [3, "MK"],
        [4, "HK"],
      ];
      for (const [i, b] of bindings) if (pressed(i)) this.gamepad.add(b);
      if (pressed(6) || pressed(7)) this.gamepad.add("guard");
    }
    this.captureEdges();
  }
  sample(): InputFrame {
    const held = this.held();
    const result: InputFrame = {
      left: held.has("left"),
      right: held.has("right"),
      up: held.has("up"),
      down: held.has("down"),
      guard: held.has("guard"),
      pressed: new Set(this.pending),
      jumpPressed: this.jumpPending,
      directionChanges: this.directionChanges,
    };
    this.pending.clear();
    this.jumpPending = false;
    this.directionChanges = [];
    return result;
  }
  destroy(): void {
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    window.removeEventListener("blur", this.blur);
  }
}
export const input = new InputManager();

if (import.meta.hot) import.meta.hot.dispose(() => input.destroy());
