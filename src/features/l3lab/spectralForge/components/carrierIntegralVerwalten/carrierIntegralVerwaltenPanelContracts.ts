import type { CarrierIntegralEditorIntent } from '../../../contracts/carrierIntegralEditorIntent';
import type { CarrierIntegralMachineId } from '../../integral';

export const ROOT_FOLLOW_AUDITION_MACHINE_IDS: CarrierIntegralMachineId[] = [
  'raw-darkpsy-oscillator',
  'harmonic-xplore-direct-carrier',
  'spektral-synthese-body',
  'branch-a-line-traffic',
  'branch-b573-synth-window',
  'branch-c-interval-body',
];

export type CarrierIntegralVerwaltenPanelProps = {
  onClose: () => void;
  onOpenInSpectralForge?: () => void;
  initialFocusIntent?: CarrierIntegralEditorIntent | null;
  onInitialFocusConsumed?: (token?: string) => void;
};
