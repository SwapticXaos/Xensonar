/**
 * Locks PlatformerControlPanel contract: composes PlatformerTransportPanel and PlatformerTunerPanel;
 * same props interface to JumpRunSoundtrackRoom (opt #65). Vision §6 modular domains; Branch A reliability.
 */

import { describe, expect, it } from "vitest";

import {
  PlatformerControlPanel,
  type PlatformerControlPanelProps,
} from "../PlatformerControlPanel";
import { PlatformerTransportPanel } from "../PlatformerTransportPanel";
import { PlatformerTunerPanel } from "../PlatformerTunerPanel";

const noop = () => {};
const noopAsync = () => Promise.resolve();

function createMinimalProps(): PlatformerControlPanelProps {
  return {
    running: false,
    onStartRun: noopAsync,
    onPause: noop,
    onResetRun: noopAsync,
    presetName: "",
    onPresetNameChange: noop,
    selectedPresetId: "",
    onSelectedPresetIdChange: noop,
    presetItems: [],
    onSavePreset: noop,
    onLoadPreset: noopAsync,
    onDeletePreset: noop,
    onClearLibrary: noop,
    libraryTransfer: "",
    onLibraryTransferChange: noop,
    onExportLibrary: noop,
    onCopyLibraryToClipboard: noopAsync,
    onImportLibrary: noop,
    bpm: 110,
    onBpmChange: noop,
    masterVolume: 0.5,
    onMasterVolumeChange: noop,
    tuningMode: "12edo",
    onTuningModeChange: noop,
    arrangementMode: "balanced",
    onArrangementModeChange: noop,
    formMode: "auto",
    onFormModeChange: noop,
    sectionBias: "auto",
    onSectionBiasChange: noop,
    evolutionDepth: 0.5,
    onEvolutionDepthChange: noop,
    tempoFollow: 0.5,
    onTempoFollowChange: noop,
    composerOn: true,
    onComposerOnChange: noop,
  };
}

describe("PlatformerControlPanel", () => {
  it("exports PlatformerControlPanel, PlatformerTransportPanel, PlatformerTunerPanel as functions", () => {
    expect(typeof PlatformerControlPanel).toBe("function");
    expect(typeof PlatformerTransportPanel).toBe("function");
    expect(typeof PlatformerTunerPanel).toBe("function");
  });

  it("PlatformerControlPanelProps has transport + tuner keys (contract for JumpRunSoundtrackRoom)", () => {
    const props = createMinimalProps();
    const keys = Object.keys(props);

    expect(keys).toContain("running");
    expect(keys).toContain("onStartRun");
    expect(keys).toContain("presetName");
    expect(keys).toContain("onImportLibrary");
    expect(keys).toContain("bpm");
    expect(keys).toContain("onBpmChange");
    expect(keys).toContain("tuningMode");
    expect(keys).toContain("sectionBias");
    expect(keys).toContain("composerOn");
    expect(keys).toContain("onComposerOnChange");

    expect(keys.length).toBeGreaterThanOrEqual(27);
  });
});
