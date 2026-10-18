/* P4C1: one control-side handoff, engine-specific preparation and cost units.
   No clock, voice queue, AudioContext, DSP, or persistent PCM is owned here. */
function assertInstrumentPreparationActive(signal) {
  if (signal?.aborted) throw Object.assign(new Error('Instrument preparation cancelled'), {name: 'AbortError'});
}
function instrumentPreparationSelection(request) {
  const composer = request.composer;
  if (!composer || !Array.isArray(composer.tracks) || !Array.isArray(composer.notes)) throw new Error('Invalid instrument preparation request');
  const tracks = new Map(composer.tracks.map(track => [track.id, track]));
  const selected = new Set(request.trackIds ?? []);
  const notes = request.drumPreviewOnly ? [] : composer.notes.filter(note => {
    const track = tracks.get(note.trackId);
    return track && track.enabled !== false && (request.noteId ? note.id === request.noteId : selected.has(track.id)) &&
      !composer.pitchSteps?.[uD(composer, note)]?.muted;
  });
  const usedTracks = new Set(notes.map(note => note.trackId));
  // Only the source-loading view is narrowed. The transport/render request keeps
  // its complete composition, bar geometry, per-note tuning and loop lengths.
  return {...request, composer: {...composer, tracks: composer.tracks.filter(track => usedTracks.has(track.id)), notes}};
}
function nodalPreparationResources(plan, sampleRate) {
  const nodes = plan.nodes?.length ?? 0;
  const liveCost=nodalLivePlanCosts(plan,sampleRate);
  return Object.freeze({engine: 'nodal', context: 'melodic-preparation', representation: 'compiled-plan',
    physicalVoicesPerNote: 1, nodeCount: nodes, nonlinearNodeCount: plan.nonlinearNodes?.length ?? 0,
    dsp: Object.freeze({unit: 'nodal-plan', units: plan.cost}),
    // Engine-specific live costs, reported separately; these numbers are NOT summed
    // with C11 complexity or used to raise any admission limit.
    surfaceDsp: Object.freeze({unit: 'nodal-surface', units: liveCost.attack,
      tailUnits:liveCost.tail,costModel:liveCost.model}),
    sampleRate});
}
function entrophonPreparationResources(source, sampleRate) {
  const materials = new Set([...source.noteBuffers.values()].map(item => item.buffer));
  let frames = 0, bytes = 0;
  for (const buffer of materials) { frames += buffer.length; bytes += buffer.length * buffer.numberOfChannels * 4; }
  return Object.freeze({engine: 'entrophon', context: 'melodic-preparation', representation: 'prepared-pcm',
    physicalVoicesPerNote: 1, dsp: Object.freeze({unit: 'c11-preparation', units: null}),
    // A prepared note plays one AudioBufferSource. Its preparation cost does
    // not claim to be the live C11 cost of the same instrument.
    noteCount: source.noteBuffers.size, uniqueBuffers: materials.size, frames, pcmBytes: bytes, sampleRate});
}
const __XenInstrumentSourceAdapters = Object.freeze([
  Object.freeze({engine: 'nodal', prefix: 'nodal:', representation: 'compiled-plan',
    prepare: (request, sources) => nodalLoadMelodicSources(request, sources),
    resources: (source, rate) => nodalPreparationResources(source.plan, rate)}),
  Object.freeze({engine: 'entrophon', prefix: 'entrophon:', representation: 'prepared-pcm',
    prepare: (request, sources, ctx) => prepareEntrophonMelodicSources(request, sources, ctx),
    resources: entrophonPreparationResources})
]);
function releasePreparedInstrumentSources(sources) {
  if (!sources) return;
  for (const source of sources.values()) if (source.kind === 'entrophon') source.noteBuffers.clear();
  sources.clear();
}
async function prepareMelodicInstrumentSources(request, ctx, initialSources = new Map()) {
  assertInstrumentPreparationActive(request.signal);
  if (!Number.isFinite(ctx?.sampleRate) || ctx.sampleRate < 8000 || ctx.sampleRate > 192000) throw new Error('Invalid instrument preparation sample rate');
  const scoped = instrumentPreparationSelection(request);
  const sources = new Map(initialSources);
  // A failed replacement must not clear buffers belonging to an older caller.
  for (const [id, source] of sources) if (source.kind === 'entrophon') sources.set(id, {...source, noteBuffers: new Map(source.noteBuffers)});
  const wanted = new Set();
  for (const track of scoped.composer.tracks) for (const note of scoped.composer.notes) if (note.trackId === track.id) wanted.add(yW(track, note));
  try {
    for (const adapter of __XenInstrumentSourceAdapters) {
      if (![...wanted].some(id => typeof id === 'string' && id.startsWith(adapter.prefix))) continue;
      assertInstrumentPreparationActive(request.signal);
      // Existing engine adapters own their workers, validation and cleanup.
      await adapter.prepare(scoped, sources, ctx);
      assertInstrumentPreparationActive(request.signal);
      for (const id of wanted) if (typeof id === 'string' && id.startsWith(adapter.prefix) && sources.get(id)?.kind !== adapter.engine) throw new Error('Instrument source not prepared: ' + id);
    }
    for (const [id, source] of sources) {
      const adapter = __XenInstrumentSourceAdapters.find(item => id.startsWith(item.prefix));
      if (adapter) sources.set(id, {...source, resources: adapter.resources(source, ctx.sampleRate)});
    }
    return sources;
  } catch (error) { releasePreparedInstrumentSources(sources); throw error; }
}
async function loadMelodicInstrumentSources(request, ctx) {
  assertInstrumentPreparationActive(request.signal);
  const scoped = instrumentPreparationSelection(request), presets = new Set();
  const tracks = new Map(scoped.composer.tracks.map(track => [track.id, track]));
  for (const note of scoped.composer.notes) {
    const preset = yW(tracks.get(note.trackId), note);
    if (typeof preset === 'string' && preset.startsWith('sample:')) presets.add(preset);
  }
  const samples = await Promise.all([...presets].map(async preset => {
    assertInstrumentPreparationActive(request.signal);
    const sampleId = preset.slice(7), item = await pg(sampleId, ctx);
    assertInstrumentPreparationActive(request.signal);
    return item ? [preset, {kind: 'sample', sampleId, baseHz: item.baseHz, baseHzSource: item.baseHzSource,
      tempoPitchLinked: item.tempoPitchLinked, playbackDurationSec: item.playbackDurationSec,
      volumeEnvelope: item.volumeEnvelope ? Zr(item.volumeEnvelope) : null,
      pitchEnvelope: item.pitchEnvelope ? Zr(item.pitchEnvelope) : null, buffer: item.buffer}] : null;
  }));
  assertInstrumentPreparationActive(request.signal);
  return prepareMelodicInstrumentSources(scoped, ctx, new Map(samples.filter(Boolean)));
}
