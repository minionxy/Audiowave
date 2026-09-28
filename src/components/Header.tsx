import React from 'react';
import { AudioInputSource } from '../types/audio';
import { Play, Square, Mic, Music, Radio, Piano, Smartphone } from 'lucide-react';

interface HeaderProps {
  currentSource: AudioInputSource;
  onSelectSource: (source: AudioInputSource) => void;
  isRunning: boolean;
  onTogglePlay: () => void;
  isAndroidPreview: boolean;
  onToggleAndroidPreview: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSource,
  onSelectSource,
  isRunning,
  onTogglePlay,
  isAndroidPreview,
  onToggleAndroidPreview,
}) => {
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element brand wordmark */}
      <a href="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
        <span className="text-cyan-400">Aether</span>Wave
      </a>

      {/* Zone 2: 4 clean navigation/source controls (desktop & mobile) */}
      <div className="flex items-center gap-2">
        {/* Desktop nav tabs */}
        <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
          <button
            onClick={() => onSelectSource('generator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              currentSource === 'generator'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Generative Tracks</span>
          </button>

          <button
            onClick={() => onSelectSource('mic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              currentSource === 'mic'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Live Microphone</span>
          </button>

          <button
            onClick={() => onSelectSource('song')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              currentSource === 'song'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Audio Song File</span>
          </button>

          <button
            onClick={() => onSelectSource('synth')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              currentSource === 'synth'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Piano className="w-3.5 h-3.5" />
            <span>Live Synthesizer</span>
          </button>
        </nav>

        {/* Mobile source selector */}
        <select
          value={currentSource}
          onChange={e => onSelectSource(e.target.value as AudioInputSource)}
          className="md:hidden bg-slate-900 border border-slate-800 text-cyan-400 text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none"
        >
          <option value="generator">📻 Tracks</option>
          <option value="mic">🎤 Live Mic</option>
          <option value="song">🎵 Song File</option>
          <option value="synth">🎹 Synth</option>
        </select>
      </div>

      {/* Zone 3: Android Device Mode Toggle + Primary Start/Stop Audio */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Android Preview Toggle */}
        <button
          onClick={onToggleAndroidPreview}
          title="Toggle Android Device Preview mode"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
            isAndroidPreview
              ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 ring-1 ring-emerald-500/30'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">{isAndroidPreview ? 'Android Preview [ON]' : 'Android View'}</span>
          <span className="sm:hidden">Android</span>
        </button>

        {/* Start / Stop Audio Action */}
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all shadow-md whitespace-nowrap cursor-pointer min-h-[40px] ${
            isRunning
              ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-500/30'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold ring-2 ring-cyan-400/30'
          }`}
        >
          {isRunning ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
