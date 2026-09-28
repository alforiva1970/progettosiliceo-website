/**
 * Tiny procedural sound kit — no assets, all WebAudio synthesis.
 * Created lazily on the first user gesture so autoplay policies are respected.
 */
export class SoundKit {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private lastShoot = 0;
  muted = false;

  unlock(): void {
    try {
      if (!this.ac) {
        const AC: typeof AudioContext | undefined =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AC) return;
        this.ac = new AC();
        this.master = this.ac.createGain();
        this.master.gain.value = this.muted ? 0 : 0.45;
        this.master.connect(this.ac.destination);

        const len = Math.floor(this.ac.sampleRate * 0.7);
        const buf = this.ac.createBuffer(1, len, this.ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        this.noiseBuf = buf;
      }
      if (this.ac.state === "suspended") void this.ac.resume();
    } catch {
      /* audio is a nice-to-have; never break the game over it */
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ac) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.45, this.ac.currentTime, 0.02);
    }
  }

  private tone(
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    vol: number,
    delay = 0,
  ): void {
    if (!this.ac || !this.master || this.muted) return;
    const t = this.ac.currentTime + delay;
    const osc = this.ac.createOscillator();
    const g = this.ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, f0: number, f1: number, delay = 0): void {
    if (!this.ac || !this.master || !this.noiseBuf || this.muted) return;
    const t = this.ac.currentTime + delay;
    const src = this.ac.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(f0, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, f1), t + dur);
    const g = this.ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  shoot(): void {
    if (!this.ac) return;
    const now = this.ac.currentTime;
    if (now - this.lastShoot < 0.035) return;
    this.lastShoot = now;
    this.tone("square", 780 + Math.random() * 90, 340, 0.07, 0.055);
  }

  explode(big = false): void {
    this.noise(big ? 0.5 : 0.26, big ? 0.5 : 0.28, big ? 2200 : 1500, 120);
    this.tone("sine", big ? 180 : 240, 45, big ? 0.45 : 0.22, big ? 0.4 : 0.22);
  }

  hit(): void {
    this.noise(0.4, 0.4, 900, 80);
    this.tone("sawtooth", 200, 48, 0.42, 0.3);
  }

  pulse(): void {
    this.tone("sawtooth", 940, 70, 0.45, 0.22);
    this.noise(0.35, 0.22, 3000, 200);
    this.tone("sine", 120, 900, 0.25, 0.14, 0.02);
  }

  power(): void {
    this.tone("triangle", 620, 620, 0.09, 0.16);
    this.tone("triangle", 930, 930, 0.12, 0.16, 0.08);
  }

  /** rising arpeggio blip — pitch climbs with the kill chain */
  combo(step: number): void {
    const f = 480 * Math.pow(1.0595, Math.min(28, step * 2));
    this.tone("triangle", f, f * 1.6, 0.08, 0.075, 0.04);
  }

  wave(): void {
    this.tone("triangle", 420, 880, 0.28, 0.16);
    this.tone("triangle", 630, 1320, 0.3, 0.1, 0.06);
  }

  over(): void {
    this.tone("sawtooth", 420, 40, 1.1, 0.28);
    this.noise(1.0, 0.3, 1400, 60, 0.05);
  }

  ui(): void {
    this.tone("square", 520, 720, 0.06, 0.09);
  }
}
