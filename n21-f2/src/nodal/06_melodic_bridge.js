/* Shared field semantics. Uses the same resolvers as the Melodic sample/block editor. */
function resolveNodalArticulationFields(articulation, localField = null, zeroVolumeFloor = true) {
  // Nodal amplitude reaches silence at the lower edge. Other backends can
  // retain the established +/-95% field through the explicit third argument.
  const volumeGain = zeroVolumeFloor ? value => {const x=pn(value);return x<0 ? 1+x : IF(x);} : IF;
  const volume = [articulation.volumeEnvelope, localField].filter(Boolean).map(f => $p(Zr(f), 'dynamic-fade')).filter(f => f.enabled && !f.bypassed);
  const pitch = [articulation.pitchEnvelope, localField].filter(Boolean).map(f => $p(Zr(f), 'pitch-elastic')).filter(f => f.enabled && !f.bypassed);
  const count = 128;
  const volumeInputs = volume.map(field => ({field, curve: gc(field, count).resolved}));
  const volumeCurve = volume.length ? Array.from({length: count}, (_, i) => volumeInputs.reduce((gain, source) => gain * volumeGain(u6(source.field, i / (count - 1), source.curve)), 1)) : null;
  const pitchCurve = pitch.length ? Array.from(B$(pitch, count)) : null;
  return {volumeCurve, pitchCurve};
}
function nodalComposerSourceFields(composer) {
  const additional=entrophonComposerSourceFields(composer);
  if (!composer.nodalInstruments) return additional;
  const entries = Object.entries(composer.nodalInstruments);
  if (entries.length > 48) throw new Error('Too many Nodal instrument sources');
  const bank = Object.create(null);
  for (const [key, instrument] of entries) {
    if (!key.startsWith('nodal:') || key.length > 220) throw new Error('Invalid Nodal source ID');
    bank[key] = __XenNodalModel.normalize(instrument);
  }
  return {...additional,nodalInstruments: bank};
}
function nodalFindInstrument(preset, composer = null) {
  if (typeof preset !== 'string' || !preset.startsWith('nodal:')) return null;
  const embedded = composer?.nodalInstruments?.[preset];
  if (embedded) return __XenNodalModel.normalize(embedded);
  try { const entry = __XenNodalLibrary.list().find(e => 'nodal:' + e.id + '@' + e.revision === preset); return entry?.instrument ?? null; }
  catch { return null; }
}
function nodalLibraryEntryLabel(entry, entries) {
  const name = entry.instrument.name;
  const same = entries.filter(e => e.instrument.name === name);
  const index = same.findIndex(e => e.id === entry.id) + 1;
  return name + ' · ' + entry.instrument.nodes.length + ' nodes' + (same.length > 1 ? ' · ' + index + '/' + same.length : '');
}
function nodalInstrumentMenu(composer) {
  // Library sound sources and currently referenced project snapshots are different entities.
  // Deleting a library entry must never silence an existing composition.
  const choices = new Map(), entries = (() => { try { return __XenNodalLibrary.list(); } catch { return []; } })();
  const referenced = new Set();
  for (const track of composer?.tracks ?? []) {
    if (track.instrumentPreset?.startsWith('nodal:')) referenced.add(track.instrumentPreset);
    for (const note of composer?.notes ?? []) if (note.trackId === track.id) {
      const id = note.instrumentPresetOverride || track.instrumentPreset;
      if (id?.startsWith('nodal:')) referenced.add(id);
    }
  }
  for (const entry of entries) choices.set('nodal:' + entry.id + '@' + entry.revision, {instrument: entry.instrument, kind: 'library', entry});
  for (const [id, instrument] of Object.entries(composer?.nodalInstruments ?? {})) if (referenced.has(id)) {
    const stored = choices.get(id);
    // The project owns its snapshot; the library may only contribute a changed display name.
    choices.set(id, {...stored, instrument: stored?.instrument ?? instrument, kind: stored ? 'library' : 'project'});
  }
  if (!choices.size) return entrophonInstrumentMenu(composer);
  const values = Array.from(choices, ([id, data]) => ({id, ...data}));
  const counts = new Map();
  for (const value of values) counts.set(value.instrument.name, (counts.get(value.instrument.name) ?? 0) + 1);
  const seen = new Map();
  return [{id: 'nodal', label: 'Nodal · Synthetic Instruments', options: values.map(value => {
    const {id, instrument, kind} = value;
    const index = (seen.get(instrument.name) ?? 0) + 1;
    seen.set(instrument.name, index);
    return {id, label: instrument.name + ' · ' + instrument.nodes.length + ' nodes' +
      (counts.get(instrument.name) > 1 ? ' · ' + index + '/' + counts.get(instrument.name) : '') +
      (kind === 'project' ? ' · in project' : ''), hint: 'Direct synthesis', baseHz: instrument.referenceHz, originLabel: 'Nodal'};
  })}].concat(entrophonInstrumentMenu(composer));
}
function nodalLoadMelodicSources(request, sources) {
  for (const track of request.composer.tracks) {
    const presets = request.composer.notes.filter(n => n.trackId === track.id).map(n => yW(track, n));
    for (const preset of presets) if (typeof preset === 'string' && preset.startsWith('nodal:') && !sources.has(preset)) {
      const instrument = nodalFindInstrument(preset, request.composer);
      if (!instrument) throw new Error('Nodal instrument missing: ' + preset);
      sources.set(preset, {kind: 'nodal', instrument, plan: __XenNodalModel.compile(instrument)});
    }
  }
  return sources;
}
function nodalHasMelodicNotes(request) {
  if (request.drumPreviewOnly) return false;
  return request.composer.notes.some(note => {
    const track = request.composer.tracks.find(t => t.id === note.trackId);
    return track && (request.noteId ? note.id === request.noteId : request.trackIds.includes(track.id)) && yW(track, note)?.startsWith('nodal:');
  });
}
/* The composition owns all enabled audible Nodal notes, independent of the currently selected note. */
function __mlContainsNodalTracks(composer) {
  if (!composer?.tracks || !composer?.notes) return false;
  const enabled = new Map(composer.tracks.filter(track => track.enabled !== false).map(track => [track.id, track]));
  return composer.notes.some(note => {
    const track = enabled.get(note.trackId);
    return !!track && (yW(track, note)?.startsWith('nodal:')||isSavedEntrophonSound(yW(track,note)));
  });
}
/* No direct Nodal event player exists in Root Follow yet. A composed WAV must
   be registered as material audio, never interpreted as an unsupported legacy synth pattern. */
function __mlNodalRflConfig(composer) {
  return (__mlContainsNodalTracks(composer) || __mlHasTrackPan(composer)) ? {
    sourceKind: 'material', renderMode: 'flowing', anchorGridStep: null,
    synthPattern: null, synthPatch: null, formantWindowPlan: null
  } : L9e({loopComposer: composer});
}
function nodalMelodicNoteTiming(composer, note, source, stepSec) {
  const durationSec = Math.max(.04, Math.min(30, F$(composer, note) * stepSec));
  return {durationSec,
    attackSec: Number.isFinite(note.edgeFadeInMs) ? Math.max(.001, Math.min(2, note.edgeFadeInMs / 1000)) : Math.min(2, Math.max(source.instrument.articulation.attackSec, d9e(note) * stepSec)),
    releaseSec: Number.isFinite(note.edgeFadeOutMs) ? Math.max(.001, Math.min(3, note.edgeFadeOutMs / 1000)) : Math.min(3, Math.max(source.instrument.articulation.releaseSec, T$(note) * stepSec))};
}
function nodalMelodicNoteOptions(composer, note, track, source, stepSec) {
  const curves = note.localField == null && source.plan?.articulation
    ? {volumeCurve: source.plan.articulation.volumeCurve, pitchCurve: source.plan.articulation.pitchCurve}
    : resolveNodalArticulationFields(source.instrument.articulation, note.localField ?? null);
  return {frequency: m9e(composer, note, source), velocity: Math.max(0, Math.min(1, note.velocity ?? .8)),
    gain: Math.max(0, Math.min(1, track.volume ?? .8)) * .7 * Math.max(1, Math.min(1.2, note.velocity ?? .8)),
    ...nodalMelodicNoteTiming(composer, note, source, stepSec), ...curves};
}
function nodalRenderTailSeconds(request) {
  const composer = request.composer, stepSec = lD(request) / iD(composer), nominal = E$(request);
  let end = nominal;
  for (const note of composer.notes) {
    if (request.noteId ? note.id !== request.noteId : !request.trackIds.includes(note.trackId)) continue;
    const track = composer.tracks.find(t => t.id === note.trackId);
    if (!track?.enabled || composer.pitchSteps[uD(composer, note)]?.muted) continue;
    const instrument = nodalFindInstrument(yW(track, note), composer); if (!instrument) continue;
    const options = nodalMelodicNoteTiming(composer, note, {kind: 'nodal', instrument}, stepSec);
    end = Math.max(end, Ax(composer, note) * stepSec + options.durationSec + Math.max(options.releaseSec, instrument.schemaVersion === 2 ? instrument.material.natural * 1.8 : 0) + .01);
  }
  return end - nominal;
}
function nodalScheduleOffline(ctx, destination, composer, note, track, start, stepSec, source, register) {
  const options = nodalMelodicNoteOptions(composer, note, track, source, stepSec);
  const result = __XenNodalDSP.render(source.plan, options, ctx.sampleRate);
  // Keep intentional instrument width. A width-zero instrument uses the same
  // mono source in both the cached stem and a panned export, avoiding a second
  // L/R summation (and a level jump) at the stereo panner.
  const stereo = !!result.left && source.instrument?.material?.width > 0;
  const buffer = ctx.createBuffer(stereo ? 2 : 1, result.pcm.length, ctx.sampleRate); buffer.copyToChannel(stereo ? result.left : result.pcm, 0); if(stereo && result.right) buffer.copyToChannel(result.right, 1);
  const player = ctx.createBufferSource(), pan = ctx.__mlMonoRender ? null : ctx.createStereoPanner(); player.buffer = buffer;
  if(pan){pan.pan.value = Math.max(-1, Math.min(1, track.pan ?? 0)); player.connect(pan); pan.connect(destination);}else player.connect(destination);
  player.start(start + Ax(composer, note) * stepSec); register?.(player); if(pan)register?.(pan);
}
