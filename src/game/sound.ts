class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  playHover(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.035);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  playSelect(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.09);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  playCountdownTap(step: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = step >= 3 ? 440 : 280 + step * 35;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.55, now + 0.07);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playClash(outcome: 0 | 1 | 2): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (outcome === 0) {
      // Metallic tie clink
      [680, 1020].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.03);
        gain.gain.setValueAtTime(0.09, now + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22 + idx * 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.03);
        osc.stop(now + 0.25 + idx * 0.03);
      });
      return;
    }

    if (outcome === 1) {
      // Player won round: crisp rising bronze chime
      [392, 523.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.14, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3 + idx * 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + 0.34 + idx * 0.07);
      });
    } else {
      // Bot won round: low ominous tension drop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, now);
      osc.frequency.setValueAtTime(170, now);
      osc.frequency.exponentialRampToValueAtTime(72, now + 0.32);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    }
  }

  playCylinderSpin(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const t = now + i * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1400 + (i % 2) * 240, t);
      osc.frequency.exponentialRampToValueAtTime(450, t + 0.02);
      gain.gain.setValueAtTime(0.055, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.024);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.028);
    }
  }

  playHammerCock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.065].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(idx === 0 ? 1100 : 1650, now + offset);
      osc.frequency.exponentialRampToValueAtTime(320, now + offset + 0.032);
      gain.gain.setValueAtTime(0.1, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.036);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.04);
    });
  }

  playDryClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Sharp metallic striker snap
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.035);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);

    // Subtle relief exhale harmonic
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(880, now + 0.02);
    bellGain.gain.setValueAtTime(0.04, now + 0.02);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.start(now + 0.02);
    bell.stop(now + 0.3);
  }

  playGunshot(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Sub-bass chest punch
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.35);
    subGain.gain.setValueAtTime(0.55, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.45);

    // 2. White noise gunpowder crack + room tail
    const duration = 0.85;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.pow(1 - i / bufferSize, 2.2);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1250, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.55);
    filter.Q.value = 0.7;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.65, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  playOutcome(victory: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.25;
    const notes = victory ? [293.66, 369.99, 440, 587.33] : [196, 174.61, 146.83];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = victory ? 'triangle' : 'sawtooth';
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = victory ? 2200 : 520;
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      gain.gain.setValueAtTime(0.11, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.7);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.75);
    });
  }
}

export const soundEngine = new SoundEngine();
