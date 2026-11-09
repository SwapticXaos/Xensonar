import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const status = read('src/features/xensonar/rooms/ResonanceStatusStrip.tsx');
const panel = read('src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx');
const bridge = read('src/features/xensonar/material/useResonanceMaterialLoopPanelProps.ts');
const app = read('src/App.tsx');
const intake = read('src/features/l3lab/materialIntake/MaterialIntakePanel.tsx');

expect(status.includes('OPEN_MATERIAL_LOOP_MANAGER_EVENT'), 'Status strip must dispatch material manager open event.');
expect(status.includes('OPEN_ROOT_FOLLOW_LOOP_MANAGER_EVENT'), 'Status strip must dispatch root-follow manager open event.');
expect(status.includes('handleOpenMaterialLoopManager') && status.includes('onClick={handleOpenMaterialLoopManager}'), 'Material status field must use guarded click handler.');
expect(panel.includes('window.addEventListener(OPEN_MATERIAL_LOOP_MANAGER_EVENT'), 'Material loop panel must listen for material manager open event.');
expect(panel.includes('materialLoopId || selectedLoopMaterial?.id || undefined'), 'Material manager event must resolve explicit active/selected material id.');
expect(bridge.includes('controller.closeMaterialLoopManager();') && bridge.includes('controller.closeRootFollowLoopManager();'), 'Audio cut upload bridge must close both managers before route handoff.');
expect(bridge.includes("window.requestAnimationFrame(() =>") && bridge.includes("xensonar:spectral-forge-audio-cut-upload"), 'Audio cut upload bridge must defer handoff by one frame.');
expect(app.includes('spectralForgeCutUploadSequenceRef') && app.includes('spectralForgeCutUploadRafIdsRef'), 'App must guard SpectralForge cut uploads with sequence/RAF refs.');
expect(app.includes('setSpectralForgeExternalAudioFile(null)') && app.includes("setRoom('L3LAB')") && app.includes('setSpectralForgeExternalAudioFile(file)'), 'App handoff must clear file, switch room, then deliver file.');
expect(app.includes('window.requestAnimationFrame(() => {') && app.includes('spectralForgeCutUploadSequenceRef.current !== sequence'), 'App handoff must deliver only after staged frame boundary and ignore stale uploads.');
expect(intake.includes('externalLoadSignatureRef') && intake.includes('loadSourceFromFileRef'), 'Material intake must guard external loads against duplicate effect executions.');
expect(intake.includes('externalLoadSignatureRef.current === signature'), 'Material intake must ignore already consumed external load signature.');
expect(!intake.includes('[externalLoadFile, loadSourceFromFile, onExternalLoadConsumed]'), 'Material intake external load effect must not retrigger from loadSourceFromFile identity churn.');

if (failures.length) {
  console.error('[loop-entry-and-cut-handoff-stabilizer] FAIL');
  for (const failure of failures) console.error('-', failure);
  process.exit(1);
}
console.log('[loop-entry-and-cut-handoff-stabilizer] OK');
