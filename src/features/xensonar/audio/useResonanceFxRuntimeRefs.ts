import { useMemo, useRef, type MutableRefObject } from "react";
import type {
  CollectiveMemoryEffect,
  DescriptorFrame,
  DescriptorProbe,
  DescriptorSummary,
} from "../../resonance/collectiveMemoryEffect";
import type { PsychedelicSpiralDevice } from "../../resonance/psychedelicSpiralDevice";
import type { TransientDriveDeviceRefs } from "../../resonance/transientDriveDevice";
import type { EnterHoldPsyFxDevice } from "../../resonance/enterHoldPsyFx";
import type { Schwarmdeuter } from "../../resonance/schwarmdeuter";

export type ResonanceFxSourceSends = {
  drone: GainNode | null;
  particles: GainNode | null;
  waves: GainNode | null;
  myzel: GainNode | null;
};

export type CollectiveMemoryFxRefs = {
  drone: CollectiveMemoryEffect | null;
  particles: CollectiveMemoryEffect | null;
  waves: CollectiveMemoryEffect | null;
  myzel: CollectiveMemoryEffect | null;
};

export type EnterHoldPsyFxSends = {
  waves: GainNode | null;
  bass: GainNode | null;
};

const createResonanceFxSourceSends = (): ResonanceFxSourceSends => ({
  drone: null,
  particles: null,
  waves: null,
  myzel: null,
});

const createCollectiveMemoryFxRefs = (): CollectiveMemoryFxRefs => ({
  drone: null,
  particles: null,
  waves: null,
  myzel: null,
});

export type ResonanceFxRuntimeRefs = {
  finalMixProbeRef: MutableRefObject<DescriptorProbe | null>;
  collectiveMemoryFramesRef: MutableRefObject<DescriptorFrame[]>;
  collectiveMemoryWindowRef: MutableRefObject<number>;
  collectiveMemorySummaryRef: MutableRefObject<DescriptorSummary | null>;
  collectiveFxRef: MutableRefObject<CollectiveMemoryFxRefs>;
  psychedelicSpiralRef: MutableRefObject<PsychedelicSpiralDevice | null>;
  psychedelicSpiralSendsRef: MutableRefObject<ResonanceFxSourceSends>;
  transientDriveFxRef: MutableRefObject<TransientDriveDeviceRefs | null>;
  enterHoldPsyFxRef: MutableRefObject<EnterHoldPsyFxDevice | null>;
  transientDriveSendsRef: MutableRefObject<ResonanceFxSourceSends>;
  enterHoldPsyFxSendsRef: MutableRefObject<EnterHoldPsyFxSends>;
  schwarmdeuterRef: MutableRefObject<Schwarmdeuter | null>;
  schwarmdeuterSendsRef: MutableRefObject<ResonanceFxSourceSends>;
};

export type ResonanceFxRuntimeRefContract = ResonanceFxRuntimeRefs & {
  resonanceFxRuntimeRefs: ResonanceFxRuntimeRefs;
};

export function useResonanceFxRuntimeRefs(): ResonanceFxRuntimeRefContract {
  const finalMixProbeRef = useRef<DescriptorProbe | null>(null);
  const collectiveMemoryFramesRef = useRef<DescriptorFrame[]>([]);
  const collectiveMemoryWindowRef = useRef(8);
  const collectiveMemorySummaryRef = useRef<DescriptorSummary | null>(null);
  const collectiveFxRef = useRef<CollectiveMemoryFxRefs>(createCollectiveMemoryFxRefs());
  const psychedelicSpiralRef = useRef<PsychedelicSpiralDevice | null>(null);
  const psychedelicSpiralSendsRef = useRef<ResonanceFxSourceSends>(createResonanceFxSourceSends());
  const transientDriveFxRef = useRef<TransientDriveDeviceRefs | null>(null);
  const enterHoldPsyFxRef = useRef<EnterHoldPsyFxDevice | null>(null);
  const transientDriveSendsRef = useRef<ResonanceFxSourceSends>(createResonanceFxSourceSends());
  const enterHoldPsyFxSendsRef = useRef<EnterHoldPsyFxSends>({ waves: null, bass: null });
  const schwarmdeuterRef = useRef<Schwarmdeuter | null>(null);
  const schwarmdeuterSendsRef = useRef<ResonanceFxSourceSends>(createResonanceFxSourceSends());

  const resonanceFxRuntimeRefs = useMemo<ResonanceFxRuntimeRefs>(() => ({
    finalMixProbeRef,
    collectiveMemoryFramesRef,
    collectiveMemoryWindowRef,
    collectiveMemorySummaryRef,
    collectiveFxRef,
    psychedelicSpiralRef,
    psychedelicSpiralSendsRef,
    transientDriveFxRef,
    enterHoldPsyFxRef,
    transientDriveSendsRef,
    enterHoldPsyFxSendsRef,
    schwarmdeuterRef,
    schwarmdeuterSendsRef,
  }), []);

  return {
    ...resonanceFxRuntimeRefs,
    resonanceFxRuntimeRefs,
  };
}
