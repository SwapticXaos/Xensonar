import fs from 'node:fs';
import { createServer } from 'vite';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const requireText = (label, source, needle) => {
  if (!source.includes(needle)) failures.push(`${label}: missing ${needle}`);
};
const forbidText = (label, source, needle) => {
  if (source.includes(needle)) failures.push(`${label}: forbidden ${needle}`);
};

const materialContractPath = 'src/features/l3lab/materialLibraryEventContract.ts';
const materialLibraryPath = 'src/features/l3lab/materialLibrary.ts';
const materialLoopControllerPath = 'src/features/xensonar/material/useMaterialLoopController.ts';
const eventHubPath = 'src/features/xensonar/runtime/xensonarEventChannels.ts';
const carrierContractPath = 'src/features/l3lab/contracts/carrierIntegralPinkExportContract.ts';
const carrierHandoffContractPath = 'src/features/l3lab/contracts/carrierIntegralMelodicHandoffContract.ts';
const carrierTransferPhasesPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralTransferExecutionPhases.ts';
const melodicImportGatewayPath = 'src/features/l3lab/canonicalForge/useMelodicMaterialImportGateway.ts';
const materialImportChannelPath = 'src/features/l3lab/canonicalForge/materialImportChannel.ts';
const carrierBridgePath = 'src/features/l3lab/canonicalForge/carrierIntegralPinkLaneBridge.ts';
const drumPlaylistContractPath = 'src/features/xensonar/drumPatternPlaylistEventContract.ts';
const drumPlaylistPath = 'src/features/xensonar/drumPatternPlaylist.ts';
const drumPlaylistRevisionPath = 'src/features/xensonar/drumPattern/useDrumPlaylistRevisionBridge.ts';
const grooveBassPanelPath = 'src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx';
const drumConfigContractPath = 'src/features/xensonar/drumConfig/drumConfigLibraryEventContract.ts';
const drumConfigLibraryPath = 'src/features/xensonar/drumConfigLibrary.ts';
const drumConfigBridgePath = 'src/features/xensonar/drumConfig/useAppDrumConfigBridge.ts';
const workspaceIntentPath = 'src/features/xensonar/rooms/resonanceWorkspaceIntentEvents.ts';
const statusStripPath = 'src/features/xensonar/rooms/ResonanceStatusStrip.tsx';
const materialLoopPanelPath = 'src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx';
const controlCorePanelPath = 'src/features/xensonar/rooms/ResonanceControlCorePanel.tsx';

const materialContract = read(materialContractPath);
const materialLibrary = read(materialLibraryPath);
const materialLoopController = read(materialLoopControllerPath);
const eventHub = read(eventHubPath);
const carrierContract = read(carrierContractPath);
const carrierHandoffContract = read(carrierHandoffContractPath);
const carrierTransferPhases = read(carrierTransferPhasesPath);
const melodicImportGateway = read(melodicImportGatewayPath);
const materialImportChannel = read(materialImportChannelPath);
const carrierBridge = read(carrierBridgePath);
const drumPlaylistContract = read(drumPlaylistContractPath);
const drumPlaylist = read(drumPlaylistPath);
const drumPlaylistRevision = read(drumPlaylistRevisionPath);
const grooveBassPanel = read(grooveBassPanelPath);
const drumConfigContract = read(drumConfigContractPath);
const drumConfigLibrary = read(drumConfigLibraryPath);
const drumConfigBridge = read(drumConfigBridgePath);
const workspaceIntent = read(workspaceIntentPath);
const statusStrip = read(statusStripPath);
const materialLoopPanel = read(materialLoopPanelPath);
const controlCorePanel = read(controlCorePanelPath);

for (const name of [
  'xensonar:material-registered',
  'xensonar:material-updated',
  'xensonar:material-reordered',
  'xensonar:material-deleted',
]) {
  requireText(materialContractPath, materialContract, name);
  forbidText(materialLibraryPath, materialLibrary, name);
  forbidText(materialLoopControllerPath, materialLoopController, name);
}

requireText(materialLibraryPath, materialLibrary, "dispatchMaterialLibraryEvent('registered'");
requireText(materialLibraryPath, materialLibrary, "dispatchMaterialLibraryEvent('updated'");
requireText(materialLibraryPath, materialLibrary, "dispatchMaterialLibraryEvent('reordered'");
requireText(materialLibraryPath, materialLibrary, "dispatchMaterialLibraryEvent('deleted'");
requireText(materialLoopControllerPath, materialLoopController, "listenMaterialLibraryEvent('registered'");
requireText(materialLoopControllerPath, materialLoopController, "listenMaterialLibraryEvent('deleted'");


requireText(drumPlaylistContractPath, drumPlaylistContract, 'xensonar:drum-pattern-playlist-updated');
forbidText(drumPlaylistPath, drumPlaylist, 'xensonar:drum-pattern-playlist-updated');
forbidText(drumPlaylistRevisionPath, drumPlaylistRevision, 'xensonar:drum-pattern-playlist-updated');
forbidText(grooveBassPanelPath, grooveBassPanel, 'xensonar:drum-pattern-playlist-updated');
requireText(drumPlaylistPath, drumPlaylist, 'dispatchDrumPatternPlaylistUpdated()');
requireText(drumPlaylistRevisionPath, drumPlaylistRevision, 'listenDrumPatternPlaylistUpdated');
requireText(grooveBassPanelPath, grooveBassPanel, 'listenDrumPatternPlaylistUpdated');

for (const name of ['xensonar:drum-config-registered', 'xensonar:drum-config-updated', 'xensonar:drum-config-deleted']) {
  requireText(drumConfigContractPath, drumConfigContract, name);
  forbidText(drumConfigLibraryPath, drumConfigLibrary, name);
  forbidText(drumConfigBridgePath, drumConfigBridge, name);
}
requireText(drumConfigLibraryPath, drumConfigLibrary, "dispatchDrumConfigLibraryEvent('registered'");
requireText(drumConfigLibraryPath, drumConfigLibrary, "dispatchDrumConfigLibraryEvent('updated'");
requireText(drumConfigLibraryPath, drumConfigLibrary, "dispatchDrumConfigLibraryEvent('deleted'");
requireText(drumConfigBridgePath, drumConfigBridge, "listenDrumConfigLibraryEvent('registered'");
requireText(drumConfigBridgePath, drumConfigBridge, "listenDrumConfigLibraryEvent('deleted'");


for (const name of [
  'xensonar:open-material-loop-manager',
  'xensonar:open-root-follow-loop-manager',
  'xensonar:open-drum-pattern-manager',
  'xensonar:open-bass-pattern-manager',
  'xensonar:open-grid-tuning-rack',
]) requireText(workspaceIntentPath, workspaceIntent, name);
for (const source of [statusStrip, materialLoopPanel, grooveBassPanel, controlCorePanel]) {
  for (const name of [
    'xensonar:open-material-loop-manager',
    'xensonar:open-root-follow-loop-manager',
    'xensonar:open-drum-pattern-manager',
    'xensonar:open-bass-pattern-manager',
    'xensonar:open-grid-tuning-rack',
  ]) forbidText('workspace intent consumer', source, name);
}
requireText(statusStripPath, statusStrip, 'resonanceWorkspaceIntentEvents');
requireText(materialLoopPanelPath, materialLoopPanel, 'resonanceWorkspaceIntentEvents');
requireText(controlCorePanelPath, controlCorePanel, 'OPEN_GRID_TUNING_RACK_EVENT');


for (const name of [
  'xensonar:pending-carrier-integral-pink-export',
  'xensonar:pending-carrier-integral-raw-material-melodic-export',
]) {
  requireText(carrierHandoffContractPath, carrierHandoffContract, name);
  forbidText(carrierTransferPhasesPath, carrierTransferPhases, name);
  forbidText(melodicImportGatewayPath, melodicImportGateway, name);
  forbidText(materialImportChannelPath, materialImportChannel, name);
}
requireText(carrierTransferPhasesPath, carrierTransferPhases, 'CARRIER_INTEGRAL_PENDING_RAW_MATERIAL_MELODIC_SESSION_KEY');
requireText(carrierTransferPhasesPath, carrierTransferPhases, 'CARRIER_INTEGRAL_PENDING_PINK_MELODIC_SESSION_KEY');
requireText(melodicImportGatewayPath, melodicImportGateway, 'CARRIER_INTEGRAL_PENDING_RAW_MATERIAL_MELODIC_SESSION_KEY');
requireText(melodicImportGatewayPath, melodicImportGateway, 'CARRIER_INTEGRAL_PENDING_PINK_MELODIC_SESSION_KEY');
requireText(materialImportChannelPath, materialImportChannel, 'CARRIER_INTEGRAL_PENDING_PINK_MELODIC_SESSION_KEY');
requireText(eventHubPath, eventHub, '../../l3lab/contracts/carrierIntegralMelodicHandoffContract');
forbidText(eventHubPath, eventHub, 'export type CarrierIntegralRawMaterialMelodicExportDetail =');

requireText(carrierContractPath, carrierContract, 'export type CarrierIntegralPinkExportDetail');
requireText(carrierContractPath, carrierContract, 'export type CarrierIntegralPinkVariant');
requireText(eventHubPath, eventHub, "../../l3lab/contracts/carrierIntegralPinkExportContract");
forbidText(eventHubPath, eventHub, 'canonicalForge/carrierIntegralPinkLaneBridge');
requireText(carrierBridgePath, carrierBridge, "export type { CarrierIntegralPinkExportDetail, CarrierIntegralPinkVariant } from '../contracts/carrierIntegralPinkExportContract';");
forbidText(carrierBridgePath, carrierBridge, 'export type CarrierIntegralPinkExportDetail =');

if (failures.length) {
  console.error('[event-ownership-contracts] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const previousWindow = globalThis.window;
const eventTarget = new EventTarget();
globalThis.window = {
  addEventListener: eventTarget.addEventListener.bind(eventTarget),
  removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
  dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
};

const server = await createServer({ appType: 'custom', server: { middlewareMode: true }, logLevel: 'error' });
try {
  const runtime = await server.ssrLoadModule('/src/features/l3lab/materialLibraryEventContract.ts');
  const drumPlaylistRuntime = await server.ssrLoadModule('/src/features/xensonar/drumPatternPlaylistEventContract.ts');
  const drumConfigRuntime = await server.ssrLoadModule('/src/features/xensonar/drumConfig/drumConfigLibraryEventContract.ts');
  const seen = [];
  const stops = [
    runtime.listenMaterialLibraryEvent('registered', (detail, event) => seen.push([event.type, detail.id, detail.role, detail.name])),
    runtime.listenMaterialLibraryEvent('updated', (detail, event) => seen.push([event.type, detail.id, detail.role, detail.name])),
    runtime.listenMaterialLibraryEvent('reordered', (detail, event) => seen.push([event.type, detail.id, detail.swapWith ?? detail.orderedIds?.join(',') ?? ''])),
    runtime.listenMaterialLibraryEvent('deleted', (detail, event) => seen.push([event.type, detail.id])),
    drumPlaylistRuntime.listenDrumPatternPlaylistUpdated((event) => seen.push([event.type])),
    drumConfigRuntime.listenDrumConfigLibraryEvent('registered', (detail, event) => seen.push([event.type, detail.id, detail.name, detail.presetSource])),
    drumConfigRuntime.listenDrumConfigLibraryEvent('updated', (detail, event) => seen.push([event.type, detail.id, detail.name])),
    drumConfigRuntime.listenDrumConfigLibraryEvent('deleted', (detail, event) => seen.push([event.type, detail.id])),
  ];
  runtime.dispatchMaterialLibraryEvent('registered', { id: 'm1', role: 'loop', name: 'One' });
  runtime.dispatchMaterialLibraryEvent('updated', { id: 'm1', role: 'loop', name: 'One+' });
  runtime.dispatchMaterialLibraryEvent('reordered', { id: 'm1', swapWith: 'm2' });
  runtime.dispatchMaterialLibraryEvent('deleted', { id: 'm1' });
  drumPlaylistRuntime.dispatchDrumPatternPlaylistUpdated();
  drumConfigRuntime.dispatchDrumConfigLibraryEvent('registered', { id: 'd1', name: 'Kit One', presetSource: 'custom' });
  drumConfigRuntime.dispatchDrumConfigLibraryEvent('updated', { id: 'd1', name: 'Kit One+' });
  drumConfigRuntime.dispatchDrumConfigLibraryEvent('deleted', { id: 'd1' });
  for (const stop of stops) stop();
  const expected = [
    ['xensonar:material-registered', 'm1', 'loop', 'One'],
    ['xensonar:material-updated', 'm1', 'loop', 'One+'],
    ['xensonar:material-reordered', 'm1', 'm2'],
    ['xensonar:material-deleted', 'm1'],
    ['xensonar:drum-pattern-playlist-updated'],
    ['xensonar:drum-config-registered', 'd1', 'Kit One', 'custom'],
    ['xensonar:drum-config-updated', 'd1', 'Kit One+'],
    ['xensonar:drum-config-deleted', 'd1'],
  ];
  if (JSON.stringify(seen) !== JSON.stringify(expected)) {
    throw new Error(`material-library event runtime mismatch: ${JSON.stringify(seen)}`);
  }
} finally {
  await server.close();
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;
}

console.log('[event-ownership-contracts] PASS');
console.log('- material library browser events have one typed owner');
console.log('- material/drum event dispatch-listen semantics pass 8/8 at runtime');
console.log('- material loop and drum playlist/config consumers use typed contracts');
console.log('- workspace manager intents have one neutral owner');
console.log('- carrier melodic export payload and pending handoff session keys have one neutral L3Lab owner');
