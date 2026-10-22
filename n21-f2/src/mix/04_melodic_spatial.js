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
/* Volume and pan share one control geometry and mutation contract. Their
   separate live audio parameters keep their own existing playback behavior. */
function __MelodicTrackMix({track, index, mutate, field}) {
  const pan = field === 'pan', value = Math.round((pan ? __mlPan(track.pan) : Math.max(0, Math.min(1, Number.isFinite(track.volume) ? track.volume : .8))) * 100);
  const label = track.label || `Instrument ${index + 1}`, name = pan ? 'pan' : 'volume';
  return u.jsxs('label', {className:'melodic-track-level '+(pan ? 'melodic-track-pan' : 'melodic-track-volume'), style:{'--xen-instrument-color':track.color||'#cbd5e1'}, title:pan ? 'Pan · double-click to centre' : 'Individual instrument playback volume', children:[
    u.jsx('span', {children:pan ? 'Pan' : 'Vol'}),
    u.jsx('input', {type:'range', min:pan ? -100 : 0, max:100, step:1, value, 'aria-label':label+' '+name,
      onChange:event=>set(Number(event.currentTarget.value)), ...(pan ? {onDoubleClick:()=>set(0)} : {})}),
    u.jsx('output', {children:pan ? value === 0 ? 'C' : (value < 0 ? 'L' : 'R') + Math.abs(value) : value+'%'})]});
  function set(raw) {
    const next = pan ? __mlPan(raw / 100) : Math.max(0, Math.min(1, raw / 100));
    if (pan) __mlSetLiveTrackPan(track.id, next); else __mlSetLiveTrackVolume(track.id, next);
    mutate(composer=>{const own=composer.tracks.find(item=>item.id===track.id);if(own)own[field]=next;},label+': '+name+' '+raw,{history:false});
  }
}
function __MelodicTrackPan(props) { return u.jsx(__MelodicTrackMix, {...props,field:'pan'}); }
function __MelodicTrackVolume(props) { return u.jsx(__MelodicTrackMix, {...props,field:'volume'}); }

/* Repeated views of one parent-owned transport, with no extra clocks/state. */
function __MelodicTransportControls({phase, drums, pattern, onPlay, onStop, onDrums, onNext, placement='editor'}) {
  const idle=phase==='idle'||phase==='failed';
  return u.jsxs('div',{'data-ml-transport':placement,className:placement==='primary'?'melodic-transport-dock':'melodic-transport-inline',children:[
    u.jsx('button',{type:'button',onClick:idle?onPlay:onStop,style:{width:44,height:44,minWidth:44},
      'aria-label':idle?'Play active instruments as a loop':phase==='preparing'?'Cancel loop preparation':'Stop loop',
      title:idle?'▶ Listen to All Active Instruments':phase==='preparing'?'■ Cancel preparation':'■ Stop loop',
      className:'flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-violet-600/75 bg-violet-950/40 font-semibold text-violet-100 hover:bg-violet-900/50',children:idle?'▶':'■'}),
    u.jsx('button',{type:'button','aria-pressed':drums,onClick:onDrums,title:(drums?'Hide drums':'Enable current Drum Machine pattern')+' · '+(pattern||'Drums'),
      className:drums?'rounded border border-cyan-500 bg-cyan-950/65 px-1.5 py-2 text-[11px] font-semibold text-cyan-100':'rounded border border-neutral-700 bg-neutral-900/55 px-1.5 py-2 text-[11px] text-neutral-500 hover:text-neutral-200',children:'+ Drums'}),
    u.jsx('button',{type:'button',onClick:onNext,title:'Load next pattern in the shared Drum Machine','aria-label':'Drum Machine: Next Pattern',className:'rounded border border-neutral-700 px-1.5 py-2 text-xs text-neutral-300 hover:bg-neutral-800',children:'›'})]});
}
