#!/usr/bin/env node
import fs from 'node:fs';
function fail(message) {
  console.error(`[check-synth-sample-anchor-contract] FAIL: ${message}`);
  process.exit(1);
}
const sampleWorkspaceText = fs.readFileSync('src/features/l3lab/canonicalForge/melodicSampleWorkspaceController.ts', 'utf8');
if (!sampleWorkspaceText.includes("import { resolveInstrumentDef } from './canonicalPreviewVoices';")) fail('missing resolveInstrumentDef import');
if (!sampleWorkspaceText.includes('const renderedInstrument = sourcePresetIsSample ? null : resolveInstrumentDef(effectivePreset, new Map())')) fail('rendered instrument is not resolved for synth sample anchor');
if (!sampleWorkspaceText.includes('const renderedOctaveBias = renderedInstrument?.kind === \'synth\' ? (renderedInstrument.voice.octaveBias ?? 0) : 0')) fail('synth octaveBias is not captured');
if (!sampleWorkspaceText.includes('canonicalLoopNoteOctaveOffset(sourceNote) + renderedOctaveBias')) fail('renderedAnchorHz does not include synth voice octaveBias');
if (!sampleWorkspaceText.includes('note.anchorHz = renderedAnchorHz')) fail('frozen sample note does not keep rendered anchorHz');

const voiceText = fs.readFileSync('src/features/l3lab/canonicalForge/canonicalPreviewVoices.ts', 'utf8');
if (!voiceText.includes("case 'deep_sub':")) fail('Deep Sub voice case missing');
if (!voiceText.includes("{ freqMul: 1, type: 'sine', volumeMul: 1") || !voiceText.includes("{ freqMul: 2, type: 'triangle'")) fail('Deep Sub is not root-aligned to freqMul 1 plus octave harmonic');
const deepSubBlock = voiceText.slice(voiceText.indexOf("case 'deep_sub':"), voiceText.indexOf("case 'vibrato_glass':"));
if (/octaveBias:\s*-1/.test(deepSubBlock)) fail('Deep Sub still has hidden octaveBias -1');
if (!voiceText.includes("const isDarkSub = preset === 'dark_sub';")) fail('Dark Sub tonal normalization guard missing');
if (!voiceText.includes('const overtoneRatio = isDarkSub ? 2 : cfg.overtoneRatio;')) fail('Dark Sub still uses the non-octave 4/3 overtone in the Melodic Loop adapter');
if (!voiceText.includes("const octaveBias = preset === 'cello' || preset === 'membrane_bloom' ? -1 : undefined;")) fail('Dark Sub still participates in the drone octaveBias list');
console.log('[check-synth-sample-anchor-contract] ok: frozen synth samples keep rendered octave bias where needed; Dark Sub and Deep Sub are root-aligned for Melodic Loop pitch anchoring.');
