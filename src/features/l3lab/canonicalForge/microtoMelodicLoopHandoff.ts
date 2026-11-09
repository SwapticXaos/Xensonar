import type { MicrotoMelodicLoopSeedExport } from "../../../external/microto/integrations/xensonar/types";
import { adaptMprgBridgePayloadToMicrotoMelodicLoopSeed } from "../../../external/microto/integrations/xensonar/mprgBridgeAdapter";

let pendingSeed: MicrotoMelodicLoopSeedExport | null = null;

export function queueMicrotoMelodicLoopSeedHandoff(seed: MicrotoMelodicLoopSeedExport) {
  pendingSeed = {
    ...seed,
    movementEvents: seed.movementEvents.map((event) => ({ ...event })),
    fallbackPhrase: [...seed.fallbackPhrase],
    mprgBridge: seed.mprgBridge
      ? {
          ...seed.mprgBridge,
          truthBoundary: { ...seed.mprgBridge.truthBoundary },
        }
      : undefined,
  };
}

export function consumeMicrotoMelodicLoopSeedHandoff() {
  const next = pendingSeed;
  pendingSeed = null;
  return next;
}

export function queueMprgBridgePayloadAsMicrotoMelodicLoopSeed(payload: unknown) {
  const result = adaptMprgBridgePayloadToMicrotoMelodicLoopSeed(payload);
  if (!result.seed) return result;
  queueMicrotoMelodicLoopSeedHandoff(result.seed);
  return result;
}
