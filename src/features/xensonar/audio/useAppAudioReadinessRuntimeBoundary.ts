import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { recordAudioPressureAdaptiveAction } from "../../../core/audio/audioPressureMap";
import { ensureXensonarBlobWorkletSmokeTest } from "../../../core/audio/xensonarBlobWorkletSmokeTest";
import { reportXensonarPromiseFailure } from "../diagnostics/runtimeIssueReporter";
import { scheduleSilentAudioWarmupSweep } from "./silentAudioWarmup";
import { prewarmLiveMelodicSampleSelections } from "../../soundLibrary/liveMelodicSampleLoad";

export type AppAudioReadinessRuntimeBoundaryArgs = {
  readonly audioCtx: AudioContext | null;
  readonly setAudioCtx: Dispatch<SetStateAction<AudioContext | null>>;
  readonly audioCtxRef: MutableRefObject<AudioContext | null>;
  readonly audioWarmupDoneRef: MutableRefObject<boolean>;
  readonly audioWarmupPromiseRef: MutableRefObject<Promise<void> | null>;
  readonly keyboardPitchAudioReadyLatchRef: MutableRefObject<{ ready: boolean; pending: boolean }>;
  readonly ensureFinalMixBus: (ctx: AudioContext) => GainNode;
  readonly getLiveMasterBus: (ctx: AudioContext, role?: "main" | "drone" | "rhythm" | "space") => GainNode;
  readonly applyRealtimeDroneOvertones: () => void;
  readonly ensureMyzelSynth: (ctx: AudioContext) => unknown;
  readonly liveDeviceWarmups?: ReadonlyArray<{
    id: string;
    ensure: (ctx: AudioContext) => unknown;
  }>;
  readonly getLiveSampleSelections?: () => ReadonlyArray<string | null | undefined>;
};

export type AppAudioReadinessRuntimeBoundary = {
  readonly initAudio: () => Promise<AudioContext>;
  readonly prewarmAudioRuntime: (ctx: AudioContext) => Promise<void> | void;
  readonly ensureAudioReady: () => Promise<AudioContext>;
  readonly ensureKeyboardPitchAudioReadyOnce: () => boolean;
  readonly warmMyzelAudioRuntime: () => void;
  readonly audioReadinessRuntimeBoundaryExtractedFromAppTsx: true;
  readonly noWaveStarterBassRootFollowOrRoom3BodyHotPathMoved: true;
  readonly fullBrowserSanityRequiredAfterThisCut: true;
};

export function useAppAudioReadinessRuntimeBoundary(args: AppAudioReadinessRuntimeBoundaryArgs): AppAudioReadinessRuntimeBoundary {
  const initAudio = async () => {
    if (!args.audioCtx) {
      const ctx = new window.AudioContext({ latencyHint: "interactive" });
      await ctx.resume();
      args.ensureFinalMixBus(ctx);
      args.audioCtxRef.current = ctx;
      args.setAudioCtx(ctx);
      return ctx;
    }
    if (args.audioCtx.state !== "running") {
      await args.audioCtx.resume();
    }
    args.audioCtxRef.current = args.audioCtx;
    args.ensureFinalMixBus(args.audioCtx);
    return args.audioCtx;
  };

  const prewarmAudioRuntime = async (ctx: AudioContext) => {
    if (args.audioWarmupDoneRef.current) return;
    if (args.audioWarmupPromiseRef.current) return args.audioWarmupPromiseRef.current;

    const warmup = (async () => {
      const mainBus = args.ensureFinalMixBus(ctx);
      const droneBus = args.getLiveMasterBus(ctx, "drone");
      const rhythmBus = args.getLiveMasterBus(ctx, "rhythm");
      const spaceBus = args.getLiveMasterBus(ctx, "space");

      // Build the stable rack while the player is explicitly waiting for power-on,
      // so the first played attack does not pay for a stack of effect constructors.
      for (const device of args.liveDeviceWarmups ?? []) {
        try {
          device.ensure(ctx);
        } catch (error) {
          reportXensonarPromiseFailure("audio", `live-device-warmup-${device.id}`, error);
        }
      }

      // Prime the common short-tone graph paths before the first dense user burst hits the graph.
      // The helper is intentionally zero-output so a room-navigation click cannot become audible.
      scheduleSilentAudioWarmupSweep(ctx, [mainBus, mainBus, droneBus, rhythmBus, spaceBus]);

      // Also instantiate the regular drone/body buses once so the first user gesture is not paying that cost.
      args.applyRealtimeDroneOvertones();
      args.ensureMyzelSynth(ctx);

      // Sample decode is opportunistic and shares the live in-flight cache. Power-on
      // remains bounded even for a very large user recording.
      void prewarmLiveMelodicSampleSelections(ctx, args.getLiveSampleSelections?.() ?? [])
        .catch((error) => reportXensonarPromiseFailure("samples", "live-sample-selection-warmup", error));

      // Audio-Engine 3.2.91.6.1.1: prove that a Blob-URL AudioWorklet can load in
      // the current singlefile/browser context without touching Root-Follow, Partikel
      // or Resident rendering. Local file:// contexts are treated as unsupported
      // so Opera does not emit blocked blob:null resource errors during normal testing.
      void ensureXensonarBlobWorkletSmokeTest(ctx);

      await new Promise<void>((resolve) => window.setTimeout(resolve, 260));
      args.audioWarmupDoneRef.current = true;
    })();
    args.audioWarmupPromiseRef.current = warmup.finally(() => {
      args.audioWarmupPromiseRef.current = null;
    });
    return args.audioWarmupPromiseRef.current;
  };

  const ensureAudioReady = async () => {
    const ctx = await initAudio();
    if (ctx.state !== "running") {
      await ctx.resume();
    }
    args.ensureFinalMixBus(ctx);
    void prewarmAudioRuntime(ctx)
      .catch((error) => reportXensonarPromiseFailure("audio", "live-runtime-warmup", error));
    args.keyboardPitchAudioReadyLatchRef.current.ready = ctx.state === "running";
    return ctx;
  };

  const ensureKeyboardPitchAudioReadyOnce = () => {
    const latch = args.keyboardPitchAudioReadyLatchRef.current;
    const existingCtx = args.audioCtxRef.current ?? args.audioCtx;
    if (existingCtx?.state === "running") {
      latch.ready = true;
      return true;
    }
    if (latch.ready) return true;
    if (!latch.pending) {
      latch.pending = true;
      recordAudioPressureAdaptiveAction("keyboard-input-audio-ready-latched");
      void ensureAudioReady()
        .then(() => {
          args.keyboardPitchAudioReadyLatchRef.current.ready = true;
        })
        .catch((error) => reportXensonarPromiseFailure("audio", "keyboard-pitch-audio-ready-latch", error))
        .finally(() => {
          args.keyboardPitchAudioReadyLatchRef.current.pending = false;
        });
    }
    return false;
  };

  const warmMyzelAudioRuntime = () => {
    void (async () => {
      const ctx = await ensureAudioReady();
      await prewarmAudioRuntime(ctx);
    })().catch((error) => reportXensonarPromiseFailure("audio", "myzel-runtime-warmup", error));
  };

  return {
    initAudio,
    prewarmAudioRuntime,
    ensureAudioReady,
    ensureKeyboardPitchAudioReadyOnce,
    warmMyzelAudioRuntime,
    audioReadinessRuntimeBoundaryExtractedFromAppTsx: true,
    noWaveStarterBassRootFollowOrRoom3BodyHotPathMoved: true,
    fullBrowserSanityRequiredAfterThisCut: true,
  };
}
