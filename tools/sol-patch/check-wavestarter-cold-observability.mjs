import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'src/features/xensonar/browserImplant/useBrowserWaveStarterImplant.ts');
const source = fs.readFileSync(file, 'utf8');

function sliceBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`missing start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

const tryAttack = sliceBetween(
  'const tryAttack = useCallback((attack: BrowserWaveStarterAttack): boolean => {',
  'const noteLegacyBypass = useCallback',
);
const bypass = sliceBetween(
  'const noteLegacyBypass = useCallback',
  'const testTone = useCallback',
);
const telemetryFlush = sliceBetween(
  'useEffect(() => {\n    if (!enabled) return;\n    const timer = window.setInterval(() => {',
  'const failOwned = useCallback',
);

const checks = {
  noAttackRequestDiagnostic: !tryAttack.includes("'attack-request'"),
  noAttackRecordReadyDiagnostic: !tryAttack.includes("'attack-record-ready'"),
  noAttackSubmitOkDiagnostic: !tryAttack.includes("'attack-submit-ok'"),
  onlyFailureDiagnosticsRemainInTryAttack: count(tryAttack, 'recordBrowserImplantDiagnostic(') === 2
    && tryAttack.includes("'attack-submit-full'")
    && tryAttack.includes("'attack-submit-exception'"),
  onlyFailureReactUpdatesRemainInTryAttack: count(tryAttack, 'setSnapshot(') === 2,
  legacyBypassHasNoDirectDiagnostic: !bypass.includes('recordBrowserImplantDiagnostic('),
  legacyBypassHasNoDirectReactUpdate: !bypass.includes('setSnapshot('),
  successUsesPrimitiveTelemetryRef: tryAttack.includes('telemetry.submittedAttacks += 1;')
    && tryAttack.includes('telemetry.submittedSinceFlush += 1;')
    && tryAttack.includes('telemetry.dirty = true;'),
  boundedTelemetryFlushPresent: telemetryFlush.includes('LIVE_ATTACK_TELEMETRY_FLUSH_MS')
    && telemetryFlush.includes("'attack-telemetry-flush'"),
  peakFormulaPreserved: tryAttack.includes('const peak = clamp(attack.volume * 0.35, 0.025, 0.12);'),
  leadFramesPreserved: tryAttack.includes('const leadFrames = 256;'),
  ageFormulaPreserved: tryAttack.includes('const ageOffsetFrames = Math.round((requestedAtMs - nowMs) * ctx.sampleRate / 1000);'),
  targetFrameFormulaPreserved: tryAttack.includes('const targetFrame = Math.max(0, host.estimateKernelFrame() + leadFrames + ageOffsetFrames);'),
  encoderPreserved: tryAttack.includes('const record = encodeResolvedWaveStarterCoreForKernel({'),
  submitBoundaryPreserved: tryAttack.includes('const sent = host.trySubmitTonePlan(record);'),
  diagnosticDownloadSeesLiveCounters: source.includes('liveAttackTelemetry: { ...liveTelemetry }'),
};

const failed = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key);
const result = {
  pass: failed.length === 0,
  proofClass: 'source-shape/hotpath-contract',
  target: path.relative(root, file),
  checks,
  failed,
  note: 'This proves the intended code-shape separation only. It does not prove audible burst elimination.',
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exit(1);
