import { useState, useCallback } from 'react';
import {
  AudioInputSource,
  AudioMetrics,
  VisualizerSettings,
  RecordedSong,
} from './types/audio';
import { audioEngine } from './services/audioEngine';
import { Header } from './components/Header';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { VisualizerCanvas } from './visualizers/VisualizerCanvas';
import { TelemetryBar } from './components/TelemetryBar';
import { ControlPanel } from './components/ControlPanel';
import { AudioStatusBanner } from './components/AudioStatusBanner';
import { AndroidDeviceFrame } from './components/AndroidDeviceFrame';
import { SynthKeyboard } from './components/SynthKeyboard';
import { SongRecorderBar } from './components/SongRecorderBar';

export function App() {
  const [source, setSource] = useState<AudioInputSource>('generator');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isSimulatedMic, setIsSimulatedMic] = useState<boolean>(false);
  const [isAndroidPreview, setIsAndroidPreview] = useState<boolean>(false);

  const [metrics, setMetrics] = useState<AudioMetrics>({
    rms: 0,
    decibels: -90,
    peakDecibels: -90,
    dominantFreq: 0,
    musicalNote: '--',
    isBeat: false,
    beatEnergy: 0,
    bands: {
      subBass: 0,
      bass: 0,
      lowMid: 0,
      mid: 0,
      highMid: 0,
      presence: 0,
      brilliance: 0,
    },
  });

  const [settings, setSettings] = useState<VisualizerSettings>({
    mode: 'bars',
    theme: 'cyan',
    fftSize: 2048,
    smoothing: 0.65,
    gain: 1.2,
    logarithmic: true,
    glowIntensity: 0.6,
    triggerStabilization: true,
    showGrid: true,
    fillOpacity: 0.8,
    particlesCount: 320,
  });

  // Toggle Live Audio
  const handleTogglePlay = useCallback(async () => {
    if (isRunning) {
      audioEngine.stop();
      setIsRunning(false);
      setIsSimulatedMic(false);
      setMicError(null);
    } else {
      try {
        setMicError(null);
        await audioEngine.start();
        setIsRunning(true);
        setIsSimulatedMic(audioEngine.getIsSimulatedMic());
      } catch (err: unknown) {
        console.error('Failed to start audio:', err);
        setIsRunning(false);
        const errorMsg = err instanceof Error ? err.message : 'Audio initialization error';
        if (source === 'mic') {
          setMicError(errorMsg);
        }
      }
    }
  }, [isRunning, source]);

  // Ensure audio is running when triggered from synth or song
  const handleEnsureStarted = useCallback(async () => {
    if (!isRunning) {
      try {
        setMicError(null);
        await audioEngine.start();
        setIsRunning(true);
        setIsSimulatedMic(audioEngine.getIsSimulatedMic());
      } catch (err: unknown) {
        console.error('Failed to start audio:', err);
      }
    }
  }, [isRunning]);

  // Handle source switch
  const handleSelectSource = useCallback(async (newSource: AudioInputSource) => {
    setSource(newSource);
    setMicError(null);
    setIsSimulatedMic(false);

    if (isRunning) {
      try {
        await audioEngine.setSource(newSource);
        setIsSimulatedMic(audioEngine.getIsSimulatedMic());
      } catch (err: unknown) {
        console.error('Error switching source:', err);
        if (newSource === 'mic') {
          const errorMsg = err instanceof Error ? err.message : 'Microphone access failed';
          setMicError(errorMsg);
        }
      }
    } else {
      try {
        await audioEngine.setSource(newSource);
      } catch (err) {
        console.error('Error preparing source:', err);
      }
    }
  }, [isRunning]);

  // Retry microphone request with fresh user click gesture
  const handleRetryMic = useCallback(async () => {
    setMicError(null);
    setSource('mic');
    setIsSimulatedMic(false);

    try {
      await audioEngine.initAudioContext();
      await audioEngine.startMicrophone();
      if (!isRunning) {
        setIsRunning(true);
      }
    } catch (err: unknown) {
      console.error('Retry mic error:', err);
      const msg = err instanceof Error ? err.message : 'Microphone permission request failed.';
      setMicError(msg);
    }
  }, [isRunning]);

  // Start acoustic voice simulator
  const handleStartSimulatedMic = useCallback(async () => {
    setMicError(null);
    setSource('mic');
    setIsSimulatedMic(true);

    try {
      await audioEngine.initAudioContext();
      audioEngine.startSimulatedMic();
      if (!isRunning) {
        setIsRunning(true);
      }
    } catch (err: unknown) {
      console.error('Simulated mic error:', err);
    }
  }, [isRunning]);

  const handleFallbackToGenerator = useCallback(async () => {
    setMicError(null);
    setIsSimulatedMic(false);
    setSource('generator');
    try {
      await audioEngine.setSource('generator');
      if (!isRunning) {
        await audioEngine.start();
        setIsRunning(true);
      }
    } catch (err) {
      console.error('Error falling back to generator:', err);
    }
  }, [isRunning]);

  const handleUpdateSettings = useCallback((newPartial: Partial<VisualizerSettings>) => {
    setSettings(prev => ({ ...prev, ...newPartial }));
  }, []);

  const handleMetricsUpdate = useCallback((newMetrics: AudioMetrics) => {
    setMetrics(newMetrics);
  }, []);

  const handleLoadRecordedSong = useCallback(async (song: RecordedSong) => {
    setSource('song');
    setIsSimulatedMic(false);
    await audioEngine.loadRecordedSong(song);
    setIsRunning(true);
  }, []);

  // App studio content (used both in full-screen and inside Android preview frame)
  const appContent = (
    <div className="w-full flex flex-col gap-5 p-3 sm:p-6 max-w-7xl mx-auto">
      {/* Audio Status, Microphone Recovery & Android Unlock Banner */}
      <AudioStatusBanner
        isRunning={isRunning}
        source={source}
        micError={micError}
        isSimulatedMic={isSimulatedMic}
        onStart={handleTogglePlay}
        onRetryMic={handleRetryMic}
        onStartSimulatedMic={handleStartSimulatedMic}
        onFallbackToGenerator={handleFallbackToGenerator}
      />

      {/* Source Transport & Audio Player Bar */}
      <AudioPlayerBar
        source={source}
        isRunning={isRunning}
        onTogglePlay={handleTogglePlay}
        onSourceChange={handleSelectSource}
      />

      {/* Live Visualizer Stage (Canvas) */}
      <VisualizerCanvas
        settings={settings}
        onMetricsUpdate={handleMetricsUpdate}
        isRunning={isRunning}
      />

      {/* Master Song Recording Bar */}
      <SongRecorderBar
        onLoadSongIntoVisualizer={handleLoadRecordedSong}
      />

      {/* Interactive Synthesizer Keyboard (Shown if Synth source is active) */}
      {source === 'synth' && (
        <SynthKeyboard
          isRunning={isRunning}
          onEnsureStarted={handleEnsureStarted}
        />
      )}

      {/* Real-Time Acoustic Telemetry & Frequency Spectrum */}
      <TelemetryBar
        metrics={metrics}
        isRunning={isRunning}
      />

      {/* Visualizer Calibration Console */}
      <ControlPanel
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Top Navigation Bar */}
      <Header
        currentSource={source}
        onSelectSource={handleSelectSource}
        isRunning={isRunning}
        onTogglePlay={handleTogglePlay}
        isAndroidPreview={isAndroidPreview}
        onToggleAndroidPreview={() => setIsAndroidPreview(prev => !prev)}
      />

      {/* Main Studio Viewport - Either standard or inside Android Device Mockup */}
      {isAndroidPreview ? (
        <AndroidDeviceFrame onExitPreview={() => setIsAndroidPreview(false)}>
          {appContent}
        </AndroidDeviceFrame>
      ) : (
        <main className="flex-1 w-full">
          {appContent}
        </main>
      )}

      {/* Clean Unboxed Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">AetherWave Audio Engine</span>
          <span>·</span>
          <span>Ultra-Responsive Live Spectrum</span>
          <span>·</span>
          <span>Acoustic Mic Isolation</span>
        </div>
        <div>
          Real-Time FFT 60FPS · AudioContext 44.1kHz / 48kHz
        </div>
      </footer>
    </div>
  );
}

export default App;
