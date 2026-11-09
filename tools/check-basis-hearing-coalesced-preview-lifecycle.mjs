#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const transport = read('src/features/l3lab/spectralForge/components/TransportBar.tsx');
const activity = read('src/features/l3lab/spectralForge/components/previewSession/useTransportPreviewActivityGate.ts');
const orchestrator = read('src/features/l3lab/spectralForge/components/previewSession/useTransportPrewarmOrchestrator.ts');
const route = read('src/features/l3lab/spectralForge/components/previewSession/spectralForgePreviewRoute.ts');
const pkg = read('package.json');
const failures = [];
const must = (haystack, needle, label = needle) => {
  if (!haystack.includes(needle)) failures.push(`missing ${label}`);
};
const mustNot = (haystack, needle, label = needle) => {
  if (haystack.includes(needle)) failures.push(`unexpected ${label}`);
};

must(transport, 'const inputStillCurrent = () => {', 'per-render current-token guard');
must(transport, 'if (!inputStillCurrent()) return;', 'stale render progress must not advance the Play-button fill');
must(transport, 'requestTransportSerialPrewarmRerun();', 'stale/in-flight work requests one latest rerun');
must(orchestrator, 'const serialPrewarmRerunRequestedRef = useRef(false);', 'single coalesced rerun owner');
must(transport, 'setTransportPrewarmRendering(false);', 'scheduled but not yet rendering does not show fake fill');
must(transport, 'setTransportPrewarmProgress(0);', 'scheduled state resets fill to zero');
must(activity, "? { coldIdleMs: 520, firstDelayMs: 160, retryDelayMs: 140 }", 'basis-hearing quiet-window timing');
must(activity, ": { coldIdleMs: 2000, firstDelayMs: 80, retryDelayMs: 80 };", 'spectral quiet-window timing');
must(transport, 'const quietWindow = getQuietWindowState(previewRenderRouteKind);', 'scheduler consults activity gate');
must(transport, 'if (quietWindow.blocked) {', 'pointer/quiet blocking remains active');
must(transport, "'Hörweise vorgemerkt · wartet auf ruhigen Reglerstand'", 'basis-hearing waiting state is explicit');
must(route, "'Hörweise wartet auf Regler-Freigabe'", 'basis-hearing pointer-down wait copy');
must(route, "'Hörweise wartet auf ruhigen Reglerstand'", 'basis-hearing quiet wait copy');
must(transport, 'Math.max(quietWindow.retryDelayMs, quietWindow.remainingQuietMs)', 'trailing debounce preserves remaining quiet time');
mustNot(transport, "setTransportPrewarmRendering(true);\n      setTransportPrewarmProgress(0.035);\n      setStatusMessage(previewRenderRouteKind === \"basis-hearing\"", 'old fake fill while only scheduled');
must(pkg, 'xensonar:check-basis-hearing-coalesced-preview-lifecycle', 'package script for coalesced preview lifecycle check');

if (failures.length) {
  console.error('[basis-hearing-coalesced-preview-lifecycle] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[basis-hearing-coalesced-preview-lifecycle] PASS');
