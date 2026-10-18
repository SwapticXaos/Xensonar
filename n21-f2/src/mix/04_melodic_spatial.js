/* Melodic spatial policy: centre-only arrangements use a mono render/cache.
   Existing nonzero pans and stereo sample assets keep their spatial content. */
function __mlPan(value) { return Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0; }
function __mlAudibleTracks(request, options = {}) {
  if (options.drumOnly) return [];
  const ids = new Set(request.trackIds || []);
  return request.composer.tracks.filter(track => track.enabled !== false && request.composer.notes.some(note =>
    note.trackId === track.id && (request.noteId ? note.id === request.noteId : ids.has(track.id)) &&
    !request.composer.pitchSteps?.[uD(request.composer, note)]?.muted));
}
function __mlOutputChannels(request, options = {}, sources = new Map(), rawDrums = new Map()) {
  const tracks = __mlAudibleTracks(request, options);
  if (tracks.some(track => __mlPan(track.pan) !== 0)) return 2;
  // A stereo recording remains a stereo source even with its pan centred.
  for (const track of tracks) for (const note of request.composer.notes) {
    if (note.trackId !== track.id || request.noteId && note.id !== request.noteId) continue;
    const source = sources.get(yW(track, note));
    if ((source?.buffer?.numberOfChannels ?? source?.audioBuffer?.numberOfChannels ?? 1) > 1) return 2;
    if (source?.kind === 'nodal' && source.instrument?.material?.width > 0) return 2;
    const prepared = source?.noteBuffers?.get(note.id);
    if ((prepared?.buffer?.numberOfChannels ?? prepared?.numberOfChannels ?? 1) > 1) return 2;
  }
  if (!options.excludeDrums && !options.regionSec && c9e(request)) {
    const settings = [...Object.values(request.drumLaneSettings || Z0), ...Object.values(request.customDrumPattern?.laneSettings || {}), ...Object.values(request.customDrumPattern?.sampleSlots || {})];
    if (__mlPan(request.drumStyle?.pan) || settings.some(lane => __mlPan(lane?.pan))) return 2;
    const grid = request.customDrumPattern;
    for (const programs of Object.values(grid?.stepPrograms || {})) {
      if (Object.values(programs || {}).some(program => program?.layers?.some(layer => __mlPan(layer.panOffset)))) return 2;
    }
    for (const [lane, slot] of Object.entries(grid?.sampleSlots || {})) {
      if (!grid.laneSteps?.[lane]?.some(value => value > 0)) continue;
      if ((rawDrums.get(slot.id)?.numberOfChannels || 1) > 1) return 2;
    }
  }
  return 1;
}
function __mlHasTrackPan(composer) {
  return composer?.tracks?.some(track => track.enabled !== false && __mlPan(track.pan) !== 0 && composer.notes?.some(note => note.trackId === track.id)) ?? false;
}
function __mlSetLiveTrackPan(trackId, value) {
  const playing = b9e(), node = playing?.trackPanners?.get(trackId);
  if (!node) return false;
  const now = playing.ctx.currentTime;
  if (typeof node.pan.cancelAndHoldAtTime === 'function') node.pan.cancelAndHoldAtTime(now);
  else {const current = node.pan.value;node.pan.cancelScheduledValues(now);node.pan.setValueAtTime(current,now);}
  node.pan.setTargetAtTime(__mlPan(value), now, .012);
  return true;
}
function __MelodicTrackPan({track, index, mutate}) {
  const value = Math.round(__mlPan(track.pan) * 100), label = track.label || `Instrument ${index + 1}`;
  return u.jsxs('label', {className:'melodic-track-pan', title:'Pan · double-click to centre', children:[
    u.jsx('span', {children:'Pan'}),
    u.jsx('input', {type:'range', min:-100, max:100, step:1, value, 'aria-label':label+' pan',
      onChange:event => set(Number(event.currentTarget.value)), onDoubleClick:() => set(0)}),
    u.jsx('output', {children:value === 0 ? 'C' : (value < 0 ? 'L' : 'R') + Math.abs(value)})]});
  function set(raw) {
    const pan = __mlPan(raw / 100);
    __mlSetLiveTrackPan(track.id, pan);
    mutate(composer => {const own = composer.tracks.find(item => item.id === track.id); if (own) own.pan = pan;}, label+': pan '+(raw || 'centre'), {history:false});
  }
}
