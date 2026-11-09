import type { CarrierIntegralMachineId } from '../../integral/carrierIntegralContracts';
import {
  resolveCarrierIntegralRawMelodicMaterialHandoffSpec,
  type CarrierIntegralRawMelodicMaterialHandoffSpec,
} from '../../integral/carrierIntegralRawMelodicMaterialHandoff';

export type CarrierIntegralExportTargetId =
  | 'root-follow-export'
  | 'materialspur-export'
  | 'melodic-pink-export';

export type CarrierIntegralSignalButtonViewModel = {
  disabled: boolean;
  rawMelodicMaterial: boolean;
  rawMelodicMaterialSpec: CarrierIntegralRawMelodicMaterialHandoffSpec | null;
  title: string;
  label: string;
  rawMaterialDataFlag: 'true' | undefined;
  rawMaterialMachineId: CarrierIntegralMachineId | undefined;
};

export const DEFAULT_SIGNAL_SEND_TITLE =
  'Beim Senden wird die gespeicherte Lesart des Bibliothekseintrags geprüft.';

export function resolveCarrierIntegralRawMelodicMaterialSendSpec(args: {
  selectedMachine: CarrierIntegralMachineId;
  targetId: CarrierIntegralExportTargetId;
}): CarrierIntegralRawMelodicMaterialHandoffSpec | null {
  return args.targetId === 'melodic-pink-export'
    ? resolveCarrierIntegralRawMelodicMaterialHandoffSpec(args.selectedMachine)
    : null;
}

export function isCarrierIntegralRawMelodicMaterialSend(args: {
  selectedMachine: CarrierIntegralMachineId;
  targetId: CarrierIntegralExportTargetId;
}): boolean {
  return Boolean(resolveCarrierIntegralRawMelodicMaterialSendSpec(args));
}

export function createCarrierIntegralSignalButtonViewModel(args: {
  selectedMachine: CarrierIntegralMachineId;
  targetId: CarrierIntegralExportTargetId;
  selectedProjectAvailable: boolean;
  libraryBusy: boolean;
  label: string;
  contractSummary?: string | null;
}): CarrierIntegralSignalButtonViewModel {
  const rawMelodicMaterialSpec = resolveCarrierIntegralRawMelodicMaterialSendSpec({
    selectedMachine: args.selectedMachine,
    targetId: args.targetId,
  });
  const rawMelodicMaterial = Boolean(rawMelodicMaterialSpec);
  return {
    disabled: !args.selectedProjectAvailable || args.libraryBusy,
    rawMelodicMaterial,
    rawMelodicMaterialSpec,
    title: rawMelodicMaterialSpec
      ? 'Öffnet den Melodic-Loop-Importdialog; Raw Audio ist dort ein auswählbarer pinke-Spur-Modus.'
      : args.contractSummary ?? DEFAULT_SIGNAL_SEND_TITLE,
    label: args.label,
    rawMaterialDataFlag: rawMelodicMaterial ? 'true' : undefined,
    rawMaterialMachineId: rawMelodicMaterialSpec?.machineId,
  };
}
