import { useEffect } from "react";
import { createControlScheduler } from "../../resonance/controlScheduler";
import { createAppAudioControlSchedulerTasks } from "./audioControlSchedulerTasks";
import type { AppAudioControlSchedulerRuntimeBoundaryArgs } from "./audioControlSchedulerRuntimeTypes";

export function useAppAudioControlSchedulerRuntimeBoundary(args: AppAudioControlSchedulerRuntimeBoundaryArgs): void {
  useEffect(() => {
    const { audioCtx } = args;
    if (!audioCtx) return;
    args.ensureFinalMixBus(audioCtx);
    args.ensureCollectiveMemoryFx(audioCtx);
    args.ensureTransientDriveDevice(audioCtx);
    args.ensureEnterHoldPsyFxDevice(audioCtx);
    args.ensureSchwarmdeuterDevice(audioCtx);
    const spiralDevice = args.ensurePsychedelicSpiralDevice(audioCtx);
    if (!spiralDevice) return;

    args.collectiveMemoryWindowRef.current = args.collectiveMemoryWindow;

    const scheduler = createControlScheduler({
      getAudioNow: () => audioCtx.currentTime,
      shouldRun: () => audioCtx.state === "running",
      onMetrics: (metrics) => {
        args.setControlPerfMonitor(metrics);
      },
      tasks: createAppAudioControlSchedulerTasks(args),
    });

    scheduler.start();
    return () => {
      scheduler.stop();
    };
  }, [
    args.audioCtx,
    args.collectiveMemoryEnabled,
    args.collectiveMemoryWindow,
    args.collectiveMemoryUi,
    args.psychedelicSpiralEnabled,
    args.psychedelicSpiralFollow,
    args.psychedelicSpiralUi,
    args.transientDriveUi,
    args.nParamsUI.droneDriveOn,
    args.nParamsUI.droneDriveAmount,
    args.nParamsUI.droneDriveTone,
    args.nParamsUI.droneDriveMix,
    args.nParamsUI.droneDriveOutput,
    args.myzelEnabled,
    args.room3BodyEnabled,
    args.myzelPostFxEnabled,
    args.myzelPostFxGroup,
    args.myzelPostFxDepth,
    args.myzelPostFxParallel,
    args.droneVolume,
    args.waveSoundEnabled,
    args.waveSoundVolume,
    args.nParamsUI.materialLoopActive,
    args.nParamsUI.materialLoopVolume,
    args.nParamsUI.particleVolume,
    args.liveMasteringEnabled,
    args.liveMasteringStrength,
    args.liveMasteringGlue,
    args.liveMasteringAir,
    args.schwarmEnabled,
    args.schwarmUi,
  ]);
}
