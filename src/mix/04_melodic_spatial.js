/* Melodic spatial policy: centre-only arrangements use a mono render/cache.
   Existing nonzero pans and stereo sample assets keep their spatial content. */
function __mlPan(value) { return Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0; }
function __mlAudibleTracks(request, options = {}) {
  if (options.drumOnly) return [];
  const ids = new Set(request.trackIds || []);
  const candidates = request.composer.tracks.filter(track => track.enabled !== false &&
    (request.noteId || ids.has(track.id)));
  const remaining = new Set(candidates.map(track => track.id)), audible = new Set();
  if (!remaining.size) return [];
  // Visit the note list once, retaining authored track order in the result.
  for (const note of request.composer.notes) {
    const id = note.trackId;
    if (!remaining.has(id) || request.noteId && note.id !== request.noteId) continue;
    if (!request.composer.pitchSteps?.[uD(request.composer, note)]?.muted) {
      audible.add(id); remaining.delete(id);
      if (!remaining.size) break;
    }
  }
  return candidates.filter(track => audible.has(track.id));
}
function __mlOutputChannels(request, options = {}, sources = new Map(), rawDrums = new Map()) {
  const tracks = __mlAudibleTracks(request, options);
  if (tracks.some(track => __mlPan(track.pan) !== 0)) return 2;
  // A stereo recording remains a stereo source even with its pan centred.
  const notesByTrack = new Map(tracks.map(track => [track.id, []]));
  for (const note of tracks.length ? request.composer.notes : []) {
    if (request.noteId && note.id !== request.noteId) continue;
    notesByTrack.get(note.trackId)?.push(note);
  }
  // Keep the existing conservative policy: once a track is audible, even its
  // muted notes may carry an intentional stereo source. Group, do not prune.
  for (const track of tracks) for (const note of notesByTrack.get(track.id)) {
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

/* xen-lazy:canonical */


/* xen-lazy:canonical */

/* Volume and pan share one control geometry and mutation contract. Their
   separate live audio parameters keep their own existing playback behavior. */

/* xen-lazy:canonical */


/* xen-lazy:canonical */


/* xen-lazy:canonical */


/* Repeated views of one parent-owned transport, with no extra clocks/state. */

/* xen-lazy:canonical */

