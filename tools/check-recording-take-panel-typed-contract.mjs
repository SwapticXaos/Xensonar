import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function fail(message) {
  console.error(`[recording-take-panel-typed-contract] ${message}`);
  process.exit(1);
}
function requireContains(path, needle) {
  const source = read(path);
  if (!source.includes(needle)) fail(`${path} missing ${needle}`);
}
function requireNotContains(path, needle) {
  const source = read(path);
  if (source.includes(needle)) fail(`${path} must not contain ${needle}`);
}

const contract = 'src/features/xensonar/recording/recordingTakePanelContracts.ts';
const panel = 'src/features/xensonar/rooms/RecordingTakePanel.tsx';
const runtime = 'src/features/xensonar/recording/useRecordingRuntimeBoundary.ts';
const effects = 'src/features/xensonar/recording/recordingEffectHandlers.ts';
const lifecycle = 'src/features/xensonar/recording/useRecordingRuntimeLifecycle.ts';

requireContains(contract, 'export type RecordingTakePanelProps');
requireContains(contract, 'RecordingSourceMode');
requireContains(contract, 'RecordingState');
requireContains(contract, 'RecordingCropRange | null');
requireContains(contract, 'MutableRefObject<HTMLAudioElement | null>');
requireContains(contract, 'MutableRefObject<HTMLDivElement | null>');
requireContains(contract, 'ReactMouseEvent<HTMLDivElement>');
requireContains(contract, 'RecordingMarkerSource');
requireNotContains(contract, ': any');
requireNotContains(contract, 'unknown');

requireContains(panel, 'import type { RecordingTakePanelProps }');
requireContains(panel, 'import type { RecordingExportScope, RecordingState }');
requireNotContains(panel, ': any');
requireNotContains(panel, '(source: any)');
requireNotContains(panel, 'recordingState: any');
requireNotContains(panel, 'recordingCrop: any');
requireContains(panel, 'setRecordingState((prev: RecordingState)');

requireContains(runtime, 'import type { RecordingTakePanelProps }');
requireContains(runtime, 'recordingTake: RecordingTakePanelProps;');
requireNotContains(runtime, 'type RecordingTakeRuntimeProps');
requireContains(runtime, "import { useRecordingRuntimeLifecycle } from './useRecordingRuntimeLifecycle';");
requireContains(runtime, 'useRecordingRuntimeLifecycle({');
requireNotContains(runtime, 'useEffect(');
requireNotContains(runtime, 'startRecordingDurationAnimation');
requireContains(lifecycle, 'export function useRecordingRuntimeLifecycle');
requireContains(lifecycle, 'startRecordingDurationDisplaySecondTick');
requireContains(lifecycle, 'registerRecordingMarkerHotkeyListener');
requireContains(lifecycle, 'startRecordingPreviewPlayheadLoop');
requireContains(lifecycle, 'cleanupRecordingRuntime');
requireContains(effects, 'export function startRecordingDurationDisplaySecondTick');
requireNotContains(effects, 'startRecordingDurationAnimation');

console.log('[recording-take-panel-typed-contract] ok');
