import { ColorTheme } from '../types/audio';

// Convert frequency in Hz to closest musical note name
export function frequencyToNote(freq: number): string {
  if (freq < 20 || freq > 20000 || isNaN(freq)) return '--';
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  if (midi < 12 || midi > 127) return `${Math.round(freq)} Hz`;
  const noteName = notes[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${noteName}${octave}`;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  background: string;
  gradient: [string, string, string];
  peakColor: string;
  gridColor: string;
}

export const THEME_PALETTES: Record<ColorTheme, ThemeColors> = {
  cyan: {
    primary: '#06b6d4',      // Laser Cyan
    secondary: '#3b82f6',    // Cobalt Blue
    accent: '#22d3ee',       // Bright Cyan
    glow: 'rgba(6, 182, 212, 0.45)',
    background: '#030712',   // Slate 950
    gradient: ['#06b6d4', '#3b82f6', '#8b5cf6'],
    peakColor: '#67e8f9',
    gridColor: 'rgba(51, 65, 85, 0.35)',
  },
  sunset: {
    primary: '#f43f5e',      // Rose Pink
    secondary: '#f97316',    // Neon Orange
    accent: '#fbbf24',       // Amber Gold
    glow: 'rgba(244, 63, 94, 0.45)',
    background: '#09050d',
    gradient: ['#fbbf24', '#f97316', '#f43f5e'],
    peakColor: '#fef08a',
    gridColor: 'rgba(76, 29, 70, 0.35)',
  },
  emerald: {
    primary: '#10b981',      // Emerald Green
    secondary: '#06b6d4',    // Cyan
    accent: '#34d399',       // Mint
    glow: 'rgba(16, 185, 129, 0.45)',
    background: '#020c08',
    gradient: ['#10b981', '#059669', '#06b6d4'],
    peakColor: '#6ee7b7',
    gridColor: 'rgba(6, 78, 59, 0.35)',
  },
  amber: {
    primary: '#f59e0b',      // Telemetry Amber
    secondary: '#d97706',    // Warm Amber
    accent: '#fbbf24',       // Bright Amber
    glow: 'rgba(245, 158, 11, 0.45)',
    background: '#0c0a06',
    gradient: ['#f59e0b', '#d97706', '#b45309'],
    peakColor: '#fde68a',
    gridColor: 'rgba(69, 45, 12, 0.35)',
  },
  violet: {
    primary: '#8b5cf6',      // Electric Violet
    secondary: '#ec4899',    // Hot Pink
    accent: '#a78bfa',       // Bright Lavender
    glow: 'rgba(139, 92, 246, 0.45)',
    background: '#080512',
    gradient: ['#8b5cf6', '#d946ef', '#ec4899'],
    peakColor: '#c084fc',
    gridColor: 'rgba(60, 30, 95, 0.35)',
  },
  monochrome: {
    primary: '#e2e8f0',      // Silver Platinum
    secondary: '#94a3b8',    // Slate
    accent: '#f8fafc',       // Pure White
    glow: 'rgba(226, 232, 240, 0.3)',
    background: '#020408',
    gradient: ['#64748b', '#94a3b8', '#f8fafc'],
    peakColor: '#ffffff',
    gridColor: 'rgba(51, 65, 85, 0.4)',
  },
};

// Calculate logarithmic distribution of FFT frequency bins
// For standard RTA spectrum analyzer (human hearing is logarithmic from 20Hz to 20kHz)
export function getLogarithmicBins(
  freqData: Uint8Array,
  numBars: number,
  sampleRate: number = 44100,
  minFreq: number = 20,
  maxFreq: number = 20000
): Float32Array {
  const output = new Float32Array(numBars);
  const fftLength = freqData.length;
  const maxBin = Math.floor((maxFreq / (sampleRate / 2)) * fftLength);
  const minBin = Math.max(1, Math.floor((minFreq / (sampleRate / 2)) * fftLength));

  for (let i = 0; i < numBars; i++) {
    // Logarithmic scale ratio from 0 to 1
    const t0 = i / numBars;
    const t1 = (i + 1) / numBars;
    
    // Frequency corresponding to bin edge
    const f0 = minFreq * Math.pow(maxFreq / minFreq, t0);
    const f1 = minFreq * Math.pow(maxFreq / minFreq, t1);

    const binStart = Math.max(minBin, Math.floor((f0 / (sampleRate / 2)) * fftLength));
    const binEnd = Math.min(maxBin, Math.ceil((f1 / (sampleRate / 2)) * fftLength));

    let sum = 0;
    let count = 0;

    for (let b = binStart; b <= binEnd && b < fftLength; b++) {
      sum += freqData[b];
      count++;
    }

    // If frequency band falls between discrete bins, interpolate
    if (count === 0) {
      const b = Math.min(fftLength - 1, Math.max(0, Math.floor((f0 / (sampleRate / 2)) * fftLength)));
      output[i] = freqData[b];
    } else {
      output[i] = sum / count;
    }
  }

  return output;
}
