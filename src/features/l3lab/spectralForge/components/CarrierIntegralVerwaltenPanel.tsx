import { useEffect, useMemo, useRef, useState } from "react";
import { DURATION, useStore } from "../state/store";
import {
  loadForgeProject,
  type ForgeProjectMeta,
} from "../projectLibrary";
import {
  type CarrierIntegralAuditionValueSource,
} from "../integral/carrierIntegralAudition";
import {
  buildCarrierIntegralMenuModel,
  resolveCarrierIntegralSelectionParams,
  resolveCarrierIntegralMachine,
  resolveCarrierIntegralSynthLabParams,
  resolveCarrierIntegralHarmonicXploreProfile,
  buildCarrierIntegralHarmonicXploreDescriptor,
  resolveCarrierIntegralHarmonicXploreRenderConfig,
  describeCarrierIntegralHarmonicXploreSelection,
  recordCarrierGestureSampleSaveProbe,
  installCarrierGestureSampleSaveProbeReader,
  type CarrierIntegralMachineParams,
  type CarrierIntegralSynthLabParams,
} from "../integral";
import { encodeAudioBufferToWav } from "../../canonicalForge/selectionAudioTransfer";
import { saveBlobAsMelodicSample } from "../../melodicSamples/melodicSampleIntake";
import { listSavedMelodicSamples } from "../../canonicalForge/melodicSampleLibrary";
import { executeCarrierIntegralTransfer } from "../integral/executeCarrierIntegralTransfer";
import {
  CarrierGestureStrip,
  copySpectralSelection,
  normalizeGestureSelection,
  type GestureStripSelection,
  type GestureStripSnapshot,
} from "./carrierIntegralVerwalten/CarrierGestureStrip";
import { CarrierIntegralLibrarySection } from "./carrierIntegralVerwalten/CarrierIntegralLibrarySection";
import { numberSlider } from "./carrierIntegralVerwalten/CarrierIntegralNumberSlider";
import {
  machineUi,
  prismDisplayName,
  visibleBodySourceModes,
} from "./carrierIntegralVerwalten/carrierIntegralMachineUi";
import {
  createCarrierIntegralSupportedMachineResolver,
  resolveCarrierIntegralEditorLoadFlow,
} from "./carrierIntegralVerwalten/carrierIntegralLibraryIntent";
import type { CarrierIntegralExportTargetId } from "./carrierIntegralVerwalten/carrierIntegralSignalButtonViewModel";
import {
  assertCarrierIntegralSendRequestAllowed,
  resolveCarrierIntegralSendRequestFlow,
} from "./carrierIntegralVerwalten/carrierIntegralSendRequest";
import { CarrierIntegralSignalSendSection } from "./carrierIntegralVerwalten/CarrierIntegralSignalSendSection";
import { CarrierIntegralMachineEditorSection } from "./carrierIntegralVerwalten/CarrierIntegralMachineEditorSection";
import {
  createCarrierIntegralGestureSampleErrorMessage,
  createCarrierIntegralGestureSampleExportRequest,
  createCarrierIntegralGestureSampleSuccessMessage,
} from "./carrierIntegralVerwalten/carrierIntegralGestureSampleExport";
import {
  renderCarrierIntegralGestureSampleExportRoute,
  resolveCarrierIntegralGestureSampleRenderMachine,
} from "./carrierIntegralVerwalten/carrierIntegralPreviewExportRoutes";
import {
  formatPercent,
  resolveProjectForEditorIntent,
} from "./carrierIntegralVerwalten/carrierIntegralVerwaltenFormatters";
import { useCarrierIntegralLibraryWorkspace } from "./carrierIntegralVerwalten/useCarrierIntegralLibraryWorkspace";
import { useCarrierIntegralAuditionSession } from "./carrierIntegralVerwalten/useCarrierIntegralAuditionSession";
import {
  ROOT_FOLLOW_AUDITION_MACHINE_IDS,
  type CarrierIntegralVerwaltenPanelProps,
} from "./carrierIntegralVerwalten/carrierIntegralVerwaltenPanelContracts";
export default function CarrierIntegralVerwaltenPanel({
  onClose,
  onOpenInSpectralForge,
  initialFocusIntent = null,
  onInitialFocusConsumed,
}: CarrierIntegralVerwaltenPanelProps) {
  const model = useMemo(() => buildCarrierIntegralMenuModel(), []);
  const selection = useStore((s) => s.carrierIntegralSelection);
  const synthLab = useStore((s) => s.carrierIntegralSynthLab);
  const harmonicXplore = useStore((s) => s.carrierIntegralHarmonicXplore);
  const setCarrierIntegralSelection = useStore(
    (s) => s.setCarrierIntegralSelection,
  );
  const setCarrierIntegralSynthLab = useStore(
    (s) => s.setCarrierIntegralSynthLab,
  );
  const setCarrierIntegralHarmonicXplore = useStore(
    (s) => s.setCarrierIntegralHarmonicXplore,
  );
  const params = resolveCarrierIntegralSelectionParams(selection);
  const synthParams = resolveCarrierIntegralSynthLabParams(synthLab);
  const harmonicXploreProfile = resolveCarrierIntegralHarmonicXploreProfile(
    harmonicXplore.profileId,
  );
  const harmonicXploreDescriptor = buildCarrierIntegralHarmonicXploreDescriptor(
    harmonicXplore.profileId,
  );
  const harmonicXploreConfig = resolveCarrierIntegralHarmonicXploreRenderConfig(
    {
      synthLab,
      harmonicXplore,
    },
  );
  const harmonicXploreSummary =
    describeCarrierIntegralHarmonicXploreSelection(harmonicXplore);
  const selected =
    model.machineItems.find((item) => item.id === selection.machineId) ??
    model.machineItems[0];
  const selectedPresets = model.presetsByMachine[selected.id] ?? [];
  const selectedMachine = selected.id;
  const shownBodySourceModes = visibleBodySourceModes(
    selectedMachine,
    selected.bodySourceModes,
  );
  const resolveLibraryMachine = useMemo(
    () =>
      createCarrierIntegralSupportedMachineResolver(
        model.machineItems.map((item) => item.id),
      ),
    [model.machineItems],
  );
  const createProjectSnapshot = useStore((s) => s.createProjectSnapshot);
  const loadProjectSnapshot = useStore((s) => s.loadProjectSnapshot);
  const materialExportName = useStore((s) => s.materialExport.name);
  const [auditionError, setAuditionError] = useState<string | null>(null);
  const [auditionValueSource, setAuditionValueSource] =
    useState<CarrierIntegralAuditionValueSource>("right-override");
  const [showLesartLab, setShowLesartLab] = useState(false);
  const [showSynthLab, setShowSynthLab] = useState(false);
  const [activeDeviceLayer, setActiveDeviceLayer] = useState<
    "gestalt" | "synth"
  >("synth");
  const [gestureStrip, setGestureStrip] = useState<GestureStripSnapshot | null>(
    null,
  );
  const [gestureSelection, setGestureSelection] =
    useState<GestureStripSelection>({ start: 0.12, end: 0.38 });
  const [gestureSampleBusy, setGestureSampleBusy] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const melodicPinkSendRef = useRef<HTMLDivElement | null>(null);
  const handledEditorIntentRef = useRef<string | null>(null);
  useEffect(() => {
    installCarrierGestureSampleSaveProbeReader();
  }, []);
  const {
    projectName, setProjectName, selectedProjectId, setSelectedProjectId,
    librarySortMode, setLibrarySortMode, libraryBusy, setLibraryBusy,
    libraryMessage, setLibraryMessage, libraryError, setLibraryError,
    libraryDrag, setLibraryDrag, sortedLibraryEntries, selectedProject,
    beginLibraryDrag, updateLibraryDragOver, finishLibraryDrop, runLibraryAction,
    saveAsNewProject, deleteSelectedProject,
    selectLibraryEntry, loadLibraryEntry,
  } = useCarrierIntegralLibraryWorkspace({
    materialExportName,
    createProjectSnapshot,
    loadProjectSnapshot,
    setCarrierIntegralSelection,
    setCarrierIntegralSynthLab,
    setCarrierIntegralHarmonicXplore,
    setAuditionValueSource,
    setAuditionError,
    onClose,
    onOpenInSpectralForge,
  });
  const {
    auditionBusyKey, lastPreviewMachineId, activeSignalMachine,
    previewPitchSemitones, setPreviewPitchSemitones, previewVolume, setPreviewVolume,
    previewBpm, setPreviewBpm, gesturePlayheadRatio, setGesturePlayheadRatio,
    previewThroughMachine,
  } = useCarrierIntegralAuditionSession({
    selectedProject,
    selectedMachine,
    selection,
    synthLab,
    harmonicXplore,
    auditionValueSource,
    setAuditionValueSource,
    setAuditionError,
    setSelectedProjectId,
    setProjectName,
    setCarrierIntegralSelection,
  });
  const selectedTargets = model.targetItemsByMachine[activeSignalMachine] ?? [];
  useEffect(() => {
    if (
      !initialFocusIntent ||
      handledEditorIntentRef.current === initialFocusIntent.token
    )
      return;
    if (!sortedLibraryEntries.length) return;
    handledEditorIntentRef.current = initialFocusIntent.token;
    const targetProject = resolveProjectForEditorIntent(
      sortedLibraryEntries,
      initialFocusIntent,
    );
    if (!targetProject) {
      setLibraryError(
        "Keine passende Figur in der Labor-Bibliothek gefunden. Bitte links manuell wählen.",
      );
      onInitialFocusConsumed?.(initialFocusIntent.token);
      return;
    }
    setLibraryBusy(true);
    setLibraryError(null);
    setLibraryMessage(null);
    void loadForgeProject(targetProject.id)
      .then((snapshot) => {
        loadProjectSnapshot(snapshot);
        setSelectedProjectId(targetProject.id);
        setProjectName(targetProject.name);
        const loadFlow = resolveCarrierIntegralEditorLoadFlow({
          entry: targetProject,
          snapshot,
          intent: initialFocusIntent,
          resolveMachine: resolveLibraryMachine,
        });
        if (loadFlow.selectionPatch)
          setCarrierIntegralSelection(loadFlow.selectionPatch);
        if (loadFlow.synthLabPatch)
          setCarrierIntegralSynthLab(loadFlow.synthLabPatch);
        if (loadFlow.harmonicXplorePatch)
          setCarrierIntegralHarmonicXplore(loadFlow.harmonicXplorePatch);
        setAuditionValueSource(loadFlow.auditionValueSource);
        setActiveDeviceLayer(loadFlow.activeDeviceLayer);
        setShowLesartLab(loadFlow.showLesartLab);
        setShowSynthLab(loadFlow.showSynthLab);
        setLibraryMessage(
          `Bearbeiten geöffnet · ${targetProject.name}${loadFlow.machineId ? ` · ${prismDisplayName(loadFlow.machineId)}` : ""}`,
        );
        if (loadFlow.scrollToMelodicPinkSend) {
          window.setTimeout(() => {
            melodicPinkSendRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 160);
        }
      })
      .catch((error) => {
        setLibraryError(
          `Figur konnte nicht geladen werden: ${error instanceof Error ? error.message : String(error)}`,
        );
      })
      .finally(() => {
        setLibraryBusy(false);
        onInitialFocusConsumed?.(initialFocusIntent.token);
      });
  }, [
    initialFocusIntent,
    loadProjectSnapshot,
    onInitialFocusConsumed,
    resolveLibraryMachine,
    setCarrierIntegralSelection,
    setCarrierIntegralSynthLab,
    setCarrierIntegralHarmonicXplore,
    sortedLibraryEntries,
  ]);
  useEffect(() => {
    if (!selectedProject) {
      setGestureStrip(null);
      setGesturePlayheadRatio(null);
      return undefined;
    }
    let cancelled = false;
    void loadForgeProject(selectedProject.id)
      .then((snapshot) => {
        if (cancelled) return;
        setGestureStrip({
          projectId: selectedProject.id,
          spectralSnapshot: new Float32Array(snapshot.spectralSnapshot),
        });
      })
      .catch(() => {
        if (!cancelled) setGestureStrip(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProject?.id]);
  const saveGestureSelectionAsSample = () => {
    const sampleRequest = createCarrierIntegralGestureSampleExportRequest({
      selectedProject,
      gestureStrip,
      gestureSelection,
      createSpectralSelection: copySpectralSelection,
      normalizeSelection: normalizeGestureSelection,
    });
    if (!sampleRequest) return;
    const renderMachineId = resolveCarrierIntegralGestureSampleRenderMachine({
      lastPreviewMachineId,
      selectedMachine,
    });
    setGestureSampleBusy(true);
    setLibraryError(null);
    setLibraryMessage(null);
    void (async () => {
      const snapshot = await loadForgeProject(sampleRequest.projectId);
      const renderedSample = await renderCarrierIntegralGestureSampleExportRoute({
        sampleRequest,
        snapshot,
        renderMachineId,
        controls: { previewBpm, previewPitchSemitones, previewVolume },
        selectionTotalDurationSec: DURATION,
        probeSource: "carrier-integral-verwalten-panel",
      });
      const blob = encodeAudioBufferToWav(renderedSample.buffer);
      const saved = await saveBlobAsMelodicSample({
        blob,
        name: renderedSample.sampleName,
      });
      const entries = await listSavedMelodicSamples();
      const dbVerified = entries.some((entry) => entry.id === saved.id);
      recordCarrierGestureSampleSaveProbe({
        source: "carrier-integral-verwalten-panel",
        projectId: sampleRequest.projectId,
        projectName: sampleRequest.projectName,
        sampleId: saved.id,
        sampleName: saved.name,
        sampleDurationSec: saved.durationSec,
        sampleSizeBytes: saved.sizeBytes,
        renderMachineId: renderedSample.renderMachineId,
        renderMachineLabel: renderedSample.renderMachineLabel,
        renderPath: renderedSample.renderPath,
        dbVerified,
        libraryEntryCount: entries.length,
      });
      if (!dbVerified) {
        throw new Error("Sample wurde geschrieben, ist aber in der Sample-Datenbankliste noch nicht sichtbar.");
      }
      setLibraryMessage(
        createCarrierIntegralGestureSampleSuccessMessage({
          sampleName: saved.name,
          renderMachineLabel: renderedSample.renderMachineLabel,
          durationSec: saved.durationSec,
          dbVerified,
        }),
      );
    })()
      .catch((error) => {
        setLibraryError(createCarrierIntegralGestureSampleErrorMessage(error));
      })
      .finally(() => {
        setGestureSampleBusy(false);
      });
  };
  const sendCarrierIntegralTarget = (args: {
    entry: ForgeProjectMeta;
    targetId: CarrierIntegralExportTargetId;
    label: string;
  }) =>
    runLibraryAction(async () => {
      const snapshot = await loadForgeProject(args.entry.id);
      const storedSelection = snapshot.carrierIntegralSelection;
      const storedSynthLab = snapshot.carrierIntegralSynthLab;
      const storedHarmonicXplore = snapshot.carrierIntegralHarmonicXplore;
      const sendRequest = resolveCarrierIntegralSendRequestFlow({
        targetId: args.targetId,
        valueSource: auditionValueSource,
        currentMachine: selectedMachine,
        lastPreviewMachine: lastPreviewMachineId,
        currentSelection: selection,
        currentSynthLab: synthLab,
        currentHarmonicXplore: harmonicXplore,
        storedSelection,
        storedSynthLab,
        storedHarmonicXplore,
        entryMeta: args.entry.carrierIntegral,
        resolveMachine: resolveLibraryMachine,
        previewBpm,
        previewVolume,
        previewPitchSemitones,
      });
      assertCarrierIntegralSendRequestAllowed(sendRequest);
      const result = await executeCarrierIntegralTransfer({
        entry: args.entry,
        snapshot,
        machineId: sendRequest.effectiveMachine,
        targetId: args.targetId,
        targetLabel: args.label,
        valueSource: sendRequest.effectiveValueSource,
        selectionOverride: sendRequest.selectionOverride,
        synthLabOverride: sendRequest.synthLabOverride,
        storedSynthLab: sendRequest.storedSynthLab,
        harmonicXploreOverride: sendRequest.harmonicXploreOverride,
        storedHarmonicXplore: sendRequest.storedHarmonicXplore,
        currentSynthLab: sendRequest.currentSynthLab,
        currentHarmonicXplore: sendRequest.currentHarmonicXplore,
        previewBpm: sendRequest.previewBpm,
        previewVolume: sendRequest.previewVolume,
        previewPitchSemitones: sendRequest.previewPitchSemitones,
      });
      setLibraryMessage(result.uiMessage);
    });
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
  const updateHarmonicXplore = (
    patch: Parameters<typeof setCarrierIntegralHarmonicXplore>[0],
  ) =>
    setCarrierIntegralHarmonicXplore({
      ...patch,
      source: "user",
    });
  return (
    <div
      data-hotkey-scope="carrier-integral-manager"
      data-xensonar-carrier-integral-verwalten="true"
      className="fixed inset-0 z-[150] flex items-start justify-center overflow-hidden bg-black/65 px-4 pb-4 pt-4"
      onKeyDownCapture={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") event.preventDefault();
      }}
    >
      <div
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-[96rem] flex-col overflow-hidden rounded-2xl border border-violet-800/70 bg-neutral-950 text-[11px] text-neutral-300 shadow-2xl shadow-black/60"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 bg-neutral-900/40 px-4 py-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-violet-300/80">
              <span className="text-base leading-none" aria-hidden="true">🌈</span><span>Carrier-Integral Werkbank</span>
            </div>
            <div className="mt-1 text-base font-semibold text-violet-50">
              Klangprisma für Carrier-Figuren
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-violet-100/70">
              <span>◇ Figur wählen</span>
              <span>∿ Prisma hören</span>
              <span>⌁ Körper formen</span>
              <span>⇢ übernehmen</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fenster schließen"
            className="rounded-full border border-violet-800/70 px-3 py-1 text-base font-bold leading-none text-violet-100 hover:bg-violet-950/40"
          >
            ×
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[20rem_minmax(28rem,1fr)]">
          <CarrierIntegralLibrarySection
            projectName={projectName}
            onProjectNameChange={setProjectName}
            libraryBusy={libraryBusy}
            selectedProjectId={selectedProjectId}
            librarySortMode={librarySortMode}
            onLibrarySortModeChange={setLibrarySortMode}
            libraryMessage={libraryMessage}
            libraryError={libraryError}
            sortedLibraryEntries={sortedLibraryEntries}
            libraryDrag={libraryDrag}
            onSaveAsNewProject={saveAsNewProject}
            onDeleteSelectedProject={deleteSelectedProject}
            onSelectLibraryEntry={selectLibraryEntry}
            onBeginLibraryDrag={beginLibraryDrag}
            onUpdateLibraryDragOver={updateLibraryDragOver}
            onFinishLibraryDrop={finishLibraryDrop}
            onClearLibraryDrag={() => setLibraryDrag(null)}
          />
          <div
            ref={contentScrollRef}
            className="min-h-0 overflow-y-auto bg-[#08080b] p-5"
          >
            {!selectedProject ? (
              <div className="flex min-h-[24rem] items-center justify-center rounded-2xl border-2 border-dashed border-neutral-800 bg-neutral-950/45 p-6 text-center text-neutral-500">
                <div>
                  <div className="text-sm text-neutral-300">
                    Noch keine Figur aufgelegt.
                  </div>
                  <div className="mt-1 text-[11px]">
                    links wählen · dann hören
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-6xl space-y-5">
                <div
                  className="relative overflow-hidden rounded-2xl border border-fuchsia-600/45 bg-fuchsia-950/10 p-5 shadow-lg"
                  data-xensonar-carrier-integral-focus-deck="true"
                >
                  <div className="absolute left-0 top-0 h-full w-1 bg-fuchsia-500" />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-fuchsia-300/80">
                        2 · ∿ Vorhör-Deck
                      </div>
                      <div className="mt-1 text-xl font-bold text-white">
                        {selectedProject.name}
                      </div>
                      <div className="mt-1 text-xs text-neutral-400">
                        ◇ Figur · ∿ Linse · ⌁ Klangkörper
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={libraryBusy || auditionBusyKey !== null}
                        onClick={() => void loadLibraryEntry(selectedProject)}
                        className="rounded-xl border border-cyan-600/80 bg-cyan-950/35 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-50 shadow-[0_0_18px_rgba(6,182,212,0.12)] hover:bg-cyan-900/35 disabled:opacity-50"
                        title="Projekt in SpectralForge öffnen"
                      >
                        In SpectralForge öffnen
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    {ROOT_FOLLOW_AUDITION_MACHINE_IDS.map((machineId) => {
                      const machine = resolveCarrierIntegralMachine(machineId);
                      const ui = machineUi(machineId);
                      const active = selectedMachine === machineId;
                      const playing =
                        auditionBusyKey ===
                        `${selectedProject.id}:${machineId}:right-override`;
                      return (
                        <button
                          key={machineId}
                          type="button"
                          disabled={auditionBusyKey !== null}
                          onClick={() =>
                            previewThroughMachine(selectedProject, machineId)
                          }
                          className={`rounded-xl border p-3 text-left transition ${playing ? "border-emerald-400 bg-emerald-900/30 text-emerald-100" : active ? ui.active : "border-neutral-700 bg-neutral-900/80 text-neutral-200 hover:border-fuchsia-400 hover:bg-fuchsia-900/20"}`}
                          title={machine.summary}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 font-semibold">
                              <span
                                className={`rounded border px-1.5 py-0.5 text-[11px] ${ui.chip}`}
                              >
                                {ui.glyph}
                              </span>
                              {prismDisplayName(machineId)}
                            </span>
                            <span
                              className={
                                playing
                                  ? "text-emerald-300"
                                  : "text-neutral-500"
                              }
                            >
                              {playing ? "■" : "▶"}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] leading-relaxed text-neutral-500">
                            {ui.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div
                    className="mt-4 rounded-xl border border-violet-900/55 bg-black/35 p-3"
                    data-xensonar-carrier-integral-gesture-strip="true"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-violet-200/80">
                      <span>◇ Gestalt-Auszug</span>
                      <button
                        type="button"
                        disabled={!gestureStrip || gestureSampleBusy}
                        onClick={saveGestureSelectionAsSample}
                        className="rounded border border-violet-700/80 bg-violet-950/30 px-2 py-1 text-violet-100 hover:bg-violet-900/35 disabled:opacity-45"
                      >
                        {gestureSampleBusy
                          ? "Speichert …"
                          : "Auswahl als Sample speichern"}
                      </button>
                    </div>
                    <CarrierGestureStrip
                      snapshot={gestureStrip}
                      selection={gestureSelection}
                      playheadRatio={gesturePlayheadRatio}
                      onSelectionChange={setGestureSelection}
                    />
                  </div>
                  <div
                    className="mt-4 grid gap-2 border-t border-fuchsia-900/35 pt-3 sm:grid-cols-3"
                    data-xensonar-carrier-integral-preview-controls="true"
                  >
                    {numberSlider({
                      label: "Pitch",
                      value: previewPitchSemitones,
                      min: -24,
                      max: 24,
                      step: 1,
                      format: (value) =>
                        `${value > 0 ? "+" : ""}${Math.round(value)} st`,
                      onChange: setPreviewPitchSemitones,
                    })}
                    {numberSlider({
                      label: "Lautstärke",
                      value: previewVolume,
                      min: 0.1,
                      max: 1,
                      step: 0.01,
                      format: formatPercent,
                      onChange: setPreviewVolume,
                    })}
                    {numberSlider({
                      label: "BPM",
                      value: previewBpm,
                      min: 45,
                      max: 180,
                      step: 1,
                      format: (value) => `${Math.round(value)}`,
                      onChange: setPreviewBpm,
                    })}
                  </div>
                  {auditionError ? (
                    <div className="mt-3 rounded border border-amber-900/70 bg-amber-950/30 px-3 py-2 text-[10px] text-amber-100">
                      {auditionError}
                    </div>
                  ) : null}
                </div>
                <CarrierIntegralMachineEditorSection
                  auditionValueSource={auditionValueSource}
                  activeDeviceLayer={activeDeviceLayer}
                  setActiveDeviceLayer={setActiveDeviceLayer}
                  selectedMachine={selectedMachine}
                  selectedProjectAvailable={!!selectedProject}
                  auditionBusyKey={auditionBusyKey}
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
                  updateHarmonicXplore={updateHarmonicXplore}
                  onPreviewSelectedMachine={() => {
                    if (!selectedProject) return;
                    previewThroughMachine(selectedProject, selectedMachine);
                  }}
                />
                <div
                  className="sr-only"
                  data-xensonar-carrier-integral-signal-path="true"
                >
                  Figur · Linse · Klangkörper
                </div>
                <CarrierIntegralSignalSendSection
                  ref={melodicPinkSendRef}
                  selectedMachine={activeSignalMachine}
                  selectedTargets={selectedTargets}
                  selectedProjectAvailable={!!selectedProject}
                  libraryBusy={libraryBusy}
                  onSend={({ targetId, label }) => {
                    if (!selectedProject) return;
                    sendCarrierIntegralTarget({
                      entry: selectedProject,
                      targetId,
                      label,
                    });
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
