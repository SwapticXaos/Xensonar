import type { AppXenpolarGameArenaRuntimeBoundary, AppXenpolarGameArenaRuntimeBoundaryArgs } from './useAppXenpolarGameArenaRuntimeBoundary';

const CORE_STATUS = 'Extras nicht im Core-Build.';

function keepCoreArenaDormant(args: AppXenpolarGameArenaRuntimeBoundaryArgs) {
  args.keyRef.current.left = false;
  args.keyRef.current.right = false;
  args.keyRef.current.shoot = false;
  args.setGameActive(false);
  args.setGameHud((hud) => ({ ...hud, score: 0, total: 0, hp: 0, phase: 'Core', time: 0, message: CORE_STATUS }));
  args.setArenaSeedStatus(CORE_STATUS);
}

export function useAppXenpolarGameArenaRuntimeBoundary(
  args: AppXenpolarGameArenaRuntimeBoundaryArgs,
): AppXenpolarGameArenaRuntimeBoundary {
  return {
    enterArenaWorkspace: (startLevel: number) => {
      keepCoreArenaDormant(args);
      args.setRoom(startLevel >= 3 ? 'L3LAB' : 'XENPOLAR');
    },
    startGameRun: async () => keepCoreArenaDormant(args),
  };
}
