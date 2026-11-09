import type { ForgeProjectSnapshot } from "../state/storeTypes";
import type { CarrierIntegralAuditionContextRequest } from "./carrierIntegralAuditionContext";
import type { CarrierLoopBodyPreviewAuditionHookRequest } from "./carrierLoopBodyPreviewAuditionHook";

export type CarrierIntegralAuditionRequest =
  CarrierIntegralAuditionContextRequest & {
    projectName: string;
    snapshot: ForgeProjectSnapshot;
    carrierLoopBodyPreviewCandidate?: CarrierLoopBodyPreviewAuditionHookRequest | null;
  };
