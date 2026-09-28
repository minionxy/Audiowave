import { VisualizerSettings } from '../../types/audio';
import { THEME_PALETTES } from '../../services/audioUtils';

export class RadialRenderer {
  private rotationAngle: number = 0;

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    freqData: Uint8Array,
    timeData: Uint8Array,
    settings: VisualizerSettings,
    bassEnergy: number = 0,
    isBeat: boolean = false
  ) {
    const theme = THEME_PALETTES[settings.theme];
    const centerX = width / 2;
    const centerY = height / 2;
    const minDim = Math.min(width, height);
    const baseRadius = minDim * 0.22;
    const maxRadius = minDim * 0.44;
    const maxBarLength = maxRadius - baseRadius;

    // Slowly rotate over time, accelerated slightly by audio energy
    this.rotationAngle += 0.003 + bassEnergy * 0.008;

    ctx.save();
    ctx.translate(centerX, centerY);

    // 1. Center Pulsing Orb (Reactive to Bass)
    const orbPulse = baseRadius * 0.65 + bassEnergy * 28 + (isBeat ? 16 : 0);
    const orbGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, Math.max(8, orbPulse));
    orbGrad.addColorStop(0, theme.peakColor);
    orbGrad.addColorStop(0.4, theme.primary);
    orbGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.arc(0, 0, orbPulse, 0, Math.PI * 2);
    ctx.fillStyle = orbGrad;
    ctx.fill();

    // 2. Inner Circular Oscilloscope Loop
    const timeLen = Math.min(512, timeData.length);
    ctx.beginPath();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = theme.accent;
    ctx.shadowColor = theme.primary;
    ctx.shadowBlur = 8 * settings.glowIntensity;

    const innerRadius = baseRadius * 0.85;
    for (let i = 0; i <= timeLen; i++) {
      const idx = i % timeLen;
      const angle = (i / timeLen) * Math.PI * 2 + this.rotationAngle;
      const normalized = (timeData[idx] - 128) / 128;
      const r = innerRadius + normalized * 24 * settings.gain;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // 3. Radial Frequency Bar Crown (Mirrored left & right for symmetrical bloom)
    const numBars = 72;
    const binStep = Math.max(1, Math.floor(freqData.length / (numBars * 2)));

    for (let i = 0; i < numBars; i++) {
      // Sample frequency data
      const binIdx = Math.min(freqData.length - 1, i * binStep);
      const rawVal = freqData[binIdx];
      const boosted = Math.min(255, rawVal * settings.gain);
      const barLen = (boosted / 255) * maxBarLength;

      // Two mirrored angles: left and right
      const angle1 = (i / numBars) * Math.PI - Math.PI / 2 + this.rotationAngle;
      const angle2 = -(i / numBars) * Math.PI - Math.PI / 2 + this.rotationAngle;

      [angle1, angle2].forEach(angle => {
        const xStart = Math.cos(angle) * baseRadius;
        const yStart = Math.sin(angle) * baseRadius;
        const xEnd = Math.cos(angle) * (baseRadius + barLen);
        const yEnd = Math.sin(angle) * (baseRadius + barLen);

        ctx.beginPath();
        ctx.lineWidth = Math.max(2, (minDim / 200));
        ctx.strokeStyle = boosted > 180 ? theme.peakColor : theme.primary;
        ctx.lineCap = 'round';
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
        ctx.stroke();

        // Outer dot marker
        if (boosted > 80) {
          ctx.beginPath();
          ctx.arc(xEnd, yEnd, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = theme.accent;
          ctx.fill();
        }
      });
    }

    ctx.restore();
  }
}
