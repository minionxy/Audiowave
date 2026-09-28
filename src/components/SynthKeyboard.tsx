import React, { useEffect, useState, useCallback, useRef } from 'react';
import { audioEngine, SYNTH_PRESETS } from '../services/audioEngine';
import { SynthPresetId, ChordMode } from '../types/audio';
import {
  Sliders,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Circle,
  Square,
  Music,
  Radio,
  Volume2,
  Layers,
  Repeat,
} from 'lucide-react';

interface SynthKeyboardProps {
  isRunning: boolean;
  onEnsureStarted: () => void;
}

interface KeyDef {
  note: string;
  midi: number;
  isBlack: boolean;
  octave: number;
  keyChar?: string;
}

// Full multi-octave notes generator from C1 (24) to B6 (95)
const generateKeys = (): KeyDef[] => {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const keys: KeyDef[] = [];

  for (let octave = 1; octave <= 6; octave++) {
    for (let i = 0; i < 12; i++) {
      const midi = (octave + 1) * 12 + i; // C1 is midi 24
      const name = noteNames[i];
      const isBlack = name.includes('#');
      keys.push({
        note: `${name}${octave}`,
        midi,
        isBlack,
        octave,
      });
    }
  }
  // Add final high C7 (96)
  keys.push({ note: 'C7', midi: 96, isBlack: false, octave: 7 });
  return keys;
};

const ALL_KEYS = generateKeys();

// Computer keyboard mapping to standard 2-octave range
const QWERTY_MAP: Record<string, number> = {
  // Lower octave (C3 to B3)
  z: 48, // C3
  s: 49, // C#3
  x: 50, // D3
  d: 51, // D#3
  c: 52, // E3
  v: 53, // F3
  g: 54, // F#3
  b: 55, // G3
  h: 56, // G#3
  n: 57, // A3
  j: 58, // A#3
  m: 59, // B3
  ',': 60, // C4
  l: 61, // C#4
  '.': 62, // D4

  // Upper octave (C4 to C5)
  q: 60, // C4
  '2': 61, // C#4
  w: 62, // D4
  '3': 63, // D#4
  e: 64, // E4
  r: 65, // F4
  '5': 66, // F#4
  t: 67, // G4
  '6': 68, // G#4
  y: 69, // A4
  '7': 70, // A#4
  u: 71, // B4
  i: 72, // C5
  '9': 73, // C#5
  o: 74, // D5
  '0': 75, // D#5
  p: 76, // E5
  '[': 77, // F5
};

export const SynthKeyboard: React.FC<SynthKeyboardProps> = ({
  isRunning,
  onEnsureStarted,
}) => {
  const [activeMidiKeys, setActiveMidiKeys] = useState<Set<number>>(new Set());
  const [baseOctave, setBaseOctave] = useState<number>(3); // 1 to 5
  const [octaveSpan, setOctaveSpan] = useState<number>(3); // 2, 3, or 4 octaves visible
  const [synthSettings, setSynthSettings] = useState(audioEngine.getSynthSettings());
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSec, setRecordSec] = useState<number>(0);
  const [showSoundDesigner, setShowSoundDesigner] = useState<boolean>(false);
  const [backingTrackOn, setBackingTrackOn] = useState<boolean>(false);

  const keyboardScrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to recording state
  useEffect(() => {
    return audioEngine.subscribeRecording((rec, elapsed) => {
      setIsRecording(rec);
      setRecordSec(elapsed);
    });
  }, []);

  // Filter keys according to baseOctave and octaveSpan
  const minMidi = (baseOctave + 1) * 12; // e.g. baseOctave 3 => C3 (48)
  const maxMidi = minMidi + octaveSpan * 12;
  const visibleKeys = ALL_KEYS.filter(k => k.midi >= minMidi && k.midi <= maxMidi);

  // Note triggers
  const handleKeyDown = useCallback(
    (midi: number) => {
      if (!isRunning) {
        onEnsureStarted();
      }
      audioEngine.triggerSynthNote(midi);
      setActiveMidiKeys(prev => new Set(prev).add(midi));
    },
    [isRunning, onEnsureStarted]
  );

  const handleKeyUp = useCallback((midi: number) => {
    audioEngine.releaseSynthNote(midi);
    setActiveMidiKeys(prev => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
  }, []);

  // Keyboard events
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const keyLower = e.key.toLowerCase();
      const mapped = QWERTY_MAP[keyLower];
      if (mapped !== undefined) {
        // Shift note based on current baseOctave relative to default C3 (octave 3)
        const shiftedMidi = mapped + (baseOctave - 3) * 12;
        handleKeyDown(shiftedMidi);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const keyLower = e.key.toLowerCase();
      const mapped = QWERTY_MAP[keyLower];
      if (mapped !== undefined) {
        const shiftedMidi = mapped + (baseOctave - 3) * 12;
        handleKeyUp(shiftedMidi);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [baseOctave, handleKeyDown, handleKeyUp]);

  // Preset switch
  const handlePresetSelect = (presetId: SynthPresetId) => {
    audioEngine.setSynthSettings({ preset: presetId });
    setSynthSettings(audioEngine.getSynthSettings());
  };

  const handleChordModeChange = (mode: ChordMode) => {
    audioEngine.setSynthSettings({ chordMode: mode });
    setSynthSettings(prev => ({ ...prev, chordMode: mode }));
  };

  const handleArpChange = (arp: 'off' | 'up' | 'down' | 'updown' | 'random') => {
    audioEngine.setSynthSettings({ arpeggiator: arp });
    setSynthSettings(prev => ({ ...prev, arpeggiator: arp }));
  };

  const handleToggleRecord = async () => {
    if (!isRecording) {
      if (!isRunning) {
        await onEnsureStarted();
      }
      await audioEngine.startRecording();
    } else {
      await audioEngine.stopRecording();
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-xl">
      {/* 1. Header Toolbar: Presets & Direct Song Record Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        {/* Left: Title & Preset Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Live Synthesizer Studio
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              {SYNTH_PRESETS[synthSettings.preset].name} · {visibleKeys.length} Active Notes
            </span>
          </div>
        </div>

        {/* Center/Right: Song Recording Trigger */}
        <div className="flex items-center gap-2">
          {!isRecording ? (
            <button
              onClick={handleToggleRecord}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              <Circle className="w-3.5 h-3.5 fill-current text-white" />
              <span>Record Song Take</span>
            </button>
          ) : (
            <button
              onClick={handleToggleRecord}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current text-slate-950" />
              <span>Stop & Save ({formatTimer(recordSec)})</span>
            </button>
          )}

          <button
            onClick={() => setShowSoundDesigner(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
              showSoundDesigner
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sound Controls</span>
          </button>
        </div>
      </div>

      {/* 2. Sound Presets / Tunes Grid (8 Distinct Timbres) */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
          <span>Synth Tune / Timbre Preset</span>
          <span className="text-slate-500">{SYNTH_PRESETS[synthSettings.preset].desc}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
          {(Object.keys(SYNTH_PRESETS) as SynthPresetId[]).map(id => {
            const preset = SYNTH_PRESETS[id];
            const isSelected = synthSettings.preset === id;
            return (
              <button
                key={id}
                onClick={() => handlePresetSelect(id)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500 text-cyan-300 shadow-md ring-1 ring-cyan-500/50'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="font-semibold truncate w-full text-center">{preset.name.split(' ')[0]}</span>
                <span className="text-[9px] text-slate-500 truncate w-full text-center">{preset.name.split(' ').slice(1).join(' ')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Optional Sound Designer Drawer (Envelope, Filter, Chord Mode, Arp) */}
      {showSoundDesigner && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          {/* Chord Mode */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Chord Voicing:</span>
            </div>
            <select
              value={synthSettings.chordMode}
              onChange={e => handleChordModeChange(e.target.value as ChordMode)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="single">Single Note (Solo)</option>
              <option value="major">Major Triad (1 - 3 - 5)</option>
              <option value="minor">Minor Triad (1 - b3 - 5)</option>
              <option value="sus4">Suspended 4th (1 - 4 - 5)</option>
              <option value="octave">Octave Stack (-12 / 0 / +12)</option>
            </select>
          </div>

          {/* Arpeggiator */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Repeat className="w-3.5 h-3.5 text-cyan-400" />
              <span>Arpeggiator Pattern:</span>
            </div>
            <select
              value={synthSettings.arpeggiator}
              onChange={e => handleArpChange(e.target.value as 'off' | 'up' | 'down' | 'updown' | 'random')}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="off">Off (Polyphonic Manual)</option>
              <option value="up">Up (Ascending)</option>
              <option value="down">Down (Descending)</option>
              <option value="updown">Up / Down Cycle</option>
              <option value="random">Random Arp</option>
            </select>
          </div>

          {/* Filter Cutoff */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Filter Cutoff:</span>
              <span className="text-cyan-400 font-bold tabular-nums">{Math.round(synthSettings.cutoff)} Hz</span>
            </div>
            <input
              type="range"
              min={100}
              max={12000}
              step={100}
              value={synthSettings.cutoff}
              onChange={e => {
                const val = parseFloat(e.target.value);
                audioEngine.setSynthSettings({ cutoff: val });
                setSynthSettings(prev => ({ ...prev, cutoff: val }));
              }}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Resonance Q */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Resonance Q:</span>
              <span className="text-cyan-400 font-bold tabular-nums">{synthSettings.resonance.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={15.0}
              step={0.5}
              value={synthSettings.resonance}
              onChange={e => {
                const val = parseFloat(e.target.value);
                audioEngine.setSynthSettings({ resonance: val });
                setSynthSettings(prev => ({ ...prev, resonance: val }));
              }}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>
      )}

      {/* 4. Octave Jumpers & Range Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border border-slate-800/80 rounded-lg px-3 py-2">
        {/* Left: Quick Octave Jumper */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-slate-400 mr-1">Base Octave:</span>
          {[1, 2, 3, 4, 5].map(oct => (
            <button
              key={oct}
              onClick={() => setBaseOctave(oct)}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors cursor-pointer ${
                baseOctave === oct
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              C{oct}
            </button>
          ))}
        </div>

        {/* Center: Octave Span selector */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
          <span>Range:</span>
          {[2, 3, 4].map(span => (
            <button
              key={span}
              onClick={() => setOctaveSpan(span)}
              className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                octaveSpan === span
                  ? 'bg-slate-800 text-cyan-400 border border-cyan-700'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {span} Octaves ({span * 12} Keys)
            </button>
          ))}
        </div>

        {/* Right: Step Shift Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setBaseOctave(prev => Math.max(1, prev - 1))}
            disabled={baseOctave <= 1}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-mono border border-slate-800 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Octave Down</span>
          </button>
          <button
            onClick={() => setBaseOctave(prev => Math.min(5, prev + 1))}
            disabled={baseOctave >= 5}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-mono border border-slate-800 transition-colors cursor-pointer"
          >
            <span>Octave Up</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5. Master Multi-Octave Piano Keyboard */}
      <div
        ref={keyboardScrollRef}
        className="relative flex h-44 select-none overflow-x-auto overflow-y-hidden pb-2 scrollbar-thin scrollbar-thumb-slate-700 touch-pan-x"
      >
        {visibleKeys
          .filter(k => !k.isBlack)
          .map(whiteKey => {
            const isWhiteActive = activeMidiKeys.has(whiteKey.midi);
            // Look for matching sharp key right above this white key
            const blackKey = visibleKeys.find(k => k.isBlack && k.midi === whiteKey.midi + 1);
            const isBlackActive = blackKey ? activeMidiKeys.has(blackKey.midi) : false;

            return (
              <div
                key={whiteKey.midi}
                className="relative flex-1 min-w-[34px] sm:min-w-[42px] max-w-[56px] h-full shrink-0"
              >
                {/* White Key */}
                <button
                  onMouseDown={() => handleKeyDown(whiteKey.midi)}
                  onMouseUp={() => handleKeyUp(whiteKey.midi)}
                  onMouseLeave={() => activeMidiKeys.has(whiteKey.midi) && handleKeyUp(whiteKey.midi)}
                  onTouchStart={e => {
                    e.preventDefault();
                    handleKeyDown(whiteKey.midi);
                  }}
                  onTouchEnd={e => {
                    e.preventDefault();
                    handleKeyUp(whiteKey.midi);
                  }}
                  className={`w-full h-full rounded-b-lg border-x border-b border-slate-700/80 flex flex-col justify-end items-center pb-2.5 transition-colors cursor-pointer select-none ${
                    isWhiteActive
                      ? 'bg-cyan-400 text-slate-950 shadow-inner'
                      : 'bg-gradient-to-b from-slate-200 to-slate-100 hover:from-white hover:to-slate-200 text-slate-800'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold leading-tight">{whiteKey.note}</span>
                </button>

                {/* Black Key (Sharp/Flat) */}
                {blackKey && (
                  <button
                    onMouseDown={e => {
                      e.stopPropagation();
                      handleKeyDown(blackKey.midi);
                    }}
                    onMouseUp={e => {
                      e.stopPropagation();
                      handleKeyUp(blackKey.midi);
                    }}
                    onMouseLeave={e => {
                      e.stopPropagation();
                      activeMidiKeys.has(blackKey.midi) && handleKeyUp(blackKey.midi);
                    }}
                    onTouchStart={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleKeyDown(blackKey.midi);
                    }}
                    onTouchEnd={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleKeyUp(blackKey.midi);
                    }}
                    className={`absolute top-0 -right-3 sm:-right-3.5 z-20 w-6 sm:w-7 h-26 rounded-b-md border border-slate-900 flex flex-col justify-end items-center pb-1.5 transition-colors cursor-pointer select-none shadow-md ${
                      isBlackActive
                        ? 'bg-cyan-500 text-white shadow-cyan-500/50'
                        : 'bg-gradient-to-b from-slate-900 to-slate-950 hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="text-[8px] font-mono leading-none">{blackKey.note.replace('#', '♯')}</span>
                  </button>
                )}
              </div>
            );
          })}
      </div>

      {/* 6. Keyboard Control Helper Footnote */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
        <span>
          💡 Play with touch or QWERTY keys: <strong>Z, X, C, V...</strong> (lower) / <strong>Q, W, E, R...</strong> (upper)
        </span>
        <span>
          Sound wave spectrum visualizer updates in real-time with zero delay
        </span>
      </div>
    </div>
  );
};
