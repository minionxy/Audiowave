import { VisualizerSettings } from '../../types/audio';
import { getLogarithmicBins } from '../../services/audioUtils';

export class WaterfallRenderer {
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    freqData: Uint8Array,
    settings: VisualizerSettings,
    sampleRate: number = 44100
  ) {
    // Ensure offscreen buffer exists and matches dimensions
    if (
      !this.offscreenCanvas ||
      this.offscreenCanvas.width !== width ||
      this.offscreenCanvas.height !== height
    ) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
      if (this.offscreenCtx) {
        this.offscreenCtx.fillStyle = '#030712';
        this.offscreenCtx.fillRect(0, 0, width, height);
      }
    }

    if (!this.offscreenCtx || !this.offscreenCanvas) return;

    const numBins = Math.min(width, 256);
    const bins = settings.logarithmic
      ? getLogarithmicBins(freqData, numBins, sampleRate, 20, 20000)
      : this.getLinearBins(freqData, numBins);

    // Scroll offscreen canvas down by 2 pixels
    const scrollSpeed = 2;
    this.offscreenCtx.drawImage(
      this.offscreenCanvas,
      0, 0, width, height - scrollSpeed,
      0, scrollSpeed, width, height - scrollSpeed
    );

    // Draw newly arrived frequency slice at top (y = 0 to scrollSpeed)
    const binWidth = width / numBins;
    for (let i = 0; i < numBins; i++) {
      const val = Math.min(255, bins[i] * settings.gain);
      this.offscreenCtx.fillStyle = this.getHeatmapColor(val, settings.theme);
      this.offscreenCtx.fillRect(i * binWidth, 0, binWidth + 0.5, scrollSpeed);
    }

    // Blit offscreen buffer onto main canvas
    ctx.drawImage(this.offscreenCanvas, 0, 0);

    // Overlay frequency labels & timeline
    if (settings.showGrid) {
      ctx.save();
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText('LIVE 0s', width - 56, 16);
      ctx.fillText('-5s', width - 40, height * 0.33);
      ctx.fillText('-10s', width - 44, height * 0.66);
      ctx.fillText('-15s', width - 44, height - 10);

      // Bottom frequency line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('20Hz', 12, height - 8);
      ctx.fillText('1kHz', width * 0.45, height - 8);
      ctx.fillText('20kHz', width - 44, height - 8);
      ctx.restore();
    }
  }

  private getLinearBins(freqData: Uint8Array, numBars: number): Float32Array {
    const bins = new Float32Array(numBars);
    const step = Math.floor(freqData.length / numBars);
    for (let i = 0; i < numBars; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += freqData[i * step + j];
      }
      bins[i] = sum / step;
    }
    return bins;
  }

  private getHeatmapColor(val: number, theme: string): string {
    const norm = Math.max(0, Math.min(1, val / 255));

    if (theme === 'cyan') {
      if (norm < 0.2) return `rgb(${Math.floor(norm * 15)}, ${Math.floor(norm * 30)}, ${Math.floor(norm * 80)})`;
      if (norm < 0.5) return `rgb(${Math.floor(norm * 40)}, ${Math.floor(norm * 180)}, ${Math.floor(norm * 255)})`;
      if (norm < 0.8) return `rgb(${Math.floor(norm * 100)}, ${Math.floor(norm * 255)}, ${Math.floor(norm * 255)})`;
      return `rgb(255, 255, 255)`;
    } else if (theme === 'sunset') {
      if (norm < 0.25) return `rgb(${Math.floor(norm * 120)}, 5, 20)`;
      if (norm < 0.55) return `rgb(${Math.floor(norm * 255)}, ${Math.floor(norm * 80)}, 30)`;
      if (norm < 0.85) return `rgb(${Math.floor(norm * 255)}, ${Math.floor(norm * 200)}, 40)`;
      return `rgb(255, 255, 240)`;
    } else if (theme === 'emerald') {
      if (norm < 0.3) return `rgb(2, ${Math.floor(norm * 90)}, ${Math.floor(norm * 40)})`;
      if (norm < 0.7) return `rgb(${Math.floor(norm * 40)}, ${Math.floor(norm * 220)}, ${Math.floor(norm * 140)})`;
      return `rgb(${Math.floor(norm * 180)}, 255, ${Math.floor(norm * 220)})`;
    } else if (theme === 'amber') {
      if (norm < 0.3) return `rgb(${Math.floor(norm * 80)}, ${Math.floor(norm * 40)}, 4)`;
      if (norm < 0.7) return `rgb(${Math.floor(norm * 240)}, ${Math.floor(norm * 150)}, 10)`;
      return `rgb(255, ${Math.floor(norm * 240)}, 160)`;
    } else {
      // Monochrome / Default
      const c = Math.floor(norm * 255);
      return `rgb(${c}, ${c}, ${c})`;
    }
  }
}
