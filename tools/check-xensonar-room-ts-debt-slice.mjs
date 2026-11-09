#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  resonancePanelProps: fs.readFileSync('src/features/xensonar/rooms/resonancePanelProps.ts', 'utf8'),
  appResonanceAuxPanelRuntimeArgs: fs.readFileSync('src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgs.ts', 'utf8'),
  resonanceStageController: fs.readFileSync('src/features/xensonar/rooms/resonanceStageController.ts', 'utf8'),
  resonanceStatusModel: fs.readFileSync('src/features/xensonar/rooms/resonanceStatusModel.ts', 'utf8'),
  topologyPanelState: fs.readFileSync('src/features/xensonar/rooms/topologyPanelState.ts', 'utf8'),
  topologyRoomRuntimeCoordinator: fs.readFileSync('src/features/xensonar/rooms/topologyRoomRuntimeCoordinator.ts', 'utf8'),
  topologyRoomSupportBindings: fs.readFileSync('src/features/xensonar/rooms/topologyRoomSupportBindings.ts', 'utf8'),
};

const checks = {
  noUnusedChurchParticleImports: !files.resonancePanelProps.includes('ChurchMode, DronePreset, GridTuning, ParticleSystem'),
  readonlyAgentKeysCloned: files.resonancePanelProps.includes('agentKeys: [...args.agentKeys]'),
  overtoneMixerNarrowSetterWrapped: files.resonancePanelProps.includes("value as 'drone' | 'waves'"),
  nullableWavePresetDefaulted: files.resonancePanelProps.includes("selectedWaveOvertonePreset: args.selectedWaveOvertonePreset ?? ''"),
  auxRuntimeArgsReturnFlattenedIntersection: files.appResonanceAuxPanelRuntimeArgs.includes('AppResonancePanelSuiteArgs["parallelEffects"] &') && files.appResonanceAuxPanelRuntimeArgs.includes('...input.parallelEffects'),
  stageNexusRefsCarriesNextAbsoluteStep: files.resonanceStageController.includes('nextAbsoluteStep: number | null'),
  resonanceStatusUsesChurchModeTypes: files.resonanceStatusModel.includes('churchMode: ChurchMode') && files.resonanceStatusModel.includes('gridMode: ChurchMode'),
  handoffBalanceCarrierStringified: files.topologyPanelState.includes('balanceCarrier.toFixed(2)'),
  installationRuntimeUsesSharedFieldBindings: files.topologyRoomRuntimeCoordinator.includes('buildInstallationSharedFieldBindings('),
  topologySystemStateUsesResidentActionType: files.topologyRoomSupportBindings.includes("setSystemState: ResidentActionsArgs['setSystemState']"),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
if (failed.length) process.exit(1);
