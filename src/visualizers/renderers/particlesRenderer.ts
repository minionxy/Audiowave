import { VisualizerSettings, FrequencyBands } from '../../types/audio';
import { THEME_PALETTES } from '../../services/audioUtils';

interface AudioParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
  radius: number;
  baseRadius: number;
  angle: number;
  speed: number;
  distance: number;
  bandIndex: number;
  color: string;
}

export class ParticlesRenderer {
  private particles: AudioParticle[] = [];
  private shockwaves: { radius: number; maxRadius: number; opacity: number }[] = [];

  public init(width: number, height: number, count: number = 320) {
    this.particles = [];
    const centerX = width / 2;
    const centerY = height / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.pow(Math.random(), 0.65) * Math.min(width, height) * 0.45;
      const baseRadius = 1.2 + Math.random() * 2.8;

      this.particles.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        vx: 0,
        vy: 0,
        originX: centerX,
        originY: centerY,
        radius: baseRadius,
        baseRadius,
        angle,
        speed: (0.004 + Math.random() * 0.01) * (Math.random() > 0.5 ? 1 : -1),
        distance,
        bandIndex: Math.floor(Math.random() * 7),
        color: '',
      });
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bands: FrequencyBands,
    settings: VisualizerSettings,
    isBeat: boolean = false,
    beatEnergy: number = 0
  ) {
    if (this.particles.length === 0) {
      this.init(width, height, settings.particlesCount || 320);
    }

    const theme = THEME_PALETTES[settings.theme];
    const centerX = width / 2;
    const centerY = height / 2;

    const bandValues = [
      bands.subBass,
      bands.bass,
      bands.lowMid,
      bands.mid,
      bands.highMid,
      bands.presence,
      bands.brilliance,
    ];

    // Trigger shockwave on beat
    if (isBeat && beatEnergy > 0.25) {
      this.shockwaves.push({
        radius: 10,
        maxRadius: Math.min(width, height) * 0.55,
        opacity: 0.8,
      });
    }

    // Render & Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += 8;
      sw.opacity -= 0.025;

      if (sw.opacity <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = theme.accent;
      ctx.globalAlpha = sw.opacity;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    // Update & Render Particles
    const bassEnergy = (bands.subBass + bands.bass) * 0.5 * settings.gain;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const bandEnergy = bandValues[p.bandIndex] * settings.gain;

      // Angular orbital motion
      p.angle += p.speed * (1 + bandEnergy * 2);

      // Distance modulation based on audio
      const targetDist = p.distance * (1 + bassEnergy * 0.35 + bandEnergy * 0.2);
      const targetX = centerX + Math.cos(p.angle) * targetDist;
      const targetY = centerY + Math.sin(p.angle) * targetDist;

      // Smooth interpolation
      p.x += (targetX - p.x) * 0.12;
      p.y += (targetY - p.y) * 0.12;
      p.radius = p.baseRadius * (1 + bandEnergy * 2.2);

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = bandEnergy > 0.5 ? theme.peakColor : theme.primary;
      ctx.globalAlpha = Math.min(1, 0.4 + bandEnergy * 0.6);

      if (settings.glowIntensity > 0.2 && bandEnergy > 0.4) {
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = 8 * settings.glowIntensity;
      }

      ctx.fill();
      ctx.restore();
    }
  }
}
