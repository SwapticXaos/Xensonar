import * as React from 'react';
import { quantizeStepSeconds } from "../../shared/tuning/grid";
import { modeMask, type ChurchMode } from "../../shared/tuning/modes";
import { type PlayOneShotTone } from "../audio";
import {
  createEmptyOvertoneMix,
  defaultAgentEnabled,
  getParticleNodes,
  type DronePreset,
  type ParticleSystem,
  type ResonanceState,
} from "./runtimeConfig";
import type { NexusRuntimeRefsRef } from "./resonanceRefs";
import {
  playNexusAgentToneByPreset,
  type NexusAgentToneCueInput,
} from "./resonanceAgentTones";
import {
  applyDroneOvertoneMix,
  buildResonanceDroneGraph,
  routeOvertoneNodesToGroupBus,
} from "./resonanceDroneGraph";
import { getAgentSlice, getDroneSlice, getParticleSlice, getQuantizeSlice } from "./config/stateSlices";
import { useResonanceSectorPulses } from "./useResonanceSectorPulses";
import { useHyperCalibUI } from "./useHyperCalibUI";

type UseResonanceOrchestratorArgs = {
  audioCtx: AudioContext | null;
  nexusParamsRef: React.MutableRefObject<ResonanceState>;
  nParamsUI: ResonanceState;
  updateNParams: (partial: Partial<ResonanceState>) => void;
  nexusRefs: NexusRuntimeRefsRef;
  droneVolume: number;
  nexusActive: boolean;
  gameWidth: number;
  gameHeight: number;
  playScheduledTone: PlayOneShotTone;
};

export function useResonanceOrchestrator({
  audioCtx,
  nexusParamsRef,
  nParamsUI,
  updateNParams,
  nexusRefs,
  droneVolume,
  nexusActive,
  gameWidth,
  gameHeight,
  playScheduledTone,
}: UseResonanceOrchestratorArgs) {
  const scheduleToQuantizedGrid = (callback: () => void) => {
    const { quantizeOn, quantizeBpm, quantizeSubdivision } = getQuantizeSlice(nexusParamsRef);
    if (!quantizeOn || !audioCtx) {
      callback();
      return;
    }
    const stepMs = quantizeStepSeconds(quantizeBpm, quantizeSubdivision);
    const now = audioCtx.currentTime;
    const target = Math.ceil(now / stepMs) * stepMs;
    const wait = Math.max(0, target - now) * 1000;
    window.setTimeout(callback, wait);
  };

  const {
    triggerDirectedPulse,
    triggerQuantizedSectorPulse,
    armWaveImpactDecay,
    waveLaunchAtRef,
    waveImpactDecayRef,
  } = useResonanceSectorPulses({
    nexusParamsRef,
    nexusRefs,
    nexusActive,
    gameHeight,
    playScheduledTone,
    scheduleToQuantizedGrid,
    audioCtx,
  });

  const {
    hyperCalibUI,
    hyperCalib2UI,
    handleHyperCalibrateButton,
    handleHyperCali2Button,
    registerHyperCali2Move,
    registerHyperCali2Click,
  } = useHyperCalibUI({ nParamsUI, updateNParams });

  const applyRealtimeDroneOvertones = (mix?: Record<string, number>, timbreOverride?: number) => {
    const ctx = audioCtx;
    if (!ctx) return;
    const refs = nexusRefs.current;
    if (!refs.droneVolumeBus) {
      buildResonanceDroneGraph(ctx, refs, droneVolume);
      routeOvertoneNodesToGroupBus(refs);
    }
    const drone = getDroneSlice(nexusParamsRef);
    applyDroneOvertoneMix(
      ctx,
      refs,
      {
        droneVolume,
        droneJIOvertones: drone.droneJIOvertones,
        droneTimbre: drone.droneTimbre ?? 0,
      },
      mix,
      timbreOverride,
    );
  };

  const setDronePreset = (preset: DronePreset) => {
    const { droneJIOvertonesByPreset: byPreset } = getDroneSlice(nexusParamsRef);
    const presetMix = byPreset[preset] ?? createEmptyOvertoneMix();
    updateNParams({
      dronePreset: preset,
      droneJIOvertones: { ...presetMix },
    });
  };

  const setSwarmProfile = (profile: "tight_groove" | "wild_orbit") => {
    if (profile === "wild_orbit") {
      updateNParams({
        swarmProfile: profile,
        swarmWildness: 0.94,
        cursorGravity: 0.62,
      });
      return;
    }
    updateNParams({
      swarmProfile: profile,
      swarmWildness: 0.46,
      cursorGravity: 0.72,
    });
  };

  const playNexusAgentTone = (
    freq: number,
    volume: number,
    targetDestination?: AudioNode,
    cue: NexusAgentToneCueInput = "ripple",
  ) => {
    if (!audioCtx) return;
    const particle = getParticleSlice(nexusParamsRef);
    playNexusAgentToneByPreset(
      particle.particlePreset,
      freq,
      volume,
      playScheduledTone,
      targetDestination,
      cue,
    );
  };

  const toggleNexusAgent = (index: number) => {
    const agent = getAgentSlice(nexusParamsRef);
    const nextEnabled = [...agent.agentEnabled];
    nextEnabled[index] = !nextEnabled[index];
    const runtimeAgent = nexusRefs.current.agents[index];
    if (runtimeAgent) {
      runtimeAgent.lastHit = nextEnabled[index] ? 0 : Number.POSITIVE_INFINITY;
    }
    updateNParams({ agentEnabled: nextEnabled, particleMute: nextEnabled.every((v) => !v) });
  };

  const setNexusAgentVolume = (index: number, value: number) => {
    const agent = getAgentSlice(nexusParamsRef);
    const nextVolumes = [...agent.agentVolumes];
    nextVolumes[index] = value;
    updateNParams({ agentVolumes: nextVolumes });
  };

  const setSwarmCount = (count: number) => {
    const nextCount = Math.max(4, Math.min(48, Math.floor(count)));
    const agent = getAgentSlice(nexusParamsRef);
    const system = agent.particleSystem;
    const nodes = getParticleNodes(system, nextCount);
    const prevAgents = nexusRefs.current.agents;

    let nextEnabled = nodes.map((_, idx) => agent.agentEnabled[idx] ?? true);
    if (system === "12edo") {
      const mask = modeMask(agent.churchMode);
      nextEnabled = nodes.map((_, idx) => mask[idx % mask.length]);
    }
    const nextVolumes = nodes.map((_, idx) => agent.agentVolumes[idx] ?? 1);

    nexusRefs.current.agents = nodes.map((node, idx) => {
      const prev = prevAgents[idx];
      if (prev) {
        return {
          ...prev,
          ratio: node.ratio,
          label: node.label,
          lastHit: nextEnabled[idx] ? prev.lastHit : Number.POSITIVE_INFINITY,
        };
      }
      const angle = (Math.PI * 2 * idx) / Math.max(1, nodes.length);
      const radius = 70 + Math.random() * 180;
      return {
        x: nexusRefs.current.cursorX + Math.cos(angle) * radius,
        y: nexusRefs.current.cursorY + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 2.4,
        vy: (Math.random() - 0.5) * 2.4,
        ratio: node.ratio,
        label: node.label,
        phase: Math.random() * Math.PI * 2,
        lastHit: nextEnabled[idx] ? 0 : Number.POSITIVE_INFINITY,
        history: [],
      };
    });

    updateNParams({
      swarmCount: nextCount,
      agentEnabled: nextEnabled,
      agentVolumes: nextVolumes,
      particleMute: nextEnabled.every((v) => !v),
    });
  };

  const setParticleSystem = (system: ParticleSystem) => {
    const agent = getAgentSlice(nexusParamsRef);
    const nodes = getParticleNodes(system, agent.swarmCount);
    const nextEnabled = defaultAgentEnabled(system, agent.churchMode, nodes.length);
    const nextVolumes = nodes.map(() => 1);
    const centerX = gameWidth * 0.5;
    const centerY = gameHeight * 0.5;
    nexusRefs.current.agents = nodes.map((node, idx) => ({
      x: centerX + Math.cos((Math.PI * 2 * idx) / nodes.length) * (120 + Math.random() * 90),
      y: centerY + Math.sin((Math.PI * 2 * idx) / nodes.length) * (120 + Math.random() * 90),
      vx: (Math.random() - 0.5) * 50,
      vy: (Math.random() - 0.5) * 50,
      ratio: node.ratio,
      label: node.label,
      phase: Math.random() * Math.PI * 2,
      lastHit: 0,
      history: [],
    }));
    updateNParams({
      particleSystem: system,
      particleMute: false,
      agentEnabled: nextEnabled,
      agentVolumes: nextVolumes,
    });
  };

  const setChurchMode = (mode: ChurchMode) => {
    const agent = getAgentSlice(nexusParamsRef);
    if (agent.particleSystem !== "12edo") {
      updateNParams({ churchMode: mode });
      return;
    }
    const mask = modeMask(mode);
    const nextEnabled = getParticleNodes("12edo", agent.swarmCount).map(
      (_, idx) => mask[idx % mask.length],
    );
    nexusRefs.current.agents.forEach((agent: any, idx: number) => {
      if (idx >= nextEnabled.length) return;
      agent.lastHit = nextEnabled[idx] ? 0 : Number.POSITIVE_INFINITY;
    });
    updateNParams({
      churchMode: mode,
      agentEnabled: nextEnabled,
      particleMute: nextEnabled.every((v) => !v),
    });
  };

  return {
    applyRealtimeDroneOvertones,
    setDronePreset,
    setSwarmProfile,
    triggerQuantizedSectorPulse,
    toggleNexusAgent,
    setNexusAgentVolume,
    handleHyperCalibrateButton,
    handleHyperCali2Button,
    registerHyperCali2Move,
    registerHyperCali2Click,
    setSwarmCount,
    setParticleSystem,
    setChurchMode,
    playNexusAgentTone,
    triggerDirectedPulse,
    armWaveImpactDecay,
    hyperCalibUI,
    hyperCalib2UI,
    waveLaunchAtRef,
    waveImpactDecayRef,
  };
}
