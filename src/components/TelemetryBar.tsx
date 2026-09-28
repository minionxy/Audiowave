import React from 'react';
import { AudioMetrics } from '../types/audio';
import { Activity } from 'lucide-react';

interface TelemetryBarProps {
  metrics: AudioMetrics;
  isRunning: boolean;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({ metrics, isRunning }) => {
  const bandsList = [
    { key: 'subBass', label: 'Sub-Bass', range: '20-60Hz', val: metrics.bands.subBass },
    { key: 'bass', label: 'Bass', range: '60-250Hz', val: metrics.bands.bass },
    { key: 'lowMid', label: 'Low-Mid', range: '250-500Hz', val: metrics.bands.lowMid },
    { key: 'mid', label: 'Mid', range: '500-2kHz', val: metrics.bands.mid },
    { key: 'highMid', label: 'High-Mid', range: '2-4kHz', val: metrics.bands.highMid },
    { key: 'presence', label: 'Presence', range: '4-6kHz', val: metrics.bands.presence },
    { key: 'brilliance', label: 'Air', range: '6-20kHz', val: metrics.bands.brilliance },
  ];

  // Normalized dB for VU meter (map -60dB to 0dB into 0% to 100%)
  const vuPercent = Math.max(0, Math.min(100, ((metrics.decibels + 60) / 60) * 100));

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-4">
      {/* Top Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Dominant Frequency & Note */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3">
          <div className="text-xs uppercase font-mono text-slate-400">Dominant Pitch</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-cyan-400">
              {metrics.dominantFreq > 20 ? `${Math.round(metrics.dominantFreq)}` : '--'}
            </span>
            <span className="text-xs font-mono text-slate-400">Hz</span>
            <span className="ml-auto px-2 py-0.5 text-xs font-mono font-semibold bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 rounded">
              {metrics.musicalNote}
            </span>
          </div>
        </div>

        {/* RMS Level */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3">
          <div className="text-xs uppercase font-mono text-slate-400">RMS Power</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-100">
              {metrics.decibels > -89 ? metrics.decibels.toFixed(1) : '-∞'}
            </span>
            <span className="text-xs font-mono text-slate-400">dBFS</span>
          </div>
        </div>

        {/* Peak Level & VU Meter */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3">
          <div className="text-xs uppercase font-mono text-slate-400 flex items-center justify-between">
            <span>Peak Level</span>
            <span className="text-[10px] font-mono tabular-nums text-slate-500">
              {metrics.peakDecibels > -89 ? `${metrics.peakDecibels.toFixed(1)} dB` : '-∞'}
            </span>
          </div>
          <div className="mt-2.5 h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                vuPercent > 85 ? 'bg-rose-500' : vuPercent > 65 ? 'bg-amber-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${vuPercent}%` }}
            />
          </div>
        </div>

        {/* Transient Beat Pulse */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 flex flex-col justify-between">
          <div className="text-xs uppercase font-mono text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>Transient Kick</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-3.5 h-3.5 rounded-full transition-all duration-75 ${
                metrics.isBeat
                  ? 'bg-rose-500 ring-4 ring-rose-500/40 scale-110 shadow-lg shadow-rose-500/50'
                  : 'bg-slate-800 ring-1 ring-slate-700'
              }`}
            />
            <span className="text-xs font-mono text-slate-300">
              {metrics.isBeat ? 'PULSE HIT' : 'STEADY'}
            </span>
          </div>
        </div>
      </div>

      {/* Live 7-Band Spectrum Level Strips */}
      <div className="grid grid-cols-7 gap-2 pt-1 border-t border-slate-800/60">
        {bandsList.map(b => (
          <div key={b.key} className="flex flex-col gap-1.5 items-center">
            <div className="w-full h-16 bg-slate-950/80 rounded-md border border-slate-800/80 p-1 flex items-end">
              <div
                className="w-full rounded-sm bg-gradient-to-t from-cyan-500 via-blue-500 to-rose-400 transition-all duration-75"
                style={{ height: `${Math.min(100, Math.max(4, b.val * 100))}%` }}
              />
            </div>
            <span className="text-[11px] font-mono font-medium text-slate-300">{b.label}</span>
            <span className="text-[9px] font-mono text-slate-500 tabular-nums">{b.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
