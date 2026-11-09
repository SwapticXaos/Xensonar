import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let ok = true;
const fail = (msg) => { console.error(`[check-playlist-ordnen-contract] ${msg}`); ok = false; };
const expect = (cond, msg) => { if (!cond) fail(msg); };

const pkg = JSON.parse(read('package.json'));
expect(typeof pkg.version === 'string' && pkg.version.length > 0, 'package version missing');

const op = read('src/features/xensonar/material/playlistDropOperation.ts');
const hud = read('src/features/xensonar/rooms/PlaylistDragActionHud.tsx');
const material = read('src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx');
const groove = read('src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx');
const rack = read('src/features/xensonar/rooms/GridTuningRackDialog.tsx');
const dragSessionHook = read('src/features/xensonar/ui/usePhaseShiftedPlaylistDragSession.ts');
const materialDrag = read('src/features/xensonar/material/materialLoopDragWorkflow.ts');
const materialActions = read('src/features/xensonar/material/materialLoopManagerActions.ts');
const rootBank = read('src/features/xensonar/material/useRootFollowLoopBankController.ts');
const drumPlaylist = read('src/features/xensonar/drumPatternPlaylist.ts');
const bridge = read('src/features/xensonar/material/useResonanceMaterialLoopBridge.ts');

function reorder(ids, draggedId, targetId, operation) {
  const unique = ids.filter((id, index, all) => id && all.indexOf(id) === index);
  const currentIndex = unique.indexOf(draggedId);
  const targetIndex = unique.indexOf(targetId);
  if (currentIndex < 0 || targetIndex < 0 || draggedId === targetId) return unique;
  if (operation === 'swap') {
    const next = [...unique];
    next[currentIndex] = targetId;
    next[targetIndex] = draggedId;
    return next;
  }
  const withoutDragged = unique.filter((id) => id !== draggedId);
  const normalizedTargetIndex = withoutDragged.indexOf(targetId);
  if (normalizedTargetIndex < 0) return unique;
  const insertIndex = operation === 'insert-before' ? normalizedTargetIndex : normalizedTargetIndex + 1;
  const next = [...withoutDragged];
  next.splice(Math.max(0, Math.min(next.length, insertIndex)), 0, draggedId);
  return next;
}
const order = (ids) => ids.join(' ');
expect(order(reorder(['A', 'B', 'C', 'D', 'E'], 'A', 'D', 'insert-before')) === 'B C A D E', 'reorder example failed: A insert-before D');
expect(order(reorder(['A', 'B', 'C', 'D', 'E'], 'A', 'C', 'insert-after')) === 'B C A D E', 'reorder example failed: A insert-after C');
expect(order(reorder(['A', 'B', 'C', 'D', 'E'], 'D', 'B', 'insert-before')) === 'A D B C E', 'reorder example failed: D insert-before B');
expect(order(reorder(['A', 'B', 'C', 'D', 'E'], 'B', 'D', 'swap')) === 'A D C B E', 'reorder example failed: B swap D');
expect(order(reorder(['A', 'B', 'C', 'D', 'E'], 'A', 'A', 'swap')) === 'A B C D E', 'reorder example failed: self drop should be no-op');

expect(op.includes('resolvePlaylistDropPreview'), 'shared drop-preview resolver missing');
expect(op.includes('resolvePhaseShiftedPlaylistDropTarget'), 'phase-shifted playlist drop resolver missing');
expect(op.includes("export type PlaylistDropOperation = 'swap' | 'insert-before' | 'insert-after'"), 'playlist operation set must support insert-after boundary bands');
expect(op.includes('reorderPlaylistIds') && op.includes('playlistOrderEquals'), 'shared true reorder helpers missing');
expect(op.includes("label: 'TAUSCHEN'") && op.includes("label: 'REINSCHIEBEN'"), 'explicit swap/insert labels missing');
expect(op.includes('highlightedEntryIds') && op.includes('beforeEntry') && op.includes('afterEntry'), 'insert gap neighbour resolution missing');
expect(op.includes('suppressNativePlaylistDragImage'), 'native drag ghost suppression helper missing');
expect(!op.includes('getPlaylistDropLabel'), 'old label-only drop helper should remain removed; use resolvePlaylistDropPreview instead');
expect(hud.includes('sourceTitle') && hud.includes('sourceSubtitle'), 'drag HUD no longer represents the dragged entry body');
expect(hud.includes('justify-between') && hud.includes('text-right'), 'drag HUD action is not positioned as right-side information');
expect(!hud.includes('translate-x-4 translate-y-4'), 'old below-cursor HUD offset still present');

for (const [name, src] of [['MaterialLoopPanel', material], ['GrooveBassPanel', groove], ['GridTuningRackDialog', rack]]) {
  expect(src.includes('resolvePlaylistDropPreview'), `${name} does not use shared drop-preview resolver`);
  expect(src.includes('insertNeighborIds') || src.includes('rackInsertNeighborIds'), `${name} does not highlight insert neighbours`);
  expect(src.includes('sourceTitle=') && src.includes('sourceSubtitle='), `${name} does not pass dragged-entry context to the HUD`);
  expect(src.includes('usePhaseShiftedPlaylistDragSession'), `${name} does not use the shared phase-shifted drag-session contract`);
  expect(!src.includes('absolute -top-2 left-0 right-0 z-10 h-4'), `${name} still uses mini insert strip drop zones`);
}

expect(materialDrag.includes('suppressNativePlaylistDragImage(args.event.dataTransfer)'), 'material loop drag does not suppress native drag image');
expect(rootBank.includes('suppressNativePlaylistDragImage(event.dataTransfer)'), 'root-follow loop drag does not suppress native drag image');
expect(groove.includes('suppressNativePlaylistDragImage(event.dataTransfer)'), 'drum playlist drag does not suppress native drag image');
expect(rack.includes('suppressNativePlaylistDragImage(event.dataTransfer)'), 'raster rack/library drag does not suppress native drag image');

expect(dragSessionHook.includes('resolvePhaseShiftedPlaylistDropTarget'), 'shared drag-session hook does not use phase-shifted drop-hit testing');
expect(dragSessionHook.includes('PlaylistDropHitRow'), 'shared drag-session hook does not build measured row hit geometry');
expect(dragSessionHook.includes('originVisibleIds') && dragSessionHook.includes('previewTarget') && dragSessionHook.includes('getDropTarget'), 'shared drag-session hook does not carry the frozen visible-order preview truth');

expect(materialDrag.includes('operation: PlaylistDropOperation'), 'material drag workflow is not operation-parametric');
expect(rootBank.includes('reorderPlaylistIds'), 'root-follow bank does not use shared reorder helper');
expect(drumPlaylist.includes('moveDrumPlaylistEntryFromVisibleOrder'), 'drum playlist has no strict full-visible-order move function');
expect(groove.includes('const currentIds = visibleOrderIds;') && groove.includes('moveDrumPlaylistEntryFromVisibleOrder'), 'drum UI path does not reorder from a mandatory frozen visible-order snapshot');

for (const [name, src] of [['MaterialLoopPanel', material], ['GrooveBassPanel', groove]]) {
  expect(src.includes('playlistDragSession.beginDrag') && src.includes('playlistDragSession.getDropTarget()'), `${name} does not use the shared drag-session source for begin/drop`);
  expect(src.includes('session.originVisibleIds') && src.includes('session.draggedId'), `${name} final drop does not pass frozen order plus session source id`);
  expect(!src.includes('resolveDropTargetFromDisplayedState'), `${name} still falls back to displayed drop state during final drop`);
  expect(!src.includes('?? resolveDropTargetFromPointer(event)'), `${name} still recomputes geometry during final drop`);
  expect(!src.includes('if (!dragId || !session) return'), `${name} still gates session drag logic through React dragId state`);
}
expect(rack.includes('rackDragSession.beginDrag') && rack.includes('rackDragSession.getDropTarget()') && rack.includes('payload'), 'GridTuningRackDialog does not use the shared drag-session source plus source payload snapshot');
expect(!rack.includes('resolveRackDropTargetFromDisplayedState'), 'GridTuningRackDialog still falls back to displayed rack drop state during final drop');
expect(!rack.includes('?? resolveRackDropTargetFromPointer(event)'), 'GridTuningRackDialog still recomputes geometry during final drop');
expect(!rack.includes('if (!dragPayload || !session) return'), 'GridTuningRackDialog still gates session drag logic through React dragPayload state');

expect(materialDrag.includes('visibleOrderIds?: readonly string[]'), 'material loop drag workflow does not accept frozen visible-order snapshots');
expect(materialDrag.includes('if (!args.visibleOrderIds?.length) return false;'), 'material loop drop can still fall back to live library order instead of using the frozen visible-order snapshot');
expect(!materialDrag.includes('getMaterialLibraryState()'), 'material loop drop still reaches into live material state during drop');
expect(materialDrag.includes('sessionDraggedId || args.event.dataTransfer.getData'), 'material loop drop does not prefer the frozen session source id');
expect(rootBank.includes('visibleOrderIds?: readonly string[]'), 'root-follow loop bank does not accept frozen visible-order snapshots');
expect(rootBank.includes('!visibleOrderIds?.length'), 'root-follow UI drop can still proceed without a frozen visible-order snapshot');
expect(rootBank.includes('sessionDraggedId || event.dataTransfer.getData'), 'root-follow drop does not prefer the frozen session source id');
expect(groove.includes('sessionDraggedId || drumDragId || event.dataTransfer.getData'), 'drum drop does not prefer the frozen session source id');
expect(groove.includes('!visibleOrderIds?.length'), 'drum UI drop can still proceed without a frozen visible-order snapshot');
expect(bridge.includes('controller.handleMaterialLoopDrop(event, entryId, operation, visibleOrderIds, sessionDraggedId)'), 'material loop bridge does not forward drop operation, frozen visible-order snapshot and session source id; insert intent can collapse back to swap');

expect(!materialActions.includes('moveMaterialEntry'), 'material loop manager actions still use global createdAt stepwise movement');
expect(materialActions.includes('reorderMaterialEntriesByIdOrder(nextOrder)'), 'material loop shift/drop does not persist full visible playlist order in one batch');
expect(materialActions.includes('operation: \'swap\''), 'material loop up/down shift no longer expresses a one-step visible swap');
expect(!materialActions.includes('formatMaterialLoopReorderedStatus'), 'material loop up/down still uses legacy global reorder status');

if (!ok) process.exit(1);
console.log('[check-playlist-ordnen-contract] ok');
