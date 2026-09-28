import React from 'react';
import { VisualizerSettings, VisualizerMode, ColorTheme } from '../types/audio';
import { audioEngine } from '../services/audioEngine';
import { Sliders, BarChart3, Waves, Disc, Flame, Sparkles, Compass } from 'lucide-react';

interface ControlPanelProps {
  settings: VisualizerSettings;
  onUpdateSettings: (newSettings: Partial<VisualizerSettings>) => void;
}

const MODES: { id: VisualizerMode; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'bars', label: 'Spectrum Bars', icon: BarChart3 },
  { id: 'oscilloscope', label: 'Oscilloscope', icon: Waves },
  { id: 'radial', label: 'Radial Pulsar', icon: Disc },
  { id: 'waterfall', label: 'Sonogram Waterfall', icon: Flame },
  { id: 'particles', label: 'Particle Nebula', icon: Sparkles },
  { id: 'vectorscope', label: 'Lissajous Scope', icon: Compass },
];

const THEMES: { id: ColorTheme; label: string; colorClass: string }[] = [
  { id: 'cyan', label: 'Laser Cyan', colorClass: 'bg-cyan-500' },
  { id: 'sunset', label: 'Neon Sunset', colorClass: 'bg-rose-500' },
  { id: 'emerald', label: 'Matrix Emerald', colorClass: 'bg-emerald-500' },
  { id: 'amber', label: 'Telemetry Amber', colorClass: 'bg-amber-500' },
  { id: 'violet', label: 'Electric Violet', colorClass: 'bg-purple-500' },
  { id: 'monochrome', label: 'Silver CRT', colorClass: 'bg-slate-300' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const handleSmoothingChange = (val: number) => {
    onUpdateSettings({ smoothing: val });
    audioEngine.setSmoothing(val);
  };

  const handleGainChange = (val: number) => {
    onUpdateSettings({ gain: val });
    audioEngine.setGain(val);
  };

  const handleFFTChange = (val: number) => {
    onUpdateSettings({ fftSize: val });
    audioEngine.setFFTSize(val);
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-5">
      {/* 1. Visualizer Mode Selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs uppercase font-mono text-slate-400">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Visualization Engine Mode</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {MODES.map(mode => {
            const Icon = mode.icon;
            const isSelected = settings.mode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onUpdateSettings({ mode: mode.id })}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500/80 text-cyan-300 shadow-md ring-1 ring-cyan-500/40'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className="truncate">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Calibration & Physics Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-800/60">
        {/* Responsiveness / Smoothing */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Smoothing (Response Speed):</span>
            <span className="text-cyan-400 font-bold tabular-nums">
              {settings.smoothing < 0.3 ? 'Ultra-Fast' : settings.smoothing > 0.8 ? 'Slow Decay' : 'Balanced'} (
              {settings.smoothing.toFixed(2)})
            </span>
          </div>
          <input
            type="range"
            min={0.0}
            max={0.92}
            step={0.02}
            value={settings.smoothing}
            onChange={e => handleSmoothingChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>Instantaneous (0.0)</span>
            <span>Smooth Flow (0.9)</span>
          </div>
        </div>

        {/* Input Gain / Sensitivity Boost */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Input Sensitivity Boost:</span>
            <span className="text-cyan-400 font-bold tabular-nums">
              {settings.gain.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min={0.2}
            max={4.0}
            step={0.1}
            value={settings.gain}
            onChange={e => handleGainChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>Soft (0.2x)</span>
            <span>Boosted (4.0x)</span>
          </div>
        </div>

        {/* FFT Resolution */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">FFT Frequency Bins:</span>
            <span className="text-cyan-400 font-bold tabular-nums">
              {settings.fftSize}
            </span>
          </div>
          <select
            value={settings.fftSize}
            onChange={e => handleFFTChange(parseInt(e.target.value, 10))}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value={512}>512 Bins (High Time Precision)</option>
            <option value={1024}>1024 Bins (Balanced Speed)</option>
            <option value={2048}>2048 Bins (Fine Frequency Detail)</option>
            <option value={4096}>4096 Bins (Deep Acoustic Analysis)</option>
          </select>
          <span className="text-[10px] font-mono text-slate-500">
            Higher = finer pitch detail; Lower = faster transient snap
          </span>
        </div>

        {/* Phosphor Glow Intensity */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Phosphor Glow:</span>
            <span className="text-cyan-400 font-bold tabular-nums">
              {Math.round(settings.glowIntensity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.0}
            max={1.0}
            step={0.05}
            value={settings.glowIntensity}
            onChange={e => onUpdateSettings({ glowIntensity: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>Sharp Outline</span>
            <span>Intense Bloom</span>
          </div>
        </div>
      </div>

      {/* 3. Color Palettes & Display Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/60">
        {/* Color Palette Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-mono text-slate-400 mr-1">Color Palette:</span>
          <div className="flex items-center gap-1.5">
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => onUpdateSettings({ theme: theme.id })}
                title={theme.label}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  settings.theme === theme.id ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span className={`w-4 h-4 rounded-full ${theme.colorClass}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.logarithmic}
              onChange={e => onUpdateSettings({ logarithmic: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
            />
            <span>Logarithmic RTA Curve</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.triggerStabilization}
              onChange={e => onUpdateSettings({ triggerStabilization: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
            />
            <span>Oscilloscope Trigger Lock</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.showGrid}
              onChange={e => onUpdateSettings({ showGrid: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
            />
            <span>Grid & Axes</span>
          </label>
        </div>
      </div>
    </div>
  );
};
