import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VisualizerSettings, AudioMetrics } from '../types/audio';
import { audioEngine } from '../services/audioEngine';
import { THEME_PALETTES } from '../services/audioUtils';
import { BarsRenderer } from './renderers/barsRenderer';
import { OscilloscopeRenderer } from './renderers/oscilloscopeRenderer';
import { RadialRenderer } from './renderers/radialRenderer';
import { WaterfallRenderer } from './renderers/waterfallRenderer';
import { ParticlesRenderer } from './renderers/particlesRenderer';
import { VectorscopeRenderer } from './renderers/vectorscopeRenderer';
import { Camera, Maximize2, Minimize2, Pause, Play } from 'lucide-react';

interface VisualizerCanvasProps {
  settings: VisualizerSettings;
  onMetricsUpdate?: (metrics: AudioMetrics) => void;
  isRunning: boolean;
}

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({
  settings,
  onMetricsUpdate,
  isRunning,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [isFrozen, setIsFrozen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Persistent renderers
  const barsRendererRef = useRef(new BarsRenderer());
  const oscRendererRef = useRef(new OscilloscopeRenderer());
  const radialRendererRef = useRef(new RadialRenderer());
  const waterfallRendererRef = useRef(new WaterfallRenderer());
  const particlesRendererRef = useRef(new ParticlesRenderer());
  const vectorscopeRendererRef = useRef(new VectorscopeRenderer());

  // Handle Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Export Snapshot PNG
  const captureSnapshot = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `aetherwave-spectrum-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastMetricsPush = 0;

    const renderLoop = (timestamp: number) => {
      if (!isFrozen) {
        const width = canvas.width;
        const height = canvas.height;

        // Fetch live audio data
        const freqData = audioEngine.getFrequencyData();
        const triggerResult = audioEngine.getTriggeredTimeDomainData();
        const metrics = audioEngine.getMetrics();

        // Push metrics at ~20Hz to avoid React rerender spam
        if (timestamp - lastMetricsPush > 45 && onMetricsUpdate) {
          onMetricsUpdate(metrics);
          lastMetricsPush = timestamp;
        }

        // Background clear
        const theme = THEME_PALETTES[settings.theme];
        if (settings.mode !== 'waterfall') {
          // Semi-transparent clear creates smooth phosphor trails
          ctx.fillStyle = isRunning ? `${theme.background}E6` : theme.background;
          ctx.fillRect(0, 0, width, height);
        }

        if (freqData && triggerResult) {
          const sampleRate = audioEngine.getContext()?.sampleRate || 44100;

          switch (settings.mode) {
            case 'bars':
              barsRendererRef.current.render(
                ctx,
                width,
                height,
                freqData,
                settings,
                sampleRate
              );
              break;

            case 'oscilloscope':
              oscRendererRef.current.render(
                ctx,
                width,
                height,
                triggerResult.data,
                settings,
                triggerResult.triggerOffset
              );
              break;

            case 'radial':
              radialRendererRef.current.render(
                ctx,
                width,
                height,
                freqData,
                triggerResult.data,
                settings,
                metrics.bands.bass,
                metrics.isBeat
              );
              break;

            case 'waterfall':
              waterfallRendererRef.current.render(
                ctx,
                width,
                height,
                freqData,
                settings,
                sampleRate
              );
              break;

            case 'particles':
              particlesRendererRef.current.render(
                ctx,
                width,
                height,
                metrics.bands,
                settings,
                metrics.isBeat,
                metrics.beatEnergy
              );
              break;

            case 'vectorscope':
              vectorscopeRendererRef.current.render(
                ctx,
                width,
                height,
                triggerResult.data,
                settings
              );
              break;
          }
        } else {
          // Idle state idle wave
          drawIdleLine(ctx, width, height, theme.primary, timestamp);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [settings, isFrozen, isRunning, onMetricsUpdate]);

  // Handle Resize & HiDPI Retina Canvas
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const drawIdleLine = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    color: string,
    t: number
  ) => {
    const centerY = height / 2;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();

    for (let x = 0; x < width; x += 4) {
      const y = centerY + Math.sin(x * 0.015 + t * 0.002) * 6;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('CLICK "START AUDIO" TO STREAM LIVE REAL-TIME SOUND WAVE', width / 2, centerY + 36);
    ctx.restore();
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-slate-950 border border-slate-800/80 rounded-xl transition-all ${
        isFullscreen ? 'h-screen w-screen rounded-none' : 'h-[440px] md:h-[500px]'
      }`}
    >
      {/* Live Canvas */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair"
      />

      {/* Canvas Top Bar HUD */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-md border border-slate-800">
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className="font-semibold text-slate-200 uppercase tracking-wider">{settings.mode}</span>
          <span className="text-slate-600">·</span>
          <span>{settings.fftSize} BINS</span>
          <span className="text-slate-600">·</span>
          <span>{settings.smoothing.toFixed(2)} SMOOTH</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/80 backdrop-blur-md p-1 rounded-md border border-slate-800">
          <button
            onClick={() => setIsFrozen(!isFrozen)}
            title={isFrozen ? 'Resume live stream' : 'Freeze frame to inspect wave'}
            className={`p-1.5 rounded transition-colors text-xs font-mono flex items-center gap-1 ${
              isFrozen
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {isFrozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFrozen ? 'Resume' : 'Freeze'}</span>
          </button>

          <button
            onClick={captureSnapshot}
            title="Download PNG snapshot of current sound wave"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-mono"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Snap</span>
          </button>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
