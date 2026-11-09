import {
  getKeyboardWindowShiftDirection,
  getWaveDirectionForKey,
  isKeyboardWindowShiftCode,
  isResonanceWaveTriggerKey,
  shouldToggleKeyboardMirror,
} from '../resonanceKeyboard';
import { AGENT_KEYS, DRUM_PATTERNS } from '../domain/instrumentData';
import type { AppNexusParams } from '../rooms/nexusParamsInitialState';
import { resolveNextDrumPlaylistPatch } from '../drumPatternPlaylist';
import type { DrumPlaylistConfigOption } from '../drumPatternPlaylistTypes';
import { resolveDrumPlaylistHotkeyDirection } from '../drumPatternPlaylistHotkeys';

type ResonanceAuxiliaryHotkeyEvent = Pick<KeyboardEvent, 'key' | 'code' | 'repeat' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>;

type RunResonanceAuxiliaryHotkeyRoutingBoundaryArgs = {
  event: ResonanceAuxiliaryHotkeyEvent;
  key: string;
  preventDefault: () => void;
  toggleKeyboardMirror: () => void;
  runWithAudio: (command: () => void, failureContext?: Record<string, unknown>) => void;
  triggerDirectedPulse: (direction: NonNullable<ReturnType<typeof getWaveDirectionForKey>>) => void;
  previewKeyboardWindowShift: (direction: NonNullable<ReturnType<typeof getKeyboardWindowShiftDirection>>) => void;
};

export function runResonanceAuxiliaryHotkeyRoutingBoundary(
  args: RunResonanceAuxiliaryHotkeyRoutingBoundaryArgs,
): boolean {
  const {
    event,
    key,
    preventDefault,
    toggleKeyboardMirror,
    runWithAudio,
    triggerDirectedPulse,
    previewKeyboardWindowShift,
  } = args;

  if (shouldToggleKeyboardMirror(event)) {
    preventDefault();
    toggleKeyboardMirror();
    return true;
  }

  if (isResonanceWaveTriggerKey(key)) {
    const direction = getWaveDirectionForKey(key);
    if (direction) {
      runWithAudio(() => triggerDirectedPulse(direction));
    }
    return true;
  }

  if (isKeyboardWindowShiftCode(event.code)) {
    const direction = getKeyboardWindowShiftDirection(event.code);
    if (direction !== null) {
      runWithAudio(() => previewKeyboardWindowShift(direction));
    }
    return true;
  }

  return false;
}

type RunResonanceNonRepeatAuxiliaryHotkeyBoundaryArgs = {
  event: ResonanceAuxiliaryHotkeyEvent;
  key: string;
  params: Pick<AppNexusParams, 'drumConfigMode' | 'drumPattern' | 'drumConfigId' | 'agentEnabled'>;
  exportedDrumConfigs: readonly DrumPlaylistConfigOption[];
  updateNParams: (patch: Partial<AppNexusParams>) => void;
  toggleNexusAgent: (agentIndex: number, options?: { pingOnEnable?: boolean }) => void;
  runWithAudio: (command: () => void, failureContext?: Record<string, unknown>) => void;
  preventDefault: () => void;
};

export function runResonanceNonRepeatAuxiliaryHotkeyBoundary(
  args: RunResonanceNonRepeatAuxiliaryHotkeyBoundaryArgs,
): boolean {
  const {
    event,
    key,
    params,
    exportedDrumConfigs,
    updateNParams,
    toggleNexusAgent,
    runWithAudio,
    preventDefault,
  } = args;

  const drumPlaylistHotkeyDirection = resolveDrumPlaylistHotkeyDirection(event);
  if (drumPlaylistHotkeyDirection !== null) {
    const nextDrumPatch = resolveNextDrumPlaylistPatch({
      drumPatterns: DRUM_PATTERNS,
      exportedDrumConfigs,
      drumConfigMode: params.drumConfigMode,
      drumPattern: params.drumPattern,
      drumConfigId: params.drumConfigId,
      direction: drumPlaylistHotkeyDirection,
    });
    if (nextDrumPatch) updateNParams(nextDrumPatch);
    preventDefault();
    return true;
  }

  const agentIndex = AGENT_KEYS.indexOf(key);
  if (agentIndex !== -1 && agentIndex < params.agentEnabled.length) {
    preventDefault();
    runWithAudio(
      () => toggleNexusAgent(agentIndex, { pingOnEnable: true }),
      { agentIndex, command: 'nexus-agent-toggle' },
    );
    return true;
  }

  return false;
}
