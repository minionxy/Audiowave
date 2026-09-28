import React, { useState, useEffect } from 'react';
import { audioEngine } from '../services/audioEngine';
import { RecordedSong } from '../types/audio';
import { Circle, Square, Play, Pause, Download, Trash2, Radio, Music, Disc } from 'lucide-react';

interface SongRecorderBarProps {
  onLoadSongIntoVisualizer: (song: RecordedSong) => void;
}

export const SongRecorderBar: React.FC<SongRecorderBarProps> = ({
  onLoadSongIntoVisualizer,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [songs, setSongs] = useState<RecordedSong[]>([]);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [audioPreviewEl, setAudioPreviewEl] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Subscribe to audioEngine recording updates
    const unsubscribe = audioEngine.subscribeRecording((rec, elapsed) => {
      setIsRecording(rec);
      setElapsedSec(elapsed);
      setSongs(audioEngine.getRecordedSongs());
    });

    return () => {
      unsubscribe();
      if (audioPreviewEl) {
        audioPreviewEl.pause();
      }
    };
  }, [audioPreviewEl]);

  const handleStartRecord = async () => {
    await audioEngine.startRecording();
  };

  const handleStopRecord = async () => {
    const newSong = await audioEngine.stopRecording();
    if (newSong) {
      setSongs(audioEngine.getRecordedSongs());
    }
  };

  const handleTogglePreviewPlay = (song: RecordedSong) => {
    if (playingSongId === song.id && audioPreviewEl) {
      audioPreviewEl.pause();
      setPlayingSongId(null);
      return;
    }

    if (audioPreviewEl) {
      audioPreviewEl.pause();
    }

    const audio = new Audio(song.blobUrl);
    audio.onended = () => setPlayingSongId(null);
    audio.play().then(() => {
      setAudioPreviewEl(audio);
      setPlayingSongId(song.id);
    }).catch(console.error);
  };

  const handleDeleteSong = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingSongId === id && audioPreviewEl) {
      audioPreviewEl.pause();
      setPlayingSongId(null);
    }
    audioEngine.deleteRecordedSong(id);
    setSongs(audioEngine.getRecordedSongs());
  };

  const handleDownloadSong = (song: RecordedSong, e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = song.blobUrl;
    a.download = `${song.title.replace(/[^a-zA-Z0-9-_]/g, '_')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      {/* Recording Trigger Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <Disc className={`w-4 h-4 ${isRecording ? 'text-rose-500 animate-spin' : 'text-slate-400'}`} />
            <span className="font-semibold uppercase tracking-wider">Song Master Recorder</span>
          </div>

          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1 bg-rose-950/80 border border-rose-800/80 rounded-lg text-rose-300 font-mono text-xs animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="font-bold">RECORDING SONG: {formatTimer(elapsedSec)}</span>
            </div>
          )}
        </div>

        {/* Master Action Button */}
        <div className="flex items-center gap-2">
          {!isRecording ? (
            <button
              onClick={handleStartRecord}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-rose-950 cursor-pointer min-h-[40px]"
            >
              <Circle className="w-3.5 h-3.5 fill-current text-white" />
              <span>Record Song Take</span>
            </button>
          ) : (
            <button
              onClick={handleStopRecord}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer min-h-[40px]"
            >
              <Square className="w-3.5 h-3.5 fill-current text-slate-950" />
              <span>Stop & Save Song ({formatTimer(elapsedSec)})</span>
            </button>
          )}
        </div>
      </div>

      {/* Recorded Song Takes List */}
      {songs.length > 0 && (
        <div className="mt-2 flex flex-col gap-2 border-t border-slate-800/70 pt-3">
          <div className="text-xs font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Your Recorded Songs ({songs.length})</span>
            <span className="text-[10px] text-slate-500">Tap to load into live sound wave visualizer</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {songs.map(song => {
              const isPreviewing = playingSongId === song.id;
              return (
                <div
                  key={song.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 flex flex-col gap-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => handleTogglePreviewPlay(song)}
                        title={isPreviewing ? 'Pause preview' : 'Play preview'}
                        className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-400 shrink-0 cursor-pointer"
                      >
                        {isPreviewing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-mono font-medium text-slate-200 truncate" title={song.title}>
                          {song.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatTimer(song.durationSec)} · {formatSize(song.sizeBytes)} · {song.createdAt}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={e => handleDownloadSong(song, e)}
                        title="Download audio file"
                        className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => handleDeleteSong(song.id, e)}
                        title="Delete recording"
                        className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Load into Live Visualizer Button */}
                  <button
                    onClick={() => onLoadSongIntoVisualizer(song)}
                    className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/60 text-cyan-300 font-mono text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    <Music className="w-3 h-3" />
                    <span>Watch Live Spectrum Waveform</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
