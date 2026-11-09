#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const channelPath = 'src/features/xensonar/runtime/xensonarEventChannels.ts';
const channel = exists(channelPath) ? read(channelPath) : '';
const app = read('src/App.tsx');

const files = {
  channel,
  app,
  spectralCutBridge: exists('src/features/xensonar/rooms/useSpectralForgeCutUploadBridge.ts') ? read('src/features/xensonar/rooms/useSpectralForgeCutUploadBridge.ts') : '',
  rootBankStorage: read('src/features/xensonar/material/rootFollowBankStorage.ts'),
  rootBankController: read('src/features/xensonar/material/useRootFollowLoopBankController.ts'),
  drumConfigBridge: read('src/features/xensonar/drumConfig/useAppDrumConfigBridge.ts'),
  drumMachineActions: read('src/features/l3lab/canonicalForge/drumMachineActions.ts'),
  melodicExportActions: read('src/features/l3lab/canonicalForge/melodicLoopExportActions.ts'),
  melodicLoopPanel: read('src/features/l3lab/canonicalForge/melodicLoopPanel.tsx'),
  carrierMelodicHandoffRuntime: read('src/features/l3lab/canonicalForge/useCarrierMelodicImportHandoffRuntime.ts'),
  carrierExecutor: read('src/features/l3lab/spectralForge/integral/executeCarrierIntegralTransfer.ts'),
  carrierTransferPhases: read('src/features/l3lab/spectralForge/integral/carrierIntegralTransferExecutionPhases.ts'),
  level3LabRoom: read('src/features/xensonar/rooms/Level3LabRoom.tsx'),
  audioCutUploadEntryRequest: read('src/features/xensonar/domain/audioCutUploadEntryRequest.ts'),
};

const eventLiterals = [
  'xensonar:root-follow-bank-membership',
  'xensonar:root-follow-bank-sync',
  'xensonar:carrier-integral-melodic-pink-export',
  'xensonar:carrier-integral-raw-material-melodic-export',
  'xensonar:open-canonical-melodic-loop',
  'xensonar:drum-config-send-request',
  'xensonar:spectral-forge-audio-cut-upload',
];

const allowedLiteralFiles = new Set([channelPath]);
const rawLiteralOccurrences = [];
for (const rel of [
  'src/App.tsx',
  'src/features/xensonar/rooms/useSpectralForgeCutUploadBridge.ts',
  'src/features/xensonar/material/rootFollowBankStorage.ts',
  'src/features/xensonar/material/useRootFollowLoopBankController.ts',
  'src/features/xensonar/drumConfig/useAppDrumConfigBridge.ts',
  'src/features/l3lab/canonicalForge/drumMachineActions.ts',
  'src/features/l3lab/canonicalForge/melodicLoopExportActions.ts',
  'src/features/l3lab/canonicalForge/melodicLoopPanel.tsx',
  'src/features/l3lab/canonicalForge/useCarrierMelodicImportHandoffRuntime.ts',
  'src/features/l3lab/spectralForge/integral/executeCarrierIntegralTransfer.ts',
  'src/features/xensonar/rooms/Level3LabRoom.tsx',
  'src/features/xensonar/domain/audioCutUploadEntryRequest.ts',
]) {
  const text = exists(rel) ? read(rel) : '';
  for (const literal of eventLiterals) {
    if (text.includes(literal) && !allowedLiteralFiles.has(rel)) {
      rawLiteralOccurrences.push({ file: rel, literal });
    }
  }
}

const checks = {
  hasTypedEventChannelModule: channel.includes('export type XensonarEventMap')
    && channel.includes('dispatchXensonarEvent')
    && channel.includes('listenXensonarEvent')
    && eventLiterals.every((literal) => channel.includes(literal)),
  rootFollowMembershipUsesTypedChannel: files.melodicExportActions.includes("dispatchXensonarEvent('rootFollowBankMembership'")
    && (files.carrierExecutor.includes("dispatchXensonarEvent('rootFollowBankMembership'") || files.carrierTransferPhases.includes('dispatchXensonarEvent("rootFollowBankMembership"') || files.carrierTransferPhases.includes("dispatchXensonarEvent('rootFollowBankMembership'"))
    && files.rootBankController.includes("listenXensonarEvent('rootFollowBankMembership'"),
  carrierMelodicHandoffUsesTypedChannel: (files.carrierExecutor.includes("dispatchXensonarEvent('carrierIntegralRawMaterialMelodicExport'") || files.carrierTransferPhases.includes('dispatchXensonarEvent("carrierIntegralRawMaterialMelodicExport"') || files.carrierTransferPhases.includes("dispatchXensonarEvent('carrierIntegralRawMaterialMelodicExport'"))
    && (files.carrierExecutor.includes("dispatchXensonarEvent('carrierIntegralMelodicPinkExport'") || files.carrierTransferPhases.includes('dispatchXensonarEvent("carrierIntegralMelodicPinkExport"') || files.carrierTransferPhases.includes("dispatchXensonarEvent('carrierIntegralMelodicPinkExport'"))
    && files.carrierMelodicHandoffRuntime.includes("listenXensonarEvent('carrierIntegralRawMaterialMelodicExport'")
    && files.carrierMelodicHandoffRuntime.includes("listenXensonarEvent('carrierIntegralMelodicPinkExport'"),
  openMelodicLoopUsesTypedChannel: (files.carrierExecutor.includes("dispatchXensonarEvent('openCanonicalMelodicLoop'") || files.carrierTransferPhases.includes('dispatchXensonarEvent("openCanonicalMelodicLoop"') || files.carrierTransferPhases.includes("dispatchXensonarEvent('openCanonicalMelodicLoop'"))
    && files.level3LabRoom.includes("listenXensonarEvent('openCanonicalMelodicLoop'"),
  drumConfigSendRequestUsesTypedChannel: files.drumMachineActions.includes("dispatchXensonarEvent('drumConfigSendRequest'")
    && files.drumConfigBridge.includes("listenXensonarEvent('drumConfigSendRequest'"),
  spectralCutUploadBridgeExtracted: files.app.includes('useSpectralForgeCutUploadBridge({')
    && files.spectralCutBridge.includes("listenXensonarEvent('spectralForgeAudioCutUpload'")
    && files.audioCutUploadEntryRequest.includes("dispatchXensonarEvent('spectralForgeAudioCutUpload'"),
  noSelectedRawEventLiteralsOutsideChannel: rawLiteralOccurrences.length === 0,
  room3NodeAuraStillProtected: read('src/features/resonance/refactorTopologyNodeAura.ts').includes('getNodeAuraSignature')
    && read('src/features/resonance/refactorTopologyLegacyAudio.ts').includes('nodeColorOsc'),
  waveStarterMicroOrchestratorStillProtected: read('src/features/xensonar/audio/waveStarterMicroOrchestrator.ts').includes('emit-micro'),
  appLinesRemainBelowRefactorThreshold: app.split(/\r?\n/).length < 7185,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  channelLines: channel.split(/\r?\n/).length,
  rawLiteralOccurrences,
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
