import type { Button, Facing, InputFrame, MoveId } from "../combat/types";
interface Direction {
  value: number;
  frame: number;
}
export class MotionBuffer {
  private directions: Direction[] = [];
  private buttons: { button: Button; frame: number }[] = [];
  private lastDirection = 5;
  frame = 0;
  clear(): void {
    this.directions = [];
    this.buttons = [];
    this.lastDirection = 5;
  }
  record(input: InputFrame, facing: Facing, advance = true): void {
    if (advance) this.frame++;
    // Preserve event-order directions even when several arrive between render frames.
    for (const direction of [...(input.directionChanges ?? []), input]) {
      const forward = facing === 1 ? direction.right : direction.left;
      const back = facing === 1 ? direction.left : direction.right;
      let d = direction.down ? 2 : direction.up ? 8 : 5;
      if (forward !== back) d += forward ? 1 : -1;
      if (d !== this.lastDirection) {
        this.directions.push({ value: d, frame: this.frame });
        this.lastDirection = d;
      }
    }
    this.directions = this.directions.filter((d) => this.frame - d.frame <= 24);
    for (const button of input.pressed)
      this.buttons.push({ button, frame: this.frame });
    this.buttons = this.buttons.filter((b) => this.frame - b.frame <= 7);
  }
  private matches(sequence: number[]): boolean {
    // Match ordered direction changes, allowing neutral but rejecting opposite/up inputs.
    let index = sequence.length - 1;
    for (let i = this.directions.length - 1; i >= 0; i--) {
      const d = this.directions[i];
      if (this.frame - d.frame > 22) break;
      if (d.value === sequence[index]) {
        if (--index < 0) return true;
      } else if (d.value !== 5 && !sequence.includes(d.value)) return false;
    }
    return false;
  }
  peek(allowSpecials = true): MoveId | null {
    const entry = this.buttons.at(-1);
    if (!entry) return null;
    if (!allowSpecials) return entry.button;
    const punch = entry.button.endsWith("P");
    if (punch && this.matches([6, 2, 3])) return "rising";
    if (punch && this.matches([2, 3, 6])) return "projectile";
    if (!punch && this.matches([2, 1, 4])) return "tornado";
    return entry.button;
  }
  consume(): void {
    this.buttons = [];
    this.directions = [];
    this.lastDirection = 5;
  }
}
