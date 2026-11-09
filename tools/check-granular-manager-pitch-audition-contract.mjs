import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let ok = true;
const fail = (msg) => { console.error(`[check-granular-manager-pitch-audition-contract] ${msg}`); ok = false; };
const expect = (cond, msg) => { if (!cond) fail(msg); };

const dialog = read('src/features/xensonar/rooms/materialLoopPanel/RootFollowGranularManagerDialog.tsx');
const panel = read('src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx');
const bridge = read('src/features/xensonar/material/useResonanceMaterialLoopBridge.ts');
const runtimeBoundary = read('src/features/xensonar/material/useMaterialLoopRuntimeBoundary.ts');
const app = read('src/App.tsx');
const stage = read('src/features/xensonar/rooms/resonanceStageController.ts');

expect(dialog.includes('data-xensonar-granular-manager-pitch-audition-surface="bounded-rail"'), 'Granular Manager must expose the bounded pitch audition rail marker');
expect(dialog.includes('data-xensonar-granular-manager-pitch-audition-rail="bounded"'), 'Granular Manager pitch audition must live on a bounded visible rail');
expect(dialog.includes('onPointerMove={handleAuditionPitchRailPointer}'), 'Granular Manager pitch rail must listen only on the rail, not the whole GM surface');
expect(dialog.includes('onPointerDown={handleAuditionPitchRailPointer}'), 'Granular Manager pitch rail should react immediately on pointer down');
expect(dialog.includes('onAuditionPitchHz?: (hz: number) => void'), 'Granular Manager lacks typed audition pitch callback');
expect(dialog.includes('handleAuditionPitchRailPointer'), 'Granular Manager bounded pitch rail handler missing');
expect(dialog.includes('rootPitchHz * Math.pow(2, octaveOffset)'), 'Granular Manager pitch surface does not map pointer Y to octave-relative Hz');
expect(dialog.includes('if (!onAuditionPitchHz || !rootFollowPreviewActive) return;'), 'Granular Manager pitch surface should only write while RFL preview is active');
expect(!dialog.includes('data-xensonar-granular-manager-pitch-audition-pad="true"'), 'Granular Manager must not reintroduce the old compact pitch pad marker');
expect(!dialog.includes('data-xensonar-granular-manager-pitch-audition-shell="vertical"'), 'Granular Manager must not reintroduce the old vertical shell marker');
expect(!dialog.includes('onPointerMoveCapture={handleAuditionPitchSurfacePointer}'), 'Granular Manager must not keep the old whole-surface pitch capture');
expect(!dialog.includes('data-xensonar-granular-manager-pitch-audition-surface="invisible"'), 'Granular Manager must not keep the invisible whole-GM pitch surface');

expect(!dialog.includes('max-h-[calc(100vh-1rem)]'), 'Granular Manager must not turn into a full-screen scroll sheet');
expect(!dialog.includes('sticky top-0'), 'Granular Manager close/header must not become a sticky sheet header');
expect(dialog.includes('ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT.rightOverlayClass'), 'Side-by-side GM should use the shared top-aligned layout contract');
expect(dialog.includes('ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT.rightDialogClass'), 'Granular Manager side-by-side width should come from the shared non-overlap layout contract');
expect(dialog.includes('const normY = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height)))'), 'Granular Manager rail must map the full bounded rail height to pitch');
expect(dialog.includes('lg:grid-cols-[3.4rem_minmax(0,0.88fr)_minmax(0,1.12fr)]'), 'Granular Manager should reserve a narrow pitch rail next to the character column');
expect(dialog.includes('🪭'), 'Granular Manager UI should carry the fan icon in the header');
expect(!dialog.includes('Schreibt nur den RFL-Pitch-Zielwert'), 'Granular Manager must not expose developer-side RFL target notes as visible copy');
expect(!dialog.includes('keine neuen Wellenstarter- oder Grain-Events'), 'Granular Manager must not expose implementation-safety notes as visible copy');
expect(!dialog.includes('playWaveStartSound') && !dialog.includes('spawnNexusRipple'), 'Granular Manager pitch audition must not trigger Wellenstarter/ripple events');

expect(panel.includes('onRootFollowAuditionPitchHz'), 'ResonanceMaterialLoopPanel does not pass audition pitch callback');
expect(panel.includes('rootFollowPreviewActive={rootFollowPreviewActive}'), 'Granular Manager does not receive preview-active status');
expect(bridge.includes('setRootFollowAuditionPitchHz'), 'Material loop bridge does not carry audition pitch callback');
expect(runtimeBoundary.includes('setRootFollowAuditionPitchHz: (hz: number) => void'), 'Material loop runtime boundary lacks audition pitch contract');
expect(app.includes('const setRootFollowAuditionPitchHz = useCallback'), 'App does not define low-overhead RFL audition pitch writer');
expect(app.includes('rootFollowInputTargetHzRef.current = clamp(hz, 27.5, 3520)'), 'App audition pitch writer does not write directly to rootFollowInputTargetHzRef');
expect(stage.includes('args.commitResonanceCursorY(rawY, { primeSource: \'resonance\' })'), 'Stage cursor pitch path changed unexpectedly');
expect(app.includes('getCurrentRootFollowInputHz'), 'RFL current-root reader missing');

if (!ok) process.exit(1);
console.log('[check-granular-manager-pitch-audition-contract] ok');
