import { GenerativeTrack } from '../types/audio';

export const GENERATIVE_TRACKS: GenerativeTrack[] = [
  {
    id: 'synthwave',
    title: 'Neon Horizon',
    genre: 'Synthwave / Cyberpunk',
    bpm: 124,
    description: 'Punchy retro kick, rolling sub bass, resonant analog lead, and driving arpeggiator.',
  },
  {
    id: 'lofi',
    title: 'Midnight Reverie',
    genre: 'Lo-Fi Chillhop',
    bpm: 82,
    description: 'Warm dusty rhodes chord progression, sub boom kick, filtered snare, and tape vibe.',
  },
  {
    id: 'techno',
    title: 'Kinetic Pulse',
    genre: 'Peak Techno',
    bpm: 135,
    description: 'Heavy 909 kick rumble, TB-303 acid resonant sweeps, and cutting metallic percussion.',
  },
  {
    id: 'ambient',
    title: 'Solar Winds (432 Hz)',
    genre: 'Ethereal Ambient',
    bpm: 60,
    description: 'Deep resonant drones, crystalline overtone bells, and soothing harmonic intervals.',
  },
  {
    id: 'chirp_sweep',
    title: 'Acoustic Sweep (20Hz - 20kHz)',
    genre: 'Spectral Calibration',
    bpm: 120,
    description: 'Logarithmic frequency chirp sweeps across the entire human hearing spectrum.',
  },
];

export class GenerativeAudioEngine {
  private ctx: AudioContext;
  private outputNode: GainNode;
  private isPlaying: boolean = false;
  private currentTrackId: string = 'synthwave';
  private timerId: number | null = null;
  private step: number = 0;
  private bpm: number = 124;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.outputNode = this.ctx.createGain();
    this.outputNode.gain.value = 0.8;
    this.outputNode.connect(destination);
  }

  public setVolume(val: number) {
    this.outputNode.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
  }

  public setTrack(trackId: string) {
    this.currentTrackId = trackId;
    const track = GENERATIVE_TRACKS.find(t => t.id === trackId);
    if (track) {
      this.bpm = track.bpm;
    }
  }

  public start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.step = 0;
    this.scheduleNextBeat();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduleNextBeat = () => {
    if (!this.isPlaying) return;

    const secondsPer16th = (60 / this.bpm) / 4;
    const now = this.ctx.currentTime + 0.05;

    this.playStep(this.step, now);

    this.step = (this.step + 1) % 64;
    const delayMs = secondsPer16th * 1000;
    this.timerId = window.setTimeout(this.scheduleNextBeat, Math.max(15, delayMs));
  };

  private playStep(step: number, time: number) {
    switch (this.currentTrackId) {
      case 'synthwave':
        this.playSynthwaveStep(step, time);
        break;
      case 'lofi':
        this.playLofiStep(step, time);
        break;
      case 'techno':
        this.playTechnoStep(step, time);
        break;
      case 'ambient':
        this.playAmbientStep(step, time);
        break;
      case 'chirp_sweep':
        this.playChirpStep(step, time);
        break;
      default:
        this.playSynthwaveStep(step, time);
    }
  }

  // --- SYNTHWAVE ---
  private playSynthwaveStep(step: number, time: number) {
    const isKick = step % 4 === 0;
    const isSnare = step % 8 === 4;
    const isHat = step % 2 === 0;

    if (isKick) this.triggerKick(time, 130, 42, 0.28);
    if (isSnare) this.triggerSnare(time, 240, 0.22);
    if (isHat) this.triggerHiHat(time, (step % 4 === 2) ? 0.08 : 0.04);

    // Rolling bassline (16th notes)
    const bassNotes = [36, 36, 36, 36, 39, 39, 41, 41, 44, 44, 41, 41, 39, 39, 36, 38];
    const midi = bassNotes[Math.floor(step / 2) % bassNotes.length];
    this.triggerSynthBass(time, midi, 0.12);

    // Arp lead every 16th note
    const arpChords = [
      [55, 60, 63, 67], // C minor
      [58, 62, 65, 70], // Bb major
      [56, 60, 63, 68], // Ab major
      [58, 62, 65, 70], // Bb major
    ];
    const chordIndex = Math.floor(step / 16) % arpChords.length;
    const chord = arpChords[chordIndex];
    const arpMidi = chord[step % chord.length] + ((step % 8 >= 4) ? 12 : 0);
    this.triggerLead(time, arpMidi, 0.14);
  }

  // --- LO-FI ---
  private playLofiStep(step: number, time: number) {
    if (step % 16 === 0 || step % 16 === 10) {
      this.triggerKick(time, 90, 38, 0.35);
    }
    if (step % 16 === 8) {
      this.triggerSnare(time, 180, 0.18, 0.5);
    }
    if (step % 2 === 0) {
      this.triggerHiHat(time, (step % 4 === 2) ? 0.05 : 0.025);
    }

    // Warm chords on bar 1 and 3
    if (step % 16 === 0) {
      const chords = [
        [51, 55, 58, 62], // Eb maj7
        [48, 51, 55, 58], // C min7
        [46, 50, 53, 57], // Bb maj7
        [44, 48, 51, 55], // Ab maj7
      ];
      const c = chords[Math.floor(step / 16) % chords.length];
      this.triggerWarmChord(time, c, 1.8);
    }
  }

  // --- TECHNO ---
  private playTechnoStep(step: number, time: number) {
    // Relentless 4/4 pounding kick with sub-rumble
    if (step % 4 === 0) {
      this.triggerKick(time, 150, 35, 0.32, 1.2);
    }
    // Offbeat open hi-hat
    if (step % 4 === 2) {
      this.triggerHiHat(time, 0.12, 6000);
    } else if (step % 2 === 0) {
      this.triggerHiHat(time, 0.03, 9000);
    }

    // Acid 303 sequence
    const acidPattern = [36, 36, 48, 39, 36, 51, 46, 36, 48, 36, 39, 51, 46, 36, 38, 41];
    const note = acidPattern[step % acidPattern.length];
    const cutoffMod = 600 + Math.sin(step * 0.3) * 1800 + (step % 8 === 2 ? 2200 : 0);
    this.triggerAcidBass(time, note, cutoffMod, 0.16);
  }

  // --- AMBIENT ---
  private playAmbientStep(step: number, time: number) {
    if (step % 32 === 0) {
      const droneNotes = [43.65, 65.41, 98.0, 130.81]; // Rooted in ~432Hz harmonic series
      this.triggerDrone(time, droneNotes[Math.floor(step / 32) % droneNotes.length], 4.0);
    }
    if (step % 16 === 8) {
      const crystalNotes = [72, 76, 79, 83, 86, 88];
      const note = crystalNotes[(step * 7) % crystalNotes.length];
      this.triggerChime(time, note, 2.5);
    }
  }

  // --- CHIRP FREQUENCY SWEEP ---
  private playChirpStep(step: number, time: number) {
    if (step % 32 === 0) {
      this.triggerLogarithmicChirp(time, 20, 20000, 3.8);
    }
  }

  // --- SOUND GENERATORS ---

  private triggerKick(time: number, startFreq: number, endFreq: number, duration: number, gainMult: number = 1.0) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, time);
      osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration * 0.5);

      gain.gain.setValueAtTime(1.0 * gainMult, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      gain.connect(this.outputNode);

      osc.start(time);
      osc.stop(time + duration);
    } catch {
      // AudioContext handling
    }
  }

  private triggerSnare(time: number, freq: number, duration: number, noiseMix: number = 0.8) {
    try {
      // Body tone
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(50, time + duration * 0.5);
      oscGain.gain.setValueAtTime(0.6 * (1 - noiseMix * 0.5), time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.5);
      osc.connect(oscGain);
      oscGain.connect(this.outputNode);
      osc.start(time);
      osc.stop(time + duration);

      // Noise snap
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, time);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5 * noiseMix, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.outputNode);

      noise.start(time);
      noise.stop(time + duration);
    } catch {
      // AudioContext handling
    }
  }

  private triggerHiHat(time: number, duration: number, hpFreq: number = 7500) {
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(hpFreq, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.outputNode);

      noise.start(time);
      noise.stop(time + duration);
    } catch {
      // AudioContext handling
    }
  }

  private triggerSynthBass(time: number, midi: number, duration: number) {
    try {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const osc = this.ctx.createOscillator();
      const subOsc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(freq / 2, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, time);
      filter.frequency.exponentialRampToValueAtTime(200, time + duration);

      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      gain.connect(this.outputNode);

      osc.start(time);
      subOsc.start(time);
      osc.stop(time + duration);
      subOsc.stop(time + duration);
    } catch {
      // AudioContext handling
    }
  }

  private triggerLead(time: number, midi: number, duration: number) {
    try {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, time);
      filter.frequency.exponentialRampToValueAtTime(900, time + duration);
      filter.Q.value = 4;

      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.outputNode);

      osc.start(time);
      osc.stop(time + duration);
    } catch {
      // AudioContext handling
    }
  }

  private triggerAcidBass(time: number, midi: number, cutoff: number, duration: number) {
    try {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, time);
      filter.frequency.exponentialRampToValueAtTime(150, time + duration);
      filter.Q.value = 14;

      gain.gain.setValueAtTime(0.45, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.outputNode);

      osc.start(time);
      osc.stop(time + duration);
    } catch {
      // AudioContext handling
    }
  }

  private triggerWarmChord(time: number, midiList: number[], duration: number) {
    try {
      midiList.forEach(midi => {
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1100, time);

        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.outputNode);

        osc.start(time);
        osc.stop(time + duration);
      });
    } catch {
      // AudioContext handling
    }
  }

  private triggerDrone(time: number, freq: number, duration: number) {
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, time);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.5, time); // Fifth overtone

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.18, time + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.outputNode);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + duration);
      osc2.stop(time + duration);
    } catch {
      // AudioContext handling
    }
  }

  private triggerChime(time: number, midi: number, duration: number) {
    try {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gain);
      gain.connect(this.outputNode);

      osc.start(time);
      osc.stop(time + duration);
    } catch {
      // AudioContext handling
    }
  }

  private triggerLogarithmicChirp(time: number, startHz: number, endHz: number, duration: number) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startHz, time);
      osc.frequency.exponentialRampToValueAtTime(endHz, time + duration);

      gain.gain.setValueAtTime(0.3, time);
      gain.gain.linearRampToValueAtTime(0.3, time + duration - 0.1);
      gain.gain.linearRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      gain.connect(this.outputNode);

      osc.start(time);
      osc.stop(time + duration);
    } catch {
      // AudioContext handling
    }
  }
}
