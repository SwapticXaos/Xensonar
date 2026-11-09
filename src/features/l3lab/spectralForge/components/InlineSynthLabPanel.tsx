import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import {
  buildCarrierIntegralMenuModel,
  buildCarrierIntegralHarmonicXploreDescriptor,
  describeCarrierIntegralHarmonicXploreSelection,
  resolveCarrierIntegralHarmonicXploreProfile,
  resolveCarrierIntegralHarmonicXploreRenderConfig,
  resolveCarrierIntegralSelectionParams,
  resolveCarrierIntegralSynthLabParams,
  type CarrierIntegralMachineParams,
  type CarrierIntegralSynthLabParams,
} from "../integral";
import { CarrierIntegralMachineEditorSection } from "./carrierIntegralVerwalten/CarrierIntegralMachineEditorSection";
import { visibleBodySourceModes } from "./carrierIntegralVerwalten/carrierIntegralMachineUi";

export default function InlineSynthLabPanel() {
  const model = useMemo(() => buildCarrierIntegralMenuModel(), []);
  const selection = useStore((s) => s.carrierIntegralSelection);
  const synthLab = useStore((s) => s.carrierIntegralSynthLab);
  const harmonicXplore = useStore((s) => s.carrierIntegralHarmonicXplore);
  const setCarrierIntegralSelection = useStore((s) => s.setCarrierIntegralSelection);
  const setCarrierIntegralSynthLab = useStore((s) => s.setCarrierIntegralSynthLab);
  const setCarrierIntegralHarmonicXplore = useStore((s) => s.setCarrierIntegralHarmonicXplore);

  const selected =
    model.machineItems.find((item) => item.id === selection.machineId) ??
    model.machineItems[0];
  const selectedMachine = selected.id;
  const selectedPresets = model.presetsByMachine[selectedMachine] ?? [];
  const shownBodySourceModes = visibleBodySourceModes(
    selectedMachine,
    selected.bodySourceModes,
  );
  const params = resolveCarrierIntegralSelectionParams(selection);
  const synthParams = resolveCarrierIntegralSynthLabParams(synthLab);
  const harmonicXploreProfile = resolveCarrierIntegralHarmonicXploreProfile(
    harmonicXplore.profileId,
  );
  const harmonicXploreConfig = resolveCarrierIntegralHarmonicXploreRenderConfig({
    synthLab,
    harmonicXplore,
  });
  const harmonicXploreSummary = describeCarrierIntegralHarmonicXploreSelection(
    harmonicXplore,
  );
  const harmonicXploreDescriptor = buildCarrierIntegralHarmonicXploreDescriptor(
    harmonicXplore.profileId,
  );

  const [activeDeviceLayer, setActiveDeviceLayer] = useState<"gestalt" | "synth">("synth");
  const [showLesartLab, setShowLesartLab] = useState(false);
  const [showSynthLab, setShowSynthLab] = useState(true);

  const updateMachineParam = <K extends keyof CarrierIntegralMachineParams>(
    key: K,
    value: CarrierIntegralMachineParams[K],
  ) =>
    setCarrierIntegralSelection({
      paramsPatch: { ...selection.paramsPatch, [key]: value },
      source: "user",
    });

  const updateSynthParam = <K extends keyof CarrierIntegralSynthLabParams>(
    key: K,
    value: CarrierIntegralSynthLabParams[K],
  ) =>
    setCarrierIntegralSynthLab({
      paramsPatch: { ...synthLab.paramsPatch, [key]: value },
      source: "user",
    });

  return (
    <section
      className="rounded border border-fuchsia-900/60 bg-fuchsia-950/10"
      data-xensonar-spectralforge-inline-synth-lab="true"
      data-xensonar-spectralforge-inline-synth-lab-compact="true"
    >
      <CarrierIntegralMachineEditorSection
        auditionValueSource="right-override"
        compactLayout={true}
        activeDeviceLayer={activeDeviceLayer}
        setActiveDeviceLayer={setActiveDeviceLayer}
        selectedMachine={selectedMachine}
        selectedProjectAvailable={false}
        auditionBusyKey={null}
        selection={selection}
        setCarrierIntegralSelection={setCarrierIntegralSelection}
        params={params}
        updateMachineParam={updateMachineParam}
        shownBodySourceModes={shownBodySourceModes}
        selectedPresets={selectedPresets}
        showLesartLab={showLesartLab}
        setShowLesartLab={setShowLesartLab}
        synthLab={synthLab}
        synthParams={synthParams}
        setCarrierIntegralSynthLab={setCarrierIntegralSynthLab}
        updateSynthParam={updateSynthParam}
        showSynthLab={showSynthLab}
        setShowSynthLab={setShowSynthLab}
        harmonicXplore={harmonicXplore}
        harmonicXploreSummary={harmonicXploreSummary}
        harmonicXploreDescriptor={harmonicXploreDescriptor}
        harmonicXploreProfileSummary={harmonicXploreProfile?.summary}
        harmonicXploreConfig={harmonicXploreConfig}
        updateHarmonicXplore={(patch) =>
          setCarrierIntegralHarmonicXplore({ ...patch, source: "user" })
        }
        onPreviewSelectedMachine={() => undefined}
      />
    </section>
  );
}
