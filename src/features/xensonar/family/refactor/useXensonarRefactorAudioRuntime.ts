import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import type { SharedFieldController } from "./sharedFieldController";
import { applyRefucktorMixParams, closeRefucktorPowerGate, openRefucktorPowerGate } from "./audioRuntime";
import { resolveXensonarSharedAudioOutput } from "../../audio/globalRecordingCaptureBridge";
import { formatFreq, frequencyForStep, getRowCount, quantizedTime, stepFromY, yFromStep } from "./music";
import type { Params } from "./types";
import { createDroneVoice, createEcho, createMediaRecorderNode, scheduleParticleVoice, scheduleWaveStartVoice } from "./voiceRuntime";
import type { XensonarRefactorAstralCursor } from "./useXensonarRefactorKeyboardScope";

type Cursor = { x: number; y: number; active: boolean };

type UseXensonarRefactorAudioRuntimeArgs = {
  params: Params;
  paramsRef: MutableRefObject<Params>;
  powered: boolean;
  poweredRef: MutableRefObject<boolean>;
  sharedField: SharedFieldController | null;
  cursorRef: MutableRefObject<Cursor>;
  astralCursorRef: MutableRefObject<XensonarRefactorAstralCursor>;
  recorderDestinationRef: MutableRefObject<MediaStreamAudioDestinationNode | null>;
  setStatus: (value: string) => void;
  setLastEvent: (value: string) => void;
};

function audioSafeNow(ctx: AudioContext | null) {
  return ctx ? ctx.currentTime : 0;
}

export function useXensonarRefactorAudioRuntime({
  params,
  paramsRef,
  powered,
  poweredRef,
  sharedField,
  cursorRef,
  astralCursorRef,
  recorderDestinationRef,
  setStatus,
  setLastEvent,
}: UseXensonarRefactorAudioRuntimeArgs) {
  const audioRef = useRef<AudioContext | null>(null);
  const ownsAudioContextRef = useRef(false);
  const masterRef = useRef<GainNode | null>(null);
  const powerGateRef = useRef<GainNode | null>(null);
  const outputRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const echoRef = useRef<ReturnType<typeof createEcho> | null>(null);
  const droneRef = useRef<ReturnType<typeof createDroneVoice> | null>(null);
  const droneSignatureRef = useRef<string | null>(null);

  const ensureAudio = useCallback(async () => {
    let ctx = audioRef.current;
    let sharedOutput: AudioNode | null = null;
    if (!ctx) {
      const shared = await resolveXensonarSharedAudioOutput();
      if (shared) {
        ctx = shared.ctx;
        sharedOutput = shared.output;
        ownsAudioContextRef.current = false;
      } else {
        ctx = new AudioContext();
        ownsAudioContextRef.current = true;
      }
      audioRef.current = ctx;

      const master = ctx.createGain();
      master.gain.value = paramsRef.current.masterVolume;
      masterRef.current = master;

      const powerGate = ctx.createGain();
      powerGate.gain.value = 0.0001;
      powerGateRef.current = powerGate;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -22;
      compressor.knee.value = 18;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.18;
      compressorRef.current = compressor;

      const output = ctx.createGain();
      output.gain.value = 0.92;
      outputRef.current = output;

      master.connect(powerGate);
      powerGate.connect(compressor);
      compressor.connect(output);
      output.connect(sharedOutput ?? ctx.destination);

      const echo = createEcho(ctx);
      echo.output.connect(master);
      echoRef.current = echo;

      const recorderDest = createMediaRecorderNode(ctx, master);
      recorderDestinationRef.current = recorderDest;

      applyRefucktorMixParams(ctx.currentTime, master, echo, paramsRef.current);

      setStatus("Audio initialisiert");
    }

    if (ctx.state !== "running") {
      await ctx.resume();
    }

    return ctx;
  }, []);

  useEffect(() => {
    const ctx = audioRef.current;
    if (!ctx) return;
    applyRefucktorMixParams(ctx.currentTime, masterRef.current, echoRef.current, params);
  }, [params.masterVolume, params.echoOn, params.echoFeedback, params.echoMix]);

  const triggerVoice = useCallback(
    async (step: number, velocity = 0.7, panHint = 0, forceTime?: number) => {
      const ctx = await ensureAudio();
      const dest = echoRef.current?.input ?? masterRef.current;
      if (!dest) return;
      const when = forceTime ?? quantizedTime(audioSafeNow(ctx), paramsRef.current);
      const frequency = frequencyForStep(step, paramsRef.current);
      if (sharedField?.active && sharedField.particleSoundsMuted) return;
      scheduleParticleVoice(ctx, dest, frequency, velocity, paramsRef.current.particlePreset, panHint, when);
      setLastEvent(`Particle ${step} • ${formatFreq(frequency)}`);
    },
    [ensureAudio, sharedField],
  );

  const triggerWaveStart = useCallback(
    async (step: number, velocity = 0.45, panHint = 0, forceTime?: number) => {
      const ctx = await ensureAudio();
      const dest = echoRef.current?.input ?? masterRef.current;
      if (!dest) return;
      const when = forceTime ?? quantizedTime(audioSafeNow(ctx), paramsRef.current);
      const frequency = frequencyForStep(step - getRowCount(paramsRef.current.tuning), paramsRef.current);
      scheduleWaveStartVoice(ctx, dest, Math.max(40, frequency), velocity, panHint, when);
      setLastEvent(`Wave start ${step} • ${formatFreq(Math.max(40, frequency))}`);
    },
    [ensureAudio],
  );

  const triggerInstallationNodeVoice = useCallback(
    async (ratio: number, velocity = 0.55, panHint = 0, forceTime?: number) => {
      const ctx = await ensureAudio();
      const dest = echoRef.current?.input ?? masterRef.current;
      if (!dest) return;
      const when = forceTime ?? quantizedTime(audioSafeNow(ctx), paramsRef.current);
      const cursorY = astralCursorRef.current.active
        ? yFromStep(astralCursorRef.current.step, paramsRef.current.tuning, paramsRef.current.gridPerspective, paramsRef.current.tonicHz)
        : cursorRef.current.y;
      const baseStep = stepFromY(cursorY, paramsRef.current.tuning, paramsRef.current.gridPerspective, paramsRef.current.tonicHz);
      const baseFrequency = frequencyForStep(baseStep, paramsRef.current);
      scheduleParticleVoice(ctx, dest, Math.max(40, baseFrequency * Math.max(0.125, ratio)), velocity, paramsRef.current.particlePreset, panHint, when);
      setLastEvent(`Resident ${ratio.toFixed(3)}x • ${formatFreq(Math.max(40, baseFrequency * Math.max(0.125, ratio)))}`);
    },
    [ensureAudio],
  );

  const stopDrone = useCallback(() => {
    if (droneRef.current) {
      droneRef.current.stop();
      droneRef.current = null;
    }
    droneSignatureRef.current = null;
  }, []);

  const startDrone = useCallback(async () => {
    if (!poweredRef.current || !paramsRef.current.droneOn) {
      stopDrone();
      return;
    }
    const ctx = await ensureAudio();
    const dest = echoRef.current?.input ?? masterRef.current;
    if (!dest) return;

    const baseFreq = frequencyForStep(0, paramsRef.current) * 0.5;
    const nextSignature = `${paramsRef.current.dronePreset}:${baseFreq.toFixed(4)}`;
    if (droneRef.current && droneSignatureRef.current === nextSignature) return;

    stopDrone();
    droneRef.current = createDroneVoice(ctx, dest, baseFreq, paramsRef.current.dronePreset);
    droneSignatureRef.current = nextSignature;
  }, [ensureAudio, stopDrone]);

  useEffect(() => {
    if (!powered) {
      stopDrone();
      return;
    }
    void startDrone();
  }, [params.droneOn, params.dronePreset, params.tuning, params.tonicHz, powered, startDrone, stopDrone]);

  const openPowerGate = useCallback((currentTime: number) => {
    openRefucktorPowerGate(powerGateRef.current, currentTime, 0.18);
  }, []);

  const closePowerGate = useCallback((currentTime: number) => {
    closeRefucktorPowerGate(powerGateRef.current, currentTime, 0.11);
  }, []);

  const disposeAudioRuntime = useCallback(() => {
    stopDrone();
    if (audioRef.current && ownsAudioContextRef.current) {
      void audioRef.current.close();
    }
  }, [stopDrone]);

  return {
    audioRef,
    ensureAudio,
    triggerVoice,
    triggerWaveStart,
    triggerInstallationNodeVoice,
    openPowerGate,
    closePowerGate,
    stopDrone,
    disposeAudioRuntime,
  };
}

export function useXensonarRefactorAudioRuntimeCleanup({
  recordingUrl,
  disposeAudioRuntime,
}: {
  recordingUrl: string | null;
  disposeAudioRuntime: () => void;
}) {
  useEffect(() => {
    return () => {
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
      disposeAudioRuntime();
    };
  }, [disposeAudioRuntime, recordingUrl]);
}
