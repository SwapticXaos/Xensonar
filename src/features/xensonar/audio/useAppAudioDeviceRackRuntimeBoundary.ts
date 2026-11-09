import type { MutableRefObject } from "react";
import { createAudioTapSnapshot, pushAudioTapSnapshot, summarizeAudioTapState } from "../../soundLibrary/audioTapDiagnostics";
import { createCollectiveMemoryEffect, createDescriptorProbe } from "../../resonance/collectiveMemoryEffect";
import { createMyzelPostFxRouter, type MyzelPostFxSourceKey } from "../../resonance/myzelPostFxRouter";
import { createPsychedelicSpiralDevice } from "../../resonance/psychedelicSpiralDevice";
import { createTransientDriveDevice } from "../../resonance/transientDriveDevice";
import { createEnterHoldPsyFxDevice } from "../../resonance/enterHoldPsyFx";
import { Schwarmdeuter, type ParticleVoiceSnapshot } from "../../resonance/schwarmdeuter";
import type { TransientEventPlan, TransientSource } from "../../resonance/transientRuntime";
import { ensureDrumMixBusRuntime, ensureExternalGameRecordingCaptureBusRuntime, ensureFinalMixBusRuntime, ensureLiveMasterRecordingDestinationRuntime, getLiveMasterBusRuntime, getLiveMasterEffectBusRuntime, type LiveMasterEffectKey, type LiveMasterBusRuntimeRefs } from "./liveMasterBusRuntimeBoundary";
import type { RecordingSourceMode, Room } from "../domain/runtimeTypes";

export type AppAudioDeviceRackRuntimeBoundaryArgs = {
  readonly liveMasterBusRuntimeRefs: LiveMasterBusRuntimeRefs;
  readonly finalMixAnalyserRef: MutableRefObject<AnalyserNode | null>;
  readonly audioEventIntakeMonitorRef: MutableRefObject<any>;
  readonly audioTapScratchRef: MutableRefObject<any>;
  readonly preFxTapAnalyserRef: MutableRefObject<AnalyserNode | null>;
  readonly postFxTapAnalyserRef: MutableRefObject<AnalyserNode | null>;
  readonly monitorTapAnalyserRef: MutableRefObject<AnalyserNode | null>;
  readonly setAudioEventIntakeMonitor: (state: any) => void;
  readonly setAudioTapMonitor: (summary: any) => void;
  readonly audioBurstRuntime: { appendSnapshot: (snapshot: any) => void };
  readonly rootFollowRuntimeRefs: {
    activeNodesRef: MutableRefObject<{ readonly size: number }>;
    activeSynthVoicesRef: MutableRefObject<{ readonly size: number }>;
  };
  readonly transientRuntimeRef: MutableRefObject<{ beginEvent: (source: TransientSource, requestedVoices: number, intensity?: number) => TransientEventPlan; getSnapshot: () => { activeVoices: number } }>;
  readonly nParamsUI: any;
  readonly liveMasterMonitor: any;
  readonly room: Room;
  readonly waveSoundEnabled: boolean;
  readonly liveMasteringEnabled: boolean;
  readonly collectiveMemoryUi: any;
  readonly collectiveFxRef: MutableRefObject<any>;
  readonly finalMixProbeRef: MutableRefObject<any>;
  readonly psychedelicSpiralRef: MutableRefObject<any>;
  readonly psychedelicSpiralSendsRef: MutableRefObject<any>;
  readonly psychedelicSpiralEnabled: boolean;
  readonly psychedelicSpiralUi: any;
  readonly transientDriveFxRef: MutableRefObject<any>;
  readonly transientDriveSendsRef: MutableRefObject<any>;
  readonly enterHoldPsyFxRef: MutableRefObject<any>;
  readonly enterHoldPsyFxSendsRef: MutableRefObject<any>;
  readonly enterHoldPsyFxEnabled: boolean;
  readonly enterHoldPsyFxUi: any;
  readonly schwarmdeuterRef: MutableRefObject<any>;
  readonly schwarmdeuterSendsRef: MutableRefObject<any>;
  readonly schwarmEnabled: boolean;
  readonly schwarmUi: any;
  readonly nexusRefs: MutableRefObject<any>;
  readonly nexusParamsRef: MutableRefObject<any>;
  readonly myzelPostFxRouterRef: MutableRefObject<any>;
  readonly myzelPostFxSendsRef: MutableRefObject<any>;
  readonly myzelPostFxConnectionsRef: MutableRefObject<any>;
  readonly gameRefs: MutableRefObject<any>;
};

export type AppAudioDeviceRackRuntimeBoundary = {
  readonly ensureFinalMixBus: (ctx: AudioContext) => GainNode;
  readonly ensureDrumMixBus: (ctx: AudioContext) => GainNode;
  readonly getLiveMasterBus: (ctx: AudioContext, role?: "main" | "drone" | "rhythm" | "space") => GainNode;
  readonly getLiveMasterEffectBus: (ctx: AudioContext, effect: LiveMasterEffectKey) => GainNode;
  readonly ensureRecordingDestination: (ctx: AudioContext, mode: RecordingSourceMode) => MediaStreamAudioDestinationNode | null;
  readonly ensureExternalGameRecordingCaptureBus: (ctx: AudioContext) => GainNode;
  readonly recordAudioTapSnapshot: (audioNow: number) => void;
  readonly beginTransientEvent: (source: TransientSource, requestedVoices: number, intensity?: number) => TransientEventPlan;
  readonly ensureCollectiveMemoryFx: (ctx: AudioContext) => any;
  readonly ensurePsychedelicSpiralDevice: (ctx: AudioContext) => any;
  readonly ensureTransientDriveDevice: (ctx: AudioContext) => any;
  readonly ensureEnterHoldPsyFxDevice: (ctx: AudioContext) => any;
  readonly ensureSchwarmdeuterDevice: (ctx: AudioContext) => any;
  readonly ensureMyzelPostFxRouter: (ctx: AudioContext) => any;
  readonly collectSchwarmSnapshots: () => ParticleVoiceSnapshot[];
  readonly audioDeviceRackRuntimeBoundaryExtractedFromAppTsx: true;
  readonly noWaveStarterBassOrRootFollowHotPathMoved: true;
  readonly fullBrowserSanityRequiredAfterThisCut: true;
};

export function useAppAudioDeviceRackRuntimeBoundary(args: AppAudioDeviceRackRuntimeBoundaryArgs): AppAudioDeviceRackRuntimeBoundary {
  const ensureFinalMixBus = (ctx: AudioContext) => ensureFinalMixBusRuntime(ctx, args.liveMasterBusRuntimeRefs);

  const ensureDrumMixBus = (ctx: AudioContext) => ensureDrumMixBusRuntime(ctx, args.liveMasterBusRuntimeRefs);

  const getLiveMasterBus = (ctx: AudioContext, role: "main" | "drone" | "rhythm" | "space" = "main") =>
    getLiveMasterBusRuntime(ctx, args.liveMasterBusRuntimeRefs, role);

  const getLiveMasterEffectBus = (ctx: AudioContext, effect: LiveMasterEffectKey) =>
    getLiveMasterEffectBusRuntime(ctx, args.liveMasterBusRuntimeRefs, effect);

  const ensureRecordingDestination = (ctx: AudioContext, mode: RecordingSourceMode) =>
    ensureLiveMasterRecordingDestinationRuntime(ctx, args.liveMasterBusRuntimeRefs, mode);

  const ensureExternalGameRecordingCaptureBus = (ctx: AudioContext) =>
    ensureExternalGameRecordingCaptureBusRuntime(ctx, args.liveMasterBusRuntimeRefs);

  const recordAudioTapSnapshot = (audioNow: number) => {
    let nextState = args.audioEventIntakeMonitorRef.current;
    const rootFollowVoiceEstimate = args.rootFollowRuntimeRefs.activeNodesRef.current.size + args.rootFollowRuntimeRefs.activeSynthVoicesRef.current.size;
    const activeVoices = args.transientRuntimeRef.current.getSnapshot().activeVoices + (args.nParamsUI.materialLoopActive ? 1 : 0) + rootFollowVoiceEstimate;
    (["pre_fx", "post_fx", "monitor"] as const).forEach((tap) => {
      const analyser = tap === "pre_fx" ? args.preFxTapAnalyserRef.current : tap === "post_fx" ? args.postFxTapAnalyserRef.current : args.monitorTapAnalyserRef.current;
      const scratch = args.audioTapScratchRef.current[tap];
      const snapshot = createAudioTapSnapshot(tap, analyser, scratch, audioNow, activeVoices);
      if (snapshot) nextState = pushAudioTapSnapshot(nextState, snapshot);
    });
    args.audioEventIntakeMonitorRef.current = nextState;
    args.setAudioEventIntakeMonitor(nextState);
    const tapSummary = summarizeAudioTapState(nextState);
    args.setAudioTapMonitor(tapSummary);
    args.audioBurstRuntime.appendSnapshot({
      nextState,
      audioNowSec: audioNow,
      activeVoices,
      room: args.room,
      materialLoopActive: args.nParamsUI.materialLoopActive,
      waveSoundEnabled: args.waveSoundEnabled,
      liveMasteringEnabled: args.liveMasteringEnabled,
      liveMasterMonitor: {
        main: args.liveMasterMonitor.main,
        drone: args.liveMasterMonitor.drone,
        rhythm: args.liveMasterMonitor.rhythm,
        space: args.liveMasterMonitor.space,
        trim: args.liveMasterMonitor.trim,
      },
    });
  };

  const beginTransientEvent = (source: TransientSource, requestedVoices: number, intensity = 1) => {
    return args.transientRuntimeRef.current.beginEvent(source, requestedVoices, intensity);
  };

  const ensureCollectiveMemoryFx = (ctx: AudioContext) => {
    const finalBus = getLiveMasterEffectBus(ctx, "collectiveMemory");
    if (!args.finalMixProbeRef.current && args.finalMixAnalyserRef.current) {
      args.finalMixProbeRef.current = createDescriptorProbe(ctx, args.finalMixAnalyserRef.current, 1024);
    }
    if (!args.collectiveFxRef.current.drone) {
      args.collectiveFxRef.current.drone = createCollectiveMemoryEffect(ctx, {
        name: "drone_memory",
        destination: finalBus,
        sendLevel: args.collectiveMemoryUi.drone.send,
        baseWet: args.collectiveMemoryUi.drone.wet,
        complementarity: 0.72,
      });
    }
    if (!args.collectiveFxRef.current.particles) {
      args.collectiveFxRef.current.particles = createCollectiveMemoryEffect(ctx, {
        name: "particles_memory",
        destination: finalBus,
        sendLevel: args.collectiveMemoryUi.particles.send,
        baseWet: args.collectiveMemoryUi.particles.wet,
        complementarity: 0.66,
      });
    }
    if (!args.collectiveFxRef.current.waves) {
      args.collectiveFxRef.current.waves = createCollectiveMemoryEffect(ctx, {
        name: "waves_memory",
        destination: finalBus,
        sendLevel: args.collectiveMemoryUi.waves.send,
        baseWet: args.collectiveMemoryUi.waves.wet,
        complementarity: 0.58,
      });
    }
    if (!args.collectiveFxRef.current.myzel) {
      args.collectiveFxRef.current.myzel = createCollectiveMemoryEffect(ctx, {
        name: "myzel_memory",
        destination: finalBus,
        sendLevel: args.collectiveMemoryUi.myzel.send,
        baseWet: args.collectiveMemoryUi.myzel.wet,
        complementarity: 0.78,
      });
    }
    return args.collectiveFxRef.current;
  };

  const ensurePsychedelicSpiralDevice = (ctx: AudioContext) => {
    ensureFinalMixBus(ctx);
    if (!args.psychedelicSpiralRef.current) {
      const device = createPsychedelicSpiralDevice(ctx, {
        enabled: args.psychedelicSpiralEnabled,
        drive: args.psychedelicSpiralUi.drive,
        color: args.psychedelicSpiralUi.color,
        motion: args.psychedelicSpiralUi.motion,
        feedback: args.psychedelicSpiralUi.feedback,
        bloom: args.psychedelicSpiralUi.bloom,
        mix: args.psychedelicSpiralUi.mix,
        stereoWidth: args.psychedelicSpiralUi.stereoWidth,
        outputGain: args.psychedelicSpiralUi.outputGain,
      });
      device.connect(getLiveMasterEffectBus(ctx, "psychedelicSpiral"));
      args.psychedelicSpiralRef.current = device;
      (Object.keys(args.psychedelicSpiralSendsRef.current) as Array<keyof typeof args.psychedelicSpiralSendsRef.current>).forEach((key) => {
        const send = ctx.createGain();
        send.gain.value = 0;
        send.connect(device.input);
        args.psychedelicSpiralSendsRef.current[key] = send;
      });
    }
    return args.psychedelicSpiralRef.current;
  };

  const ensureTransientDriveDevice = (ctx: AudioContext) => {
    ensureFinalMixBus(ctx);
    if (!args.transientDriveFxRef.current) {
      const device = createTransientDriveDevice(ctx, getLiveMasterEffectBus(ctx, "transientDrive"));
      args.transientDriveFxRef.current = device;
      (Object.keys(args.transientDriveSendsRef.current) as Array<keyof typeof args.transientDriveSendsRef.current>).forEach((key) => {
        const send = ctx.createGain();
        send.gain.value = 0;
        send.connect(device.input);
        args.transientDriveSendsRef.current[key] = send;
      });
      if (args.nexusRefs.current.droneVolumeBus && args.transientDriveSendsRef.current.drone) {
        args.nexusRefs.current.droneVolumeBus.connect(args.transientDriveSendsRef.current.drone);
      }
      if (args.nexusRefs.current.myzelMasterGain && args.transientDriveSendsRef.current.myzel) {
        args.nexusRefs.current.myzelMasterGain.connect(args.transientDriveSendsRef.current.myzel);
      }
    }
    return args.transientDriveFxRef.current;
  };

  const ensureEnterHoldPsyFxDevice = (ctx: AudioContext) => {
    ensureFinalMixBus(ctx);
    if (!args.enterHoldPsyFxRef.current) {
      const device = createEnterHoldPsyFxDevice(ctx, {
        destination: getLiveMasterEffectBus(ctx, "enterHoldPsyFx"),
        enabled: args.enterHoldPsyFxEnabled,
        bpm: args.nexusParamsRef.current.quantizeBpm,
        depth: args.enterHoldPsyFxUi.depth,
        color: args.enterHoldPsyFxUi.color,
        flicker: args.enterHoldPsyFxUi.flicker,
        mix: args.enterHoldPsyFxUi.mix,
        bassMotion: args.enterHoldPsyFxUi.bassMotion,
        outputGain: args.enterHoldPsyFxUi.outputGain,
      });
      args.enterHoldPsyFxRef.current = device;
      const waveSend = ctx.createGain();
      waveSend.gain.value = 0;
      waveSend.connect(device.waveInput);
      args.enterHoldPsyFxSendsRef.current.waves = waveSend;
      const bassSend = ctx.createGain();
      bassSend.gain.value = 0;
      bassSend.connect(device.bassInput);
      args.enterHoldPsyFxSendsRef.current.bass = bassSend;
    }
    return args.enterHoldPsyFxRef.current;
  };

  const ensureSchwarmdeuterDevice = (ctx: AudioContext) => {
    ensureFinalMixBus(ctx);
    if (!args.schwarmdeuterRef.current) {
      const device = new Schwarmdeuter(ctx, {
        params: {
          amount: args.schwarmUi.amount,
          interpretiveBias: args.schwarmUi.interpretiveBias,
          sensitivity: args.schwarmUi.sensitivity,
          memorySeconds: args.schwarmUi.memorySeconds,
          densityBias: args.schwarmUi.densityBias,
          weave: args.schwarmUi.weave,
          material: args.schwarmUi.material,
          bypass: !args.schwarmEnabled,
        },
      });
      device.connect(getLiveMasterEffectBus(ctx, "schwarmdeuter"));
      args.schwarmdeuterRef.current = device;
      (Object.keys(args.schwarmdeuterSendsRef.current) as Array<keyof typeof args.schwarmdeuterSendsRef.current>).forEach((key) => {
        const send = ctx.createGain();
        send.gain.value = 0;
        send.connect(device.input);
        args.schwarmdeuterSendsRef.current[key] = send;
      });
      if (args.nexusRefs.current.droneVolumeBus && args.schwarmdeuterSendsRef.current.drone) {
        args.nexusRefs.current.droneVolumeBus.connect(args.schwarmdeuterSendsRef.current.drone);
      }
      if (args.nexusRefs.current.myzelMasterGain && args.schwarmdeuterSendsRef.current.myzel) {
        args.nexusRefs.current.myzelMasterGain.connect(args.schwarmdeuterSendsRef.current.myzel);
      }
    }
    return args.schwarmdeuterRef.current;
  };

  const ensureMyzelPostFxRouter = (ctx: AudioContext) => {
    ensureFinalMixBus(ctx);
    if (!args.myzelPostFxRouterRef.current) {
      const router = createMyzelPostFxRouter(ctx, getLiveMasterEffectBus(ctx, "myzelPostFx"));
      args.myzelPostFxRouterRef.current = router;
      (Object.keys(args.myzelPostFxSendsRef.current) as MyzelPostFxSourceKey[]).forEach((key) => {
        args.myzelPostFxSendsRef.current[key] = router.inputs[key];
      });
    }
    if (args.nexusRefs.current.droneVolumeBus && args.myzelPostFxSendsRef.current.drone && !args.myzelPostFxConnectionsRef.current.drone) {
      args.nexusRefs.current.droneVolumeBus.connect(args.myzelPostFxSendsRef.current.drone);
      args.myzelPostFxConnectionsRef.current.drone = true;
    }
    if (args.nexusRefs.current.myzelMasterGain && args.myzelPostFxSendsRef.current.myzel && !args.myzelPostFxConnectionsRef.current.myzel) {
      args.nexusRefs.current.myzelMasterGain.connect(args.myzelPostFxSendsRef.current.myzel);
      args.myzelPostFxConnectionsRef.current.myzel = true;
    }
    return args.myzelPostFxRouterRef.current;
  };

  const collectSchwarmSnapshots = (): ParticleVoiceSnapshot[] => {
    const nowMs = performance.now();
    const out: ParticleVoiceSnapshot[] = [];
    args.nexusRefs.current.agents.slice(0, 40).forEach((agent: any, index: number) => {
      const recent = Number.isFinite(agent.lastHit) ? Math.max(0, 1 - (nowMs - agent.lastHit) / 420) : 0;
      out.push({
        id: `agent-${index}`,
        x: agent.x,
        y: agent.y,
        vx: agent.vx,
        vy: agent.vy,
        life: recent,
        energy: Math.max(0.12, agent.lastHitGain || recent || 0.2),
        ratio: agent.ratio,
        freq: 220 * Math.max(0.125, agent.ratio),
        hue: ((agent.ratio * 180) % 360 + 360) % 360,
        justSpawned: recent > 0.75,
      });
    });
    args.gameRefs.current.particles.slice(0, 24).forEach((particle: any, index: number) => {
      out.push({
        id: `game-${index}`,
        x: particle.x,
        y: particle.y,
        vx: particle.vx,
        vy: particle.vy,
        life: particle.life,
        energy: Math.max(0.08, particle.life),
        hue: particle.hue,
        justSpawned: particle.life > 0.82,
      });
    });
    return out;
  };

  return {
    ensureFinalMixBus,
    ensureDrumMixBus,
    getLiveMasterBus,
    getLiveMasterEffectBus,
    ensureRecordingDestination,
    ensureExternalGameRecordingCaptureBus,
    recordAudioTapSnapshot,
    beginTransientEvent,
    ensureCollectiveMemoryFx,
    ensurePsychedelicSpiralDevice,
    ensureTransientDriveDevice,
    ensureEnterHoldPsyFxDevice,
    ensureSchwarmdeuterDevice,
    ensureMyzelPostFxRouter,
    collectSchwarmSnapshots,
    audioDeviceRackRuntimeBoundaryExtractedFromAppTsx: true,
    noWaveStarterBassOrRootFollowHotPathMoved: true,
    fullBrowserSanityRequiredAfterThisCut: true,
  };
}
