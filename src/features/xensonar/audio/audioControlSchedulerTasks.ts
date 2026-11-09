import type { ControlTask } from "../../resonance/controlScheduler";
import { pushDescriptorFrame, readDescriptorProbe, summarizeDescriptorHistory, type CollectiveMemoryEffect } from "../../resonance/collectiveMemoryEffect";
import { updateLiveMasteringSystem } from "../../resonance/liveMastering";
import { updateMyzelPostFxRouter } from "../../resonance/myzelPostFxRouter";
import { updateTransientDriveDevice } from "../../resonance/transientDriveDevice";
import { GAME_HEIGHT, GAME_WIDTH, PARTICLE_VOLUME_MAX } from "../domain/instrumentData";
import { clamp } from "../rooms/resonanceRuntimeMath";
import type { AppAudioControlSchedulerRuntimeBoundaryArgs } from "./audioControlSchedulerRuntimeTypes";

export function createAppAudioControlSchedulerTasks(
  args: AppAudioControlSchedulerRuntimeBoundaryArgs,
): ControlTask[] {
  let lastCollectiveUiPush = 0;
  let lastSpiralUiPush = 0;
  let lastSchwarmUiPush = 0;
  let lastMyzelPostFxUiPush = 0;
  let lastMasterUiPush = 0;

  return [
        {
          id: "collective-memory",
          intervalMs: 180,
          run: ({ audioNow, perfNow }) => {
            const fx = args.collectiveFxRef.current;
            const hasActiveRoute = args.collectiveMemoryEnabled && (Object.entries(args.collectiveMemoryUi) as Array<[keyof typeof args.collectiveMemoryUi, (typeof args.collectiveMemoryUi)[keyof typeof args.collectiveMemoryUi]]>).some(([, config]) => config.enabled && (config.send > 0.002 || config.wet > 0.002));

            (Object.entries(args.collectiveMemoryUi) as Array<[keyof typeof args.collectiveMemoryUi, (typeof args.collectiveMemoryUi)[keyof typeof args.collectiveMemoryUi]]>).forEach(([key, config]) => {
              const device = fx[key as string];
              if (!device) return;
              const active = hasActiveRoute && config.enabled;
              device.setSendLevel(active ? config.send : 0);
              device.setWet(active ? config.wet : 0);
            });

            if (!hasActiveRoute) {
              args.collectiveMemorySummaryRef.current = null;
              if (perfNow - lastCollectiveUiPush > 420) {
                lastCollectiveUiPush = perfNow;
                args.setCollectiveMemoryMonitor(null);
              }
              return;
            }

            const probe = args.finalMixProbeRef.current;
            if (!probe) return;
            const frame = readDescriptorProbe(probe, audioNow);
            pushDescriptorFrame(args.collectiveMemoryFramesRef.current, frame, args.collectiveMemoryWindowRef.current);
            const memory = summarizeDescriptorHistory(args.collectiveMemoryFramesRef.current, args.collectiveMemoryWindowRef.current);
            args.collectiveMemorySummaryRef.current = memory;
            (Object.values(fx).filter(Boolean) as CollectiveMemoryEffect[]).forEach((device) => device.updateFromMemory(memory, audioNow));
            if (perfNow - lastCollectiveUiPush > 360) {
              lastCollectiveUiPush = perfNow;
              args.setCollectiveMemoryMonitor(memory);
            }
          },
        },
        {
          id: "psychedelic-spiral",
          intervalMs: 66,
          run: ({ audioNow, perfNow }) => {
            const device = args.psychedelicSpiralRef.current;
            if (!device) return;

            const snapshot = args.myceliumSnapshotRef.current;
            const body = args.room3TimbreStateRef.current;
            const follow = clamp(args.psychedelicSpiralFollow, 0, 1);
            const effective = {
              enabled: args.psychedelicSpiralEnabled,
              drive: clamp(args.psychedelicSpiralUi.drive + follow * (body.saturationPre * 0.26 + snapshot.maxEnergy * 0.18), 0, 1),
              color: clamp(args.psychedelicSpiralUi.color + follow * (body.air * 0.16 + snapshot.constellationBrightness * 0.22), 0, 1),
              motion: clamp(args.psychedelicSpiralUi.motion + follow * (snapshot.constellationFlux * 0.28 + (1 - body.driftCoherence) * 0.24), 0, 1),
              feedback: clamp(args.psychedelicSpiralUi.feedback + follow * (snapshot.constellationTension * 0.2 + body.inharmonicity * 0.18), 0, 1),
              bloom: clamp(args.psychedelicSpiralUi.bloom + follow * (body.resonanceFocus * 0.22 + body.bodyMix * 0.18), 0, 1),
              mix: clamp(args.psychedelicSpiralUi.mix, 0, 1),
              stereoWidth: clamp(args.psychedelicSpiralUi.stereoWidth + follow * (body.partialGroups.shimmer * 0.08 + snapshot.constellationFlux * 0.08), 0, 1),
              outputGain: clamp(args.psychedelicSpiralUi.outputGain, 0, 1.5),
            };
            device.setOptions(effective);

            const sourceStates = {
              drone: args.psychedelicSpiralUi.drone,
              particles: args.psychedelicSpiralUi.particles,
              waves: args.psychedelicSpiralUi.waves,
              myzel: args.psychedelicSpiralUi.myzel,
            };
            (Object.keys(sourceStates) as Array<keyof typeof sourceStates>).forEach((key) => {
              const sendNode = args.psychedelicSpiralSendsRef.current[key];
              if (!sendNode) return;
              const cfg = sourceStates[key];
              const level = args.psychedelicSpiralEnabled && cfg.enabled ? cfg.send : 0;
              sendNode.gain.setTargetAtTime(level, audioNow, 0.08);
            });

            if (perfNow - lastSpiralUiPush > 320) {
              lastSpiralUiPush = perfNow;
              args.setPsychedelicSpiralMonitor({
                drive: effective.drive,
                color: effective.color,
                motion: effective.motion,
                feedback: effective.feedback,
                bloom: effective.bloom,
                mix: effective.mix,
                width: effective.stereoWidth,
              });
            }
          },
        },
        {
          id: "transient-drive",
          intervalMs: 74,
          run: ({ audioNow }) => {
            const device = args.transientDriveFxRef.current;
            if (!device) return;
            const snapshot = args.myceliumSnapshotRef.current;
            const body = args.room3TimbreStateRef.current;
            updateTransientDriveDevice(device, audioNow, {
              enabled: !!args.nParamsUI.droneDriveOn,
              amount: args.nParamsUI.droneDriveAmount ?? 0.36,
              tone: args.nParamsUI.droneDriveTone ?? 0.56,
              mix: clamp((args.nParamsUI.droneDriveMix ?? 0.48) * 0.9, 0, 1),
              output: args.nParamsUI.droneDriveOutput ?? 0.9,
              myzelGate: args.myzelEnabled ? args.myzelGateRef.current : 0,
              shimmer: args.myzelEnabled ? (args.myzelLayerModRef.current?.shimmer ?? 0) : 0,
              bodyCoupling: args.room3BodyEnabled ? args.room3BodyControlsRef.current.coupling : 0,
              bodyFlux: args.room3BodyEnabled ? snapshot.constellationFlux : 0,
              bodyTension: args.room3BodyEnabled ? snapshot.constellationTension : 0,
              bodyRoughness: args.room3BodyEnabled ? args.room3BodyControlsRef.current.roughness : 0,
              resonanceFocus: args.room3BodyEnabled ? body.resonanceFocus : 0.5,
            });

            const sourceStates = {
              drone: args.transientDriveUi.drone,
              particles: args.transientDriveUi.particles,
              waves: args.transientDriveUi.waves,
              myzel: args.transientDriveUi.myzel,
            };
            (Object.keys(sourceStates) as Array<keyof typeof sourceStates>).forEach((key) => {
              const sendNode = args.transientDriveSendsRef.current[key];
              if (!sendNode) return;
              const cfg = sourceStates[key];
              const level = args.nParamsUI.droneDriveOn && cfg.enabled ? cfg.send : 0;
              sendNode.gain.setTargetAtTime(level, audioNow, 0.08);
            });
          },
        },
        {
          id: "enter-psyfx",
          intervalMs: 72,
          run: ({ audioNow }) => {
            const device = args.enterHoldPsyFxRef.current;
            if (!device) return;
            device.setOptions({
              enabled: args.enterHoldPsyFxEnabled,
              bpm: Math.max(40, args.nexusParamsRef.current.quantizeBpm),
              depth: args.enterHoldPsyFxUi.depth,
              color: args.enterHoldPsyFxUi.color,
              flicker: args.enterHoldPsyFxUi.flicker,
              mix: args.enterHoldPsyFxUi.mix,
              bassMotion: args.enterHoldPsyFxUi.bassMotion,
              outputGain: args.enterHoldPsyFxUi.outputGain,
            }, audioNow);
            if (args.enterHoldPsyFxSendsRef.current.waves) {
              args.enterHoldPsyFxSendsRef.current.waves.gain.setTargetAtTime(args.enterHoldPsyFxEnabled ? args.enterHoldPsyFxUi.waveSend : 0, audioNow, 0.08);
            }
            if (args.enterHoldPsyFxSendsRef.current.bass) {
              args.enterHoldPsyFxSendsRef.current.bass.gain.setTargetAtTime(args.enterHoldPsyFxEnabled && args.enterHoldPsyFxUi.bassLink ? args.enterHoldPsyFxUi.bassSend : 0, audioNow, 0.08);
            }
          },
        },
        {
          id: "schwarmdeuter",
          intervalMs: clamp(args.schwarmUi.updateMs, 80, 260),
          run: ({ audioNow, perfNow }) => {
            const device = args.schwarmdeuterRef.current;
            if (!device) return;
            const sourceStates = {
              drone: args.schwarmUi.drone,
              particles: args.schwarmUi.particles,
              waves: args.schwarmUi.waves,
              myzel: args.schwarmUi.myzel,
            };
            const hasActiveRoute = args.schwarmEnabled && (Object.values(sourceStates) as Array<{ enabled: boolean; send: number }>).some((cfg) => cfg.enabled && cfg.send > 0.002);
            (Object.keys(sourceStates) as Array<keyof typeof sourceStates>).forEach((key) => {
              const sendNode = args.schwarmdeuterSendsRef.current[key];
              if (!sendNode) return;
              const cfg = sourceStates[key];
              sendNode.gain.setTargetAtTime(hasActiveRoute && cfg.enabled ? cfg.send : 0, audioNow, 0.08);
            });
            device.setParams({
              amount: args.schwarmUi.amount,
              interpretiveBias: args.schwarmUi.interpretiveBias,
              sensitivity: args.schwarmUi.sensitivity,
              memorySeconds: args.schwarmUi.memorySeconds,
              densityBias: args.schwarmUi.densityBias,
              weave: args.schwarmUi.weave,
              material: args.schwarmUi.material,
              bypass: !hasActiveRoute,
            });
            if (!hasActiveRoute) {
              if (perfNow - lastSchwarmUiPush > 420) {
                lastSchwarmUiPush = perfNow;
                args.setSchwarmMonitor(null);
              }
              return;
            }
            const particles = args.collectSchwarmSnapshots();
            const state = device.update({
              time: audioNow,
              dt: Math.max(1 / 120, clamp(args.schwarmUi.updateMs, 80, 260) / 1000),
              bounds: { width: GAME_WIDTH, height: GAME_HEIGHT },
              particles,
            });
            if (perfNow - lastSchwarmUiPush > 320) {
              lastSchwarmUiPush = perfNow;
              args.setSchwarmMonitor(state);
            }
          },
        },
        {
          id: "myzel-post-fx",
          intervalMs: 78,
          run: ({ audioNow, perfNow }) => {
            const router = args.myzelPostFxRouterRef.current;
            if (!router) return;
            const sourceLevels = {
              particles: clamp(args.nParamsUI.particleVolume / Math.max(0.001, PARTICLE_VOLUME_MAX), 0, 1),
              drone: clamp(args.droneVolume, 0, 1),
              waves: args.waveSoundEnabled ? clamp(args.waveSoundVolume * 2.4, 0, 1) : 0,
              myzel: args.myzelEnabled ? clamp((args.myzelInterpreterMixRef.current.hybridBlend * 0.35) + (args.myzelInterpreterMixRef.current.weaveBlend * 0.25) + (args.myzelInterpreterMixRef.current.driveAmount * 0.25) + ((args.myzelLayerModRef.current?.shimmer ?? 0) * 0.15), 0, 1) : 0,
              forge: args.nParamsUI.materialLoopActive ? clamp(args.nParamsUI.materialLoopVolume * 2.4, 0, 1) : 0,
            };
            const telemetry = updateMyzelPostFxRouter(router, {
              enabled: args.myzelPostFxEnabled,
              focusGroup: args.myzelPostFxGroup,
              depth: args.myzelPostFxDepth,
              parallel: args.myzelPostFxParallel,
              sourceLevels,
              liveMasterShares: {
                main: args.liveMasterMonitor.main,
                drone: args.liveMasterMonitor.drone,
                rhythm: args.liveMasterMonitor.rhythm,
                space: args.liveMasterMonitor.space,
              },
            }, audioNow);
            if (perfNow - lastMyzelPostFxUiPush > 320) {
              lastMyzelPostFxUiPush = perfNow;
              args.setMyzelPostFxMonitor({ ...telemetry });
            }
          },
        },
        {
          id: "live-mastering",
          intervalMs: 84,
          run: ({ audioNow, perfNow }) => {
            const liveMaster = args.liveMasteringRef.current;
            if (!liveMaster) return;
            const telemetry = updateLiveMasteringSystem(liveMaster, {
              enabled: args.liveMasteringEnabled,
              strength: args.liveMasteringStrength,
              glue: args.liveMasteringGlue,
              air: args.liveMasteringAir,
            }, audioNow);
            args.finalOutputTrimRef.current?.gain.setTargetAtTime(telemetry.trim, audioNow, 0.18);
            if (perfNow - lastMasterUiPush > 320) {
              lastMasterUiPush = perfNow;
              args.setLiveMasterMonitor({ ...telemetry });
            }
          },
        },
        {
          id: "audio-tap-monitor",
          intervalMs: 128,
          run: ({ audioNow }) => {
            if (!args.preFxTapAnalyserRef.current && !args.postFxTapAnalyserRef.current && !args.monitorTapAnalyserRef.current) return;
            args.recordAudioTapSnapshot(audioNow);
          },
        },
  ];
}
