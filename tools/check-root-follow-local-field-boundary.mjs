#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const rendererPath = 'src/features/xensonar/rootFollow/rootFollowSynthRenderer.ts';
const boundaryPath = 'src/features/xensonar/rootFollow/rootFollowLocalFieldAutomation.ts';
const bodyPath = 'src/features/xensonar/rootFollow/rootFollowDirectNoteRenderBody.ts';
const sampleVoicePath = 'src/features/xensonar/rootFollow/rootFollowSampleVoiceRuntime.ts';
const renderer = read(rendererPath);
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const body = exists(bodyPath) ? read(bodyPath) : '';
const sampleVoice = exists(sampleVoicePath) ? read(sampleVoicePath) : '';
const sampleElasticPlanPath = 'src/features/xensonar/rootFollow/rootFollowSampleElasticPlan.ts';
const sampleElasticPlan = exists(sampleElasticPlanPath) ? read(sampleElasticPlanPath) : '';
const app = read('src/App.tsx');

const failures = [];
if (!exists(boundaryPath)) failures.push(`${boundaryPath} missing`);
if (!exists(bodyPath)) failures.push(`${bodyPath} missing`);
if (!exists(sampleVoicePath)) failures.push(`${sampleVoicePath} missing`);

const mustContain = [
  [boundary, 'export type RootFollowLocalField', 'RootFollowLocalField type export missing'],
  [boundary, 'export function getActiveRootFollowLocalFieldTarget', 'active target resolver export missing'],
  [boundary, 'export function activeRootFollowLocalFieldList', 'active field list export missing'],
  [boundary, 'export function sampleRootFollowLocalFieldTargetValue', 'target value sampler export missing'],
  [boundary, 'export function buildRootFollowLocalPitchSemitoneCurve', 'pitch semitone curve export missing'],
  [boundary, 'export function scheduleRootFollowLocalPitchDetuneAutomation', 'detune automation export missing'],
  [boundary, 'export function scheduleRootFollowSegmentDynamicGainAutomation', 'segment dynamic gain automation export missing'],
  [boundary, 'localFieldDynamicFadeGain(', 'dynamic-fade mapping must remain in boundary'],
  [boundary, 'localFieldPitchSemitoneOffset(', 'pitch-elastic semitone mapping must remain in boundary'],
  [boundary, 'detuneParam.cancelScheduledValues(startTime)', 'detune fallback/cancellation path missing'],
  [renderer + body, "from './rootFollowLocalFieldAutomation'", 'renderer/body must import root-follow local-field boundary'],
  [sampleVoice, 'compileRootFollowGainSampler([args.volumeEnvelope, localField])', 'sample voice runtime must compile source/local dynamic gain through boundary'],
  [sampleVoice, 'buildRootFollowLocalPitchSemitoneCurve(field)', 'sample voice runtime must compile local pitch curves through boundary'],
  [sampleElasticPlan, 'buildRootFollowLocalPitchSemitoneCurve(field)', 'sample-elastic plan must build pitch-elastic curves through boundary'],
  [body, "activeRootFollowLocalFieldList(localField, 'dynamic-fade')", 'direct-note render body must delegate dynamic field list into boundary'],
  [body, 'scheduleRootFollowLocalPitchDetuneAutomation(', 'direct-note render body must delegate oscillator detune automation'],
  [sampleElasticPlan, "from './rootFollowLocalFieldAutomation'", 'sample-elastic plan must import root-follow local-field boundary'],
  [sampleVoice, "from './rootFollowLocalFieldAutomation'", 'sample voice runtime must import root-follow local-field boundary'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const mustMatch = [
  [boundary, /getActiveRootFollowLocalFieldTarget\(\s*fieldInput,\s*['"]dynamic-fade['"]/s, 'dynamic-fade target path missing'],
  [boundary, /getActiveRootFollowLocalFieldTarget\(\s*fieldInput,\s*['"]pitch-elastic['"]/s, 'pitch-elastic target path missing'],
  [boundary, /gain\.gain\.setValueCurveAtTime\(\s*mapped,\s*segmentStart/s, 'segment gain curve automation missing'],
  [body, /scheduleRootFollowDynamicFieldGainAutomation\(\s*dynamicGain,\s*activeRootFollowLocalFieldList\(localField,\s*['"]dynamic-fade['"]\)/s, 'direct-note render body must pass dynamic-fade local-field list into canonical dynamic gain automation'],
];
for (const [content, pattern, message] of mustMatch) {
  if (!pattern.test(content)) failures.push(message);
}

const forbiddenRendererPatterns = [
  [/function\s+buildLocalPitchSemitoneCurve\s*\(/, 'renderer still defines buildLocalPitchSemitoneCurve'],
  [/function\s+scheduleLocalPitchDetuneAutomation\s*\(/, 'renderer still defines scheduleLocalPitchDetuneAutomation'],
  [/function\s+activeLocalFieldList\s*\(/, 'renderer still defines activeLocalFieldList'],
  [/function\s+sampleLocalFieldTargetValue\s*\(/, 'renderer still defines sampleLocalFieldTargetValue'],
  [/function\s+scheduleSegmentDynamicGainAutomation\s*\(/, 'renderer still defines scheduleSegmentDynamicGainAutomation'],
  [/function\s+sampleLocalFieldWithinRange\s*\(/, 'renderer still defines sampleLocalFieldWithinRange'],
  [/function\s+sampleLocalCurveValue\s*\(/, 'renderer still defines sampleLocalCurveValue'],
  [/getLocalFieldTargetState\(/, 'renderer still resolves local field targets directly'],
  [/resolveLocalFieldCurve\(/, 'renderer still resolves local field curves directly'],
  [/localFieldDynamicFadeGain\(/, 'renderer still maps dynamic-fade directly'],
  [/localFieldPitchSemitoneOffset\(/, 'renderer still maps pitch-elastic directly'],
  [/ensureLocalFieldState\(/, 'renderer still normalizes local field state directly'],
];
for (const [pattern, message] of forbiddenRendererPatterns) {
  if (pattern.test(renderer)) failures.push(message);
}

const forbiddenBoundaryNeedles = [
  'scheduleRootFollowSynthWindow',
  'resolveDirectInstrumentDef',
  'loadMelodicSampleBuffer',
  'makeMaterialElasticWindowSeed',
  'materialElasticGrainSourceDitherSec',
  'safeApplyAttack',
  'safeApplyExponentialRelease',
  'recordAudioPressure',
  'activeSynthVoicesRef',
  'rootFollowInputTargetHzRef',
  'useState(',
  'useEffect(',
  'useRef(',
];
for (const needle of forbiddenBoundaryNeedles) {
  if (boundary.includes(needle)) failures.push(`boundary owns renderer/runtime detail: ${needle}`);
}

if (app.includes('rootFollowLocalFieldAutomation')) {
  failures.push('App.tsx should not import the local-field automation boundary directly');
}

if (failures.length) {
  console.error('[root-follow-local-field-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[root-follow-local-field-boundary] OK');
