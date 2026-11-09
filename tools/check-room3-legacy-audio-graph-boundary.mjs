#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const rel = (file) => path.join(root, file);
const legacyPath = 'src/features/resonance/refactorTopologyLegacyAudio.ts';
const graphPath = 'src/features/resonance/refactorTopologyLegacyAudioGraph.ts';
const framePath = 'src/features/resonance/refactorTopologyLegacyAudioFrame.ts';
const auraPath = 'src/features/resonance/refactorTopologyNodeAura.ts';
const legacy = fs.readFileSync(rel(legacyPath), 'utf8');
const graph = fs.readFileSync(rel(graphPath), 'utf8');
const frame = fs.readFileSync(rel(framePath), 'utf8');
const aura = fs.readFileSync(rel(auraPath), 'utf8');

const checks = [
  ['graphFileExists', fs.existsSync(rel(graphPath))],
  ['legacyReexportsEnsure', /export\s*\{\s*ensureRefactorTopologyLegacyAudio\s*\}\s*from\s*["']\.\/refactorTopologyLegacyAudioGraph["']/.test(legacy)],
  ['graphImportsStateTypeOnly', /import\s+type\s*\{\s*RefactorTopologyLegacyAudioState\s*\}/.test(graph)],
  ['graphCreatesColorOsc', /const\s+nodeColorOsc\s*=\s*ctx\.createOscillator\(\)/.test(graph)],
  ['graphCreatesNoiseSource', /const\s+nodeNoiseSource\s*=\s*ctx\.createBufferSource\(\)/.test(graph)],
  ['graphCreatesDriveShaper', /const\s+driveShaper\s*=\s*ctx\.createWaveShaper\(\)/.test(graph)],
  ['graphKeepsColorNoiseDrivePath', /nodeColorOsc\.connect\(colorGain\)[\s\S]*nodeNoiseSource\.connect\(noiseGain\)[\s\S]*filter\.connect\(driveGain\)[\s\S]*driveGain\.connect\(driveShaper\)[\s\S]*driveShaper\.connect\(pan\)/.test(graph)],
  ['legacyNoInlineGraphCreation', !/const\s+nodeColorOsc\s*=\s*ctx\.createOscillator\(\)/.test(legacy) && !/ctx\.createBufferSource\(\)/.test(legacy)],
  ['legacyStillWritesColorGain', /state\.nodeColorGain\?\.gain\.setTargetAtTime/.test(legacy)],
  ['legacyStillWritesNoiseGain', /state\.nodeNoiseGain\?\.gain\.setTargetAtTime/.test(legacy)],
  ['legacyStillWritesDriveGain', /state\.nodeDriveGain\?\.gain\.setTargetAtTime/.test(legacy)],
  ['legacyStillWritesNodeColorFrequency', /state\.nodeColorOsc\?\.frequency\.setTargetAtTime/.test(legacy)],
  ['frameStillReadsNearestPreset', /snapshot\.myzelNearestPresetId/.test(frame)],
  ['auraStillExportsSignature', /export\s+const\s+getNodeAuraSignature/.test(aura)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
const lineCount = (src) => src.split(/\r?\n/).length;
const report = {
  ok: failures.length === 0,
  files: { legacyPath, graphPath, framePath, auraPath },
  failures,
  lineCounts: {
    legacy: lineCount(legacy),
    graph: lineCount(graph),
    frame: lineCount(frame),
    aura: lineCount(aura),
  },
  contract: {
    graphOwnsAudioNodeCreation: /ctx\.createOscillator\(\)/.test(graph) && /ctx\.createBiquadFilter\(\)/.test(graph),
    legacyOwnsRuntimeParamWrites: /setTargetAtTime/.test(legacy),
    frameOwnsUiSemanticDerivation: /getNodeAuraSignature\(nearestPresetId\)/.test(frame),
  },
};
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
