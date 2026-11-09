import type { HarmonicWorld } from "../../domain/harmonicWorld";
import type {
  MovementEvent,
  PlatformerArrangementForm,
  PlatformerArrangementMode,
  PlatformerTuningMode,
} from "../../game/jumpRunSoundtrack/platformerArrangement";
import type { PlatformerSectionBias } from "../../game/jumpRunSoundtrack/platformerSectionBias";
import { renderPlatformerLoopToWav } from "./renderPlatformerLoopToWav";
import type { MicrotoMelodicLoopSeedExport, MicrotoXensonarLoopExport } from "./types";

export type BuildPlatformerLoopExportInput = {
  name: string;
  bars: number;
  bpm: number;
  movementEvents: MovementEvent[];
  fallbackPhrase: number[];
  arrangementMode: PlatformerArrangementMode;
  formMode: PlatformerArrangementForm;
  sectionBias: PlatformerSectionBias;
  tuningMode: PlatformerTuningMode;
  evolutionDepth: number;
  masterVolume: number;
  harmonicWorld?: HarmonicWorld | null;
  rootHz?: number | null;
};

export type BuildPlatformerMelodicLoopSeedExportInput = {
  name: string;
  bars: number;
  movementEvents: MovementEvent[];
  fallbackPhrase: number[];
  arrangementMode: PlatformerArrangementMode;
  formMode: PlatformerArrangementForm;
  sectionBias: PlatformerSectionBias;
  tuningMode: PlatformerTuningMode;
  evolutionDepth: number;
  harmonicWorld?: HarmonicWorld | null;
  rootHz?: number | null;
};

export async function buildPlatformerLoopExport(
  input: BuildPlatformerLoopExportInput,
): Promise<MicrotoXensonarLoopExport> {
  const rootHz = input.rootHz ?? input.harmonicWorld?.baseFreq ?? null;
  const render = await renderPlatformerLoopToWav({
    bars: input.bars,
    bpm: input.bpm,
    movementEvents: input.movementEvents,
    fallbackPhrase: input.fallbackPhrase,
    arrangementMode: input.arrangementMode,
    formMode: input.formMode,
    sectionBias: input.sectionBias,
    tuningMode: input.tuningMode,
    evolutionDepth: input.evolutionDepth,
    masterVolume: input.masterVolume,
    rootHz,
  });

  return {
    name: input.name,
    blob: render.blob,
    bars: input.bars,
    durationSec: render.durationSec,
    rootHz,
    sourceDevice: "MicrotoSynFlow",
    sourceVersion: "phase-b",
    renderMode: "platformer-offline-loop",
    notes: `Platformer offline bounce · form ${render.formLabel} · target ${Math.round(render.targetBpm)} bpm · complexity ${render.complexity.toFixed(2)}`,
  };
}


export function buildPlatformerMelodicLoopSeedExport(
  input: BuildPlatformerMelodicLoopSeedExportInput,
): MicrotoMelodicLoopSeedExport {
  const rootHz = input.rootHz ?? input.harmonicWorld?.baseFreq ?? null;
  const movementEvents = [...input.movementEvents]
    .map((event) => ({ ...event }))
    .sort((a, b) => (a.t - b.t) || ((a.ordinal ?? 0) - (b.ordinal ?? 0)))
    .slice(-320);
  return {
    name: input.name,
    bars: input.bars,
    rootHz,
    movementEvents,
    fallbackPhrase: [...input.fallbackPhrase],
    arrangementMode: input.arrangementMode,
    formMode: input.formMode,
    sectionBias: input.sectionBias,
    tuningMode: input.tuningMode,
    evolutionDepth: input.evolutionDepth,
    sourceDevice: "MicrotoSynFlow",
    sourceVersion: "phase-b-seed",
    notes: `Platformer → Melodic Loop Seed · ${movementEvents.length} events · ${input.tuningMode} · ${input.formMode}` ,
  };
}
