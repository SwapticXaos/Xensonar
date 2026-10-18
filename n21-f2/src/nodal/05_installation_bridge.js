// Preview-only renderer. Instruments remain synthetic descriptors in the library and
// Melodic Loop; PCM is ephemeral and never written to the instrument store.
function nodalPreviewWorkerEntry(kernelFactory) {
  const renderer = kernelFactory();
  self.onmessage = ({data}) => {
    try {
      const rendered = renderer.render(data.plan, data.options, data.sampleRate);
      self.postMessage({type: 'rendered', pcm: rendered.pcm, left: rendered.left, right: rendered.right}, [rendered.pcm.buffer, ...(rendered.left ? [rendered.left.buffer, rendered.right.buffer] : [])]);
    } catch (error) { self.postMessage({type: 'error', message: String(error?.message ?? error)}); }
  };
}
function createNodalInstallationBackend({model, dsp, library, live}) {
  const attached = new WeakMap(); let current = null;
  function attach(ref, parameters) {
    let bridge = attached.get(ref);
    if (bridge) { bridge.configure(parameters); return bridge; }
    let config = parameters, options = {seed: 1, excitation: 'tone', level: .6, coupling: .075}, cached = null, player = null, playerContext = null, pendingPlayer = null, generation = 0, preparedInstrument = null;
    let previewSource = null, previewRelease = null, previewWorker = null, abortPreviewRender = null;
    function stopPreview() {
      generation++;
      const abort = abortPreviewRender; abortPreviewRender = null;
      if (abort) abort(new Error('Nodal preview cancelled'));
      if (previewWorker) { previewWorker.terminate(); previewWorker = null; }
      if (previewSource) { try { previewSource.onended = null; previewSource.stop(); } catch {} try { previewSource.disconnect(); } catch {} previewSource = null; }
      const release = previewRelease; previewRelease = null; if (release) release();
    }
    function renderPreview(plan, note, sampleRate, revision) {
      if (typeof Worker !== 'function' || typeof URL?.createObjectURL !== 'function' || typeof Blob !== 'function')
        return Promise.resolve(dsp.render(plan, note, sampleRate));
      return new Promise((resolve, reject) => {
        let url = null, worker = null, settled = false;
        const watchdogMs = Math.max(5000, Math.min(90000, Math.ceil((note.durationSec + plan.articulation.releaseSec) * 3000 + 1500)));
        const watchdog = setTimeout(() => finish(new Error('Nodal preview worker did not respond')), watchdogMs);
        const finish = (error, pcm) => {
          if (settled) return; settled = true; clearTimeout(watchdog);
          if (abortPreviewRender === cancel) abortPreviewRender = null;
          if (previewWorker === worker) previewWorker = null;
          if (worker) worker.terminate(); if (url) URL.revokeObjectURL(url);
          if (error) reject(error); else resolve(pcm);
        };
        const cancel = error => finish(error);
        abortPreviewRender = cancel;
        try {
          const code = '(' + nodalPreviewWorkerEntry.toString() + ')(' + createNodalSynthesisKernel.toString() + ');';
          url = URL.createObjectURL(new Blob([code], {type:'text/javascript'}));
          worker = new Worker(url); previewWorker = worker;
          worker.onmessage = ({data}) => data.type === 'rendered' ? finish(null, data) : finish(new Error(data.message ?? 'Nodal preview render failed'));
          worker.onerror = event => { event.preventDefault?.(); finish(new Error('Nodal preview rendering worker failed')); };
          worker.postMessage({plan, options: note, sampleRate});
        } catch (error) { finish(error); }
      });
    }
    async function preview(instrument, note = {}) {
      // Unlike the realtime loop transport, manual audition may be prepared offline:
      // worklet registration and admission cannot silently turn a click into silence.
      stopPreview(); const revision = generation;
      const audio = config.audio;
      if (!audio || typeof audio.ensureReady !== 'function') throw new Error('Nodal audio adapter unavailable');
      await audio.ensureReady();
      if (revision !== generation) throw new Error('Nodal preview cancelled');
      const context = audio.getContext();
      if (!context || context.state !== 'running') throw new Error('Audio context not running for Nodal preview');
      const plan = model.compile(instrument);
      if (plan.silent) throw new Error('Nodal instrument has no active organs');
      if (plan.cost > 8) throw new Error('Nodal instrument exceeds live preview budget');
      const frequency = note.frequency ?? instrument.referenceHz;
      if (!Number.isFinite(frequency) || frequency < 5 || frequency > 12000) throw new Error('Invalid preview frequency');
      const sampleRate = context.sampleRate;
      const renderOptions = {frequency, velocity: note.velocity ?? .8, gain: note.gain ?? .7,
        durationSec: note.durationSec ?? instrument.articulation.durationSec, seed: note.seed ?? instrument.seed};
      let pcm;
      try { pcm = await renderPreview(plan, renderOptions, sampleRate, revision); }
      catch (error) {
        if (revision !== generation) throw error;
        // Worker/CSP failures must never make the manual audition permanently silent.
        // This is a preview-only fallback; real-time Melodic synthesis is unchanged.
        pcm = dsp.render(plan, renderOptions, sampleRate);
      }
      if (revision !== generation) throw new Error('Nodal preview cancelled');
      const rendered = pcm; pcm = rendered.pcm;
      const peak = pcm.reduce((max, x) => Math.max(max, Math.abs(x)), 0);
      if (!Number.isFinite(peak) || peak < .0001) throw new Error('Nodal preview rendered silence');
      const ticket = audio.acquire(1); // prepared PCM owns one playback voice, not the compile-time DSP cost
      if (!ticket) throw new Error('Nodal preview rejected by the shared audio voice budget');
      let owned = true;
      const release = () => { if (!owned) return; owned = false; ticket.release(); };
      previewRelease = release;
      try {
        const buffer = context.createBuffer(rendered.left ? 2 : 1, pcm.length, sampleRate);
        buffer.copyToChannel(rendered.left ?? pcm, 0); if(rendered.right) buffer.copyToChannel(rendered.right, 1);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.onended = () => { if (previewSource === source) previewSource = null; try { source.disconnect(); } catch {} release(); if (previewRelease === release) previewRelease = null; };
        const analyser = context.createAnalyser(); analyser.fftSize = 2048; source.connect(analyser); analyser.connect(audio.getOutput(context)); // one established master output owner
        const disconnect = source.disconnect.bind(source); source.disconnect = () => { disconnect(); analyser.disconnect(); };
        previewSource = source;
        source.start(context.currentTime + .02);
        return Object.freeze({started: Promise.resolve(), noteOff: () => { try { source.stop(); } catch {} },
          offlinePreview: true, peak, sampleRate, analyser, durationSec: buffer.duration});
      } catch (error) { release(); if (previewRelease === release) previewRelease = null; throw error; }
    }

    const status = {revision: 0, error: null, diagnostics: []};
    function capture() {
      const result = model.fromInstallation({nodes: ref.current.nodes, width: config.width, height: config.height,
        referenceHz: config.referenceHz, name: config.name || 'Nodal Instrument', ...options});
      status.diagnostics = result.diagnostics; return result.instrument;
    }
    function plan() {
      const instrument = capture(), key = model.semanticKey(instrument);
      if (cached?.key !== key) { cached = {key, value: model.compile(instrument)}; status.revision++; }
      return cached.value;
    }
    function setOptions(patch) {
      const next = {...options, ...patch};
      // Validate before changing the working state.
      model.fromInstallation({nodes: ref.current.nodes, width: config.width, height: config.height, referenceHz: config.referenceHz, ...next});
      options = {seed: next.seed, excitation: next.excitation, level: next.level, coupling: next.coupling, blockedEdges: next.blockedEdges, articulation: next.articulation, referenceHz: next.referenceHz ?? config.referenceHz, name: next.name ?? config.name}; return capture();
    }
    function patchNode(id, patch) {
      const node = ref.current.nodes.find(n => String(n.residentId ?? n.id) === id);
      if (!node) throw new Error('Nodal node not found');
      const original = node.nodalDesign, proposed = {...original, ...patch};
      if (Object.keys(patch).some(k => !['role', 'ratio', 'cents', 'radius', 'strength', 'excitation', 'pickup'].includes(k))) throw new Error('Unsupported Nodal node patch');
      node.nodalDesign = proposed;
      try { capture(); } catch (error) { if (original === undefined) delete node.nodalDesign; else node.nodalDesign = original; throw error; }
      return capture();
    }
    async function prepareAudio(instrument = capture()) {
      const revision = generation;
      const audio = config.audio;
      if (!audio || typeof audio.ensureReady !== 'function') throw new Error('Nodal installation has no audio adapter');
      await audio.ensureReady(); if (revision !== generation) throw new Error('Nodal preparation cancelled');
      const context = audio.getContext();
      if (!context || context.state !== 'running') throw new Error('Audio context not running');
      if (playerContext !== context) {
        player?.dispose(); player = null; playerContext = context;
        pendingPlayer = live.createPlayer(context, audio.getOutput(context), {acquire: () => config.audio.acquire(1)}, {
          maxCost:16,maxVoices:32,sharedCapacity:true,priority:'secondary',preserveTails:true,prepareOnControl:true,
          costForPlan:(plan,rate)=>nodalLivePlanCosts(plan,rate).attack,
          tailCostForPlan:(plan,rate)=>nodalLivePlanCosts(plan,rate).tail
        });
      }
      if (!player) {
        try { player = await pendingPlayer; }
        catch (error) { playerContext = null; pendingPlayer = null; throw error; }
        if (revision !== generation) { player.dispose(); player = null; throw new Error('Nodal preparation cancelled'); }
      }
      await player.prepare(instrument); preparedInstrument = instrument; return instrument;
    }
    function noteOn(instrument, note = {}, startSec) {
      // Intentionally synchronous: unprepared or stale notes are dropped, never queued.
      if (!player) return null;
      // Preview events are not sequencer events: give the Worklet one render quantum
      // and message-delivery headroom. Nothing is queued or replayed after a miss.
      return player.noteOn(instrument ?? preparedInstrument, note, startSec ?? (playerContext.currentTime + .06));
    }
    function restore(instrument) {
      const normalized = model.normalize(instrument);
      options = {seed: normalized.seed, excitation: normalized.excitation.kind, level: normalized.excitation.level, coupling: normalized.coupling, blockedEdges: normalized.blockedEdges, articulation: normalized.articulation, referenceHz: normalized.referenceHz, name: normalized.name};
      for (const stored of normalized.nodes) {
        const node = ref.current.nodes.find(n => String(n.residentId ?? n.id) === stored.id);
        if (node) node.nodalDesign = {role: stored.role, ratio: stored.ratio, cents: stored.cents, radius: stored.radius, strength: stored.strength, excitation: stored.excitation, pickup: stored.pickup};
      }
      return normalized;
    }
    function replace(instrument) {
      const normalized = model.normalize(instrument), extent = Math.max(config.width, config.height), old = ref.current.nodes;
      ref.current.nodes = normalized.nodes.map(n => ({...old.find(o => String(o.residentId ?? o.id) === n.id),
        residentId: n.id, label: n.label, x: config.width / 2 + (n.x - .5) * extent, y: config.height / 2 + (n.y - .5) * extent,
        freq: normalized.referenceHz * n.ratio * Math.pow(2, n.cents / 1200), ratio: n.ratio, tuningCents: 0, energy: 0,
        isCustomResident: true, residentMuted: n.muted}));
      restore(normalized); return capture();
    }
    function checkpoint(entry) {
      try { entry.nodalInstrument = capture(); status.error = null; }
      catch (error) { status.error = String(error.message); }
      return entry;
    }
    bridge = Object.freeze({capture, compile: plan, setOptions, patchNode, prepareAudio, noteOn, preview, stopPreview, replace,
      ensureAudio: async () => { await config.audio.ensureReady(); return config.audio.getContext(); },
      getOutput: context => config.audio.getOutput(context),
      acquireVoice: cost => config.audio?.acquire(cost) ?? null,
      render: (note, sampleRate) => dsp.render(plan(), note, sampleRate),
      save: saveOptions => library.save(capture(), saveOptions), restore, checkpoint,
      configure: value => { config = value; },
      stop: () => { stopPreview(); player?.stop(); },
      dispose: () => { stopPreview(); player?.dispose(); player = null; playerContext = null; cached = null; preparedInstrument = null; },
      status: () => ({...status, diagnostics: status.diagnostics.slice(), audio: player?.snapshot() ?? null})});
    attached.set(ref, bridge); return bridge;
  }
  function activate(ref, bridge) { current = bridge; ref.current.nodalBackend = bridge; }
  function deactivate(ref, bridge) { if (current === bridge) current = null; if (ref.current.nodalBackend === bridge) delete ref.current.nodalBackend; bridge.dispose(); }
  function checkpoint(ref, entry) { return attached.get(ref)?.checkpoint(entry) ?? entry; }
  function restore(ref, entry) { if (entry.nodalInstrument) attached.get(ref)?.restore(entry.nodalInstrument); }
  return Object.freeze({attach, activate, deactivate, checkpoint, restore, get current() { return current; }});
}
const __XenNodalInstallation = createNodalInstallationBackend({model: __XenNodalModel, dsp: __XenNodalDSP, library: __XenNodalLibrary, live: __XenNodalLive});
function useNodalInstallationBackend(react, ref, config) {
  const bridge = react.useMemo(() => __XenNodalInstallation.attach(ref, config), [ref]);
  bridge.configure(config);
  react.useEffect(() => { __XenNodalInstallation.activate(ref, bridge); return () => __XenNodalInstallation.deactivate(ref, bridge); }, [ref, bridge]);
  react.useEffect(() => () => bridge.stop(), [bridge, config.room]);
  return bridge;
}
function nodalPersistedNodeFields(node) {
  const out = {};
  for (const key of ['myzelEffectModuleType', 'myzelEffectPresetId']) if (typeof node[key] === 'string' && node[key].length < 160) out[key] = node[key];
  for (const key of ['myzelAuraRadius', 'myzelEffectStrength']) if (Number.isFinite(node[key])) out[key] = node[key];
  if (node.nodalDesign && typeof node.nodalDesign === 'object') {
    const design = {};
    for (const key of ['role', 'ratio', 'cents', 'radius', 'strength', 'excitation', 'pickup']) {
      const value = node.nodalDesign[key];
      if (key === 'role' ? __XenNodalModel.roles.includes(value) : Number.isFinite(value)) design[key] = value;
    }
    if (Object.keys(design).length) out.nodalDesign = design;
  }
  return out;
}
function nodalPersistedInstrument(entry) {
  if (entry.nodalInstrument == null) return {};
  try { return {nodalInstrument: __XenNodalModel.normalize(entry.nodalInstrument)}; }
  catch { return {}; } // Unsupported optional additions never invalidate a legacy constellation.
}
function acquireNodalPreviewAdmission({context, runtime, allowStart, activeTones}, cost) {
  if (!context || context.state !== 'running' || !runtime || allowStart(context) === false || activeTones.current.length >= 52) return null;
  const event = runtime.beginEvent('other', cost, 1);
  if (event.maxVoices < cost || event.load >= .62) return null;
  const tickets = [];
  for (let i = 0; i < cost; i++) {
    const ticket = runtime.admitVoice(event, 1);
    if (!ticket) { tickets.forEach(t => runtime.releaseVoice(t)); return null; }
    tickets.push(ticket);
  }
  let released = false;
  return {release() { if (released) return; released = true; tickets.forEach(t => runtime.releaseVoice(t)); }};
}
if (typeof window !== 'undefined') window.XenSonarNodalBackend = Object.freeze({
  version: 1, model: __XenNodalModel, synthesis: __XenNodalDSP, library: __XenNodalLibrary,
  get installation() { return __XenNodalInstallation.current; }
});
