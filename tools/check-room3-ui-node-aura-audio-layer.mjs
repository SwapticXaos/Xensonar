#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  'src/features/resonance/refactorTopologyLegacyAudio.ts',
  'src/features/resonance/refactorTopologyLegacyAudioFrame.ts',
  'src/features/resonance/refactorTopologyNodeAura.ts',
  'src/features/resonance/refactorTopologyLegacyAudioGraph.ts',
];

const sources = Object.fromEntries(files.map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
const joined = Object.values(sources).join('\n');
const legacy = sources['src/features/resonance/refactorTopologyLegacyAudio.ts'];
const frame = sources['src/features/resonance/refactorTopologyLegacyAudioFrame.ts'];
const aura = sources['src/features/resonance/refactorTopologyNodeAura.ts'];
const graph = sources['src/features/resonance/refactorTopologyLegacyAudioGraph.ts'] ?? legacy;

const required = [
  ['refactorBoundary:signatureModule', /export\s+const\s+getNodeAuraSignature/.test(aura)],
  ['refactorBoundary:frameModule', /export\s+const\s+deriveRefactorTopologyLegacyAudioFrame/.test(frame)],
  ['refactorBoundary:legacyImportsFrame', /deriveRefactorTopologyLegacyAudioFrame/.test(legacy)],
  ['uiNearestPresetSignature', /getNodeAuraSignature\(nearestPresetId\)/.test(frame)],
  ['nearestPresetRead', /snapshot\.myzelNearestPresetId/.test(frame)],
  ['nodeColorOscState', /nodeColorOsc:\s*OscillatorNode\s*\|\s*null/.test(legacy)],
  ['nodeNoiseSourceState', /nodeNoiseSource:\s*AudioBufferSourceNode\s*\|\s*null/.test(legacy)],
  ['nodeDriveShaperState', /nodeDriveShaper:\s*WaveShaperNode\s*\|\s*null/.test(legacy)],
  ['colorOscCreated', /const\s+nodeColorOsc\s*=\s*ctx\.createOscillator\(\)/.test(graph)],
  ['noiseSourceCreated', /const\s+nodeNoiseSource\s*=\s*ctx\.createBufferSource\(\)/.test(graph)],
  ['driveShaperCreated', /const\s+driveShaper\s*=\s*ctx\.createWaveShaper\(\)/.test(graph)],
  ['colorGainConnected', /nodeColorOsc\.connect\(colorGain\)/.test(graph)],
  ['noiseGainConnected', /nodeNoiseSource\.connect\(noiseGain\)/.test(graph)],
  ['driveShaperInPath', /filter\.connect\(driveGain\)[\s\S]*driveGain\.connect\(driveShaper\)[\s\S]*driveShaper\.connect\(pan\)/.test(graph)],
  ['spatialBitcrusherRead', /snapshot\.myzelSpatialBitcrusher/.test(frame)],
  ['spatialSubRead', /snapshot\.myzelSpatialSub/.test(frame)],
  ['spatialResonatorRead', /snapshot\.myzelSpatialResonator/.test(frame)],
  ['spatialChorusRead', /snapshot\.myzelSpatialChorus/.test(frame)],
  ['nodeColorFrequencyWrite', /state\.nodeColorOsc\?\.frequency\.setTargetAtTime/.test(legacy)],
  ['nodeColorGainWrite', /state\.nodeColorGain\?\.gain\.setTargetAtTime/.test(legacy)],
  ['nodeNoiseGainWrite', /state\.nodeNoiseGain\?\.gain\.setTargetAtTime/.test(legacy)],
  ['nodeDriveGainWrite', /state\.nodeDriveGain\?\.gain\.setTargetAtTime/.test(legacy)],
  ['signatureFilterWrite', /nodeSignatureFilterMul/.test(legacy)],
  ['signatureQWrite', /nodeSignatureQ/.test(legacy)],
  ['signatureSubBiasWrite', /nodeSignature\.subBias/.test(legacy) || /signatureSub/.test(legacy)],
  ['signatureAirBiasWrite', /nodeSignature\.airBias/.test(legacy) || /signatureAir/.test(legacy)],
];

const signaturePresets = [
  'dreckecke', 'metallcluster', 'metall', 'vokalecke', 'vokal', 'shimmerhof', 'glas', 'luft', 'koernung', 'subwurzel', 'koerper', 'custom'
];
for (const preset of signaturePresets) {
  required.push([`signaturePreset:${preset}`, new RegExp(`case ['"]${preset}['"]:`).test(aura)]);
}

const failures = required.filter(([, ok]) => !ok).map(([name]) => name);

const report = {
  ok: failures.length === 0,
  checkedFiles: files,
  requiredCount: required.length,
  failures,
  refactorBoundary: {
    signatureFile: 'src/features/resonance/refactorTopologyNodeAura.ts',
    frameFile: 'src/features/resonance/refactorTopologyLegacyAudioFrame.ts',
    audioWriterFile: 'src/features/resonance/refactorTopologyLegacyAudio.ts',
    audioGraphFile: 'src/features/resonance/refactorTopologyLegacyAudioGraph.ts',
  },
  evidence: {
    hasNodeAuraSignature: /getNodeAuraSignature/.test(joined),
    hasUiLabelPresetBridge: /snapshot\.myzelNearestPresetId/.test(joined),
    hasAdditionalAudibleDevices: /nodeColorOsc/.test(joined) && /nodeNoiseSource/.test(joined) && /nodeDriveShaper/.test(joined),
    hasSpatialEffectReads: /myzelSpatialBitcrusher/.test(frame) && /myzelSpatialSub/.test(frame) && /myzelSpatialResonator/.test(frame),
    hasDeviceWrites: /nodeColorGain\?\.gain\.setTargetAtTime/.test(legacy) && /nodeDriveGain\?\.gain\.setTargetAtTime/.test(legacy),
    frameExtractedFromAudioWriter: /deriveRefactorTopologyLegacyAudioFrame\(now, rootHz, snapshot, state\)/.test(legacy),
  },
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
