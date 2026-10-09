import type {
  Button,
  Facing,
  InputFrame,
  MoveId,
  DirectionInput,
} from "../combat/types";
interface Direction {
  value: number;
  frame: number;
}
export class MotionBuffer {
  private directions: Direction[] = [];
  private buttons: { button: Button; move: MoveId; frame: number }[] = [];
  private lastDirection = 5;
  private jumpFrame: number | null = null;
  frame = 0;
  clear(): void {
    this.directions = [];
    this.buttons = [];
    this.lastDirection = 5;
    this.jumpFrame = null;
  }
  record(input: InputFrame, facing: Facing, advance = true): void {
    if (advance) this.frame++;
    this.directions = this.directions.filter((d) => this.frame - d.frame <= 32);
    if (input.motionEvents !== undefined) {
      // Directions and buttons share one event stream. A direction that arrives
      // after an attack in the same render frame cannot rewrite that attack.
      for (const event of input.motionEvents) {
        if (event.type === "direction")
          this.recordDirection(event.direction, facing);
        else this.recordButton(event.button);
      }
      this.recordDirection(input, facing);
    } else {
      // Simulation/AI callers can still supply ordinary snapshots.
      for (const direction of [...(input.directionChanges ?? []), input])
        this.recordDirection(direction, facing);
      for (const button of input.pressed) this.recordButton(button);
    }
    if (input.jumpPressed) this.jumpFrame = this.frame;
    if (this.jumpFrame !== null && this.frame - this.jumpFrame > 7)
      this.jumpFrame = null;
    this.buttons = this.buttons.filter((b) => this.frame - b.frame <= 7);
  }
  private recordDirection(direction: DirectionInput, facing: Facing): void {
    const forward = facing === 1 ? direction.right : direction.left;
    const back = facing === 1 ? direction.left : direction.right;
    let d = direction.down ? 2 : direction.up ? 8 : 5;
    if (forward !== back) d += forward ? 1 : -1;
    if (d !== this.lastDirection) {
      this.directions.push({ value: d, frame: this.frame });
      this.lastDirection = d;
    }
  }
  private recordButton(button: Button): void {
    this.buttons.push({
      button,
      move: this.resolve(button),
      frame: this.frame,
    });
  }
  peekJump(): boolean {
    return this.jumpFrame !== null;
  }
  consumeJump(): void {
    this.jumpFrame = null;
  }
  private matches(sequence: number[]): boolean {
    // Cardinal taps only; tolerate neutral and sliding through lower diagonals.
    let index = sequence.length - 1;
    for (let i = this.directions.length - 1; i >= 0; i--) {
      const d = this.directions[i];
      if (this.frame - d.frame > 30) break;
      if (d.value === sequence[index]) {
        if (--index < 0) return true;
      } else if (![5, 1, 3].includes(d.value) && !sequence.includes(d.value))
        return false;
    }
    return false;
  }
  peek(allowSpecials = true, allowed?: readonly MoveId[]): MoveId | null {
    const entry = this.buttons.at(-1);
    if (!entry) return null;
    if (!allowSpecials || (allowed && !allowed.includes(entry.move)))
      return entry.button;
    return entry.move;
  }
  private resolve(button: Button): MoveId {
    const punch = button.endsWith("P");
    if (punch && this.matches([2, 4])) return "rising";
    if (punch && this.matches([2, 6])) return "projectile";
    if (!punch && this.matches([2, 6])) return "sidekick";
    if (!punch && this.matches([4, 6])) return "tornado";
    return button;
  }
  consume(): void {
    this.buttons = [];
    this.directions = [];
    this.lastDirection = 5;
  }
}
