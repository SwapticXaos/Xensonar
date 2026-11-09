import type { BassPattern, DrumPattern } from '../domain/instrumentData';
import type { DrumPlaylistConfigOption } from '../drumPatternPlaylistTypes';
import type { buildAppResonanceDisplayRuntimeEntry } from '../runtimeEntries';
import type { AppChromeRuntimeArgs, BuildAppResonanceChromeRuntimeArgsInput } from './appResonanceChromeRuntimeArgsTypes';

type DisplayInput = Parameters<typeof buildAppResonanceDisplayRuntimeEntry>[0];
type DisplayOutput = ReturnType<typeof buildAppResonanceDisplayRuntimeEntry>;
type ChromeInput = BuildAppResonanceChromeRuntimeArgsInput;
type ChromeRuntimeArgs = AppChromeRuntimeArgs;

type ComputedChromeStatusKey =
  | "particleSystemLabel"
  | "particleDisplayModeLabel"
  | "gridTuningLabel"
  | "gridModeLabel"
  | "gridBaseHz"
  | "keyboardWindowStart"
  | "keyboardWindowEnd"
  | "keyboardWindowFirstHz"
  | "keyboardWindowLastHz"
  | "drumPatternName"
  | "bassPatternName";

type ChromeStatusInput = Omit<ChromeInput["status"], ComputedChromeStatusKey>;

type GrooveStatusInput = {
  exportedDrumConfigs: readonly DrumPlaylistConfigOption[];
  drumConfigMode: "preset" | "exported";
  drumPattern: DrumPattern;
  drumConfigId: string;
  bassPattern: BassPattern;
  bassPatternMode: "preset" | "clip";
  bassClipId: string;
};

export type AppResonanceChromeRuntimeBoundary = DisplayOutput & {
  appResonanceChromeRuntimeArgs: ChromeRuntimeArgs;
};

export type UseAppResonanceChromeRuntimeBoundaryArgs = {
  display: DisplayInput;
  header: ChromeInput["header"];
  status: ChromeStatusInput;
  sideRails: ChromeInput["sideRails"];
  grooveStatus: GrooveStatusInput;
};
