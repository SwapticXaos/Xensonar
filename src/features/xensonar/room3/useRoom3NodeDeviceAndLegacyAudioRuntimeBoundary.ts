import { useRoom3NodeDeviceAudioFrameRuntime } from "./useRoom3NodeDeviceAudioFrameRuntime";
import { useRoom3LegacyTopologyAudioFrameRuntime } from "./useRoom3LegacyTopologyAudioFrameRuntime";
import type { Room3NodeDeviceAndLegacyAudioRuntimeBoundaryArgs } from "./room3NodeDeviceLegacyAudioRuntimeTypes";

export function useRoom3NodeDeviceAndLegacyAudioRuntimeBoundary(args: Room3NodeDeviceAndLegacyAudioRuntimeBoundaryArgs) {
  useRoom3NodeDeviceAudioFrameRuntime(args);
  useRoom3LegacyTopologyAudioFrameRuntime(args);
}
