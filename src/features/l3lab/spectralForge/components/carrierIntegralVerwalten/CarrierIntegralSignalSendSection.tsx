import { forwardRef, useMemo } from "react";
import type {
  CarrierIntegralMachineId,
  CarrierIntegralMenuTargetItem,
} from "../../integral";
import {
  resolveCarrierIntegralRawMelodicMaterialHandoffSpec,
} from "../../integral";
import {
  createCarrierIntegralSignalButtonViewModel,
  type CarrierIntegralExportTargetId,
} from "./carrierIntegralSignalButtonViewModel";

export type CarrierIntegralSignalSendSectionProps = {
  selectedMachine: CarrierIntegralMachineId;
  selectedTargets: CarrierIntegralMenuTargetItem[];
  selectedProjectAvailable: boolean;
  libraryBusy: boolean;
  onSend: (args: { targetId: CarrierIntegralExportTargetId; label: string }) => void;
};

type CarrierIntegralSignalSendButtonSpec = {
  targetId: CarrierIntegralExportTargetId;
  label: string;
  className: string;
};

const SIGNAL_SEND_BUTTONS: CarrierIntegralSignalSendButtonSpec[] = [
  {
    targetId: "root-follow-export",
    label: "An Root Follow senden",
    className:
      "border-violet-700/70 bg-violet-950/35 text-violet-100 hover:bg-violet-900/45",
  },
  {
    targetId: "materialspur-export",
    label: "An Materialspur senden",
    className:
      "border-cyan-700/70 bg-cyan-950/35 text-cyan-100 hover:bg-cyan-900/45",
  },
  {
    targetId: "melodic-pink-export",
    label: "An Melodic Loop senden",
    className:
      "border-pink-600/80 bg-pink-950/40 text-pink-100 hover:bg-pink-900/45",
  },
];

export const CarrierIntegralSignalSendSection = forwardRef<
  HTMLDivElement,
  CarrierIntegralSignalSendSectionProps
>(function CarrierIntegralSignalSendSection(
  {
    selectedMachine,
    selectedTargets,
    selectedProjectAvailable,
    libraryBusy,
    onSend,
  },
  ref,
) {
  const selectedRawMelodicMaterialSpec =
    resolveCarrierIntegralRawMelodicMaterialHandoffSpec(selectedMachine);

  const targetById = useMemo(
    () => new Map(selectedTargets.map((target) => [target.targetId, target.contract])),
    [selectedTargets],
  );

  const signalSendButton = (button: CarrierIntegralSignalSendButtonSpec) => {
    const contract = targetById.get(button.targetId);
    const viewModel = createCarrierIntegralSignalButtonViewModel({
      selectedMachine,
      targetId: button.targetId,
      selectedProjectAvailable,
      libraryBusy,
      label: button.label,
      contractSummary: contract?.summary,
    });

    return (
      <button
        key={button.targetId}
        type="button"
        disabled={viewModel.disabled}
        onClick={() => onSend({ targetId: button.targetId, label: button.label })}
        className={`rounded border px-4 py-2 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${button.className}`}
        title={viewModel.title}
        data-xensonar-carrier-integral-raw-melodic-material={viewModel.rawMaterialDataFlag}
        data-xensonar-carrier-integral-raw-melodic-material-machine={viewModel.rawMaterialMachineId}
      >
        {viewModel.label}
      </button>
    );
  };

  return (
    <div
      ref={ref}
      className="rounded-xl border border-pink-800/70 bg-pink-950/20 p-4 shadow-[0_0_18px_rgba(236,72,153,0.08)]"
      data-xensonar-carrier-integral-signal-send-section="true"
      data-xensonar-carrier-integral-session-commit="true"
      data-xensonar-carrier-integral-melodic-pink-send-focus="true"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-pink-300/80">
            Pinke Spur · ⇢ An Melodic Loop senden
          </div>
          <div className="mt-1 text-xs text-pink-100/80">
            Melodic Loop öffnet den gemeinsamen Importdialog.
          </div>
          <div
            className="mt-2 rounded border border-pink-800/70 bg-pink-950/25 px-2 py-1 text-[10px] text-pink-100"
            data-xensonar-carrier-integral-raw-melodic-material-panel="true"
            data-xensonar-carrier-integral-raw-melodic-material-machine={selectedRawMelodicMaterialSpec?.machineId}
            data-xensonar-carrier-integral-melodic-import-unified="true"
          >
            An Melodic Loop senden führt immer ins Importmenü: Fretless-Feld, zerstreut, Raw Audio oder monoton.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {SIGNAL_SEND_BUTTONS.map(signalSendButton)}
        </div>
      </div>
    </div>
  );
});
