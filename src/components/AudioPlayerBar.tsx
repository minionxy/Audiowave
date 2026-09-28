import React, { useRef, useState, useEffect } from 'react';
import { AudioInputSource } from '../types/audio';
import { GENERATIVE_TRACKS } from '../services/generativeAudio';
import { audioEngine } from '../services/audioEngine';
import { Volume2, VolumeX, Upload, RefreshCw, AlertCircle, Headphones, Play, Pause } from 'lucide-react';

interface AudioPlayerBarProps {
  source: AudioInputSource;
  isRunning: boolean;
  onTogglePlay: () => void;
  onSourceChange: (source: AudioInputSource) => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  source,
  isRunning,
  onTogglePlay,
  onSourceChange,
}) => {
  const [selectedTrack, setSelectedTrack] = useState<string>('synthwave');
  const [volume, setVolume] = useState<number>(0.85);
  const [micMonitor, setMicMonitor] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [songDuration, setSongDuration] = useState<number>(0);
  const [songCurrentTime, setSongCurrentTime] = useState<number>(0);
  const [songIsPlaying, setSongIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync volume with audioEngine
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioEngine.setMasterVolume(newVol);
  };

  // Switch generative track
  const handleTrackChange = (trackId: string) => {
    setSelectedTrack(trackId);
    audioEngine.setGenerativeTrack(trackId);
  };

  // Toggle Mic Monitor
  const handleToggleMicMonitor = () => {
    const next = !micMonitor;
    setMicMonitor(next);
    audioEngine.setMicMonitor(next);
  };

  // Upload custom song/audio file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      const name = await audioEngine.loadSongFile(file);
      setUploadedFileName(name);
      onSourceChange('song');
      if (!isRunning) {
        onTogglePlay();
      }
    } catch (err) {
      console.error('Error loading audio file:', err);
    }
  };

  // Handle song progress tracking
  useEffect(() => {
    const audioEl = audioEngine.getAudioElement();
    if (!audioEl) return;

    const handleTimeUpdate = () => {
      setSongCurrentTime(audioEl.currentTime);
      setSongDuration(audioEl.duration || 0);
      setSongIsPlaying(!audioEl.paused);
    };

    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    audioEl.addEventListener('loadedmetadata', handleTimeUpdate);
    audioEl.addEventListener('play', () => setSongIsPlaying(true));
    audioEl.addEventListener('pause', () => setSongIsPlaying(false));

    return () => {
      audioEl.removeEventListener('timeupdate', handleTimeUpdate);
      audioEl.removeEventListener('loadedmetadata', handleTimeUpdate);
    };
  }, [uploadedFileName]);

  const handleSeek = (newTime: number) => {
    const audioEl = audioEngine.getAudioElement();
    if (audioEl) {
      audioEl.currentTime = newTime;
      setSongCurrentTime(newTime);
    }
  };

  const handleToggleSongPlay = () => {
    const audioEl = audioEngine.getAudioElement();
    if (!audioEl) return;
    if (audioEl.paused) {
      audioEl.play().then(() => setSongIsPlaying(true)).catch(console.error);
      if (!isRunning) onTogglePlay();
    } else {
      audioEl.pause();
      setSongIsPlaying(false);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      {/* Source-specific controls */}
      <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {source === 'generator' && (
          <div className="flex flex-wrap items-center gap-3 w-full">
            <label className="text-xs uppercase font-mono text-slate-400 shrink-0">
              Built-in Track:
            </label>
            <select
              value={selectedTrack}
              onChange={e => handleTrackChange(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono rounded-lg px-3 py-2 outline-none focus:border-cyan-500 cursor-pointer"
            >
              {GENERATIVE_TRACKS.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.genre} · {t.bpm} BPM)
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400 hidden lg:inline">
              {GENERATIVE_TRACKS.find(t => t.id === selectedTrack)?.description}
            </span>
          </div>
        )}

        {source === 'mic' && (
          <div className="flex flex-wrap items-center gap-4 w-full">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
              <span>{isRunning ? 'MICROPHONE ACTIVE (LIVE INPUT)' : 'MICROPHONE READY'}</span>
            </div>

            <button
              onClick={handleToggleMicMonitor}
              title="Only enable with headphones to prevent acoustic feedback loop!"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                micMonitor
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>{micMonitor ? 'Headphone Monitor [ON]' : 'Monitor [OFF]'}</span>
            </button>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Mic input visualizer works directly without echo feedback.
            </span>
          </div>
        )}

        {source === 'song' && (
          <div className="flex flex-col w-full gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleSongPlay}
                  className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors"
                >
                  {songIsPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-slate-200 truncate max-w-[220px] sm:max-w-xs">
                    {uploadedFileName || 'No audio file loaded'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                    {formatTime(songCurrentTime)} / {formatTime(songDuration)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose MP3 / Audio</span>
                </button>
              </div>
            </div>

            {/* Seek Bar */}
            {songDuration > 0 && (
              <input
                type="range"
                min={0}
                max={songDuration || 100}
                step={0.1}
                value={songCurrentTime}
                onChange={e => handleSeek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            )}
          </div>
        )}

        {source === 'synth' && (
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>INTERACTIVE SYNTHESIZER: Play keys on screen or with computer keyboard!</span>
          </div>
        )}
      </div>

      {/* Master Output Volume */}
      <div className="flex items-center gap-2.5 shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4">
        <button
          onClick={() => handleVolumeChange(volume === 0 ? 0.8 : 0)}
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={volume}
          onChange={e => handleVolumeChange(parseFloat(e.target.value))}
          className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
        <span className="text-xs font-mono text-slate-400 w-8 tabular-nums">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};
