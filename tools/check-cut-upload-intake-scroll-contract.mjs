#!/usr/bin/env node
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function expect(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  }
}
function has(file, text, label = text) {
  const content = read(file);
  expect(content.includes(text), `${file} should include ${label}`);
}

const app = read('src/App.tsx');
const cutUploadBridge = read('src/features/xensonar/rooms/useSpectralForgeCutUploadBridge.ts');
expect(cutUploadBridge.includes('createCutUploadEntryScrollIntent(sequence)'), 'cut-upload bridge should create a separate cut-upload entry scroll intent token.');
expect(cutUploadBridge.includes('setSpectralForgeExternalAudioOrigin(SPECTRAL_FORGE_CUT_UPLOAD_ORIGIN)'), 'cut-upload bridge should mark cut-upload handoff origin via the shared contract constant.');
const sceneSourceBuilder = read('src/features/xensonar/layout/appPresentationSourceBuilders.ts');
expect(
  app.includes('spectralForgeEntryUploadState,') && sceneSourceBuilder.includes('entryScrollIntent: spectralForgeEntryUploadState.spectralForgeEntryScrollIntent'),
  'App should pass entry scroll intent into the room scene runtime args through the presentation source boundary.',
);
expect(
  sceneSourceBuilder.includes('onEntryScrollIntentConsumed') && sceneSourceBuilder.includes('setSpectralForgeEntryScrollIntent((current)'),
  'App should clear the scroll intent only after successful visible positioning through the presentation source boundary.',
);

has('src/features/l3lab/contracts/spectralForgeEntryIntent.ts', "CUT_UPLOAD: 'cut-upload'", 'shared cut-upload origin constant');
has('src/features/l3lab/contracts/spectralForgeEntryIntent.ts', "MATERIAL_INTAKE_GATEWAY: 'material-intake-gateway'", 'shared material intake gateway target');
has('src/features/l3lab/contracts/spectralForgeEntryIntent.ts', 'createCutUploadEntryScrollIntent', 'cut-upload entry scroll intent factory');

has('src/features/xensonar/rooms/appRoomSceneRuntimeArgs.ts', '"entryScrollIntent"', 'entryScrollIntent in runtime args pick');
has('src/features/xensonar/rooms/appRoomSceneRuntimeArgs.ts', '"onEntryScrollIntentConsumed"', 'onEntryScrollIntentConsumed in runtime args pick');
has('src/features/xensonar/rooms/appRoomSceneRuntimeBindings.ts', "entryScrollIntent?: AppRoomSceneBindingsArgs['entryScrollIntent'];", 'entryScrollIntent runtime binding type');
has('src/features/xensonar/rooms/appRoomSceneRuntimeBindings.ts', 'entryScrollIntent: args.entryScrollIntent ?? null', 'entryScrollIntent runtime binding return');
has('src/features/xensonar/rooms/appRoomSceneBindings.ts', "entryScrollIntent?: AppRoomScenePropsArgs['viewport']['auxiliaryRooms']['entryScrollIntent'];", 'entryScrollIntent scene binding type');
has('src/features/xensonar/rooms/appRoomSceneBindings.ts', 'entryScrollIntent: args.entryScrollIntent ?? null', 'entryScrollIntent scene binding return');
has('src/features/xensonar/rooms/auxiliaryRoomProps.ts', 'entryScrollIntent?: SpectralForgeEntryScrollIntent | null', 'entryScrollIntent auxiliary room prop');
has('src/features/xensonar/rooms/auxiliaryRoomProps.ts', 'entryScrollIntent: args.entryScrollIntent ?? null', 'entryScrollIntent auxiliary room return');
has('src/features/xensonar/rooms/Level3LabRoom.tsx', 'entryScrollIntent={entryScrollIntent}', 'Level3LabRoom forwards entry intent');
has('src/features/xensonar/rooms/ExperimentalForgeWorkshopRoom.tsx', 'entryScrollIntent={entryScrollIntent}', 'ExperimentalForgeWorkshopRoom forwards entry intent');
has('src/features/l3lab/spectralForge/SpectralForgeRoom.tsx', 'entryScrollIntent={entryScrollIntent}', 'SpectralForgeRoom forwards intent to MaterialIntakePanel');

const intake = read('src/features/l3lab/materialIntake/MaterialIntakePanel.tsx');
const entryGateway = read('src/features/l3lab/materialIntake/useMaterialIntakeEntryGateway.ts');
expect(intake.includes('useMaterialIntakeEntryGateway({'), 'MaterialIntakePanel should delegate entry gateway lifecycle to the boundary hook.');
expect(intake.includes('data-material-intake-gateway="true"'), 'MaterialIntakePanel should expose a stable gateway scroll target.');
expect(intake.includes('data-cut-upload-entry-target="true"'), 'MaterialIntakePanel should expose a cut-upload-specific entry target.');
expect(entryGateway.includes('pendingEntryScrollIntentRef'), 'Entry gateway hook should persist entry scroll intent beyond external file/origin cleanup.');
expect(entryGateway.includes('isMaterialIntakeGatewayIntent(entryScrollIntent)'), 'Entry gateway hook should validate target/reason before scrolling.');
expect(entryGateway.includes('scrollSpectralForgeToIntakeGateway'), 'Entry gateway hook should use the central scroll resolver.');
expect(entryGateway.includes('onEntryScrollIntentConsumedRef.current?.(intent.token)'), 'Entry gateway hook should consume intent only after successful positioning.');

const entryScroll = read('src/features/l3lab/materialIntake/entryScroll.ts');
expect(entryScroll.includes('findScrollableParent'), 'central scroll helper should resolve the actual scroll container or window.');
expect(entryScroll.includes('findScrollableParent'), 'central scroll helper should resolve the actually scrollable parent.');
expect(entryScroll.includes('window.__xensonarSpectralForgeEntryScrollDiag'), 'central scroll helper should retain a debug-light internal diagnostic.');
expect(entryScroll.includes('window.scrollTo'), 'central scroll helper should correct browser viewport when needed.');

if (process.exitCode) process.exit(process.exitCode);
console.log('OK cut-upload intake scroll contract');
