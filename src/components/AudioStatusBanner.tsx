import React from 'react';
import { AudioInputSource } from '../types/audio';
import {
  AlertTriangle,
  Play,
  Radio,
  Volume2,
  Mic,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface AudioStatusBannerProps {
  isRunning: boolean;
  source: AudioInputSource;
  micError: string | null;
  isSimulatedMic?: boolean;
  onStart: () => void;
  onRetryMic: () => void;
  onStartSimulatedMic: () => void;
  onFallbackToGenerator: () => void;
}

export const AudioStatusBanner: React.FC<AudioStatusBannerProps> = ({
  isRunning,
  source,
  micError,
  isSimulatedMic = false,
  onStart,
  onRetryMic,
  onStartSimulatedMic,
  onFallbackToGenerator,
}) => {
  // If there's an active microphone error
  if (micError) {
    return (
      <div className="bg-rose-950/90 border border-rose-800 rounded-xl p-4 flex flex-col gap-3 text-xs font-mono shadow-lg animate-in fade-in duration-200">
        <div className="flex items-start gap-2.5 text-rose-200">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-rose-100">Live Microphone Alert:</span>
            <span className="text-rose-300 leading-relaxed">{micError}</span>
          </div>
        </div>

        {/* Action toolbar to immediately resolve or bypass the issue */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-900/60">
          <button
            onClick={onRetryMic}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Microphone</span>
          </button>

          <button
            onClick={onStartSimulatedMic}
            title="Simulates human speech formants and vocal harmonic spectrum directly on the visualizer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-amber-50 font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try Voice Simulator</span>
          </button>

          <button
            onClick={() => window.open(window.location.href, '_blank')}
            title="If preview iframe blocks mic permissions, open in a new browser tab"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>Open Direct Tab</span>
          </button>

          <button
            onClick={onFallbackToGenerator}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-700/80 transition-colors ml-auto cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Switch to Synth Tracks</span>
          </button>
        </div>
      </div>
    );
  }

  // If using the acoustic voice simulator
  if (source === 'mic' && isSimulatedMic && isRunning) {
    return (
      <div className="bg-amber-950/60 border border-amber-800/70 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2.5 text-amber-200">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
          <span>
            <strong>Acoustic Voice Simulator Active:</strong> Generating speech vocal formants (vowels & harmonic spectrum) for live testing.
          </span>
        </div>
        <button
          onClick={onRetryMic}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white font-medium border border-amber-500/80 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Switch to Real Mic</span>
        </button>
      </div>
    );
  }

  // If microphone is running normally
  if (source === 'mic' && isRunning) {
    return (
      <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2.5 text-emerald-300">
          <Mic className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
          <span>
            <strong>Live Microphone Active:</strong> Speak, sing, or play an instrument to watch real-time frequencies and waveforms. (Speaker feedback auto-muted).
          </span>
        </div>
      </div>
    );
  }

  // Not running state
  if (!isRunning) {
    return (
      <div className="bg-cyan-950/40 border border-cyan-800/50 rounded-xl p-3 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2.5 text-cyan-200">
          <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>
            {source === 'mic'
              ? 'Tap Start Audio to stream your live microphone into the real-time visualizer.'
              : 'Tap Start Audio to stream live real-time sound wave (activates Web Audio).'}
          </span>
        </div>
        <button
          onClick={onStart}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-sm whitespace-nowrap cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Start Now</span>
        </button>
      </div>
    );
  }

  return null;
};
