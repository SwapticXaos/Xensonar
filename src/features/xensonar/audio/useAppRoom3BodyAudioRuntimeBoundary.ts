import { useEffect, type MutableRefObject } from "react";
import { deriveRoom3ModField } from "../../resonance/modField";
import { deriveRoom3TimbreState, type Room3BodyControls, type Room3TimbreState } from "../../resonance/timbreModel";
import { deriveRoom3ModalBody, type Room3ModalBodyState } from "../../resonance/modalBody";
import { resolveInterpreterMyzelBaseHz, type MyzelInterpreterMix } from "../../resonance/interpreterConfig";
import { DRONE_MAX_FREQ, DRONE_MIN_FREQ, type DronePreset } from "../domain/instrumentData";
import type { MyceliumSnapshot } from "../../topology/myceliumSnapshot";
import type { ResonanceNexusRuntimeRefObject } from "../rooms/resonanceNexusRuntimeRefs";
import { createMyzelDriveCurve, createSoftClipCurve, freqFromY } from "../rooms/resonanceRuntimeMath";

type Room3BodyAudioParams = {
  readonly bassRootMode: "fixed" | string;
  readonly bassRootHz: number;
  readonly dronePreset: DronePreset;
};

type Room3BodyCurveState = {
  pre: number;
  post: number;
};

type AppRoom3BodyAudioRuntimeBoundaryDeps = {
  readonly audioCtx: AudioContext | null;
  readonly nexusActive: boolean;
  readonly nexusRefs: ResonanceNexusRuntimeRefObject;
  readonly myzelEnabled: boolean;
  readonly nParamsUI: Room3BodyAudioParams;
  readonly myceliumSnapshotRef: MutableRefObject<MyceliumSnapshot>;
  readonly myzelGateRef: MutableRefObject<number>;
  readonly room3BodyControlsRef: MutableRefObject<Room3BodyControls>;
  readonly myzelInterpreterMixRef: MutableRefObject<MyzelInterpreterMix>;
  readonly myzelPrimedYRef: MutableRefObject<number | null>;
  readonly room3ModFieldRef: MutableRefObject<ReturnType<typeof deriveRoom3ModField>>;
  readonly room3TimbreStateRef: MutableRefObject<Room3TimbreState>;
  readonly room3ModalStateRef: MutableRefObject<Room3ModalBodyState | null>;
  readonly room3BodyEnabledRef: MutableRefObject<boolean>;
  readonly myzelTopologyModeRef: MutableRefObject<string>;
  readonly room3BodyCurveRef: MutableRefObject<Room3BodyCurveState>;
  readonly getLiveMasterBus: (ctx: AudioContext, role?: "main" | "drone" | "rhythm" | "space") => GainNode;
  readonly noUiChangedByBoundary: true;
  readonly noRouteRewrite: true;
  readonly noModalBodyNormalization: true;
  readonly noWaveStarterOrRootFollowPolicyOwnedHere: true;
};

export type AppRoom3BodyAudioRuntimeBoundary = {
  readonly room3BodyAudioRuntimeBoundaryExtractedFromAppTsx: true;
  readonly ownsCreationRafAndCleanupAsOneBody: true;
  readonly preservesBodyExciterInletSemantics: true;
  readonly preservesWarmGraphBypassSemantics: true;
  readonly noUiChangedByBoundary: true;
  readonly noWaveStarterOrRootFollowPolicyOwnedHere: true;
};

export function useAppRoom3BodyAudioRuntimeBoundary(
  args: AppRoom3BodyAudioRuntimeBoundaryDeps,
): AppRoom3BodyAudioRuntimeBoundary {
  const {
    audioCtx,
    nexusActive,
    nexusRefs,
    myzelEnabled,
    nParamsUI,
    myceliumSnapshotRef,
    myzelGateRef,
    room3BodyControlsRef,
    myzelInterpreterMixRef,
    myzelPrimedYRef,
    room3ModFieldRef,
    room3TimbreStateRef,
    room3ModalStateRef,
    room3BodyEnabledRef,
    myzelTopologyModeRef,
    room3BodyCurveRef,
    getLiveMasterBus,
  } = args;

  useEffect(() => {
    if (!audioCtx || !nexusActive) return;

    const refs = nexusRefs.current;
    const ctx = audioCtx;

    if (!refs.noiseBuffer) {
      const bufferSize = ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1;
      refs.noiseBuffer = buffer;
    }

    if (!refs.room3BodyMaster) {
      const noiseSource = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      const pulseOsc = ctx.createOscillator();
      const pulseGain = ctx.createGain();
      const exciterGain = ctx.createGain();
      const preDriveGain = ctx.createGain();
      const preDriveShaper = ctx.createWaveShaper();
      const toneBus = ctx.createGain();
      const highpass = ctx.createBiquadFilter();
      const lowpass = ctx.createBiquadFilter();
      const postDriveShaper = ctx.createWaveShaper();
      const master = ctx.createGain();
      const modeFilters: BiquadFilterNode[] = [];
      const modeGains: GainNode[] = [];

      noiseSource.buffer = refs.noiseBuffer;
      noiseSource.loop = true;
      noiseGain.gain.value = 0.0001;
      pulseOsc.type = "square";
      pulseOsc.frequency.value = 220;
      pulseGain.gain.value = 0.0001;
      exciterGain.gain.value = 0.0001;
      preDriveGain.gain.value = 1;
      preDriveShaper.curve = createMyzelDriveCurve(0.18);
      preDriveShaper.oversample = "4x";
      highpass.type = "highpass";
      highpass.frequency.value = 120;
      lowpass.type = "lowpass";
      lowpass.frequency.value = 4200;
      postDriveShaper.curve = createSoftClipCurve(0.18);
      postDriveShaper.oversample = "4x";
      master.gain.value = 0.0001;

      noiseSource.connect(noiseGain);
      pulseOsc.connect(pulseGain);
      noiseGain.connect(exciterGain);
      pulseGain.connect(exciterGain);
      exciterGain.connect(preDriveGain);
      preDriveGain.connect(preDriveShaper);

      for (let i = 0; i < 4; i += 1) {
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        filter.type = "bandpass";
        filter.frequency.value = 220 * (1.2 + i * 0.44);
        filter.Q.value = 3.5 + i;
        gain.gain.value = 0.0001;
        preDriveShaper.connect(filter);
        filter.connect(gain);
        gain.connect(toneBus);
        modeFilters.push(filter);
        modeGains.push(gain);
      }

      toneBus.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(postDriveShaper);
      postDriveShaper.connect(master);
      master.connect(refs.droneGroupBus ?? getLiveMasterBus(ctx, "drone"));

      noiseSource.start();
      pulseOsc.start();

      refs.room3BodyNoiseSource = noiseSource;
      refs.room3BodyNoiseGain = noiseGain;
      refs.room3BodyPulseOsc = pulseOsc;
      refs.room3BodyPulseGain = pulseGain;
      refs.room3BodyExciterGain = exciterGain;
      refs.room3BodyPreDriveGain = preDriveGain;
      refs.room3BodyPreDriveShaper = preDriveShaper;
      refs.room3BodyToneBus = toneBus;
      refs.room3BodyHighpass = highpass;
      refs.room3BodyLowpass = lowpass;
      refs.room3BodyPostDriveShaper = postDriveShaper;
      refs.room3BodyMaster = master;
      refs.room3BodyModeFilters = modeFilters;
      refs.room3BodyModeGains = modeGains;
    }

    let raf = 0;
    const tick = () => {
      const now = ctx.currentTime;
      const snapshot = myceliumSnapshotRef.current;
      const gate = myzelEnabled ? myzelGateRef.current : 0;
      const controls = room3BodyControlsRef.current;
      const mix = myzelInterpreterMixRef.current;
      const baseHz = nParamsUI.bassRootMode === "fixed"
        ? nParamsUI.bassRootHz
        : resolveInterpreterMyzelBaseHz(
            myzelPrimedYRef.current,
            nexusRefs.current.cursorY,
            snapshot,
            freqFromY,
            DRONE_MIN_FREQ,
            DRONE_MAX_FREQ,
            mix.hybridBlend,
          );

      const modField = deriveRoom3ModField(snapshot, gate, controls);
      room3ModFieldRef.current = modField;
      const timbreState = deriveRoom3TimbreState(snapshot, modField, controls);
      room3TimbreStateRef.current = timbreState;
      const modalState = deriveRoom3ModalBody(snapshot, baseHz, timbreState, modField, nParamsUI.dronePreset);
      room3ModalStateRef.current = modalState;

      const bypass = !myzelEnabled || !room3BodyEnabledRef.current || myzelTopologyModeRef.current === "installation";
      const activeMaster = bypass ? 0.0001 : modalState.masterGain;
      const exciterOpen = bypass ? 0.0001 : 0.55 + modField.gateBody * 0.45;

      refs.room3BodyPulseOsc?.frequency.setTargetAtTime(modalState.pulseFrequency, now, 0.06);
      refs.room3BodyPulseGain?.gain.setTargetAtTime(bypass ? 0.0001 : modalState.exciterGain * (0.72 + timbreState.exciterHardness * 0.42), now, 0.04);
      refs.room3BodyNoiseGain?.gain.setTargetAtTime(bypass ? 0.0001 : modalState.noiseGain, now, 0.04);
      refs.room3BodyExciterGain?.gain.setTargetAtTime(exciterOpen, now, 0.05);
      refs.room3BodyPreDriveGain?.gain.setTargetAtTime(bypass ? 1 : 1 + modalState.preDriveAmount * 5.5, now, 0.05);
      refs.room3BodyHighpass?.frequency.setTargetAtTime(modalState.highpassHz, now, 0.06);
      refs.room3BodyLowpass?.frequency.setTargetAtTime(modalState.lowpassHz, now, 0.06);
      refs.room3BodyMaster?.gain.setTargetAtTime(activeMaster, now, 0.08);

      if (refs.room3BodyPreDriveShaper) {
        const next = modalState.preDriveAmount;
        if (Math.abs(next - room3BodyCurveRef.current.pre) > 0.03) {
          room3BodyCurveRef.current.pre = next;
          refs.room3BodyPreDriveShaper.curve = createMyzelDriveCurve(next);
          refs.room3BodyPreDriveShaper.oversample = "4x";
        }
      }

      if (refs.room3BodyPostDriveShaper) {
        const next = modalState.postDriveAmount;
        if (Math.abs(next - room3BodyCurveRef.current.post) > 0.03) {
          room3BodyCurveRef.current.post = next;
          refs.room3BodyPostDriveShaper.curve = createSoftClipCurve(next);
          refs.room3BodyPostDriveShaper.oversample = "4x";
        }
      }

      refs.room3BodyModeFilters.forEach((filter, idx) => {
        const mode = modalState.modes[idx] ?? modalState.modes[modalState.modes.length - 1];
        if (!mode) return;
        filter.frequency.setTargetAtTime(mode.freq, now, 0.05);
        filter.Q.setTargetAtTime(mode.q, now, 0.06);
      });
      refs.room3BodyModeGains.forEach((gainNode, idx) => {
        const mode = modalState.modes[idx] ?? modalState.modes[modalState.modes.length - 1];
        if (!mode) return;
        gainNode.gain.setTargetAtTime(bypass ? 0.0001 : mode.gain, now, 0.05);
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      try { refs.room3BodyNoiseSource?.stop(); } catch {}
      try { refs.room3BodyPulseOsc?.stop(); } catch {}
      [
        refs.room3BodyNoiseSource,
        refs.room3BodyNoiseGain,
        refs.room3BodyPulseOsc,
        refs.room3BodyPulseGain,
        refs.room3BodyExciterGain,
        refs.room3BodyPreDriveGain,
        refs.room3BodyPreDriveShaper,
        refs.room3BodyToneBus,
        refs.room3BodyHighpass,
        refs.room3BodyLowpass,
        refs.room3BodyPostDriveShaper,
        refs.room3BodyMaster,
        ...refs.room3BodyModeFilters,
        ...refs.room3BodyModeGains,
      ].forEach((node) => {
        try { node?.disconnect(); } catch {}
      });
      refs.room3BodyNoiseSource = null;
      refs.room3BodyNoiseGain = null;
      refs.room3BodyPulseOsc = null;
      refs.room3BodyPulseGain = null;
      refs.room3BodyExciterGain = null;
      refs.room3BodyPreDriveGain = null;
      refs.room3BodyPreDriveShaper = null;
      refs.room3BodyToneBus = null;
      refs.room3BodyHighpass = null;
      refs.room3BodyLowpass = null;
      refs.room3BodyPostDriveShaper = null;
      refs.room3BodyMaster = null;
      refs.room3BodyModeFilters = [];
      refs.room3BodyModeGains = [];
    };
  }, [
    audioCtx,
    nexusActive,
    myzelEnabled,
    nParamsUI.bassRootMode,
    nParamsUI.bassRootHz,
    nParamsUI.dronePreset,
  ]);

  return {
    room3BodyAudioRuntimeBoundaryExtractedFromAppTsx: true,
    ownsCreationRafAndCleanupAsOneBody: true,
    preservesBodyExciterInletSemantics: true,
    preservesWarmGraphBypassSemantics: true,
    noUiChangedByBoundary: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  };
}
