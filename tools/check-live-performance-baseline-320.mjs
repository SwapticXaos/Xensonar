#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const failures = [];
const ok = (cond, message) => { if (!cond) failures.push(message); };
const has = (src, needle, message) => ok(src.includes(needle), message);
const lacks = (src, needle, message) => ok(!src.includes(needle), message);
const count = (src, needle) => src.split(needle).length - 1;

const manifestPath = path.join(root, 'tools/performance/XENSONAR_320_CONFIRMED_LIVE_BASELINE.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
ok(manifest.status === 'user-live-confirmed', '320 baseline must remain marked user-live-confirmed');

// Golden browser artifact integrity: future edits must not silently move the goalposts.
const gzPath = path.join(root, 'tools/performance/reference/Xensonar_320_confirmed_live.html.gz');
const gz = fs.readFileSync(gzPath);
const gzSha = crypto.createHash('sha256').update(gz).digest('hex');
ok(gzSha === manifest.compressed_reference_sha256, `compressed 320 reference SHA mismatch: ${gzSha}`);
const html = zlib.gunzipSync(gz);
const htmlSha = crypto.createHash('sha256').update(html).digest('hex');
ok(htmlSha === manifest.core_html_sha256, `decompressed 320 reference SHA mismatch: ${htmlSha}`);
ok(html.length === manifest.core_html_bytes, `decompressed 320 reference size changed: ${html.length}`);

// 319 root cause #1: CanonicalForge bootstrap must stay one-shot and tool settings value-stable.
{
  const src = read('src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx');
  has(src, 'const [initialState] = useState(() => buildCanonicalForgeInitialState({', 'CanonicalForge initial session bootstrap lost lazy useState initializer');
  has(src, 'const workspaceToolSettings = useMemo(', 'CanonicalForge workspaceToolSettings must stay memoized');
  lacks(src, 'const [initialState] = useState(buildCanonicalForgeInitialState({', 'CanonicalForge must not eagerly rebuild initial session state on render');
}

// 320 root cause #1: keydown must mutate a stable router shell, not rebuild/clamp arrays per attack.
{
  const src = read('src/features/xensonar/input/useAppResonanceKeyboardInputEffectBoundary.ts');
  const actionsAt = src.indexOf('const routerActions: ResonanceKeyboardRouterActions = {');
  const keydownAt = src.indexOf('const handleResonanceKeyDown = (event: KeyboardEvent) => {');
  ok(actionsAt >= 0 && keydownAt > actionsAt, 'stable keyboard routerActions shell must be created outside keydown');
  has(src, 'let routerRuntime: ResonanceKeyboardRouterRuntime | null = null;', 'keyboard router runtime reuse contract missing');
  has(src, 'let routerArgs: ResonanceKeyboardInputRouterArgs | null = null;', 'keyboard router args reuse contract missing');
  has(src, 'routerRuntime.event = event;', 'keyboard router must mutate live event on reused runtime');
  lacks(src, 'recentLoopHotkeyEntries: [...', 'keydown path must not clone recent loop hotkey entries');
  lacks(src, 'recentRootFollowHotkeyEntries: [...', 'keydown path must not clone recent root-follow hotkey entries');
}

// 320 root cause #2: 60 Hz Nexus frame helpers reuse their argument objects.
{
  const src = read('src/features/xensonar/rooms/resonanceNexusFrameRuntime.ts');
  for (const name of ['droneFrameArgs', 'fieldTrafficFrameArgs', 'overlayFrameArgs']) {
    has(src, `let ${name}:`, `Nexus frame ${name} persistent argument slot missing`);
    ok(count(src, `${name} = {`) === 1, `Nexus frame ${name} should allocate its object exactly once in this runtime`);
  }
  has(src, 'droneFrameArgs.state = state;', 'Nexus drone frame must update reused args in place');
  has(src, 'fieldTrafficFrameArgs.frameNowMs = frameNowMs;', 'Nexus traffic frame must update reused args in place');
  has(src, 'overlayFrameArgs.t = t;', 'Nexus overlay frame must update reused args in place');
}

// 320 root cause #3: cursor HUD is a narrow live channel, never root React state.
{
  const src = read('src/features/xensonar/rooms/useResonanceCursorRuntimeState.ts');
  has(src, 'publishResonanceCursorHudHz(next);', 'cursor HUD narrow-channel publish missing');
  has(src, 'const cursorHudHzRef = useRef(', 'cursor HUD canonical ref missing');
  lacks(src, 'useState', 'cursor HUD must not move back into parent React state');
}

// 320 root cause #4: high-rate scheduler/transient telemetry stays out of root React state.
{
  const src = read('src/features/xensonar/rooms/useResonanceFxUiState.ts');
  has(src, 'const controlPerfMonitorRef = useRef<ControlSchedulerMetrics>', 'control scheduler telemetry ref missing');
  has(src, 'const transientRuntimeMonitorRef = useRef<TransientRuntimeSnapshot>', 'transient telemetry ref missing');
  has(src, 'publishResonanceControlPerfMonitor(metrics);', 'control scheduler narrow-channel publish missing');
  has(src, 'publishResonanceTransientRuntimeMonitor(snapshot);', 'transient narrow-channel publish missing');
  lacks(src, 'const [controlPerfMonitor, setControlPerfMonitor] = useState', 'control scheduler telemetry must not return to parent state');
  lacks(src, 'const [transientRuntimeMonitor, setTransientRuntimeMonitor] = useState', 'transient telemetry must not return to parent state');
}

// 320 root cause #5: Hold RAF is demand-driven and sleeps with no active hold.
{
  const src = read('src/features/xensonar/input/useWaveStarterHoldGestureLoopBridge.ts');
  ok(count(src, 'requestAnimationFrame(') === 1, 'Hold bridge must have exactly one RAF allocation site behind ensureHoldLoopRaf');
  has(src, 'if (!hasActiveWaveStarterHoldGestureLoop({ state: waveStarterHoldGestureLoopRef.current })) {', 'Hold RAF active-hold guard missing');
  has(src, 'holdLoopRafRef.current = null;\n        return;', 'Hold RAF must terminate without rescheduling when idle');
  has(src, 'const ensureHoldLoopRaf = () => {', 'Hold RAF demand scheduler missing');
}

// 320 root cause #6: wheel IDs/order must be value-stable across equivalent parent renders.
{
  const src = read('src/features/xensonar/rooms/useResonanceMetaPresetWheelWorkspace.ts');
  has(src, 'const metaPresetIdsRef = useRef<string[]>(candidateMetaPresetIds);', 'MetaPreset ID stability ref missing');
  has(src, 'if (!samePresetOrder(metaPresetIdsRef.current, candidateMetaPresetIds)) {', 'MetaPreset ID value-equality guard missing');
  has(src, 'return samePresetOrder(prev, next) ? prev : next;', 'MetaPreset persistence no-op guard missing');
}

// Root Follow is part of the confirmed baseline. Any intentional change requires an explicit re-baseline.
{
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile()) {
        const rel = path.relative(root, abs).split(path.sep).join('/');
        const folded = rel.toLowerCase().replaceAll('-', '').replaceAll('_', '');
        if (folded.includes('rootfollow')) files.push(rel);
      }
    }
  };
  walk(path.join(root, 'src'));
  files.sort();
  const h = crypto.createHash('sha256');
  for (const rel of files) {
    h.update(rel); h.update('\0'); h.update(fs.readFileSync(path.join(root, rel))); h.update('\0');
  }
  const digest = h.digest('hex');
  ok(files.length === manifest.root_follow_file_count, `Root Follow baseline file count changed: ${files.length}`);
  ok(digest === manifest.root_follow_tree_sha256_v1, `Root Follow tree changed from confirmed 320 baseline: ${digest}`);
}

if (failures.length) {
  console.error('Xensonar 320 live-performance baseline guard: FAIL');
  for (const failure of failures) console.error(` - ${failure}`);
  console.error('\nDo not update the baseline merely to make this test green. Re-baseline only after the browser workload oracle, rendered-audio oracle, and a human live smoke all pass.');
  process.exit(2);
}

console.log('Xensonar 320 live-performance baseline guard: PASS');
console.log(` golden core SHA256: ${manifest.core_html_sha256}`);
console.log(` root-follow tree SHA256: ${manifest.root_follow_tree_sha256_v1}`);
