import { VisualizerSettings } from '../../types/audio';
import { THEME_PALETTES } from '../../services/audioUtils';

export class VectorscopeRenderer {
  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timeData: Uint8Array,
    settings: VisualizerSettings
  ) {
    const theme = THEME_PALETTES[settings.theme];
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.42;

    // Reticle & Polar Stereo Axes (+45° Left, -45° Right, Vertical M, Horizontal S)
    if (settings.showGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
      ctx.lineWidth = 1;

      // Concentric circles
      [0.25, 0.5, 0.75, 1.0].forEach(frac => {
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.arc(centerX, centerY, maxRadius * frac, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 45 degree stereo diagonal axes
      ctx.beginPath();
      ctx.setLineDash([]);
      // +45° Left
      ctx.moveTo(centerX - maxRadius * 0.707, centerY + maxRadius * 0.707);
      ctx.lineTo(centerX + maxRadius * 0.707, centerY - maxRadius * 0.707);
      // -45° Right
      ctx.moveTo(centerX - maxRadius * 0.707, centerY - maxRadius * 0.707);
      ctx.lineTo(centerX + maxRadius * 0.707, centerY + maxRadius * 0.707);
      // Vertical / Horizontal
      ctx.moveTo(centerX, centerY - maxRadius);
      ctx.lineTo(centerX, centerY + maxRadius);
      ctx.moveTo(centerX - maxRadius, centerY);
      ctx.lineTo(centerX + maxRadius, centerY);
      ctx.stroke();

      // Axis labels
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.fillText('+L', centerX - maxRadius * 0.707 - 16, centerY - maxRadius * 0.707);
      ctx.fillText('+R', centerX + maxRadius * 0.707 + 6, centerY - maxRadius * 0.707);
      ctx.fillText('M', centerX - 4, centerY - maxRadius - 6);
      ctx.fillText('S', centerX + maxRadius + 6, centerY + 3);
      ctx.restore();
    }

    // Lissajous Stereo Phase Trace
    const length = Math.min(512, timeData.length);
    const delay = 16; // Simulated stereo separation delay

    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = theme.primary;
    if (settings.glowIntensity > 0.2) {
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = 10 * settings.glowIntensity;
    }

    let started = false;
    for (let i = 0; i < length - delay; i++) {
      // Left channel = timeData[i], Right channel = timeData[i + delay]
      const left = ((timeData[i] - 128) / 128) * settings.gain;
      const right = ((timeData[i + delay] - 128) / 128) * settings.gain;

      // Rotate 45 degrees for standard Goniometer (M = L+R vertical, S = L-R horizontal)
      const m = (left + right) * 0.707;
      const s = (left - right) * 0.707;

      const x = centerX + s * maxRadius;
      const y = centerY - m * maxRadius;

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }
}
