export type AudioInputSource = 'mic' | 'song' | 'synth' | 'generator';

export type VisualizerMode = 
  | 'bars'         // Linear & Log Frequency Spectrum with Peak Caps
  | 'oscilloscope' // Phosphor Beam Time-Domain Waveform
  | 'radial'       // Circular Pulsar Spectrum
  | 'waterfall'    // 2D/3D Rolling Spectrogram Sonogram
  | 'particles'    // Reactive Particle Nebula
  | 'vectorscope'; // Lissajous & Stereo Phase Scope

export type ColorTheme = 'cyan' | 'sunset' | 'emerald' | 'amber' | 'violet' | 'monochrome';

export interface FrequencyBands {
  subBass: number;    // 20 - 60 Hz
  bass: number;       // 60 - 250 Hz
  lowMid: number;     // 250 - 500 Hz
  mid: number;        // 500 - 2,000 Hz
  highMid: number;    // 2,000 - 4,000 Hz
  presence: number;   // 4,000 - 6,000 Hz
  brilliance: number; // 6,000 - 20,000 Hz
}

export interface AudioMetrics {
  rms: number;           // Root-mean-square level (0 to 1)
  decibels: number;      // -100 to 0 dBFS
  peakDecibels: number;  // Peak level
  dominantFreq: number;  // Peak frequency in Hz
  musicalNote: string;   // Closest note (e.g. A4, C#3)
  isBeat: boolean;       // Beat / Transient kick detected
  beatEnergy: number;    // Transient strength
  bands: FrequencyBands; // Band energy levels (0 to 1)
}

export interface VisualizerSettings {
  mode: VisualizerMode;
  theme: ColorTheme;
  fftSize: number;           // 256, 512, 1024, 2048, 4096
  smoothing: number;         // 0.0 to 0.95
  gain: number;              // 0.2 to 5.0
  logarithmic: boolean;      // Log scale vs linear for spectrum bars
  glowIntensity: number;     // 0.0 to 1.0
  triggerStabilization: boolean; // For oscilloscope wave locking
  showGrid: boolean;         // Frequency & dB axes
  fillOpacity: number;       // 0.1 to 1.0
  particlesCount: number;    // For particle mode
}

export interface GenerativeTrack {
  id: string;
  title: string;
  genre: string;
  bpm: number;
  description: string;
}

export type SynthPresetId = 
  | 'supersaw'     // Trance / EDM Analog Saw Lead
  | 'acid303'      // Squelchy Resonant Techno Acid Bass
  | 'rhodes'       // Warm Electric Piano / Vintage Rhodes
  | 'sub808'       // Heavy Trap / Hip Hop 808 Sub-Bass
  | 'chiptune'     // 8-Bit Arcade Square Lead
  | 'dreampad'     // Lush Ambient Shimmer Poly-Pad
  | 'crystalpluck' // Metallic Bell & Percussive Pluck
  | 'brass';       // Synth Brass Stab

export type ChordMode = 'single' | 'major' | 'minor' | 'sus4' | 'octave';

export interface SynthSettings {
  preset: SynthPresetId;
  waveform: OscillatorType;
  attack: number;     // 0.005 to 1.2s
  decay: number;      // 0.05 to 2.0s
  sustain: number;    // 0.0 to 1.0
  release: number;    // 0.05 to 3.0s
  cutoff: number;     // 80 to 14000 Hz
  resonance: number;  // 0.5 to 18
  chordMode: ChordMode;
  octaveOffset: number; // -2 to +2
  arpeggiator: 'off' | 'up' | 'down' | 'updown' | 'random';
  arpBpm: number;
  glide: number;      // Portamento time 0.0 to 0.3s
}

export interface RecordedSong {
  id: string;
  title: string;
  durationSec: number;
  createdAt: string;
  blobUrl: string;
  blob: Blob;
  sizeBytes: number;
}
