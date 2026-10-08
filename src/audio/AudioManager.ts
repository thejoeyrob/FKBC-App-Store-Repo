// Synthesized debug sounds only. No external art, samples, or legacy assets.
export class AudioManager {
  private context: AudioContext | null = null;
  muted = false;
  unlock(): void {
    if (!this.context) this.context = new AudioContext();
    void this.context.resume();
  }
  hit(blocked: boolean): void {
    if (this.muted || !this.context || this.context.state !== "running") return;
    const ctx = this.context,
      osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      t = ctx.currentTime;
    osc.type = blocked ? "triangle" : "sawtooth";
    osc.frequency.setValueAtTime(blocked ? 320 : 150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(t + 0.13);
  }
}
export const audio = new AudioManager();
