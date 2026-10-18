async function nodalPlayMelodic(request) {
  let token = null;
  const fail = error => {
    if (token !== null && !uP(token)) return;
    hS();
    const message = 'Melodic Loop: ' + String(error?.message ?? error);
    request.onPhase?.('failed'); request.onPlaybackError?.(message);
    request.onPlayhead?.(null); request.onComposerPlayhead?.(null);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('xensonar:melodic-error', {detail: message}));
  };
  try {
    return await nodalStartMelodic({...request, onToken: value => { token = value; request.onToken?.(value); }, onPlaybackError: fail});
  } catch (error) { fail(error); throw error; }
}
async function nodalStartMelodic(request) {
  hS(); request = {...request, signal: beginEntrophonMelodicPreparation()}; const token = g9e(); request.onToken?.(token); request.onPhase?.('preparing'); __mlSetPhase('preparing');
  const bridge = __XenNodalInstallation.current; if (!bridge) throw new Error('Nodal audio owner unavailable');
  // The live voice admission belongs to the main audio runtime. Use its context
  // and output as well: a second preview AudioContext can stay suspended under
  // browser autoplay policy while the main runtime rejects its voices.
  const ctx = await bridge.ensureAudio();
  if (!ctx || ctx.state !== 'running') throw new Error('Shared Nodal audio context is not running');
  if (!uP(token)) return false;
  const sources = await SW(request, ctx); if (!uP(token)) return false;
  const composer = request.composer, steps = iD(composer), duration = lD(request), stepSec = duration / steps;
  if (__mlSoloTrackId !== null && !composer.tracks.every(track => track.enabled === (track.id === __mlSoloTrackId))) __mlSoloTrackId = null;
  const selected = request.noteId ? composer.notes.filter(n => n.id === request.noteId) : composer.notes.filter(n => request.trackIds.includes(n.trackId));
  const master = ctx.createGain(); master.gain.value = .82; master.__f49PreviewMaster = true; master.connect(bridge.getOutput(ctx)); Mx(master);
  const gains = new Map(), players = new Map(), stems = new Map(), events = [];
  let timer = null, stopped = false, cycle = 0, cursor = 0, startTime = ctx.currentTime + .12, loopOffset = 0;
  const stop = () => { if (stopped) return; stopped = true; if (timer !== null) clearTimeout(timer); for (const player of players.values()) player.stop(); };
  const dispose = () => { stop(); for (const player of players.values()) player.dispose(); };
  Mx({stop, disconnect: dispose});
  try {
    for (const track of composer.tracks) {
      const gain = ctx.createGain(); gain.gain.value = __mlSoloTrackId !== null ? Number(track.id === __mlSoloTrackId) : Number(track.enabled); gain.connect(master); gains.set(track.id, gain); Mx(gain);
      const nodalNotes = selected.filter(n => n.trackId === track.id && yW(track, n)?.startsWith('nodal:'));
      if (nodalNotes.length) {
        const plans = new Set(nodalNotes.map(n => sources.get(yW(track, n)).plan.key));
        if (plans.size > 16) throw new Error('Maximum of 16 different Nodal instruments per live track');
        if (nodalNotes.some(n => sources.get(yW(track, n)).plan.cost > 8)) throw new Error('Nodal instrument exceeds the live voice budget. Reduce node complexity or export as audio.');
        const pan = ctx.createStereoPanner(); pan.channelCount = 1; pan.channelCountMode = 'explicit'; pan.pan.value = Math.max(-1, Math.min(1, track.pan ?? 0)); pan.connect(gain); Mx(pan);
        // One physical voice, one global ticket. DSP cost belongs to the same
        // context ledger as live Wave/Keyboard/Particle, across every track.
        const player = await __XenNodalLive.createPlayer(ctx, pan, {acquire: () => bridge.acquireVoice(1), onError: error => request.onPlaybackError?.(error)}, {
          maxCost:16,maxVoices:32,sharedCapacity:true,priority:'primary',preserveTails:true,prepareOnControl:true,
          costForPlan:(plan,rate)=>nodalLivePlanCosts(plan,rate).attack,
          tailCostForPlan:(plan,rate)=>nodalLivePlanCosts(plan,rate).tail
        });
        if (!uP(token)) { player.dispose(); dispose(); return false; }
        players.set(track.id, player);
        const pitchSets=new Map();
        for (const note of nodalNotes) {
          const source = sources.get(yW(track, note)); await player.prepare(source.instrument);
          if(!uP(token)){dispose();return false;}
          let pitches=pitchSets.get(source.instrument);if(!pitches){pitches=new Set();pitchSets.set(source.instrument,pitches);}
          pitches.add(nodalMelodicNoteOptions(composer,note,track,source,stepSec).frequency);
          events.push({at: Ax(composer, note) * stepSec, note, track, source, player});
        }
        // The transport clock is established AFTER preparation. There is no
        // promise/Worker wait in tick(), noteOn(), or live surface attacks.
        for(const [instrument,pitches] of pitchSets){
          await player.warmFrequencies(instrument,[...pitches]);
          if(!uP(token)){dispose();return false;}
        }
      }
      const legacy = selected.filter(n => n.trackId === track.id && !yW(track, n)?.startsWith('nodal:'));
      if (legacy.length) {
        if (request.loop) {
          const legacyRequest = {...request, composer: {...composer, notes: composer.notes.filter(n => !yW(composer.tracks.find(t => t.id === n.trackId), n)?.startsWith('nodal:'))}};
          stems.set(track.id, await __mlGetStem(legacyRequest, track.id));
        }
      }
    }
    if (request.loop && c9e(request) && !request.noteId) stems.set('__drums__', await __mlGetStem(request, '__drums__'));
    if (!uP(token)) { dispose(); return false; }
    if (stems.has('__drums__')) { const gain = ctx.createGain(); gain.gain.value = request.drumMonitorEnabled === true || __mlDrumsAudible ? 1 : 0; const rack = __f48GetDrumRack(ctx, master); gain.connect(rack.input); gains.set('__drums__', gain); Mx(gain); Mx({disconnect: () => rack.dispose()}); }
    const noteOrigin = request.noteId && selected[0] ? Ax(composer, selected[0]) * stepSec : 0;
    events.forEach(event => event.at -= noteOrigin); events.sort((a, b) => a.at - b.at || a.note.id.localeCompare(b.note.id));
    startTime = ctx.currentTime + .12;
    const tailsEnd = events.reduce((end, event) => { const note = nodalMelodicNoteOptions(composer, event.note, event.track, event.source, stepSec); return Math.max(end, event.at + note.durationSec + Math.max(note.releaseSec, event.source.plan.tailSec ?? 0) + .01); }, 0);
    const total = Math.max(tailsEnd, request.noteId && selected[0] ? F$(composer, selected[0]) * stepSec + .2 : E$(request));
    const session = {token, ctx, master, stemBuffers: stems, stemGains: gains, stemSources: [],
      totalDurationSec: request.loop ? duration : total, totalSteps: steps, stepDurationSec: stepSec, startTime, loopOffsetSec: 0,
      liveEnabledIds: new Set(composer.tracks.filter(t => t.enabled).map(t => t.id)), drumRenderRequest: JSON.parse(JSON.stringify(request)),
      drumMonitorExplicit: request.drumMonitorEnabled === true,
      playheadCallback: request.onComposerPlayhead ?? request.onPlayhead, globalPlayheadCallback: request.onGlobalPlayheadRatio,
      nodalTransport: {stop, seek(unit) {
        for (const player of players.values()) player.stop();
        for (const source of session.stemSources) { try { source.stop(); source.disconnect(); } catch {} }
        loopOffset = ((unit % steps + steps) % steps) * stepSec; session.loopOffsetSec = loopOffset;
        startTime = ctx.currentTime + .025; session.startTime = startTime; cycle = 0; cursor = events.findIndex(e => e.at >= loopOffset); if (cursor < 0) cursor = events.length;
        if (stems.size) __mlLaunchStemSources(session, loopOffset, startTime); return true;
      }}};
    y9e(session);
    if (request.loop && stems.size) __mlLaunchStemSources(session, 0, startTime);
    if (!request.loop) for (const note of selected) {
      const track = composer.tracks.find(t => t.id === note.trackId); if (!track?.enabled || yW(track, note)?.startsWith('nodal:')) continue;
      N$(ctx, master, composer, note, track, startTime - noteOrigin, stepSec, sources, Mx);
    }
    if (!request.loop && !request.noteId) _$(ctx, master, request, startTime, cD(request));
    const firstStarts = [];
    let initialAttempts = 0, initialAccepted = 0;
    function tick() {
      if (stopped || !uP(token)) return;
      const now = ctx.currentTime, horizon = now + .12;
      if (request.loop) {
        const presentCycle = Math.max(0, Math.floor((now - startTime + loopOffset) / duration));
        if (presentCycle > cycle) { cycle = presentCycle; cursor = 0; }
      }
      // Only future notes are scheduled. A delayed tick drops missed attacks instead of replaying them.
      let visited = 0;
      while (events.length && visited++ < 512) {
        if (cursor >= events.length) { if (!request.loop) break; cursor = 0; cycle++; }
        const event = events[cursor], at = startTime - loopOffset + cycle * duration + event.at;
        if (at > horizon) break; cursor++;
        const step = composer.pitchSteps[uD(composer, event.note)];
        if (at < now - .008 || (__mlSoloTrackId !== null ? event.track.id !== __mlSoloTrackId : !session.liveEnabledIds.has(event.track.id)) || step?.muted) continue;
        const voice = event.player.noteOn(event.source.instrument,
          {...nodalMelodicNoteOptions(composer, event.note, event.track, event.source, stepSec), confirmStart: true}, at);
        if (timer === null) { initialAttempts++; if (voice) initialAccepted++; }
        // The one-note audition must never report Play when its only voice was
        // refused. Multi-track real-time playback keeps the established drop policy.
        if (!voice && request.noteId) throw new Error('Could not start Nodal note: audio context or voice budget blocked playback.');
        if (voice?.started) {
          if (timer === null) firstStarts.push(voice.started);
          voice.started.catch(error => {
            if (stopped || !uP(token)) return;
            // A late secondary attack or temporary capacity rejection is dropped,
            // never queued. Structural DSP/processor failures stop the transport.
            if (!request.noteId && ['late', 'voice capacity'].includes(error.reason)) return;
            request.onPlaybackError?.(error);
          });
        }
      }
      const elapsed = Math.max(0, now - startTime), position = request.loop ? (loopOffset + elapsed) % duration : Math.min(total, elapsed);
      session.playheadCallback?.(position / stepSec + (request.noteId ? noteOrigin / stepSec : 0)); session.globalPlayheadCallback?.(position / duration);
      if (!request.loop && elapsed >= total + .15) { request.onEnded?.(); hS(); return; }
      timer = setTimeout(() => { try { tick(); } catch (error) { request.onPlaybackError?.(error); } }, 25);
    }
    tick();
    if (initialAttempts && !initialAccepted && !stems.size && selected.every(note => yW(composer.tracks.find(t => t.id === note.trackId), note)?.startsWith('nodal:'))) throw new Error('No Nodal voice available: audio budget exhausted. Stop other voices and try again.');
    await Promise.all(firstStarts);
    if (stopped || !uP(token)) return false;
    request.onPhase?.('playing'); __mlSetPhase('playing'); return true;
  } catch (error) { dispose(); throw error; }
}
