import { VisualizerSettings } from '../../types/audio';
import { THEME_PALETTES } from '../../services/audioUtils';

export class OscilloscopeRenderer {
  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timeData: Uint8Array,
    settings: VisualizerSettings,
    triggerOffset: number = 0
  ) {
    const theme = THEME_PALETTES[settings.theme];
    const centerY = height / 2;
    const paddingX = 24;
    const availableWidth = width - paddingX * 2;

    // Reticle & Voltage Division Grid
    if (settings.showGrid) {
      this.renderOscilloscopeGrid(ctx, width, height, centerY, paddingX);
    }

    const dataLength = timeData.length;
    // If trigger stabilization is enabled, start from zero-crossing offset
    const startIndex = settings.triggerStabilization ? triggerOffset : 0;
    // Display up to 1024 points across canvas for detailed wave inspection
    const pointsToDisplay = Math.min(1024, dataLength - startIndex);
    const sliceWidth = availableWidth / pointsToDisplay;

    // Gain boost applied to wave amplitude
    const ampGain = settings.gain;

    // 1. Phosphor Ambient Halo Pass (Glow)
    if (settings.glowIntensity > 0.1) {
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = 6 * settings.glowIntensity;
      ctx.strokeStyle = theme.glow;
      ctx.shadowColor = theme.primary;
      ctx.shadowBlur = 18 * settings.glowIntensity;

      for (let i = 0; i < pointsToDisplay; i++) {
        const idx = startIndex + i;
        const normalized = (timeData[idx] - 128) / 128;
        const y = centerY + normalized * (height * 0.42) * ampGain;
        const x = paddingX + i * sliceWidth;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 2. Main Phosphor Beam Pass
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = theme.primary;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < pointsToDisplay; i++) {
      const idx = startIndex + i;
      const normalized = (timeData[idx] - 128) / 128;
      // Clamp to screen bounds with soft margin
      const y = Math.max(12, Math.min(height - 12, centerY + normalized * (height * 0.42) * ampGain));
      const x = paddingX + i * sliceWidth;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 3. Hot White Center Core Beam (Simulates intense electron beam impact)
    ctx.beginPath();
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = theme.peakColor;
    for (let i = 0; i < pointsToDisplay; i++) {
      const idx = startIndex + i;
      const normalized = (timeData[idx] - 128) / 128;
      const y = Math.max(12, Math.min(height - 12, centerY + normalized * (height * 0.42) * ampGain));
      const x = paddingX + i * sliceWidth;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // 4. Timebase & Voltage HUD
    this.renderHUD(ctx, width, height, settings);
  }

  private renderOscilloscopeGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    centerY: number,
    paddingX: number
  ) {
    ctx.save();
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.28)';
    ctx.lineWidth = 1;

    // Horizontal division lines (8 divisions)
    const vDivisions = 8;
    for (let i = 1; i < vDivisions; i++) {
      const y = (height / vDivisions) * i;
      ctx.beginPath();
      ctx.setLineDash(i === vDivisions / 2 ? [] : [2, 4]);
      ctx.moveTo(paddingX, y);
      ctx.lineTo(width - paddingX, y);
      ctx.stroke();
    }

    // Vertical division lines (10 divisions)
    const hDivisions = 10;
    for (let j = 1; j < hDivisions; j++) {
      const x = paddingX + ((width - paddingX * 2) / hDivisions) * j;
      ctx.beginPath();
      ctx.setLineDash(j === hDivisions / 2 ? [] : [2, 4]);
      ctx.moveTo(x, 16);
      ctx.lineTo(x, height - 16);
      ctx.stroke();
    }

    // Center Crosshair Reticle Ticks
    const centerX = width / 2;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.beginPath();
    ctx.setLineDash([]);
    // X center marks
    for (let offset = -80; offset <= 80; offset += 16) {
      if (offset === 0) continue;
      ctx.moveTo(centerX + offset, centerY - 4);
      ctx.lineTo(centerX + offset, centerY + 4);
    }
    // Y center marks
    for (let offset = -80; offset <= 80; offset += 16) {
      if (offset === 0) continue;
      ctx.moveTo(centerX - 4, centerY + offset);
      ctx.lineTo(centerX + 4, centerY + offset);
    }
    ctx.stroke();

    ctx.restore();
  }

  private renderHUD(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings: VisualizerSettings
  ) {
    ctx.save();
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';

    // Trigger state indicator
    const triggerText = settings.triggerStabilization ? 'TRIG: AUTO [LOCKED]' : 'TRIG: FREE RUN';
    ctx.fillText(triggerText, 24, 24);

    // Timebase scale estimate
    ctx.fillText(`GAIN: ${settings.gain.toFixed(1)}x`, width - 120, 24);
    ctx.fillText('TIMEBASE: 1ms / DIV', 24, height - 12);
    ctx.fillText('COUPLING: AC DIRECT', width - 150, height - 12);

    ctx.restore();
  }
}
