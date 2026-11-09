import { describe, expect, it } from "vitest";

import { createDefaultResonanceState } from "../config/defaults";
import {
  getAgentSlice,
  getDroneSlice,
  getGlobalHarmonicContext,
  getGridSlice,
  getGrooveSlice,
  getParticleSlice,
  getQuantizedParticleSlice,
  getQuantizeSlice,
  getResonanceUiSliceFromState,
  getSimulationParamsSlice,
  getSimulationSlice,
  getWaveStartSlice,
} from "../config/stateSlices";

describe("stateSlices getters", () => {
  it("getGridSlice returns grid subset from ref", () => {
    const state = createDefaultResonanceState();
    const ref = { current: state };
    const slice = getGridSlice(ref);
    expect(slice).toEqual({
      gridOn: state.gridOn,
      gridBase: state.gridBase,
      gridTuning: state.gridTuning,
      lockCursorToGrid: state.lockCursorToGrid,
      cursorSpeed: state.cursorSpeed,
    });
    expect(Object.keys(slice).sort()).toEqual(
      ["cursorSpeed", "gridBase", "gridOn", "gridTuning", "lockCursorToGrid"].sort(),
    );
  });

  it("getQuantizeSlice returns quantize subset from ref", () => {
    const state = createDefaultResonanceState();
    const ref = { current: state };
    const slice = getQuantizeSlice(ref);
    expect(slice).toEqual({
      quantizeOn: state.quantizeOn,
      quantizeBpm: state.quantizeBpm,
      quantizeSubdivision: state.quantizeSubdivision,
    });
    expect(Object.keys(slice).sort()).toEqual(
      ["quantizeBpm", "quantizeOn", "quantizeSubdivision"].sort(),
    );
  });

  it("getGlobalHarmonicContext returns baseFreq + quantize + gridTuning from ref", () => {
    const state = createDefaultResonanceState();
    const ref = { current: state };
    const ctx = getGlobalHarmonicContext(ref);
    expect(ctx.baseFreq).toBe(state.gridBase);
    expect(ctx.quantizeOn).toBe(state.quantizeOn);
    expect(ctx.quantizeBpm).toBe(state.quantizeBpm);
    expect(ctx.quantizeSubdivision).toBe(state.quantizeSubdivision);
    expect(ctx.gridTuning).toBe(state.gridTuning);
    expect(Object.keys(ctx).sort()).toEqual(
      ["baseFreq", "gridTuning", "quantizeBpm", "quantizeOn", "quantizeSubdivision"].sort(),
    );
    ref.current = { ...state, gridBase: 220, gridTuning: "ji" };
    const ctx2 = getGlobalHarmonicContext(ref);
    expect(ctx2.baseFreq).toBe(220);
    expect(ctx2.gridTuning).toBe("ji");
  });

  it("getDroneSlice returns drone subset from ref", () => {
    const state = createDefaultResonanceState();
    const ref = { current: state };
    const slice = getDroneSlice(ref);
    expect(slice).toEqual({
      droneTimbre: state.droneTimbre,
      dronePreset: state.dronePreset,
      droneRhythm: state.droneRhythm,
      droneFlanger: state.droneFlanger,
      droneVibrato: state.droneVibrato,
      droneJIOvertones: state.droneJIOvertones,
      droneJIOvertonesByPreset: state.droneJIOvertonesByPreset,
      droneOvertoneWaveform: state.droneOvertoneWaveform,
    });
    expect(Object.keys(slice).sort()).toEqual(
      [
        "droneFlanger",
        "droneJIOvertones",
        "droneJIOvertonesByPreset",
        "droneOvertoneWaveform",
        "dronePreset",
        "droneRhythm",
        "droneTimbre",
        "droneVibrato",
      ].sort(),
    );
  });

  it("getSimulationSlice returns simulation subset from ref", () => {
    const state = createDefaultResonanceState();
    const ref = { current: state };
    const slice = getSimulationSlice(ref);
    expect(slice).toEqual({
      particleSystem: state.particleSystem,
      swarmCount: state.swarmCount,
      agentEnabled: state.agentEnabled,
    });
    expect(Object.keys(slice).sort()).toEqual(
      ["agentEnabled", "particleSystem", "swarmCount"].sort(),
    );
  });

  it("getSimulationParamsSlice returns echo + agent params subset from ref", () => {
    const state = createDefaultResonanceState();
    const ref = { current: state };
    const slice = getSimulationParamsSlice(ref);
    expect(slice).toEqual({
      echoOn: state.echoOn,
      echoTempo: state.echoTempo,
      particleMute: state.particleMute,
      agentEnabled: state.agentEnabled,
      agentVolumes: state.agentVolumes,
      clickSoundOnly: state.clickSoundOnly,
      swarmWildness: state.swarmWildness ?? 0.82,
      cursorGravity: state.cursorGravity ?? 0.42,
    });
    expect(Object.keys(slice).sort()).toEqual(
      [
        "agentEnabled",
        "agentVolumes",
        "clickSoundOnly",
        "cursorGravity",
        "echoOn",
        "echoTempo",
        "particleMute",
        "swarmWildness",
      ].sort(),
    );
  });

  it("getAgentSlice returns agent + mode subset from ref", () => {
    const state = createDefaultResonanceState();
    const ref = { current: state };
    const slice = getAgentSlice(ref);
    expect(slice).toEqual({
      particleSystem: state.particleSystem,
      churchMode: state.churchMode,
      swarmProfile: state.swarmProfile,
      swarmCount: state.swarmCount,
      agentEnabled: state.agentEnabled,
      agentVolumes: state.agentVolumes,
    });
    expect(Object.keys(slice).sort()).toEqual(
      ["agentEnabled", "agentVolumes", "churchMode", "particleSystem", "swarmProfile", "swarmCount"].sort(),
    );
  });

  it("getParticleSlice returns particle subset from ref", () => {
    const state = createDefaultResonanceState();
    const ref = { current: state };
    const slice = getParticleSlice(ref);
    expect(slice).toEqual({
      particlePreset: state.particlePreset,
    });
    expect(Object.keys(slice).sort()).toEqual(["particlePreset"].sort());
  });

  it("getWaveStartSlice returns wave-start subset from ref", () => {
    const state = createDefaultResonanceState();
    const ref = { current: state };
    const slice = getWaveStartSlice(ref);
    expect(slice).toEqual({
      waveStartOvertones: state.waveStartOvertones,
      waveStartWaveform: state.waveStartWaveform,
    });
    expect(Object.keys(slice).sort()).toEqual(
      ["waveStartOvertones", "waveStartWaveform"].sort(),
    );
  });

  it("getQuantizedParticleSlice returns quantize + particle queue subset from ref", () => {
    const state = createDefaultResonanceState();
    const ref = { current: state };
    const slice = getQuantizedParticleSlice(ref);
    expect(slice).toEqual({
      quantizeOn: state.quantizeOn,
      quantizeEvents: state.quantizeEvents,
      quantizeBpm: state.quantizeBpm,
      quantizeSubdivision: state.quantizeSubdivision,
      particlePreset: state.particlePreset,
      particleMute: state.particleMute,
      clickSoundOnly: state.clickSoundOnly,
      particleVolume: state.particleVolume,
      agentEnabled: state.agentEnabled,
      agentVolumes: state.agentVolumes,
    });
    expect(Object.keys(slice).sort()).toEqual(
      [
        "agentEnabled",
        "agentVolumes",
        "clickSoundOnly",
        "particleMute",
        "particlePreset",
        "particleVolume",
        "quantizeBpm",
        "quantizeEvents",
        "quantizeOn",
        "quantizeSubdivision",
      ].sort(),
    );
  });

  it("getGrooveSlice returns groove + hyper patterns subset from ref", () => {
    const state = createDefaultResonanceState();
    const ref = { current: state };
    const slice = getGrooveSlice(ref);
    expect(slice).toEqual({
      quantizeBpm: state.quantizeBpm,
      quantizeSubdivision: state.quantizeSubdivision,
      quantizeMicroTightness: state.quantizeMicroTightness,
      hyperCalibrateOn: state.hyperCalibrateOn,
      hyperCalibratedReady: state.hyperCalibratedReady,
      hyperCalibratedPattern: state.hyperCalibratedPattern,
      hyperCali2On: state.hyperCali2On,
      hyperCali2Ready: state.hyperCali2Ready,
      hyperCali2Weights64: state.hyperCali2Weights64,
      hyperCali2PitchOffsets: state.hyperCali2PitchOffsets,
      bassRootMode: state.bassRootMode,
      bassRootHz: state.bassRootHz,
      bassVolume: state.bassVolume,
      bassActive: state.bassActive,
      bassPattern: state.bassPattern,
      drumActive: state.drumActive,
      drumPattern: state.drumPattern,
      drumVolume: state.drumVolume,
      harmonyCascadeSteps: state.harmonyCascadeSteps,
      particleSystem: state.particleSystem,
    });
    expect(Object.keys(slice).sort()).toEqual(
      [
        "bassActive",
        "bassPattern",
        "bassRootHz",
        "bassRootMode",
        "bassVolume",
        "drumActive",
        "drumPattern",
        "drumVolume",
        "harmonyCascadeSteps",
        "hyperCali2On",
        "hyperCali2PitchOffsets",
        "hyperCali2Ready",
        "hyperCali2Weights64",
        "hyperCalibrateOn",
        "hyperCalibratedPattern",
        "hyperCalibratedReady",
        "particleSystem",
        "quantizeBpm",
        "quantizeMicroTightness",
        "quantizeSubdivision",
      ].sort(),
    );
  });

  it("getResonanceUiSliceFromState bundles UI-facing slices from a concrete state", () => {
    const state = createDefaultResonanceState();
    const ui = getResonanceUiSliceFromState(state);
    expect(ui.grid.gridBase).toBe(state.gridBase);
    expect(ui.grid.gridTuning).toBe(state.gridTuning);
    expect(ui.quantize.quantizeOn).toBe(state.quantizeOn);
    expect(ui.quantize.quantizeBpm).toBe(state.quantizeBpm);
    expect(ui.quantize.quantizeSubdivision).toBe(state.quantizeSubdivision);
    expect(ui.drone.dronePreset).toBe(state.dronePreset);
    expect(ui.waveStart.waveStartWaveform).toBe(state.waveStartWaveform);
    expect(Object.keys(ui).sort()).toEqual(
      ["agent", "drone", "grid", "groove", "particle", "quantize", "waveStart"].sort(),
    );
  });

  it("getSimulationParamsSlice applies fallback when swarmWildness/cursorGravity are undefined", () => {
    const state = createDefaultResonanceState();
    const partial = { ...state, swarmWildness: undefined, cursorGravity: undefined } as typeof state;
    const ref = { current: partial };
    const slice = getSimulationParamsSlice(ref);
    expect(slice.swarmWildness).toBe(0.82);
    expect(slice.cursorGravity).toBe(0.42);
  });

  it("getters read current ref value (live snapshot)", () => {
    const state = createDefaultResonanceState();
    const ref = { current: state };
    expect(getGridSlice(ref).gridBase).toBe(440);
    ref.current = { ...state, gridBase: 220 };
    expect(getGridSlice(ref).gridBase).toBe(220);
  });
});
