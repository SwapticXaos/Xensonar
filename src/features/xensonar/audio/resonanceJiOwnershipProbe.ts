import type { ResonanceNexusRuntimeRefObject } from "../rooms/resonanceNexusRuntimeRefs";

export type ResonanceJiOwnershipProbeEvent =
  | "overtone-effect-enter"
  | "overtone-effect-skip-no-primary"
  | "overtone-effect-ready"
  | "overtone-effect-cleanup"
  | "mainloop-enter"
  | "mainloop-primary-ready"
  | "mainloop-legacy-ji-fallback"
  | "mainloop-canonical-ji-filter-layer"
  | "mainloop-ready"
  | "mainloop-cleanup";

export type ResonanceJiOwnershipProbeRecord = {
  readonly sequence: number;
  readonly atMs: number;
  readonly event: ResonanceJiOwnershipProbeEvent;
  readonly filterPresent: boolean;
  readonly gainPresent: boolean;
  readonly overtoneMasterPresent: boolean;
  readonly jiVoiceCount: number;
  readonly manualJiVoiceCount: number;
};

const records: ResonanceJiOwnershipProbeRecord[] = [];
let sequence = 0;

export const recordResonanceJiOwnershipProbe = (
  event: ResonanceJiOwnershipProbeEvent,
  refsObject: ResonanceNexusRuntimeRefObject,
): void => {
  const refs = refsObject.current;
  records.push({
    sequence: ++sequence,
    atMs: typeof performance !== "undefined" ? performance.now() : Date.now(),
    event,
    filterPresent: !!refs.filter,
    gainPresent: !!refs.gain,
    overtoneMasterPresent: !!refs.overtoneMaster,
    jiVoiceCount: Object.keys(refs.jiOscs).length,
    manualJiVoiceCount: Object.keys(refs.manualJiOscs).length,
  });
  if (records.length > 128) records.splice(0, records.length - 128);
};

export const readResonanceJiOwnershipProbe = (): readonly ResonanceJiOwnershipProbeRecord[] =>
  records.map((record) => ({ ...record }));

export const clearResonanceJiOwnershipProbe = (): void => {
  records.length = 0;
  sequence = 0;
};

if (typeof globalThis !== "undefined") {
  const debugHost = globalThis as typeof globalThis & {
    __XENSONAR_JI_OWNERSHIP_PROBE__?: {
      read: typeof readResonanceJiOwnershipProbe;
      clear: typeof clearResonanceJiOwnershipProbe;
    };
  };
  debugHost.__XENSONAR_JI_OWNERSHIP_PROBE__ ??= {
    read: readResonanceJiOwnershipProbe,
    clear: clearResonanceJiOwnershipProbe,
  };
}
