import { resolveFieldWaveCatchupGhostRadius, stepFieldWaveDisplayRadius } from "./resonanceFieldPresentationClock";
import { resolveResonanceFieldStepFrame, type ResonanceFieldStepClockState } from "./resonanceFieldStepClock";
import { BASE_WAVE_SPEED, waveIntensityScalar } from "./resonanceRuntimeMath";
import type { ResonanceNexusRuntimeRefs } from "./resonanceNexusRuntimeRefs";

export const RESONANCE_NEXUS_FIELD_FRAME_KERNEL_CONTRACT = {
  preservesFieldStepOrder: true,
  preservesWaveParticleInterleaveAtCaller: true,
  ownsNoAudioNodes: true,
  ownsNoRafLifecycle: true,
  ownsNoReactLifecycle: true,
} as const;

type FieldStep = {
  readonly nowMs: number;
  readonly stepMs: number;
  readonly motionScale: number;
};

export type ResonanceNexusFieldFrameKernelArgs = {
  readonly ctx: CanvasRenderingContext2D;
  readonly state: ResonanceNexusRuntimeRefs;
  readonly clockState: ResonanceFieldStepClockState;
  readonly frameNowMs: number;
};

export function createResonanceNexusFieldFrameKernel(args: ResonanceNexusFieldFrameKernelArgs) {
  const { ctx: c, state, clockState, frameNowMs } = args;
  const fieldStepFrame = resolveResonanceFieldStepFrame(clockState, frameNowMs);
  const fieldSteps: FieldStep[] = fieldStepFrame.steps.length > 0
    ? fieldStepFrame.steps
    : [{ nowMs: frameNowMs, stepMs: fieldStepFrame.stepMs, motionScale: 0 }];

  const advanceFieldWaveStep = (motionScale: number) => {
    state.ripples = state.ripples.filter((r) => r.life > 0 && r.radius <= r.maxRadius + 16);
    state.ripples.forEach((r) => {
      const previousTruthRadius = r.radius;
      r.prevRadius = previousTruthRadius;
      r.radius = Math.min(r.maxRadius + 16, previousTruthRadius + BASE_WAVE_SPEED * motionScale);
      r.life = Math.max(0, 1 - r.radius / Math.max(1, r.maxRadius));
    });

    state.sectorPulses = state.sectorPulses.filter((pulse) => pulse.life > 0.01 && pulse.radius <= pulse.maxRadius + 16);
    state.sectorPulses.forEach((pulse) => {
      const previousTruthRadius = pulse.radius;
      pulse.prevRadius = previousTruthRadius;
      pulse.radius = Math.min(pulse.maxRadius + 16, previousTruthRadius + BASE_WAVE_SPEED * motionScale);
      pulse.life = Math.max(0, 1 - pulse.radius / Math.max(1, pulse.maxRadius));
    });
  };

  const renderFieldWaves = () => {
    state.ripples.forEach((r) => {
      const previousDisplayRadius = r.displayRadius ?? r.prevRadius ?? r.radius;
      r.displayPrevRadius = previousDisplayRadius;
      r.displayRadius = stepFieldWaveDisplayRadius({
        displayRadius: r.displayRadius,
        previousTruthRadius: r.prevRadius ?? r.radius,
        truthRadius: r.radius,
        rawFrameMs: fieldStepFrame.rawFrameMs,
        maxRadius: r.maxRadius,
        baseWaveSpeed: BASE_WAVE_SPEED,
      });
      const visualRadius = r.displayRadius ?? r.radius;
      const visualLife = Math.max(0, 1 - visualRadius / Math.max(1, r.maxRadius));
      const progress = r.maxRadius > 0 ? visualRadius / r.maxRadius : 0;
      const scalar = waveIntensityScalar(progress, r.decay);
      const ghostRadius = resolveFieldWaveCatchupGhostRadius(r.displayPrevRadius, visualRadius);
      if (ghostRadius !== null) {
        c.beginPath();
        c.arc(r.x, r.y, ghostRadius, 0, Math.PI * 2);
        c.strokeStyle = `rgba(200, 150, 255, ${Math.max(0, visualLife * scalar * 0.32)})`;
        c.lineWidth = 1 + scalar * 1.2;
        c.stroke();
      }
      c.beginPath();
      c.arc(r.x, r.y, visualRadius, 0, Math.PI * 2);
      c.strokeStyle = `rgba(200, 150, 255, ${Math.max(0, visualLife * scalar)})`;
      c.lineWidth = 1.5 + scalar * 1.8;
      c.stroke();
    });

    state.sectorPulses.forEach((pulse) => {
      const previousDisplayRadius = pulse.displayRadius ?? pulse.prevRadius ?? pulse.radius;
      pulse.displayPrevRadius = previousDisplayRadius;
      pulse.displayRadius = stepFieldWaveDisplayRadius({
        displayRadius: pulse.displayRadius,
        previousTruthRadius: pulse.prevRadius ?? pulse.radius,
        truthRadius: pulse.radius,
        rawFrameMs: fieldStepFrame.rawFrameMs,
        maxRadius: pulse.maxRadius,
        baseWaveSpeed: BASE_WAVE_SPEED,
      });

      const centerAngle = pulse.direction === "right" ? 0 : pulse.direction === "up" ? -Math.PI / 2 : pulse.direction === "left" ? Math.PI : Math.PI / 2;
      const halfSector = Math.PI / 4;
      const start = centerAngle - halfSector;
      const end = centerAngle + halfSector;
      const visualRadius = pulse.displayRadius ?? pulse.radius;
      const visualLife = Math.max(0, 1 - visualRadius / Math.max(1, pulse.maxRadius));
      const progress = pulse.maxRadius > 0 ? visualRadius / pulse.maxRadius : 0;
      const scalar = waveIntensityScalar(progress, pulse.decay);
      const ghostRadius = resolveFieldWaveCatchupGhostRadius(pulse.displayPrevRadius, visualRadius);

      c.save();
      if (ghostRadius !== null) {
        c.strokeStyle = `rgba(196, 181, 253, ${Math.max(0, visualLife * scalar * 0.32)})`;
        c.lineWidth = 1 + scalar * 1.2;
        c.beginPath();
        c.arc(pulse.x, pulse.y, ghostRadius, start, end);
        c.stroke();
      }
      c.strokeStyle = `rgba(196, 181, 253, ${Math.max(0, visualLife * scalar)})`;
      c.lineWidth = 1.5 + scalar * 1.8;
      c.beginPath();
      c.arc(pulse.x, pulse.y, visualRadius, start, end);
      c.stroke();
      c.restore();
    });
  };

  return { fieldStepFrame, fieldSteps, advanceFieldWaveStep, renderFieldWaves };
}
