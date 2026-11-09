import { useEffect, type MutableRefObject } from "react";
import { type MyceliumSnapshot } from "../../topology/myceliumSnapshot";
import { deriveDroneMyceliumMod, type DroneMyceliumMod } from "../../resonance/myceliumInterpreters";

export type AppResonanceMyceliumDroneModFrameRuntimeArgs = {
  myceliumSnapshotRef: MutableRefObject<MyceliumSnapshot>;
  myceliumDroneAmountRef: MutableRefObject<number>;
  myceliumDroneModRef: MutableRefObject<DroneMyceliumMod>;
};

export function useAppResonanceMyceliumDroneModFrameRuntime(
  args: AppResonanceMyceliumDroneModFrameRuntimeArgs,
) {
  const {
    myceliumSnapshotRef,
    myceliumDroneAmountRef,
    myceliumDroneModRef,
  } = args;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      myceliumDroneModRef.current = deriveDroneMyceliumMod(
        myceliumSnapshotRef.current,
        myceliumDroneAmountRef.current,
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}
