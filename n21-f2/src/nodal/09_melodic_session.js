/* Editing a Melodic instrument keeps the original notes/tracks intact. A new
   immutable source snapshot is substituted for every reference to the edited
   instrument; the unrelated instruments and their notes are untouched. */
function nodalUpdateMelodicInstrument(instrument, target) {
  if (!target || !target.noteId || !target.trackId || !target.sourcePreset) throw new Error('No Melodic note block selected for updating.');
  const state = EQ();
  if (!state?.loopComposer) throw new Error('Melodic session is unavailable.');
  const composer = $n(state.loopComposer);
  const track = composer.tracks.find(t => t.id === target.trackId);
  const note = composer.notes.find(n => n.id === target.noteId && n.trackId === target.trackId);
  if (!track || !note || yW(track, note) !== target.sourcePreset) throw new Error('The original note block has changed. Reopen it from Melodic Loop.');
  const prior = nodalFindInstrument(target.sourcePreset, composer);
  if (!prior) throw new Error('The original Nodal instrument is no longer available.');
  // Persist the edited recipe as an immutable source revision, never as PCM.
  const normalized = __XenNodalModel.normalize(instrument);
  const entry = __XenNodalLibrary.save(normalized);
  const preset = 'nodal:' + entry.id + '@' + entry.revision;
  composer.nodalInstruments = {...composer.nodalInstruments, [preset]: entry.instrument};
  for (const lane of composer.tracks) {
    if (lane.instrumentPreset === target.sourcePreset) {
      lane.instrumentPreset = preset;
      if (lane.label === prior.name) lane.label = entry.instrument.name;
    }
  }
  for (const block of composer.notes) if (block.instrumentPresetOverride === target.sourcePreset) block.instrumentPresetOverride = preset;
  // Keep only snapshots still referenced by any track or note. Otherwise repeated
  // revisions of the same sound would eventually exhaust the embedded source cap.
  const usedPresets = new Set(composer.tracks.map(lane => lane.instrumentPreset));
  for (const block of composer.notes) if (block.instrumentPresetOverride) usedPresets.add(block.instrumentPresetOverride);
  for (const key of Object.keys(composer.nodalInstruments)) if (!usedPresets.has(key)) delete composer.nodalInstruments[key];
  // Keep the original note focused. Never add a reference note or another lane.
  composer.selectedTrackId = target.trackId; composer.selectedNoteId = target.noteId;
  OLe({...state, loopComposer: composer, activeWorkspace: 'microtonal-logic', logicView: 'melodic', status: 'Instrument updated: ' + entry.instrument.name});
  window.dispatchEvent(new CustomEvent('xensonar:nodal-melodic-changed', {detail: composer}));
  return {updated: true, entry, preset, trackId: target.trackId, noteId: target.noteId};
}
let __NodalTransferSequence = 0;
function nodalSendToMelodic(instrument, withReference = true) {
  const entry = __XenNodalLibrary.save(instrument), preset = 'nodal:' + entry.id + '@' + entry.revision;
  const state = EQ() ?? Oqe({initialSession: null, externalLogicView: 'melodic'}), composer = $n(state.loopComposer), trackId = 'nodal-track-' + Date.now().toString(36) + '-' + (++__NodalTransferSequence).toString(36);
  composer.nodalInstruments = {...composer.nodalInstruments, [preset]: entry.instrument};
  const track = uR({id: trackId, label: entry.instrument.name, color: '#72ddd0', volume: .85, instrumentRole: 'texture', instrumentPreset: preset, patternPresetId: null, pan: 0, enabled: true}, composer.tracks.length);
  composer.tracks.push(track); composer.selectedTrackId = trackId; composer.activeTrackIds = Array.from(new Set([...composer.activeTrackIds, trackId]));
  if (withReference) {
    const index = composer.pitchSteps.findIndex(step => Math.abs((step.ratio ?? 0) - 1) < 1e-8), channelIndex = Math.max(0, index);
    const stepSec = lD({composer, bpm: state.materialExport.bpm}) / iD(composer);
    const note = pr(composer, {id: trackId + '-note', trackId, channelIndex, lineId: composer.pitchLines[channelIndex]?.id,
      startUnit: 0, durationUnits: Math.max(1, Math.min(iD(composer), entry.instrument.articulation.durationSec / stepSec)), velocity: .8, fadeInUnits: 0, fadeOutUnits: 0});
    composer.notes.push(note); composer.selectedNoteId = note.id;
  }
  OLe({...state, loopComposer: composer, activeWorkspace: 'microtonal-logic', logicView: 'melodic', status: entry.instrument.name + ' · Nodal instrument in Melodic Loop'});
  window.dispatchEvent(new CustomEvent('xensonar:nodal-melodic-changed', {detail: composer}));
  return {entry, preset, trackId};
}
let __NodalSessionWrite = null;
function nodalPersistComposerSession(session) {
  if (typeof localStorage === 'undefined' || !session?.loopComposer) return;
  if (__NodalSessionWrite) clearTimeout(__NodalSessionWrite);
  if (!Object.keys(session.loopComposer.nodalInstruments ?? {}).length&&!Object.keys(session.loopComposer.entrophonInstruments??{}).length) { localStorage.removeItem('xensonar.nodal.melodic-session.v1'); return; }
  const payload = {schemaVersion: 1, loopComposer: $n(session.loopComposer), materialExport: session.materialExport,
    loopPatternVariants: session.loopPatternVariants, loopPatternLinks: session.loopPatternLinks, logicView: session.logicView};
  __NodalSessionWrite = setTimeout(() => { __NodalSessionWrite = null; try { localStorage.setItem('xensonar.nodal.melodic-session.v1', JSON.stringify(payload)); } catch (error) { console.error('[nodal][session-save]', error); } }, 160);
}
function nodalRestoreComposerSession() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const text = localStorage.getItem('xensonar.nodal.melodic-session.v1'); if (!text || text.length > 1500000) return null;
    const payload = JSON.parse(text); if (payload.schemaVersion !== 1 || !payload.loopComposer?.tracks?.length) return null;
    return {...payload, loopComposer: $n(payload.loopComposer)};
  } catch { return null; }
}
function useNodalNavigation(react, callbacks) {
  const latest = react.useRef(callbacks); latest.current = callbacks;
  react.useEffect(() => {
    const melodic = () => latest.current.openMelodic(), designer = event => latest.current.openDesigner(event.detail);
    window.addEventListener('xensonar:nodal-open-melodic', melodic); window.addEventListener('xensonar:nodal-open-designer', designer);
    return () => { window.removeEventListener('xensonar:nodal-open-melodic', melodic); window.removeEventListener('xensonar:nodal-open-designer', designer); };
  }, []);
}
function NodalInstrumentEditButton({composer}) {
  const note = composer.notes.find(n => n.id === composer.selectedNoteId), track = composer.tracks.find(t => t.id === (note?.trackId ?? composer.selectedTrackId));
  const instrument = track ? nodalFindInstrument(yW(track, note), composer) : null;
  return instrument && note ? P.createElement('button', {type: 'button', className: 'rounded border border-emerald-700/70 bg-emerald-950/20 px-2 py-1 text-[11px] text-emerald-100',
    title: 'Edit this note block’s Nodal instrument. The note block and melody remain unchanged.',
    onClick: () => window.dispatchEvent(new CustomEvent('xensonar:nodal-open-designer', {detail: {
      instrument, target: {noteId: note.id, trackId: track.id, sourcePreset: yW(track, note)}
    }}))}, 'Edit Nodal Instrument ↗') : null;
}
