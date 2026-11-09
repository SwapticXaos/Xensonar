import type { CompletionArrangement, CompletionPattern } from "./platformerArrangement";
import type { PlatformerRouteMode } from "./platformerRouteProfile";
import type { PlatformerSectionBias } from "./platformerSectionBias";

export type PlatformerComposerPreviewSection = {
  slotIndex: number;
  label: "A" | "B" | "C";
  density: number;
  airRatio: number;
  accentPeak: number;
  tensionPeak: number;
  leadSteps: number;
  restSteps: number;
  root: number;
};

export type PlatformerComposerPreview = {
  ready: boolean;
  events: number;
  formLabel: string;
  targetBpm: number;
  complexity: number;
  sectionBias: PlatformerSectionBias;
  phaseFocus: "A" | "B" | "C" | "--";
  tuningTilt: number;
  forkBias: number;
  restDensity: number;
  routeSignature: string;
  routeMode: PlatformerRouteMode;
  routeBias: number;
  routeTravel: number;
  routeColor: string;
  routeGroove: string;
  routeLeadVoice: string;
  motifLengths: {
    ground: number;
    air: number;
    accent: number;
    cadence: number;
    roots: number;
  };
  timeline: PlatformerComposerPreviewSection[];
};

const PREVIEW_SECTION_LABELS: Array<"A" | "B" | "C"> = ["A", "B", "C"];

const dominantPhaseIndex = (phaseWeights: [number, number, number]) =>
  phaseWeights.reduce((best, value, index) => (value > phaseWeights[best] ? index : best), 0);

const buildPreviewSection = (
  label: "A" | "B" | "C",
  pattern: CompletionPattern,
  slotIndex: number,
): PlatformerComposerPreviewSection => {
  let leadSteps = 0;
  let restSteps = 0;
  let accentPeak = 0;
  let tensionPeak = 0;
  for (let step = 0; step < pattern.lengthSteps; step += 1) {
    if (pattern.lead[step] != null) leadSteps += 1;
    const quietStep =
      pattern.lead[step] == null
      && pattern.arp[step] == null
      && pattern.bass[step] == null
      && !pattern.kick[step]
      && !pattern.snare[step]
      && !pattern.hat[step]
      && !pattern.ghost[step];
    if (quietStep) restSteps += 1;
    accentPeak = Math.max(accentPeak, pattern.accent[step] ?? 0);
    tensionPeak = Math.max(tensionPeak, pattern.tension[step] ?? 0);
  }
  return {
    slotIndex,
    label,
    density: Number(pattern.density.toFixed(2)),
    airRatio: Number(pattern.airRatio.toFixed(2)),
    accentPeak: Number(accentPeak.toFixed(2)),
    tensionPeak: Number(tensionPeak.toFixed(2)),
    leadSteps,
    restSteps,
    root: pattern.barRoots[0] ?? 0,
  };
};

export const emptyPlatformerComposerPreview = (): PlatformerComposerPreview => ({
  ready: false,
  events: 0,
  formLabel: "--",
  targetBpm: 0,
  complexity: 0,
  sectionBias: "auto",
  phaseFocus: "--",
  tuningTilt: 0,
  forkBias: 0,
  restDensity: 0,
  routeSignature: "--",
  routeMode: "balanced",
  routeBias: 0,
  routeTravel: 0,
  routeColor: "--",
  routeGroove: "--",
  routeLeadVoice: "--",
  motifLengths: {
    ground: 0,
    air: 0,
    accent: 0,
    cadence: 0,
    roots: 0,
  },
  timeline: [],
});

export const createPlatformerComposerPreview = (
  arrangement: CompletionArrangement,
  events: number,
  sectionBias: PlatformerSectionBias,
): PlatformerComposerPreview => ({
  ready: true,
  events,
  formLabel: arrangement.formLabel,
  targetBpm: Math.round(arrangement.targetBpm),
  complexity: Number(arrangement.complexity.toFixed(2)),
  sectionBias,
  phaseFocus: PREVIEW_SECTION_LABELS[dominantPhaseIndex(arrangement.theme.phaseWeights)] ?? "--",
  tuningTilt: Number(arrangement.theme.tuningBias.toFixed(2)),
  forkBias: Number(arrangement.theme.forkBias.toFixed(2)),
  restDensity: Number(arrangement.theme.restDensity.toFixed(2)),
  routeSignature: arrangement.theme.routeProfile.signature,
  routeMode: arrangement.theme.routeProfile.mode,
  routeBias: Number(arrangement.theme.routeProfile.branchBias.toFixed(2)),
  routeTravel: Number(arrangement.theme.routeProfile.splitMotion.toFixed(2)),
  routeColor: arrangement.theme.routeOrchestration.colorLabel,
  routeGroove: arrangement.theme.routeOrchestration.grooveLabel,
  routeLeadVoice: arrangement.theme.routeOrchestration.leadVoiceLabel,
  motifLengths: {
    ground: arrangement.theme.groundMotif.length,
    air: arrangement.theme.airMotif.length,
    accent: arrangement.theme.accentMotif.length,
    cadence: arrangement.theme.cadenceMotif.length,
    roots: arrangement.theme.rootContour.length,
  },
  timeline: arrangement.order.map((sectionId, slotIndex) =>
    buildPreviewSection(
      PREVIEW_SECTION_LABELS[sectionId] ?? "A",
      arrangement.sections[sectionId] ?? arrangement.sections[0] ?? [],
      slotIndex,
    )),
});
