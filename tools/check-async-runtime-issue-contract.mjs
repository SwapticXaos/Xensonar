import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let ok = true;
const fail = (msg) => { console.error(`[check-async-runtime-issue-contract] ${msg}`); ok = false; };
const expect = (cond, msg) => { if (!cond) fail(msg); };

const pkg = JSON.parse(read('package.json'));
expect(/^3\.2\.91\.5\.(5[7-9]|[6-9]\d+)($|[._-])/.test(pkg.version), 'package version must be at least 3.2.91.5.57 for async/runtime issue corridor');
expect(pkg.scripts?.['xensonar:check-async-runtime-issue-contract'] === 'node tools/check-async-runtime-issue-contract.mjs', 'async runtime issue contract script missing from package.json');

const reporter = read('src/features/xensonar/diagnostics/runtimeIssueReporter.ts');
expect(reporter.includes('XENSONAR_RUNTIME_ISSUE_EVENT'), 'runtime issue event constant missing');
expect(reporter.includes('reportXensonarRuntimeIssue'), 'runtime issue reporter missing');
expect(reporter.includes('reportXensonarPromiseFailure'), 'promise failure reporter missing');
expect(reporter.includes('window.dispatchEvent(new CustomEvent'), 'runtime issue reporter must dispatch a browser event for future UI/diagnostics listeners');
expect(reporter.includes('timestamp: Date.now()'), 'runtime issue payload should carry a timestamp');

const app = read('src/App.tsx');
expect(app.includes('reportXensonarPromiseFailure'), 'App does not use runtime promise failure reporting');
expect(app.includes("'wave-starter-sample-list-refresh'"), 'wave-starter sample list refresh failure is not reported');
expect(app.includes("'resonance-hotkey-audio-ready'"), 'resonance hotkey ensureAudioReady failure is not reported');
expect(app.includes("'nexus-agent-toggle-audio-ready'"), 'nexus agent ensureAudioReady failure is not reported');

const stage = read('src/features/xensonar/rooms/resonanceStageController.ts');
expect(stage.includes("'stage-canvas-ripple-audio-ready'"), 'stage canvas ripple ensureAudioReady failure is not reported');

const sampleActions = read('src/features/l3lab/canonicalForge/melodicSampleActions.ts');
for (const code of [
  'upload-melodic-samples',
  'import-spectral-selection-as-melodic-sample',
  'delete-melodic-sample',
  'update-melodic-sample-base-hz',
  'save-melodic-sample-envelope',
  'update-melodic-sample-tempo-profile',
]) {
  expect(sampleActions.includes(`'${code}'`), `melodic sample action failure not reported: ${code}`);
}

const selectedSample = read('src/features/l3lab/canonicalForge/SelectedSampleEffectStrip.tsx');
expect(selectedSample.includes("'selected-sample-waveform-preview'"), 'selected sample waveform preview failure is not reported');

const lifecycle = read('src/features/l3lab/canonicalForge/useCanonicalForgeLifecycleEffects.ts');
expect(lifecycle.includes("'canonical-selection-loop-preview'"), 'canonical selection loop preview failure is not reported');
expect(lifecycle.includes("'canonical-source-audition-preview'"), 'canonical source audition preview failure is not reported');

const libraryLifecycle = read('src/features/l3lab/canonicalForge/useCanonicalForgeMelodicSampleLibraryLifecycle.ts');
expect(libraryLifecycle.includes("'canonical-library-sample-list-refresh'"), 'canonical sample library refresh failure is not reported');

const intakeBridge = read('src/features/l3lab/canonicalForge/canonicalIntakeEventBridge.ts');
expect(intakeBridge.includes("'canonical-intake-raw-send'"), 'canonical raw material send failure is not reported');
expect(intakeBridge.includes("'canonical-raw-selection-to-melodic-sample'"), 'canonical raw selection sample failure is not reported');
expect(intakeBridge.includes("'canonical-blob-to-melodic-sample'"), 'canonical blob sample failure is not reported');

const rootBank = read('src/features/xensonar/material/useRootFollowLoopBankController.ts');
expect(rootBank.includes("'mark-root-follow-preferred'"), 'root-follow preferred marking failure is not reported');
expect(rootBank.includes("'set-root-follow-loop-anchor'"), 'root-follow anchor update failure is not reported');

const topologyResidentUiState = read('src/features/topology/useMyzelResidentWorkbenchUiState.ts');
expect(topologyResidentUiState.includes("'myzel-sample-list-refresh'"), 'myzel topology sample list refresh failure is not reported');

const monitoredFiles = [
  'src/App.tsx',
  'src/features/xensonar/rooms/resonanceStageController.ts',
  'src/features/l3lab/canonicalForge/SelectedSampleEffectStrip.tsx',
  'src/features/l3lab/canonicalForge/melodicSampleActions.ts',
  'src/features/l3lab/canonicalForge/useCanonicalForgeMelodicSampleLibraryLifecycle.ts',
  'src/features/l3lab/canonicalForge/useCanonicalForgeLifecycleEffects.ts',
  'src/features/l3lab/canonicalForge/canonicalIntakeEventBridge.ts',
  'src/features/xensonar/material/useRootFollowLoopBankController.ts',
  'src/features/topology/useMyzelResidentWorkbenchUiState.ts',
];
for (const file of monitoredFiles) {
  const text = read(file);
  const thenLines = text.split('\n').map((line, index) => ({ line, number: index + 1 })).filter(({ line }) => line.includes('void ') && line.includes('.then('));
  for (const { line, number } of thenLines) {
    const slice = text.split('\n').slice(Math.max(0, number - 1), Math.min(text.split('\n').length, number + 8)).join('\n');
    expect(slice.includes('.catch('), `${file}:${number} has void promise chain without nearby catch`);
  }
}

if (!ok) process.exit(1);
console.log('[check-async-runtime-issue-contract] ok');
