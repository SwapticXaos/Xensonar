import { useEffect, type MutableRefObject } from "react";
import { normalizeNodalDeviceMatrix, type NodalDeviceMatrix } from "@/features/resonance/nodalDeviceMatrix";

export type Room3NodalDeviceStateMirrorArgs = {
  nodalDeviceMatrix: NodalDeviceMatrix;
  nodalDeviceMatrixRef: MutableRefObject<NodalDeviceMatrix>;
};

export const useRoom3NodalDeviceStateMirror = ({
  nodalDeviceMatrix,
  nodalDeviceMatrixRef,
}: Room3NodalDeviceStateMirrorArgs) => {
  useEffect(() => {
    nodalDeviceMatrixRef.current = normalizeNodalDeviceMatrix(nodalDeviceMatrix);
  }, [nodalDeviceMatrix, nodalDeviceMatrixRef]);
};
