import {
  AudioInputSource,
  AudioMetrics,
  FrequencyBands,
  RecordedSong,
  SynthPresetId,
  SynthSettings,
  ChordMode,
} from '../types/audio';
import { frequencyToNote } from './audioUtils';
import { GenerativeAudioEngine } from './generativeAudio';

interface SynthVoice {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  filters: BiquadFilterNode[];
  rootNote: number;
}

export const SYNTH_PRESETS: Record<SynthPresetId, { name: string; desc: string; defaults: Partial<SynthSettings> }> = {
  supersaw: {
    name: 'Analog Super Saw',
    desc: 'Dual detuned saws with lush harmonic spread for EDM & Cyberpunk leads',
    defaults: {
      preset: 'supersaw',
      waveform: 'sawtooth',
      attack: 0.015,
      decay: 0.25,
      sustain: 0.65,
      release: 0.35,
      cutoff: 6500,
      resonance: 3.2,
      glide: 0.02,
    },
  },
  acid303: {
    name: 'Cyberpunk 303 Acid',
    desc: 'High-resonance squelchy bass with sweeping aggressive envelope',
    defaults: {
      preset: 'acid303',
      waveform: 'sawtooth',
      attack: 0.005,
      decay: 0.2,
      sustain: 0.35,
      release: 0.2,
      cutoff: 4800,
      resonance: 12.5,
      glide: 0.05,
    },
  },
  rhodes: {
    name: 'Neo-Soul Electric Piano',
    desc: 'Warm vintage Rhodes electric keys with bell-like chime overtone',
    defaults: {
      preset: 'rhodes',
      waveform: 'triangle',
      attack: 0.01,
      decay: 0.8,
      sustain: 0.25,
      release: 0.6,
      cutoff: 3400,
      resonance: 1.5,
      glide: 0.0,
    },
  },
  sub808: {
    name: 'Deep 808 Sub-Bass',
    desc: 'Heavy trap sub-bass with punchy pitch-kick drop and deep sine rumble',
    defaults: {
      preset: 'sub808',
      waveform: 'sine',
      attack: 0.008,
      decay: 0.6,
      sustain: 0.7,
      release: 0.8,
      cutoff: 1200,
      resonance: 1.0,
      glide: 0.08,
    },
  },
  chiptune: {
    name: '8-Bit Arcade Square',
    desc: 'Crisp retro game console square wave with instantaneous transient response',
    defaults: {
      preset: 'chiptune',
      waveform: 'square',
      attack: 0.002,
      decay: 0.15,
      sustain: 0.7,
      release: 0.15,
      cutoff: 8000,
      resonance: 2.0,
      glide: 0.0,
    },
  },
  dreampad: {
    name: 'Cosmic Shimmer Pad',
    desc: 'Slow ethereal ambient strings with rich polyphonic resonance',
    defaults: {
      preset: 'dreampad',
      waveform: 'triangle',
      attack: 0.45,
      decay: 1.2,
      sustain: 0.85,
      release: 1.4,
      cutoff: 4200,
      resonance: 2.0,
      glide: 0.04,
    },
  },
  crystalpluck: {
    name: 'Crystal Bell Pluck',
    desc: 'Bright metallic bell chime with fast pluck decay and high harmonic ring',
    defaults: {
      preset: 'crystalpluck',
      waveform: 'sine',
      attack: 0.003,
      decay: 0.35,
      sustain: 0.15,
      release: 0.5,
      cutoff: 7500,
      resonance: 4.5,
      glide: 0.0,
    },
  },
  brass: {
    name: 'Future Synth Brass',
    desc: 'Punchy brass stabs with dual-octave sawtooth harmonics',
    defaults: {
      preset: 'brass',
      waveform: 'sawtooth',
      attack: 0.05,
      decay: 0.4,
      sustain: 0.5,
      release: 0.4,
      cutoff: 5500,
      resonance: 3.5,
      glide: 0.01,
    },
  },
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private preAmpGain: GainNode | null = null;
  private audibleBus: GainNode | null = null;

  // Source Nodes
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micMonitorGain: GainNode | null = null;

  // Simulated Mic Voice Engine (Fallback / Test mode)
  private simulatedMicOsc: OscillatorNode | null = null;
  private simulatedMicTimer: number | null = null;
  private isSimulatedMicActive: boolean = false;

  private fileAudioElement: HTMLAudioElement | null = null;
  private fileSource: MediaElementAudioSourceNode | null = null;

  private generativeEngine: GenerativeAudioEngine | null = null;

  // Live Synth Voices
  private activeVoices: Map<number, SynthVoice> = new Map();
  private heldKeys: Set<number> = new Set();
  private arpTimerId: number | null = null;
  private arpStep: number = 0;

  // Synth Settings
  private synthSettings: SynthSettings = {
    preset: 'supersaw',
    waveform: 'sawtooth',
    attack: 0.015,
    decay: 0.25,
    sustain: 0.65,
    release: 0.35,
    cutoff: 6500,
    resonance: 3.2,
    chordMode: 'single',
    octaveOffset: 0,
    arpeggiator: 'off',
    arpBpm: 128,
    glide: 0.02,
  };

  // State
  private currentSource: AudioInputSource = 'generator';
  private isRunning: boolean = false;
  private fftSize: number = 2048;
  private smoothing: number = 0.65;
  private gainValue: number = 1.0;
  private micMonitorEnabled: boolean = false;

  // Audio Recording Engine
  private recordDestination: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecordingState: boolean = false;
  private recordStartTime: number = 0;
  private recordTimerId: number | null = null;
  private recordingElapsedSec: number = 0;
  private recordingListeners: Set<(isRec: boolean, elapsedSec: number) => void> = new Set();
  private recordedSongs: RecordedSong[] = [];
  private songCounter: number = 1;

  // Analysis Buffers
  private freqDataArray: Uint8Array | null = null;
  private timeDataArray: Uint8Array | null = null;

  // Beat Detection State
  private energyHistory: number[] = [];
  private beatHoldFrames: number = 0;

  constructor() {
    // Lazy AudioContext initialization on first user gesture
  }

  public async initAudioContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Analyser Node (computes FFT frequency & time-domain wave data)
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothing;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      // Pre-amp gain (controls visualizer spectrum input sensitivity)
      this.preAmpGain = this.ctx.createGain();
      this.preAmpGain.gain.value = this.gainValue;
      this.preAmpGain.connect(this.analyser);

      // Master output gain (for hearing sound through speakers/headphones)
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.ctx.destination);

      // Recording destination node - captures all master output
      this.recordDestination = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.recordDestination);

      // Audible mix bus: Connects audible sources (synth, generative, song file)
      // to BOTH the preAmpGain (visualizer) AND masterGain (speakers).
      this.audibleBus = this.ctx.createGain();
      this.audibleBus.gain.value = 1.0;
      this.audibleBus.connect(this.preAmpGain);
      this.audibleBus.connect(this.masterGain);

      // Generative synth engine outputs to audibleBus
      this.generativeEngine = new GenerativeAudioEngine(this.ctx, this.audibleBus);

      // Mic monitor gain: default 0.0 (MUTED to prevent screeching speaker feedback)
      this.micMonitorGain = this.ctx.createGain();
      this.micMonitorGain.gain.value = 0.0;
      this.micMonitorGain.connect(this.masterGain);

      // Initialize analysis buffers
      this.freqDataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDataArray = new Uint8Array(this.analyser.fftSize);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Critical Android & iOS mobile Web Audio unlock
    try {
      const unlockBuffer = this.ctx.createBuffer(1, 1, 22050);
      const unlockSource = this.ctx.createBufferSource();
      unlockSource.buffer = unlockBuffer;
      unlockSource.connect(this.ctx.destination);
      unlockSource.start(0);
    } catch {
      // Ignore unlock buffer errors
    }

    return this.ctx;
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getSource(): AudioInputSource {
    return this.currentSource;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public setFFTSize(size: number) {
    this.fftSize = size;
    if (this.analyser) {
      this.analyser.fftSize = size;
      this.freqDataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDataArray = new Uint8Array(this.analyser.fftSize);
    }
  }

  public setSmoothing(val: number) {
    this.smoothing = Math.max(0, Math.min(0.95, val));
    if (this.analyser) {
      this.analyser.smoothingTimeConstant = this.smoothing;
    }
  }

  public setGain(val: number) {
    this.gainValue = Math.max(0.1, Math.min(5.0, val));
    if (this.preAmpGain) {
      this.preAmpGain.gain.value = this.gainValue;
    }
  }

  public setMasterVolume(val: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1.0, val));
    }
  }

  public setMicMonitor(enabled: boolean) {
    this.micMonitorEnabled = enabled;
    if (this.micMonitorGain) {
      this.micMonitorGain.gain.value = enabled ? 1.0 : 0.0;
    }
  }

  public getMicMonitor(): boolean {
    return this.micMonitorEnabled;
  }

  // --- AUDIO RECORDING ENGINE ---

  public subscribeRecording(listener: (isRec: boolean, elapsedSec: number) => void): () => void {
    this.recordingListeners.add(listener);
    listener(this.isRecordingState, this.recordingElapsedSec);
    return () => {
      this.recordingListeners.delete(listener);
    };
  }

  private notifyRecordingListeners() {
    this.recordingListeners.forEach(fn => fn(this.isRecordingState, this.recordingElapsedSec));
  }

  public getIsRecording(): boolean {
    return this.isRecordingState;
  }

  public getRecordingElapsed(): number {
    return this.recordingElapsedSec;
  }

  public getRecordedSongs(): RecordedSong[] {
    return [...this.recordedSongs];
  }

  public async startRecording(): Promise<boolean> {
    await this.initAudioContext();
    if (!this.recordDestination) return false;

    if (!this.isRunning) {
      await this.start();
    }

    try {
      this.recordedChunks = [];
      const stream = this.recordDestination.stream;

      const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        '',
      ];
      let selectedType = '';
      for (const t of types) {
        if (t === '' || (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t))) {
          selectedType = t;
          break;
        }
      }

      const options = selectedType ? { mimeType: selectedType } : undefined;
      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100);
      this.isRecordingState = true;
      this.recordStartTime = Date.now();
      this.recordingElapsedSec = 0;

      if (this.recordTimerId) window.clearInterval(this.recordTimerId);
      this.recordTimerId = window.setInterval(() => {
        this.recordingElapsedSec = Math.floor((Date.now() - this.recordStartTime) / 1000);
        this.notifyRecordingListeners();
      }, 500);

      this.notifyRecordingListeners();
      return true;
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      this.isRecordingState = false;
      this.notifyRecordingListeners();
      return false;
    }
  }

  public async stopRecording(): Promise<RecordedSong | null> {
    if (!this.mediaRecorder || !this.isRecordingState) return null;

    return new Promise(resolve => {
      if (this.recordTimerId) {
        window.clearInterval(this.recordTimerId);
        this.recordTimerId = null;
      }

      this.mediaRecorder!.onstop = () => {
        this.isRecordingState = false;
        const durationSec = Math.max(1, Math.floor((Date.now() - this.recordStartTime) / 1000));
        const mime = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mime });
        const blobUrl = URL.createObjectURL(blob);

        const currentPreset = SYNTH_PRESETS[this.synthSettings.preset]?.name || 'Synthesizer';
        const newSong: RecordedSong = {
          id: `song-${Date.now()}`,
          title: `Song Take #${this.songCounter++} (${currentPreset})`,
          durationSec,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          blobUrl,
          blob,
          sizeBytes: blob.size,
        };

        this.recordedSongs.unshift(newSong);
        this.notifyRecordingListeners();
        resolve(newSong);
      };

      try {
        this.mediaRecorder!.stop();
      } catch (err) {
        console.error('Error stopping MediaRecorder:', err);
        this.isRecordingState = false;
        this.notifyRecordingListeners();
        resolve(null);
      }
    });
  }

  public deleteRecordedSong(id: string) {
    const idx = this.recordedSongs.findIndex(s => s.id === id);
    if (idx !== -1) {
      URL.revokeObjectURL(this.recordedSongs[idx].blobUrl);
      this.recordedSongs.splice(idx, 1);
    }
  }

  public async loadRecordedSong(song: RecordedSong): Promise<void> {
    await this.initAudioContext();
    this.stopCurrentSource();
    this.currentSource = 'song';

    if (!this.fileAudioElement) {
      this.fileAudioElement = new Audio();
      this.fileAudioElement.crossOrigin = 'anonymous';
      this.fileAudioElement.loop = true;
    }

    this.fileAudioElement.src = song.blobUrl;
    this.fileAudioElement.load();

    if (!this.fileSource && this.ctx && this.audibleBus) {
      this.fileSource = this.ctx.createMediaElementSource(this.fileAudioElement);
      this.fileSource.connect(this.audibleBus);
    }

    try {
      await this.fileAudioElement.play();
      this.isRunning = true;
    } catch (err) {
      console.warn('Playback waiting on gesture:', err);
    }
  }

  // --- SOURCE SWITCHING ---

  public async setSource(source: AudioInputSource): Promise<void> {
    await this.initAudioContext();
    const prevSource = this.currentSource;
    this.stopCurrentSource();
    this.currentSource = source;

    if (this.isRunning) {
      try {
        await this.startActiveSource();
      } catch (err) {
        // Rollback source if start fails
        this.currentSource = prevSource;
        try {
          await this.startActiveSource();
        } catch {
          // ignore
        }
        throw err;
      }
    }
  }

  public async start(): Promise<void> {
    await this.initAudioContext();
    this.isRunning = true;
    try {
      await this.startActiveSource();
    } catch (err) {
      this.isRunning = false;
      this.stopCurrentSource();
      throw err;
    }
  }

  public stop(): void {
    this.isRunning = false;
    this.stopCurrentSource();
    this.releaseAllVoices();
    if (this.isRecordingState) {
      this.stopRecording();
    }
  }

  private async startActiveSource(): Promise<void> {
    if (!this.ctx) return;

    switch (this.currentSource) {
      case 'generator':
        if (this.generativeEngine) {
          this.generativeEngine.start();
        }
        break;

      case 'mic':
        await this.startMicrophone();
        break;

      case 'song':
        if (this.fileAudioElement) {
          try {
            await this.fileAudioElement.play();
          } catch (err) {
            console.warn('File audio waiting on user interaction:', err);
          }
        }
        break;

      case 'synth':
        // Synth voices are triggered on-demand via keyboard
        break;
    }
  }

  private stopCurrentSource(): void {
    if (this.generativeEngine) {
      this.generativeEngine.stop();
    }

    this.stopSimulatedMic();

    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {
        // ignore
      }
      this.micSource = null;
    }

    if (this.fileAudioElement) {
      this.fileAudioElement.pause();
    }
  }

  // --- LIVE MICROPHONE (ROBUST HARDWARE ACCESS & FEEDBACK ELIMINATION) ---

  public async startMicrophone(): Promise<void> {
    if (!this.ctx || !this.analyser) return;

    this.stopSimulatedMic();

    // Check mediaDevices support
    const getUserMediaFn =
      navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices) ||
      (navigator as unknown as { webkitGetUserMedia?: (c: unknown, s: unknown, f: unknown) => void })
        .webkitGetUserMedia ||
      (navigator as unknown as { mozGetUserMedia?: (c: unknown, s: unknown, f: unknown) => void })
        .mozGetUserMedia;

    if (!getUserMediaFn) {
      throw new Error(
        'Microphone API is not supported by your browser or environment (requires HTTPS).'
      );
    }

    let stream: MediaStream | null = null;
    let lastError: unknown = null;

    // Strategy 1: Soft ideal constraints for high fidelity without OverconstrainedError
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          autoGainControl: { ideal: true },
          noiseSuppression: { ideal: false },
        },
      });
    } catch (err1) {
      lastError = err1;
      console.warn('Advanced mic constraints failed, attempting fallback { audio: true }:', err1);
      // Strategy 2: Absolute baseline boolean constraint
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err2) {
        lastError = err2;
      }
    }

    if (!stream) {
      throw this.parseMicError(lastError);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.micStream = stream;
    this.micSource = this.ctx.createMediaStreamSource(stream);

    // 1. Connect to preAmpGain so visualizer receives live audio spectrum
    this.micSource.connect(this.preAmpGain!);

    // 2. Connect to recordDestination so singing/speaking is captured into song takes
    if (this.recordDestination) {
      this.micSource.connect(this.recordDestination);
    }

    // 3. Connect to micMonitorGain (default 0.0 muted) to completely prevent feedback howling
    if (this.micMonitorGain) {
      this.micSource.connect(this.micMonitorGain);
    }

    this.isSimulatedMicActive = false;
  }

  private parseMicError(err: unknown): Error {
    if (err instanceof Error) {
      const name = err.name || '';
      const msg = err.message || '';

      if (
        name === 'NotAllowedError' ||
        name === 'PermissionDeniedError' ||
        name === 'SecurityError' ||
        msg.toLowerCase().includes('permission denied') ||
        msg.toLowerCase().includes('not allowed')
      ) {
        return new Error(
          'Microphone permission was blocked or denied by your browser or iframe security policy. Please click the address bar permissions icon to allow microphone access, or open in a direct tab.'
        );
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return new Error(
          'No microphone hardware was detected on this device. Please connect a headset or microphone, or use the Acoustic Voice Simulator.'
        );
      }
      if (name === 'NotReadableError' || name === 'TrackStartError') {
        return new Error(
          'Microphone is currently held by another application or tab (e.g. Zoom, Google Meet). Please close other audio tabs and retry.'
        );
      }
      if (name === 'OverconstrainedError') {
        return new Error(
          'Hardware audio constraints not satisfied by this microphone device.'
        );
      }
      return new Error(`Microphone hardware error: ${msg || name}`);
    }
    return new Error('Microphone access was denied or hardware could not be initialized.');
  }

  // --- ACOUSTIC VOICE SIMULATOR (TEST & FALLBACK MODE) ---

  public startSimulatedMic(): void {
    if (!this.ctx || !this.preAmpGain) return;
    this.stopSimulatedMic();

    // Human vocal cord fundamental frequency (A3 ~ 165 Hz)
    const fundamentalFreq = 165;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(fundamentalFreq, this.ctx.currentTime);

    // Formant filters for vowel harmonics (F1 ~ 750Hz, F2 ~ 1400Hz)
    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(750, this.ctx.currentTime);
    f1.Q.setValueAtTime(4.0, this.ctx.currentTime);

    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(1400, this.ctx.currentTime);
    f2.Q.setValueAtTime(5.0, this.ctx.currentTime);

    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    osc.connect(f1);
    osc.connect(f2);
    f1.connect(voiceGain);
    f2.connect(voiceGain);

    // Route directly to preAmpGain so visualizer sees speech spectrum
    voiceGain.connect(this.preAmpGain);

    osc.start();
    this.simulatedMicOsc = osc;
    this.isSimulatedMicActive = true;

    // Speech rhythm cadence modulation (mimicking spoken words)
    let step = 0;
    this.simulatedMicTimer = window.setInterval(() => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      step++;
      const isSpeaking = step % 8 !== 0;

      if (isSpeaking) {
        const pitchBend = fundamentalFreq + Math.sin(step * 0.7) * 25 + (step % 3) * 12;
        osc.frequency.setTargetAtTime(pitchBend, now, 0.06);
        voiceGain.gain.setTargetAtTime(0.65 + Math.random() * 0.25, now, 0.05);

        const vowels = [
          [750, 1400],
          [350, 2200],
          [500, 900],
          [400, 1800],
        ];
        const v = vowels[step % vowels.length];
        f1.frequency.setTargetAtTime(v[0], now, 0.08);
        f2.frequency.setTargetAtTime(v[1], now, 0.08);
      } else {
        voiceGain.gain.setTargetAtTime(0.001, now, 0.05);
      }
    }, 180);
  }

  public stopSimulatedMic(): void {
    if (this.simulatedMicTimer) {
      window.clearInterval(this.simulatedMicTimer);
      this.simulatedMicTimer = null;
    }
    if (this.simulatedMicOsc) {
      try {
        this.simulatedMicOsc.stop();
        this.simulatedMicOsc.disconnect();
      } catch {
        // ignore
      }
      this.simulatedMicOsc = null;
    }
    this.isSimulatedMicActive = false;
  }

  public getIsSimulatedMic(): boolean {
    return this.isSimulatedMicActive;
  }

  // --- AUDIO FILE PLAYER ---

  public async loadSongFile(file: File): Promise<string> {
    await this.initAudioContext();
    this.stopCurrentSource();
    this.currentSource = 'song';

    const objectUrl = URL.createObjectURL(file);

    if (!this.fileAudioElement) {
      this.fileAudioElement = new Audio();
      this.fileAudioElement.crossOrigin = 'anonymous';
      this.fileAudioElement.loop = true;
    }

    this.fileAudioElement.src = objectUrl;
    this.fileAudioElement.load();

    if (!this.fileSource && this.ctx && this.audibleBus) {
      this.fileSource = this.ctx.createMediaElementSource(this.fileAudioElement);
      this.fileSource.connect(this.audibleBus);
    }

    try {
      await this.fileAudioElement.play();
      this.isRunning = true;
    } catch (err) {
      console.warn('Playback waiting on gesture:', err);
    }

    return file.name;
  }

  public getAudioElement(): HTMLAudioElement | null {
    return this.fileAudioElement;
  }

  // --- GENERATIVE TRACK CONTROLS ---

  public setGenerativeTrack(trackId: string) {
    if (this.generativeEngine) {
      this.generativeEngine.setTrack(trackId);
    }
  }

  // --- LIVE SYNTHESIZER ENGINE ---

  public getSynthSettings(): SynthSettings {
    return { ...this.synthSettings };
  }

  public setSynthSettings(newSettings: Partial<SynthSettings>) {
    this.synthSettings = { ...this.synthSettings, ...newSettings };

    if (newSettings.preset && SYNTH_PRESETS[newSettings.preset]) {
      const presetDef = SYNTH_PRESETS[newSettings.preset].defaults;
      this.synthSettings = { ...this.synthSettings, ...presetDef, ...newSettings };
    }

    if (this.synthSettings.arpeggiator !== 'off') {
      this.startArpeggiator();
    } else {
      this.stopArpeggiator();
    }
  }

  private getChordIntervals(mode: ChordMode): number[] {
    switch (mode) {
      case 'major':
        return [0, 4, 7];
      case 'minor':
        return [0, 3, 7];
      case 'sus4':
        return [0, 5, 7];
      case 'octave':
        return [-12, 0, 12];
      case 'single':
      default:
        return [0];
    }
  }

  public triggerSynthNote(midiNote: number, velocity: number = 0.85) {
    if (!this.ctx || !this.audibleBus) return;

    this.heldKeys.add(midiNote);

    if (this.synthSettings.arpeggiator !== 'off') {
      return;
    }

    this.playVoiceWithChord(midiNote, velocity);
  }

  private playVoiceWithChord(baseMidi: number, velocity: number) {
    if (!this.ctx || !this.audibleBus) return;

    this.releaseSynthNote(baseMidi);

    const effectiveBase = baseMidi + this.synthSettings.octaveOffset * 12;
    const intervals = this.getChordIntervals(this.synthSettings.chordMode);
    const chordNotes = intervals.map(i => effectiveBase + i);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];

    const now = this.ctx.currentTime;
    const s = this.synthSettings;

    chordNotes.forEach((midi, chordIndex) => {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const isRoot = chordIndex === 0;
      const noteVol = isRoot ? velocity : velocity * 0.7;

      switch (s.preset) {
        case 'supersaw': {
          [-9, 9].forEach(detuneCents => {
            const osc = this.ctx!.createOscillator();
            const filter = this.ctx!.createBiquadFilter();
            const gain = this.ctx!.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            osc.detune.setValueAtTime(detuneCents, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(s.cutoff * 0.4, now);
            filter.frequency.exponentialRampToValueAtTime(s.cutoff, now + s.attack + 0.05);
            filter.frequency.exponentialRampToValueAtTime(s.cutoff * 0.6, now + s.attack + s.decay);
            filter.Q.value = s.resonance;

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(noteVol * 0.22, now + s.attack);
            gain.gain.exponentialRampToValueAtTime(noteVol * 0.22 * s.sustain, now + s.attack + s.decay);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.audibleBus!);
            osc.start(now);

            oscillators.push(osc);
            gains.push(gain);
            filters.push(filter);
          });
          break;
        }

        case 'acid303': {
          const osc = this.ctx!.createOscillator();
          const filter = this.ctx!.createBiquadFilter();
          const gain = this.ctx!.createGain();

          osc.type = s.waveform;
          osc.frequency.setValueAtTime(freq, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(Math.min(12000, s.cutoff * 2.5), now);
          filter.frequency.exponentialRampToValueAtTime(Math.max(200, s.cutoff * 0.15), now + s.decay);
          filter.Q.value = s.resonance;

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(noteVol * 0.4, now + s.attack);
          gain.gain.exponentialRampToValueAtTime(noteVol * 0.4 * s.sustain, now + s.attack + s.decay);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.audibleBus!);
          osc.start(now);

          oscillators.push(osc);
          gains.push(gain);
          filters.push(filter);
          break;
        }

        case 'rhodes': {
          const osc1 = this.ctx!.createOscillator();
          const osc2 = this.ctx!.createOscillator();
          const filter = this.ctx!.createBiquadFilter();
          const gain1 = this.ctx!.createGain();
          const gain2 = this.ctx!.createGain();

          osc1.type = 'triangle';
          osc1.frequency.setValueAtTime(freq, now);

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(freq * 3.0, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(s.cutoff, now);
          filter.Q.value = s.resonance;

          gain1.gain.setValueAtTime(0.0001, now);
          gain1.gain.linearRampToValueAtTime(noteVol * 0.35, now + s.attack);
          gain1.gain.exponentialRampToValueAtTime(noteVol * 0.35 * s.sustain, now + s.attack + s.decay);

          gain2.gain.setValueAtTime(0.0001, now);
          gain2.gain.linearRampToValueAtTime(noteVol * 0.1, now + s.attack);
          gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(gain1);
          filter.connect(gain2);
          gain1.connect(this.audibleBus!);
          gain2.connect(this.audibleBus!);

          osc1.start(now);
          osc2.start(now);

          oscillators.push(osc1, osc2);
          gains.push(gain1, gain2);
          filters.push(filter);
          break;
        }

        case 'sub808': {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq * 2.0, now);
          osc.frequency.exponentialRampToValueAtTime(freq, now + 0.038);

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(noteVol * 0.5, now + s.attack);
          gain.gain.exponentialRampToValueAtTime(noteVol * 0.5 * s.sustain, now + s.attack + s.decay);

          osc.connect(gain);
          gain.connect(this.audibleBus!);
          osc.start(now);

          oscillators.push(osc);
          gains.push(gain);
          break;
        }

        case 'dreampad': {
          [-6, 6].forEach(detune => {
            const osc = this.ctx!.createOscillator();
            const filter = this.ctx!.createBiquadFilter();
            const gain = this.ctx!.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.detune.setValueAtTime(detune, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(s.cutoff * 0.3, now);
            filter.frequency.linearRampToValueAtTime(s.cutoff, now + s.attack);
            filter.Q.value = s.resonance;

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(noteVol * 0.25, now + s.attack);
            gain.gain.exponentialRampToValueAtTime(noteVol * 0.25 * s.sustain, now + s.attack + s.decay);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.audibleBus!);
            osc.start(now);

            oscillators.push(osc);
            gains.push(gain);
            filters.push(filter);
          });
          break;
        }

        case 'crystalpluck': {
          const osc = this.ctx!.createOscillator();
          const oscBell = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          const filter = this.ctx!.createBiquadFilter();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          oscBell.type = 'sine';
          oscBell.frequency.setValueAtTime(freq * 5.04, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(s.cutoff, now);
          filter.frequency.exponentialRampToValueAtTime(800, now + s.decay);
          filter.Q.value = s.resonance;

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(noteVol * 0.4, now + s.attack);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + s.decay);

          osc.connect(filter);
          oscBell.connect(filter);
          filter.connect(gain);
          gain.connect(this.audibleBus!);

          osc.start(now);
          oscBell.start(now);

          oscillators.push(osc, oscBell);
          gains.push(gain);
          filters.push(filter);
          break;
        }

        default: {
          const osc = this.ctx!.createOscillator();
          const filter = this.ctx!.createBiquadFilter();
          const gain = this.ctx!.createGain();

          osc.type = s.waveform;
          osc.frequency.setValueAtTime(freq, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(s.cutoff, now);
          filter.Q.value = s.resonance;

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(noteVol * 0.35, now + s.attack);
          gain.gain.exponentialRampToValueAtTime(noteVol * 0.35 * s.sustain, now + s.attack + s.decay);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.audibleBus!);
          osc.start(now);

          oscillators.push(osc);
          gains.push(gain);
          filters.push(filter);
          break;
        }
      }
    });

    this.activeVoices.set(baseMidi, {
      oscillators,
      gains,
      filters,
      rootNote: baseMidi,
    });
  }

  public releaseSynthNote(midiNote: number) {
    this.heldKeys.delete(midiNote);

    const voice = this.activeVoices.get(midiNote);
    if (voice && this.ctx) {
      const now = this.ctx.currentTime;
      const relTime = this.synthSettings.release;

      voice.gains.forEach(gain => {
        try {
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + relTime);
        } catch {
          // voice clean
        }
      });

      voice.oscillators.forEach(osc => {
        try {
          osc.stop(now + relTime + 0.05);
        } catch {
          // ignore
        }
      });

      this.activeVoices.delete(midiNote);
    }
  }

  public releaseAllVoices() {
    this.heldKeys.clear();
    this.stopArpeggiator();

    this.activeVoices.forEach(voice => {
      voice.oscillators.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // cleanup
        }
      });
    });
    this.activeVoices.clear();
  }

  // --- ARPEGGIATOR ENGINE ---

  private startArpeggiator() {
    if (this.arpTimerId) return;
    const intervalMs = Math.round((60000 / this.synthSettings.arpBpm) / 2);

    this.arpTimerId = window.setInterval(() => {
      if (this.heldKeys.size === 0) return;

      const keys = Array.from(this.heldKeys).sort((a, b) => a - b);
      let noteToPlay: number;

      switch (this.synthSettings.arpeggiator) {
        case 'up':
          noteToPlay = keys[this.arpStep % keys.length];
          this.arpStep++;
          break;
        case 'down':
          noteToPlay = keys[keys.length - 1 - (this.arpStep % keys.length)];
          this.arpStep++;
          break;
        case 'updown': {
          const cycle = keys.concat([...keys].reverse().slice(1, -1));
          noteToPlay = cycle[this.arpStep % cycle.length];
          this.arpStep++;
          break;
        }
        case 'random':
          noteToPlay = keys[Math.floor(Math.random() * keys.length)];
          break;
        default:
          return;
      }

      this.playVoiceWithChord(noteToPlay, 0.85);
      setTimeout(() => {
        this.releaseSynthNote(noteToPlay);
      }, intervalMs * 0.8);
    }, intervalMs);
  }

  private stopArpeggiator() {
    if (this.arpTimerId) {
      window.clearInterval(this.arpTimerId);
      this.arpTimerId = null;
    }
    this.arpStep = 0;
  }

  // --- REAL-TIME ACOUSTIC ANALYSIS ---

  public getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.freqDataArray) return null;
    this.analyser.getByteFrequencyData(this.freqDataArray as unknown as Uint8Array<ArrayBuffer>);
    return this.freqDataArray;
  }

  public getTriggeredTimeDomainData(stabilize: boolean = true): { data: Uint8Array; triggerOffset: number } | null {
    if (!this.analyser || !this.timeDataArray) return null;
    this.analyser.getByteTimeDomainData(this.timeDataArray as unknown as Uint8Array<ArrayBuffer>);

    let triggerOffset = 0;
    if (stabilize && this.isRunning) {
      const maxSearch = Math.min(256, Math.floor(this.timeDataArray.length / 2));
      for (let i = 1; i < maxSearch; i++) {
        if (this.timeDataArray[i - 1] < 128 && this.timeDataArray[i] >= 128) {
          triggerOffset = i;
          break;
        }
      }
    }

    return {
      data: this.timeDataArray,
      triggerOffset,
    };
  }

  public getMetrics(): AudioMetrics {
    const emptyBands: FrequencyBands = {
      subBass: 0,
      bass: 0,
      lowMid: 0,
      mid: 0,
      highMid: 0,
      presence: 0,
      brilliance: 0,
    };

    if (!this.analyser || !this.freqDataArray || !this.timeDataArray || !this.isRunning) {
      return {
        rms: 0,
        decibels: -90,
        peakDecibels: -90,
        dominantFreq: 0,
        musicalNote: '--',
        isBeat: false,
        beatEnergy: 0,
        bands: emptyBands,
      };
    }

    this.analyser.getByteFrequencyData(this.freqDataArray as unknown as Uint8Array<ArrayBuffer>);
    this.analyser.getByteTimeDomainData(this.timeDataArray as unknown as Uint8Array<ArrayBuffer>);

    const binCount = this.analyser.frequencyBinCount;
    const sampleRate = this.ctx?.sampleRate || 44100;
    const binHz = (sampleRate / 2) / binCount;

    // 1. RMS & Peak Level Calculation
    let sumSquares = 0;
    let peakDev = 0;
    for (let i = 0; i < this.timeDataArray.length; i++) {
      const norm = (this.timeDataArray[i] - 128) / 128;
      sumSquares += norm * norm;
      const absNorm = Math.abs(norm);
      if (absNorm > peakDev) peakDev = absNorm;
    }
    const rms = Math.sqrt(sumSquares / this.timeDataArray.length);
    const decibels = rms > 0.00001 ? 20 * Math.log10(rms) : -90;
    const peakDecibels = peakDev > 0.00001 ? 20 * Math.log10(peakDev) : -90;

    // 2. Multi-Band Energy Partitioning & Dominant Peak
    const bands: FrequencyBands = { ...emptyBands };
    const counts = { subBass: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, presence: 0, brilliance: 0 };

    let maxBinIdx = 0;
    let maxBinVal = 0;

    for (let i = 0; i < binCount; i++) {
      const val = this.freqDataArray[i];
      const freq = i * binHz;

      if (val > maxBinVal) {
        maxBinVal = val;
        maxBinIdx = i;
      }

      const normalizedVal = val / 255;

      if (freq >= 20 && freq < 60) {
        bands.subBass += normalizedVal;
        counts.subBass++;
      } else if (freq >= 60 && freq < 250) {
        bands.bass += normalizedVal;
        counts.bass++;
      } else if (freq >= 250 && freq < 500) {
        bands.lowMid += normalizedVal;
        counts.lowMid++;
      } else if (freq >= 500 && freq < 2000) {
        bands.mid += normalizedVal;
        counts.mid++;
      } else if (freq >= 2000 && freq < 4000) {
        bands.highMid += normalizedVal;
        counts.highMid++;
      } else if (freq >= 4000 && freq < 6000) {
        bands.presence += normalizedVal;
        counts.presence++;
      } else if (freq >= 6000 && freq < 20000) {
        bands.brilliance += normalizedVal;
        counts.brilliance++;
      }
    }

    if (counts.subBass > 0) bands.subBass /= counts.subBass;
    if (counts.bass > 0) bands.bass /= counts.bass;
    if (counts.lowMid > 0) bands.lowMid /= counts.lowMid;
    if (counts.mid > 0) bands.mid /= counts.mid;
    if (counts.highMid > 0) bands.highMid /= counts.highMid;
    if (counts.presence > 0) bands.presence /= counts.presence;
    if (counts.brilliance > 0) bands.brilliance /= counts.brilliance;

    let dominantFreq = 0;
    if (maxBinVal > 25 && maxBinIdx > 0 && maxBinIdx < binCount - 1) {
      const alpha = this.freqDataArray[maxBinIdx - 1];
      const beta = this.freqDataArray[maxBinIdx];
      const gamma = this.freqDataArray[maxBinIdx + 1];
      const denom = alpha - 2 * beta + gamma;
      const delta = denom !== 0 ? (0.5 * (alpha - gamma)) / denom : 0;
      dominantFreq = (maxBinIdx + delta) * binHz;
    } else if (maxBinVal > 25) {
      dominantFreq = maxBinIdx * binHz;
    }

    const musicalNote = dominantFreq > 20 ? frequencyToNote(dominantFreq) : '--';

    // 3. Beat detection
    const bassEnergy = (bands.subBass * 1.5 + bands.bass) / 2.5;
    let isBeat = false;
    let beatEnergy = 0;

    this.energyHistory.push(bassEnergy);
    if (this.energyHistory.length > 45) {
      this.energyHistory.shift();
    }

    if (this.beatHoldFrames > 0) {
      this.beatHoldFrames--;
    } else if (this.energyHistory.length >= 20) {
      const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
      const variance =
        this.energyHistory.reduce((acc, val) => acc + Math.pow(val - avgEnergy, 2), 0) /
        this.energyHistory.length;
      const threshold = avgEnergy + Math.max(0.08, Math.sqrt(variance) * 1.5);

      if (bassEnergy > threshold && bassEnergy > 0.22) {
        isBeat = true;
        beatEnergy = bassEnergy;
        this.beatHoldFrames = 8;
      }
    }

    return {
      rms,
      decibels,
      peakDecibels,
      dominantFreq,
      musicalNote,
      isBeat,
      beatEnergy,
      bands,
    };
  }
}

// Global audio engine singleton
export const audioEngine = new AudioEngine();
