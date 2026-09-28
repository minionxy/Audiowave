import { VisualizerSettings } from '../../types/audio';
import { getLogarithmicBins, THEME_PALETTES } from '../../services/audioUtils';

interface PeakData {
  value: number;
  holdTime: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export class BarsRenderer {
  private peaks: PeakData[] = [];
  private sparks: Spark[] = [];

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    freqData: Uint8Array,
    settings: VisualizerSettings,
    sampleRate: number = 44100
  ) {
    const theme = THEME_PALETTES[settings.theme];
    const numBars = settings.fftSize >= 2048 ? 96 : settings.fftSize >= 1024 ? 64 : 48;

    // Get either logarithmic bins (human hearing curve) or linear
    const bins = settings.logarithmic
      ? getLogarithmicBins(freqData, numBars, sampleRate, 20, 20000)
      : this.getLinearBins(freqData, numBars);

    // Initialize peaks array if size changed
    if (this.peaks.length !== numBars) {
      this.peaks = Array.from({ length: numBars }, () => ({ value: 0, holdTime: 0 }));
    }

    const paddingX = 36;
    const paddingBottom = 40;
    const paddingTop = 28;
    const availableWidth = width - paddingX * 2;
    const availableHeight = height - paddingBottom - paddingTop;
    const barWidth = Math.max(2, (availableWidth / numBars) * 0.78);
    const gap = (availableWidth - barWidth * numBars) / (numBars - 1);

    // Render Grid & Freq markers if enabled
    if (settings.showGrid) {
      this.renderFrequencyGrid(ctx, width, height, paddingX, paddingTop, paddingBottom, availableHeight);
    }

    // Prepare Bar Gradient
    const gradient = ctx.createLinearGradient(0, height - paddingBottom, 0, paddingTop);
    gradient.addColorStop(0, theme.gradient[0]);
    gradient.addColorStop(0.5, theme.gradient[1]);
    gradient.addColorStop(1, theme.gradient[2]);

    // Render Bars
    for (let i = 0; i < numBars; i++) {
      const rawVal = bins[i]; // 0 to 255
      const boostedVal = Math.min(255, rawVal * settings.gain);
      const normalizedHeight = (boostedVal / 255) * availableHeight;
      const barHeight = Math.max(2, normalizedHeight);

      const x = paddingX + i * (barWidth + gap);
      const y = height - paddingBottom - barHeight;

      // Draw Main Bar
      ctx.fillStyle = gradient;
      ctx.beginPath();
      // Round top corners
      const cornerRadius = Math.min(barWidth / 2, 4);
      ctx.roundRect(x, y, barWidth, barHeight, [cornerRadius, cornerRadius, 0, 0]);
      ctx.fill();

      // Glow pass if enabled
      if (settings.glowIntensity > 0.2 && boostedVal > 120) {
        ctx.save();
        ctx.shadowColor = theme.primary;
        ctx.shadowBlur = 10 * settings.glowIntensity;
        ctx.fillStyle = theme.accent;
        ctx.fillRect(x, y, barWidth, Math.min(4, barHeight));
        ctx.restore();
      }

      // Peak Hold & Falloff Logic
      const peak = this.peaks[i];
      if (boostedVal >= peak.value) {
        // High transient spark ejection
        if (boostedVal > 200 && boostedVal - peak.value > 45 && this.sparks.length < 120) {
          for (let s = 0; s < 2; s++) {
            this.sparks.push({
              x: x + barWidth / 2,
              y: y,
              vx: (Math.random() - 0.5) * 3,
              vy: -Math.random() * 4 - 2,
              life: 1,
              maxLife: 25 + Math.random() * 15,
              color: theme.peakColor,
            });
          }
        }
        peak.value = boostedVal;
        peak.holdTime = 18; // Hold peak for 18 frames
      } else {
        if (peak.holdTime > 0) {
          peak.holdTime--;
        } else {
          peak.value = Math.max(0, peak.value - 3.8); // Smooth gravity falloff
        }
      }

      // Draw Peak Cap Indicator
      if (peak.value > 4) {
        const peakY = height - paddingBottom - (peak.value / 255) * availableHeight;
        ctx.fillStyle = theme.peakColor;
        ctx.fillRect(x, Math.max(paddingTop, peakY - 3), barWidth, 2.5);
      }
    }

    // Render and Update Sparks
    this.renderSparks(ctx);
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

  private renderFrequencyGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    paddingX: number,
    paddingTop: number,
    paddingBottom: number,
    availableHeight: number
  ) {
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';

    // Horizontal dB lines (-60dB, -40dB, -20dB, 0dB)
    const dbLevels = [
      { db: ' 0 dB', frac: 0.0 },
      { db: '-12 dB', frac: 0.25 },
      { db: '-24 dB', frac: 0.5 },
      { db: '-48 dB', frac: 0.75 },
    ];

    dbLevels.forEach(({ db, frac }) => {
      const y = paddingTop + frac * availableHeight;
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(paddingX, y);
      ctx.lineTo(width - paddingX, y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillText(db, 6, y + 3);
    });

    // Frequency markers along bottom
    const freqMarkers = [
      { label: '60Hz', frac: 0.05 },
      { label: '250Hz', frac: 0.22 },
      { label: '1kHz', frac: 0.48 },
      { label: '4kHz', frac: 0.72 },
      { label: '16kHz', frac: 0.94 },
    ];

    const baselineY = height - paddingBottom;
    ctx.beginPath();
    ctx.moveTo(paddingX, baselineY);
    ctx.lineTo(width - paddingX, baselineY);
    ctx.stroke();

    freqMarkers.forEach(({ label, frac }) => {
      const x = paddingX + frac * (width - paddingX * 2);
      ctx.fillText(label, x - 12, height - 16);
    });

    ctx.restore();
  }

  private renderSparks(ctx: CanvasRenderingContext2D) {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.18; // gravity
      s.life++;

      const progress = s.life / s.maxLife;
      if (progress >= 1) {
        this.sparks.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
