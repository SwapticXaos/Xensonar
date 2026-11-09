#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const args = { only: null, verbose: false, out: 'reports/spectralforge-carrier-integral-sanity.json' };
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === '--only') args.only = process.argv[++i] || null;
  else if (arg.startsWith('--only=')) args.only = arg.slice('--only='.length);
  else if (arg === '--verbose') args.verbose = true;
  else if (arg === '--out') args.out = process.argv[++i] || args.out;
  else if (arg === '--help' || arg === '-h') {
    console.log('Usage: node tools/run-spectralforge-carrier-integral-sanity.mjs [--only check-id] [--out file] [--verbose]');
    process.exit(0);
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

const cache = new Map();
function read(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) throw new Error(`missing file: ${rel}`);
  if (!cache.has(rel)) cache.set(rel, fs.readFileSync(abs, 'utf8'));
  return cache.get(rel);
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function has(rel, token) {
  return read(rel).includes(token);
}
function must(rel, token, message = `${rel} missing ${token}`) {
  assert(has(rel, token), message);
}
function mustNot(rel, token, message = `${rel} must not contain ${token}`) {
  assert(!has(rel, token), message);
}
function mustMatch(rel, pattern, message = `${rel} missing ${pattern}`) {
  assert(pattern.test(read(rel)), message);
}
function block(rel, startNeedle, endNeedle) {
  const text = read(rel);
  const start = text.indexOf(startNeedle);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(start >= 0 && end > start, `${rel}: could not isolate block ${startNeedle}`);
  return text.slice(start, end);
}
function blockMust(source, token, message) { assert(source.includes(token), message); }
function blockMustNot(source, token, message) { assert(!source.includes(token), message); }
function objectEntryBlock(rel, key) {
  const text = read(rel);
  const startNeedle = `  '${key}': {`;
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `${rel}: missing object entry ${key}`);
  const commaEnd = text.indexOf('\n  },', start + startNeedle.length);
  const finalEnd = text.indexOf('\n  }\n};', start + startNeedle.length);
  const end = commaEnd > start ? commaEnd : finalEnd;
  assert(end > start, `${rel}: could not isolate object entry ${key}`);
  return text.slice(start, end + 5);
}
function registryMachineBlock(machineId) {
  const text = read(REGISTRY);
  const start = text.indexOf(`    id: '${machineId}',`);
  assert(start >= 0, `${machineId} missing from registry`);
  const end = text.indexOf('\n  },', start);
  assert(end > start, `${machineId} registry entry could not be isolated`);
  return text.slice(start, end + 5);
}

const RUNTIME = 'src/features/l3lab/spectralForge/integral/carrierIntegralRuntimeRoutes.ts';
const ROOT = 'src/features/l3lab/spectralForge/rootFollow/buildV2RootFollowEvent.ts';
const REGISTRY = 'src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts';
const MENU = 'src/features/l3lab/spectralForge/integral/carrierIntegralMenuModel.ts';

const checks = {
  'branch-a-runtime': () => {
    const aBlock = objectEntryBlock(RUNTIME, 'branch-a-line-traffic');
    for (const [token, msg] of [
      ["status: 'wired'", 'A route must be wired, not contract-only'],
      ["compositionPresetId: 'spectralforge-v2-branch-a-line-traffic'", 'A route must use branch-a line traffic preset id'],
      ["emissionMode: 'branch_a_line_traffic'", 'A emission mode must be explicit'],
      ['shouldBuildSyntheticRootFollow: true', 'A route must allow synthetic root-follow build'],
      ['mayUseDirectSupernoteBuilder: false', 'A must not be labelled as direct Supernote builder'],
    ]) blockMust(aBlock, token, msg);
    blockMustNot(aBlock, 'interval-window-body', 'A block must not be labelled as C interval-window body');
    blockMustNot(aBlock, 'b573', 'A block must not be labelled as B_5.73');
    const bBlock = objectEntryBlock(RUNTIME, 'branch-b573-synth-window');
    const cBlock = objectEntryBlock(RUNTIME, 'branch-c-interval-body');
    blockMust(bBlock, "emissionMode: 'branch_b_5_73_synth_window_body'", 'B_5.73 route must stay distinct');
    blockMust(cBlock, "emissionMode: 'branch_c_interval_window_body'", 'C route must stay distinct');
    for (const token of [
      "runtimeRoute.machineId === 'branch-a-line-traffic'",
      'function branchALineTrafficMicroOffsetBeat',
      'function branchALineTrafficVelocityScale',
      'function branchALineTrafficGateScale',
      "'branch-a-traffic-'",
      "'branch-a-traffic|'",
      'branchALineTrafficCount',
      'branchALineTrafficMicroOffsetCount',
      'A Linienverkehr ist aktiv, aber aus diesem Carrier wurden keine geführten Linien ableitbar.',
      'shouldBuildB573SynthWindow || shouldBuildCIntervalBody',
      'spectralWindowMeta: null',
    ]) must(ROOT, token);
    must(REGISTRY, "antiBurstStrategy: 'traffic-line-shaping'");
    must(MENU, "'branch-a-linienkoerper': 'branch-a-line-traffic'");
    must(MENU, "'line-window': ['branch-a-line-traffic']");
  },
  'branch-b573-runtime': () => {
    const bBlock = objectEntryBlock(RUNTIME, 'branch-b573-synth-window');
    for (const [token, msg] of [
      ["status: 'wired'", 'B_5.73 route must be wired, not contract-only'],
      ["compositionPresetId: 'spectralforge-v2-b573-synth-window-body'", 'B_5.73 route must use b573 synth-window preset id'],
      ["emissionMode: 'branch_b_5_73_synth_window_body'", 'B_5.73 emission mode must be explicit'],
      ['shouldBuildSyntheticRootFollow: true', 'B_5.73 route must allow synthetic root-follow build'],
      ['mayUseDirectSupernoteBuilder: false', 'B_5.73 must not use direct Supernote builder'],
    ]) blockMust(bBlock, token, msg);
    blockMustNot(bBlock, 'interval-window-body', 'B_5.73 block must not be labelled as C interval-window body');
    const cBlock = objectEntryBlock(RUNTIME, 'branch-c-interval-body');
    blockMust(cBlock, "compositionPresetId: 'spectralforge-v2-interval-window-body'", 'C route must stay on C interval-window preset id');
    blockMust(cBlock, "emissionMode: 'branch_c_interval_window_body'", 'C emission mode must stay separate from B');
    for (const token of [
      "import { buildBranchB573SynthWindowBodyPlan }",
      "runtimeRoute.machineId === 'branch-b573-synth-window'",
      'shouldBuildB573SynthWindow || shouldBuildCIntervalBody',
      'localField: voice.localField',
      'b573LocalFieldVoiceCount',
      'b573EmissionMode: b573WindowPlan?.emissionMode',
      'B_5.73 Synth-Fenster ist aktiv, aber aus diesem Carrier wurden keine dichten Spaltenfenster ableitbar.',
      'spectralWindowMeta: null',
    ]) must(ROOT, token);
    assert(has(ROOT, 'const notes: RootFollowSynthNoteSnapshot[] = shouldBuildB573SynthWindow') && has(ROOT, '? b573WindowNotes'), 'B_5.73 notes must be selected before C/direct notes');
    const b573 = 'src/features/l3lab/spectralForge/rootFollow/buildBranchB573SynthWindowBodyPlan.ts';
    const c = 'src/features/l3lab/spectralForge/rootFollow/buildV2IntervalWindowBodyPlan.ts';
    for (const token of ['export function buildBranchB573SynthWindowBodyPlan', 'converts dense Carrier columns into fewer stretchable synth voices', 'buildLocalFieldFromWindow', "emissionMode: SpectralForgeV2RootFollowEmissionMode = hasDenseBody && voices.length > 0 ? 'interval_window_body' : 'line_segments'"]) must(b573, token);
    must(c, 'export function buildSpectralForgeV2IntervalWindowBodyPlan');
    must(REGISTRY, "antiBurstStrategy: 'b573-synth-window-body'");
    must(REGISTRY, "antiBurstStrategy: 'interval-window-body'");
  },
  'branch-c-runtime': () => {
    const cBlock = objectEntryBlock(RUNTIME, 'branch-c-interval-body');
    for (const [token, msg] of [
      ["status: 'wired'", 'C route must be wired, not contract-only'],
      ["compositionPresetId: 'spectralforge-v2-interval-window-body'", 'C route must use interval-window-body preset id'],
      ["emissionMode: 'branch_c_interval_window_body'", 'C route must expose branch_c_interval_window_body emission mode'],
      ['shouldBuildSyntheticRootFollow: true', 'C route must allow synthetic root-follow build'],
      ['mayUseDirectSupernoteBuilder: false', 'C route must not use direct Supernote builder'],
    ]) blockMust(cBlock, token, msg);
    for (const token of [
      "import { buildSpectralForgeV2IntervalWindowBodyPlan }",
      "runtimeRoute.machineId === 'branch-c-interval-body'",
      'spectralWindowMeta: voice.spectralWindowMeta',
      'intervalWindowCount: intervalWindowPlan?.summary.intervalWindowCount',
      'spectralWindowMetaCount',
      'C Intervallkörper ist aktiv, aber aus diesem Carrier wurden keine dichten Fenster ableitbar.',
    ]) must(ROOT, token);
    assert(has(ROOT, ': shouldBuildCIntervalBody') && has(ROOT, '? intervalWindowNotes') && has(ROOT, ': directSegmentNotes'), 'C must not fall through to direct segment notes');
    const interval = 'src/features/l3lab/spectralForge/rootFollow/buildV2IntervalWindowBodyPlan.ts';
    for (const token of ['export function buildSpectralForgeV2IntervalWindowBodyPlan', 'buildLocalFieldForWindow', 'spectralWindowMeta: buildMeta(window, role)', 'denseColumnRatio']) must(interval, token);
    must('src/features/xensonar/rootFollow/rootFollowSpectralWindowMeta.ts', 'export type RootFollowSpectralWindowMeta');
    must('src/features/xensonar/rootFollow/rootFollowTypes.ts', "import type { RootFollowSpectralWindowMeta } from './rootFollowSpectralWindowMeta';");
    must('src/features/xensonar/rootFollow/rootFollowTypes.ts', 'spectralWindowMeta?: RootFollowSpectralWindowMeta | null;');
    must('src/features/xensonar/rootFollow/rootFollowTypes.ts', 'spectralWindowMeta: parsed.spectralWindowMeta');
  },
  'runtime-route': () => {
    const checks = [
      [RUNTIME, "'legacy-supernote-5.69'", 'legacy 5.69 runtime route'],
      [RUNTIME, "compositionPresetId: 'spectralforge-v2-legacy-supernote-5-69'", 'legacy preset id must be explicit'],
      [RUNTIME, "emissionMode: 'legacy_5_69_direct_supernote'", 'legacy emission mode must be explicit'],
      [RUNTIME, "'branch-a-line-traffic'", 'Antonia runtime route'],
      [RUNTIME, "label: 'Antonia'", 'Antonia runtime label'],
      [RUNTIME, "'branch-b573-synth-window'", 'B_5.73 runtime route placeholder'],
      [RUNTIME, 'shouldBuildSyntheticRootFollow: false', 'non-wired routes must refuse synthetic root-follow config'],
      ['src/features/l3lab/spectralForge/integral/carrierIntegralSelection.ts', "const machineId: CarrierIntegralMachineId = 'branch-a-line-traffic';", 'default must be the active Antonia Branch-A route'],
      [ROOT, 'resolveCarrierIntegralRuntimeRootFollowRoute', 'root-follow builder must consult runtime route'],
      [ROOT, 'compositionPresetId: runtimeRoute.compositionPresetId', 'composition preset must come from runtime route'],
      [ROOT, 'runtimeRoute.shouldBuildSyntheticRootFollow', 'eligibility must respect runtime route'],
      [ROOT, 'carrierIntegralRuntimeStatus: runtimeRoute.status', 'summary must record runtime status'],
      [ROOT, 'carrierIntegralEmissionMode: runtimeRoute.emissionMode', 'summary must record emission mode'],
      ['src/features/l3lab/spectralForge/embodiment/buildSpectralEmbodimentArtifacts.ts', 'Boolean(rootFollowBuild?.summary.eligible)', 'synthetic root-follow send must respect eligibility'],
      ['src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx', 'executeCarrierIntegralTransfer', 'manager must keep runtime transfer delegated to executor'],
    ];
    for (const [file, token, msg] of checks) must(file, token, msg);
    mustNot('src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx', '      />\n      />', 'double JSX input closing tag must not return');
    mustNot(REGISTRY, 'energyThreshold: clamp01(params.energyThreshold),\n    energyThreshold: clamp01(params.energyThreshold),', 'duplicate energyThreshold clamp must stay removed');
  },
  'send-targets': () => {
    const contracts = 'src/features/l3lab/spectralForge/integral/carrierIntegralContracts.ts';
    const sendTargets = 'src/features/l3lab/spectralForge/integral/carrierIntegralSendTargets.ts';
    const surface = [sendTargets, 'src/features/l3lab/spectralForge/integral/carrierIntegralSendTargetContracts.ts', 'src/features/l3lab/spectralForge/integral/carrierIntegralSendContractBuilders.ts'].map(read).join('\n');
    for (const destination of ['materialspur', 'root-follow-loop', 'loop-track-direct', 'melodic-pink-lane']) assert(surface.includes(`'${destination}'`), `destination ${destination} missing`);
    for (const mode of ['synthetic-time-elastic', 'raw-granular-elastic', 'raw-tape-coupled', 'fixed-rendered-audio']) assert(surface.includes(`'${mode}'`), `elasticity mode ${mode} missing`);
    for (const fn of ['resolveCarrierIntegralSendContract', 'resolveCarrierIntegralDestinationSupport', 'listCarrierIntegralSendContracts', 'describeCarrierIntegralElasticity']) must(sendTargets, `function ${fn}`, `${fn} missing`);
    assert(surface.includes("defaultElasticity: 'synthetic-time-elastic'"), 'synthetic Root Follow default elasticity missing');
    assert(surface.includes("allowedElasticities: ['raw-granular-elastic', 'raw-tape-coupled']"), 'raw audio granular/tape choice missing');
    assert(surface.includes('Materialspur-Senden und Root-Follow-Senden'), 'material/root target separation guardrail missing');
    for (const machineId of ['legacy-supernote-5.69', 'raw-darkpsy-oscillator', 'harmonic-xplore-direct-carrier', 'spektral-synthese-body', 'branch-a-line-traffic', 'branch-b573-synth-window', 'branch-c-interval-body']) {
      const entry = registryMachineBlock(machineId);
      assert(entry.includes("'materialspur-export': true"), `${machineId} must advertise Materialspur export`);
      assert(entry.includes("'root-follow-export': true"), `${machineId} must advertise Root Follow export`);
    }
    const guards = 'src/features/l3lab/spectralForge/integral/carrierIntegralRouteGuards.ts';
    for (const token of ['inspectCarrierIntegralSendDestinationContracts', 'b573-root-synthetic-elastic', 'raw-audio-root-elasticity-choice']) must(guards, token);
    must('src/features/l3lab/spectralForge/integral/index.ts', 'carrierIntegralSendTargets');
    must(contracts, "'root-follow-export'");
    must(contracts, "'materialspur-export'");
    must('docs/SPECTRALFORGE_CARRIER_INTEGRAL_SEND_TARGETS_3.2.91.5.89.md', 'Root Follow Loop');
    must('docs/SPECTRALFORGE_CARRIER_INTEGRAL_SEND_TARGETS_3.2.91.5.89.md', 'Materialspur');
    must('docs/SPECTRALFORGE_CARRIER_INTEGRAL_SEND_TARGETS_3.2.91.5.89.md', 'synthetic-time-elastic');
    must('docs/SPECTRALFORGE_CARRIER_INTEGRAL_SEND_TARGETS_3.2.91.5.89.md', 'raw-granular-elastic');
    must('docs/SPECTRALFORGE_CARRIER_INTEGRAL_SEND_TARGETS_3.2.91.5.89.md', 'raw-tape-coupled');
  },
  'body-sources': () => {
    const neutral = 'src/features/l3lab/spectralForge/donorV2/buildNeutralCarrierDonorV2Tensor.ts';
    const contracts = 'src/features/l3lab/spectralForge/integral/carrierIntegralContracts.ts';
    const bodySources = 'src/features/l3lab/spectralForge/integral/carrierIntegralBodySources.ts';
    const doc = 'docs/SPECTRALFORGE_CARRIER_INTEGRAL_BODY_SOURCES_3.2.91.5.90.md';
    for (const token of ['buildNeutralCarrierDonorV2Tensor', "registers: DonorRegisterLabel[] = ['low', 'mid', 'high']", "phases: DonorAnchorPhase[] = ['attack', 'sustain', 'release']", "regimes: CarrierAnchorRegime[] = ['tonal', 'cluster', 'noise', 'transient']", 'sourceFrameCount']) must(neutral, token);
    for (const mode of ['raw_oscillator', 'neutral_pigment', 'audio_donor', 'harmonic_xplore', 'spektral_synthese']) {
      must(contracts, `'${mode}'`, `body source mode ${mode} missing from contracts`);
      assert(has(bodySources, `${mode}: {`) || has(bodySources, `mode: '${mode}'`), `active body source ${mode} missing from body source registry`);
    }
    for (const legacyVocabularyMode of ['material_render', 'legacy_direct']) {
      must(contracts, `'${legacyVocabularyMode}'`, `legacy body-source vocabulary ${legacyVocabularyMode} missing from contracts`);
      must(doc, legacyVocabularyMode, `body source doc missing ${legacyVocabularyMode}`);
    }
    assert(has(bodySources, 'legacy_direct: {') || has(bodySources, "mode: 'legacy_direct'"), 'active legacy-supernote-5.69 declares legacy_direct but no legacy_direct body-source contract exists');
    for (const fn of ['resolveCarrierIntegralBodySourceContract', 'listCarrierIntegralBodySourceContracts', 'resolveCarrierIntegralMachineBodySourceOptions', 'buildCarrierIntegralNeutralPigmentSource', 'summarizeNeutralPigment', 'inspectCarrierIntegralBodySourceContracts']) must(bodySources, `function ${fn}`, `${fn} missing`);
    assert(has(bodySources, 'providesDonorTensor: true') && has(bodySources, 'requiresAudioDonor: false'), 'neutral pigment must provide tensor without requiring audio donor');
    must(bodySources, 'raw_oscillator');
    must(bodySources, 'donorlose Direktquelle');
    must(bodySources, 'b573-neutral-pigment-ready');
    must(bodySources, 'raw-darkpsy-body-source-exclusive');
    must(REGISTRY, "id: 'b573-neutral-pigment-stretch'");
    must(REGISTRY, "source: 'branch-b-5.82'");
    must('src/features/l3lab/spectralForge/integral/index.ts', 'carrierIntegralBodySources');
    must(doc, 'Neutral-Pigment darf den Roh-Oszillator nicht ersetzen');
    must(doc, 'Material-Renderkörper darf nicht als B_5.73');
  },

  'pink-variants': () => {
    const bridge = 'src/features/l3lab/canonicalForge/carrierIntegralPinkLaneBridge.ts';
    const melodic = 'src/features/l3lab/canonicalForge/melodicLoopPanel.tsx';
    const melodicImportGateway = 'src/features/l3lab/canonicalForge/useMelodicMaterialImportGateway.ts';
    const preview = 'src/features/l3lab/canonicalForge/loopPreview.ts';
    const domain = 'src/features/l3lab/canonicalForge/loopDrumDomainTypes.ts';
    const importDialog = 'src/features/l3lab/canonicalForge/MaterialImportDialog.tsx';
    const labelsSurface = read(bridge) + read(melodic) + read(melodicImportGateway) + read(importDialog);
    for (const id of ['last-hearing', 'grained', 'scattered', 'monotone']) must(bridge, `id: '${id}'`, 'Pinkspur-Variantenliste');
    for (const label of ['Fretless-Feld', 'Raw Audio', 'zerstreut', 'monoton']) assert(labelsSurface.includes(label), `Pinkspur-Variantenlabel missing ${label}`);
    assert(!labelsSurface.includes('letzte Hörweise'), 'old misleading Pinkspur label must stay removed');
    assert(!labelsSurface.includes('gekörnt'), 'old misleading Raw Audio label must stay removed');
    must(bridge, "return 'last-hearing';", 'Pinkspur-Default');
    if (has(melodic, 'data-xensonar-carrier-integral-pink-variant-menu="true"')) {
      must(melodic, 'CARRIER_INTEGRAL_PINK_VARIANTS.map', 'Melodic-Loop-Variantmenu');
    } else {
      must(importDialog, 'data-xensonar-material-import-audio-paint-variant="true"', 'Audio-Paint-Dialog-Variantmenu');
      must(importDialog, 'CARRIER_INTEGRAL_PINK_VARIANTS.map', 'Audio-Paint-Dialog-Variantmenu');
      must(melodicImportGateway, 'queueCarrierPinkExportForImportDialog', 'Carrier-Export opens shared import dialog');
    }
    must(domain, 'export type CarrierIntegralFieldClip', 'LoopNote-Feldclip-Typ');
    must(domain, 'carrierIntegralField?: CarrierIntegralFieldClip | null;', 'LoopNote-Feldclip-Feld');
    must(bridge, 'buildCarrierIntegralFieldClip', 'Fretless field clip builder');
    must(bridge, "note.carrierIntegralField = buildCarrierIntegralFieldClip(pattern, detail, totalBeats, 'last-hearing');", 'Fretless field export');
    for (const token of ['scheduleCarrierIntegralFieldClip', "field.schemaVersion !== 'carrier-integral-field-v1'", 'relativeSemitones']) must(preview, token, 'LoopPreview field clip playback');
    for (const token of ["variant === 'scattered'", 'applyScatteredProjection', "variant === 'monotone'", 'buildCarrierIntegralBodyField', "variant === 'grained'", 'Raw Audio nutzt den gerenderten Materialkörper']) must(bridge, token);
    mustNot(bridge, "return 'monotone';\n}", 'Default must not become monotone');
  },

  'selection-persistence-current': () => {
    const selection = 'src/features/l3lab/spectralForge/integral/carrierIntegralSelection.ts';
    const types = 'src/features/l3lab/spectralForge/state/storeTypes.ts';
    const actions = 'src/features/l3lab/spectralForge/state/storeCarrierIntegralActions.ts';
    const snapshot = 'src/features/l3lab/spectralForge/state/storeProjectSnapshotActions.ts';
    const initial = 'src/features/l3lab/spectralForge/state/storeInitialState.ts';
    for (const token of [
      'CarrierIntegralSelection',
      'createDefaultCarrierIntegralSelection',
      'normalizeCarrierIntegralSelection',
      'applyCarrierIntegralSelectionPatch',
      'resolveCarrierIntegralSelectionParams',
    ]) must(selection, token, `selection contract missing ${token}`);
    for (const token of [
      'carrierIntegralSelection: CarrierIntegralSelection;',
      'setCarrierIntegralSelection: (patch: CarrierIntegralSelectionPatch) => void;',
      'resetCarrierIntegralSelection: () => void;',
      'carrierIntegralSelection?: Partial<CarrierIntegralSelection> | null;',
    ]) must(types, token, `store type contract missing ${token}`);
    must(actions, 'carrierIntegralSelection: applyCarrierIntegralSelectionPatch(state.carrierIntegralSelection, patch)', 'selection setter must patch persistent store state');
    must(actions, 'carrierIntegralSelection: createInitialCarrierIntegralSelectionState()', 'selection reset must restore canonical initial state');
    must(snapshot, 'carrierIntegralSelection: normalizeCarrierIntegralSelection(state.carrierIntegralSelection)', 'project snapshot must persist selection');
    must(snapshot, 'carrierIntegralSelection: normalizeCarrierIntegralSelection(snapshot.carrierIntegralSelection ?? null, s.carrierIntegralSelection)', 'project load must hydrate selection');
    must(initial, 'carrierIntegralSelection: createInitialCarrierIntegralSelectionState()', 'store initial state must own selection');
    mustNot('src/features/l3lab/spectralForge/integral/index.ts', "export * from './carrierIntegralSelection';", 'selection must not be forced back through the broad integral barrel');
  },
  'panel-sections-and-params-current': () => {
    const shell = 'src/features/l3lab/spectralForge/components/CarrierIntegralPanel.tsx';
    const sidebar = 'src/features/l3lab/spectralForge/components/SpectralForgeWorkbenchSidebar.tsx';
    const manager = 'src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx';
    const libraryWorkspace = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/useCarrierIntegralLibraryWorkspace.ts';
    const editor = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/CarrierIntegralMachineEditorSection.tsx';
    const library = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/CarrierIntegralLibrarySection.tsx';
    const signal = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/CarrierIntegralSignalSendSection.tsx';
    must(shell, 'data-xensonar-carrier-integral-panel="true"', 'Carrier Integral shell marker');
    must(shell, '<CarrierIntegralVerwaltenPanel', 'shell must own manager opening');
    must(sidebar, '<CarrierIntegralPanel', 'Workbench sidebar must mount Carrier Integral shell');
    for (const token of ['<CarrierIntegralLibrarySection', '<CarrierIntegralMachineEditorSection', '<CarrierIntegralSignalSendSection']) must(manager, token, `manager must delegate ${token}`);
    must(library, 'data-xensonar-carrier-integral-quiet-library="true"', 'library section marker');
    for (const label of ['Stimmenlimit', 'Linienlimit', 'Fensterlimit', 'Dichte-Schutz', 'LocalField-Tiefe', 'Stretch-Elastik', 'Synth manuell formen', 'Feinjustierung / Labor öffnen']) must(editor, label, `machine editor missing current parameter control ${label}`);
    for (const label of ['An Root Follow senden', 'An Materialspur senden', 'An Melodic Loop senden']) must(signal, label, `signal section missing current send control ${label}`);
    mustNot(manager, 'Antonia Voll', 'active manager must not restore archived Antonia Voll surface');
    mustNot(manager, 'Antonia Glatt', 'active manager must not restore archived Antonia Glatt surface');
  },
  'parameter-runtime-current': () => {
    const rootEvent = 'src/features/l3lab/spectralForge/rootFollow/buildV2RootFollowEvent.ts';
    const artifacts = 'src/features/l3lab/spectralForge/embodiment/buildSpectralEmbodimentArtifacts.ts';
    for (const token of [
      'carrierIntegralParams?: CarrierIntegralMachineParams | null;',
      'carrierIntegralRouteSignature?: CarrierIntegralRouteSignature | null;',
      'const integralParams = args.carrierIntegralParams ?? null;',
      'fadeInBeatsFromParams',
      'carrierIntegralParamsHash',
      'carrierIntegralParamSummary',
    ]) must(rootEvent, token, `root-follow parameter bridge missing ${token}`);
    for (const token of [
      'resolveCarrierIntegralSelectionParams',
      'buildCarrierIntegralRouteSignature',
      'carrierIntegralParams,',
      'carrierIntegralRouteSignature,',
    ]) must(artifacts, token, `embodiment parameter bridge missing ${token}`);
  },
  'project-library-current': () => {
    const manager = 'src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx';
    const libraryWorkspace = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/useCarrierIntegralLibraryWorkspace.ts';
    const librarySection = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/CarrierIntegralLibrarySection.tsx';
    const projectLibrary = 'src/features/l3lab/spectralForge/projectLibrary.ts';
    for (const token of ['saveForgeProject', 'loadForgeProject', 'useForgeProjectLibrary', 'createProjectSnapshot', 'loadProjectSnapshot']) {
      const owner = ['createProjectSnapshot', 'loadProjectSnapshot'].includes(token) ? manager : libraryWorkspace;
      must(owner, token, `project workflow owner missing ${token}`);
    }
    for (const token of ['Neu sichern', 'Auswahl löschen']) must(librarySection, token, `library section missing current control ${token}`);
    for (const token of [
      'ForgeProjectCarrierIntegralMeta',
      'carrierIntegral?: ForgeProjectCarrierIntegralMeta | null',
      'createCarrierIntegralMeta',
      'snapshot.carrierIntegralSelection',
      'carrierIntegral: createCarrierIntegralMeta(args.snapshot)',
    ]) must(projectLibrary, token, `project library missing Carrier Integral metadata contract ${token}`);
    mustNot(librarySection, 'Werte aus Eintrag', 'manual stored-values affordance must stay removed');
  },

  'archived-render-body-compatibility': () => {
    const registry = 'src/features/l3lab/spectralForge/integral/donatelloDieterRenderBodyRegistry.ts';
    const cache = 'src/features/l3lab/spectralForge/integral/materialBodyPreviewCache.ts';
    for (const token of [
      "id: 'dieter-v2-rendered-material-body'",
      "machineId: 'material-render-body'",
      "id: 'dieter-window-body'",
      "id: 'donatello-formant-window-body'",
      "playheadStartPolicy: 'after-rendered-audio-ready'",
      'previewCachePolicy: {',
      'assertDonatelloDieterRenderBodyRegistryComplete',
    ]) must(registry, token, `archived render-body compatibility missing ${token}`);
    for (const token of [
      'buildMaterialBodyPreviewCacheKey',
      'getCachedMaterialBodyPreviewBuffer',
      'storeCachedMaterialBodyPreviewBuffer',
      'clearMaterialBodyPreviewCache',
      'material-body-preview:',
    ]) must(cache, token, `material-body preview-cache contract missing ${token}`);
    const activeSurface = read(REGISTRY) + read(MENU) + read('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralMachineUi.ts');
    assert(!activeSurface.includes("id: 'donatello-formant-window-body'") && !activeSurface.includes("id: 'dieter-window-body'"), 'archived render bodies must not re-enter the active core-six registry/menu surface');
  },
  'harmonic-xplore-direct-engine': () => {
    const files = {
      direct: 'src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreDirectEngine.ts',
      contracts: 'src/features/l3lab/spectralForge/integral/carrierIntegralContracts.ts',
      registry: REGISTRY,
      routes: 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts',
      audition: 'src/features/l3lab/spectralForge/integral/carrierIntegralAudition.ts',
      capabilities: 'src/features/l3lab/spectralForge/integral/carrierIntegralMachineCapabilities.ts',
      runtimeRoutes: RUNTIME,
      syntheticBuild: 'src/features/l3lab/spectralForge/integral/carrierIntegralSyntheticRootFollowBuild.ts',
      artifactRoutes: 'src/features/l3lab/spectralForge/integral/carrierIntegralRootFollowArtifactRoutes.ts',
      transferPlan: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyTransferExecutionPlan.ts',
      ui: 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralMachineUi.ts',
      menu: MENU,
      panel: 'src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx',
      index: 'src/features/l3lab/spectralForge/integral/index.ts',
    };
    for (const [key, token] of [
      ['direct', 'renderCarrierIntegralHarmonicXploreDirectPreviewBuffer'], ['direct', 'buildCarrierIntegralHarmonicXploreDirectTimbreSnapshot'], ['direct', 'directRatioBodyMayOverformLegacySynth: true'], ['direct', 'noPerNoteInitialPitchSwoop: true'], ['direct', 'noiseDustSuppressedForPureCarrier: true'],
      ['contracts', "'harmonic-xplore-direct-carrier'"], ['contracts', "'harmonic-ratio-carrier-machine'"], ['contracts', "'harmonic_xplore'"],
      ['registry', "id: 'harmonic-xplore-direct-carrier'"], ['registry', 'treatAsDistinctMachine: true'], ['registry', "bodySourceModes: ['harmonic_xplore']"],
      ['routes', 'auditionCarrierIntegralHarmonicXploreDirectRoute'], ['routes', 'playRenderedAudioBufferPreview(rendered.buffer'], ['audition', 'auditionCarrierIntegralHarmonicXploreDirectRoute'],
      ['capabilities', "machineId === 'harmonic-xplore-direct-carrier' || machineId === 'spektral-synthese-body'"], ['capabilities', "return 'harmonic-ratio-carrier-reading'"], ['capabilities', "return 'direct-ratio-body-family'"],
      ['runtimeRoutes', "compositionPresetId: 'spectralforge-v2-harmonic-xplore-direct-carrier'"], ['syntheticBuild', 'buildCarrierIntegralHarmonicXploreDirectTimbreSnapshot'], ['artifactRoutes', 'buildCarrierIntegralHarmonicXploreDirectRootFollowArtifactRoute'],
      ['transferPlan', 'case "harmonic-xplore-direct-carrier"'], ['ui', 'HarmonicXplorE'], ['panel', 'buildCarrierIntegralMenuModel()'], ['panel', 'selectedMachine = selected.id'], ['index', "export * from './carrierIntegralHarmonicXploreDirectEngine'"],
    ]) must(files[key], token);
    mustMatch(files.menu, /machine\.id\s*===\s*'harmonic-xplore-direct-carrier'[\s\S]*return 'timbre-lab'/, 'HarmonicXplorE classified into timbre-lab');
    mustNot('src/App.tsx', 'harmonic-xplore-direct-carrier', 'HarmonicXplorE direct must not wire hotpath/App.tsx');
    mustNot('src/features/xensonar/audio/waveStarterLaneRuntime.ts', 'harmonic-xplore-direct-carrier', 'HarmonicXplorE direct must not mutate Wellenstarter');
  },
};

function runCheck(id) {
  const started = Date.now();
  try {
    checks[id]();
    return { id, status: 'pass', durationMs: Date.now() - started };
  } catch (error) {
    return { id, status: 'fail', durationMs: Date.now() - started, error: error?.message || String(error) };
  }
}

const ids = args.only ? [args.only] : Object.keys(checks);
for (const id of ids) {
  if (!checks[id]) throw new Error(`Unknown --only check: ${id}`);
}
const results = ids.map(runCheck);

const externalChecks = args.only ? [] : [
  { id: 'core-six-surface', tool: 'tools/check-spectralforge-carrier-core-six-surface-7743.mjs' },
  { id: 'single-antonia-surface', tool: 'tools/check-spectralforge-antonia-branch-a-single-surface-7775.mjs' },
  { id: 'workshop-selection-simplify', tool: 'tools/check-spectralforge-integral-workshop-selection-simplify.mjs' },
  { id: 'transfer-policy-parity', tool: 'tools/check-spectralforge-carrier-integral-transfer-policy-parity-boundary.mjs' },
  { id: 'rendered-preview-cache', tool: 'tools/check-spectralforge-carrier-integral-rendered-preview-cache-boundary.mjs' },
  { id: 'stable-identity', tool: 'tools/check-spectralforge-carrier-integral-stable-identity-boundary.mjs' },
  { id: 'synthetic-root-follow-build', tool: 'tools/check-spectralforge-carrier-integral-synthetic-root-follow-build-boundary.mjs' },
  { id: 'carrier-melodic-import', tool: 'tools/run-carrier-melodic-import-sanity.mjs' },
];
function runExternalCheck(entry) {
  const started = Date.now();
  const proc = spawnSync(process.execPath, [entry.tool], { cwd: root, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' }, maxBuffer: 1024 * 1024 * 8 });
  const status = (proc.status ?? 1) === 0 ? 'pass' : 'fail';
  return {
    id: entry.id,
    status,
    durationMs: Date.now() - started,
    error: status === 'fail' ? (String(proc.stderr || proc.stdout || '').trim().split(/\r?\n/).slice(-8).join(' | ') || `exit ${proc.status}`) : undefined,
    proofClass: 'current-line-delegated-check',
  };
}
results.push(...externalChecks.map(runExternalCheck));
const failed = results.filter((result) => result.status !== 'pass');
for (const result of results) {
  if (args.verbose || result.status !== 'pass') {
    console.error(`[spectralforge-carrier-integral-sanity] ${result.status.toUpperCase()} ${result.id}${result.error ? `: ${result.error}` : ''}`);
  }
}
const report = {
  ok: failed.length === 0,
  reportKind: 'spectralforge-carrier-integral-sanity',
  generatedAt: new Date().toISOString(),
  summary: { total: results.length, passed: results.length - failed.length, failed: failed.length },
  claimBoundaries: {
    canClaim: ['The current Carrier Integral surface, persisted selection, parameter bridge, project-library metadata, runtime routes, send targets, body sources, transfer parity, preview cache, stable identity and Carrier-to-Melodic handoff remain structurally coherent.'],
    cannotClaim: ['This is not a full audio/browser behavior proof and does not judge Klangqualität or musical usefulness.'],
  },
  results,
};
fs.mkdirSync(path.dirname(path.join(root, args.out)), { recursive: true });
fs.writeFileSync(path.join(root, args.out), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, summary: report.summary, report: args.out }, null, 2));
process.exit(report.ok ? 0 : 1);
