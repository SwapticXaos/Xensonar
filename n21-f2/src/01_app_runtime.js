/* F3.56.14 — one technical reference convention; audio ownership stays domain-specific.
 * Old persisted IDs and the {__materialIntakeAssetRef} record shape remain byte-compatible.
 */
const __F35614AudioRef = (() => {
  const SAMPLE = 'melodic-sample:';
  const isLinked = id => typeof id === 'string' && id.startsWith(SAMPLE) && id.length > SAMPLE.length;
  return Object.freeze({
    samplePrefix: SAMPLE,
    sampleId: id => SAMPLE + id,
    isLinkedSample: isLinked,
    sampleIdFromAsset: id => isLinked(id) ? id.slice(SAMPLE.length) : null,
    marker: id => ({ __materialIntakeAssetRef: id }),
    fromSource: source => source?.sourceAsset?.__materialIntakeAssetRef ?? null,
  });
})();

/* F3.56.13 — shared archive logistics, not shared Donor/Forge schemas. */
const __F35613Archive = Object.freeze({
  validateRows(groups, valid, reject) {
    const ids = new Set();
    for (const [rows, prefix] of groups) for (const row of rows) {
      if (!row || !valid(row.id, prefix) || ids.has(row.id) || !row.value) reject(row);
      ids.add(row.id);
    }
    return ids;
  },
  assertMode(mode, reject) {
    if (!['merge', 'replace', 'differential'].includes(mode)) reject();
  },
  packRows(rows, pack) {
    return rows.map(row => ({ id: row.id, value: pack(row.value) }));
  },
  async exportAssets(storage, ids, pack, assertAsset, missing) {
    const result = [];
    for (const id of ids) {
      const row = await storage.get(id);
      if (!row) missing(id);
      assertAsset(row.value, id);
      result.push({ id, value: pack(row.value) });
    }
    return result;
  },
  async restoreAssets(storage, rows, unpack, assertAsset) {
    let imported = 0, reused = 0;
    for (const row of rows) {
      const current = await storage.get(row.id);
      if (current?.value?.monoSamples?.length || current?.value?.leftSamples?.length) {
        reused++;
        continue;
      }
      const value = unpack(row.value);
      assertAsset(value, row.id);
      // Commit each audio asset before publishing metadata references.
      await storage.putMany([{ id: row.id, value, updatedAt: Date.now() }], []);
      imported++;
    }
    return { imported, reused };
  },
  async commitMetadata(storage, planned, localRows, archiveIds, mode) {
    const existing = new Set(localRows.map(row => row.id));
    const toPut = mode === 'merge' ? planned.filter(row => !existing.has(row.id)) : planned;
    const toDelete = mode === 'replace'
      ? localRows.map(row => row.id).filter(id => !archiveIds.has(id)) : [];
    await storage.putMany(toPut, toDelete); // One metadata transaction per store.
    return { toPut, toDelete };
  },
});

/* F3.56.12: shared persistence mechanics; record schemas and audio paths stay at their callers. */
function __f35612Finite(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function __f35612SparsePcmHash(samples) {
  let h = 0x811c9dc5 >>> 0;
  const count = Math.min(257, Math.max(1, samples.length));
  for (let i = 0; i < count; i++) {
    const index = count === 1 ? 0 : Math.round(i / (count - 1) * Math.max(0, samples.length - 1));
    const q = Math.round(Math.max(-1, Math.min(1, __f35612Finite(samples[index]))) * 32767) | 0;
    h ^= q & 0xffff;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
// Material Intake and Donor Library already share this exact ID format.
// Experiment autosave retains its different fingerprint field order.
function __f35612MaterialFingerprint(asset) {
  const probe = asset?.monoSamples?.length ? asset.monoSamples : asset?.leftSamples;
  return [
    String(asset?.fileName ?? asset?.label ?? 'audio'),
    __f35612Finite(asset?.sampleRate), __f35612Finite(asset?.channelCount, 1),
    __f35612Finite(asset?.originalDuration ?? asset?.durationSec).toFixed(6),
    asset?.monoSamples?.length ?? 0, asset?.leftSamples?.length ?? 0,
    probe instanceof Float32Array ? __f35612SparsePcmHash(probe) : 'no-pcm',
  ].join('|');
}
function __f35612RecordStore(dbName, errors = {}) {
  const storeName = 'records';
  const failure = (error, key) => error ?? (errors[key] ? new Error(errors[key]) : error);
  function open() {
    return new Promise((resolve, reject) => {
      if (errors.unavailable && typeof indexedDB === 'undefined')
        return reject(new Error(errors.unavailable));
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(failure(request.error, 'open'));
    });
  }
  async function operate(mode, run) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        // Only Donor Library previously settled reads on transaction abort.
        if (errors.readAbort) tx.onabort = () => reject(failure(tx.error, 'readAbort'));
        run(tx.objectStore(storeName), tx, resolve, reject);
      });
    } finally { db.close(); }
  }
  function read(id, keyOnly) {
    return operate('readonly', (store, tx, resolve, reject) => {
      const req = keyOnly ? store.getKey(id) : store.get(id);
      req.onsuccess = () => resolve(keyOnly ? req.result !== undefined : req.result ?? null);
      req.onerror = () => reject(failure(req.error, keyOnly ? 'has' : 'get'));
    });
  }
  function listPrefix(prefix) {
    return operate('readonly', (store, tx, resolve, reject) => {
      const rows = [], req = store.openCursor(IDBKeyRange.bound(prefix, prefix + '\uffff'));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) { rows.push(cursor.value); cursor.continue(); } else resolve(rows);
      };
      req.onerror = () => reject(failure(req.error, 'list'));
    });
  }
  function write(rows, deletes, deleting = false) {
    if (!rows.length && !deletes.length) return Promise.resolve();
    return operate('readwrite', (store, tx, resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(failure(tx.error, deleting ? 'delete' : 'put'));
      tx.onabort = () => reject(failure(tx.error, deleting ? 'deleteAbort' : 'putAbort'));
      for (const id of deletes) store.delete(id);
      for (const row of rows) store.put(row);
    });
  }
  return {
    get: id => read(id, false), has: id => read(id, true), listPrefix,
    put: row => write([row], []), delete: id => write([], [id], true),
    putMany: (rows, deletes) => write(rows, deletes),
  };
}

// F3_39 control-side Wave renderer. Fixed records and existing C11 host only.
// All cold preparation is coalesced per AudioContext, outside an attack.
const __wave39Banks = new WeakMap();
const __wave39Empty = Object.freeze([]);
const __wave39BodyProfiles = new Map();
const __wave39GradientCache = [];
function __wave39Bank(ctx) {
  const existing = __wave39Banks.get(ctx);
  if (existing) return existing;
  const pending = new Promise((resolve, reject) => {
    if (typeof Worker === 'undefined') { reject(new Error('Wave bank worker unavailable')); return; }
    const workerSource = ire.replace('self.postMessage({type:"prepared",session:s.session,bank:e},[e.buffer])',
      'let lut=new Float64Array(65537);for(let i=0;i<lut.length;i++)lut[i]=Math.tanh(i*8/65536);self.postMessage({type:"prepared",session:s.session,bank:e,tanh:lut},[e.buffer,lut.buffer])');
    const url = URL.createObjectURL(new Blob([workerSource], {type:'text/javascript'}));
    let worker, settled=false;
    const finish=(error,data)=>{if(settled)return;settled=true;clearTimeout(timer);worker?.terminate();URL.revokeObjectURL(url);error?reject(error):resolve(data)};
    const timer=setTimeout(()=>finish(new Error('Wave bank preparation timed out')),10000);
    try {
      worker=new Worker(url,{type:'classic',name:'xensonar-wave-bank'});
      worker.onerror=e=>finish(new Error(e.message||'Wave bank worker failed'));
      worker.onmessageerror=()=>finish(new Error('Wave bank receipt failed'));
      worker.onmessage=e=>{
        const data=e.data;
        if(data?.type==='worker-ready')worker.postMessage({type:'prepare',session:1});
        else if(data?.type==='prepared' && data.bank instanceof Float32Array && data.bank.length===YF && data.tanh instanceof Float64Array && data.tanh.length===65537)finish(null,data);
        else if(data?.type==='fault')finish(new Error(String(data.message||data.reason)));
      };
    }catch(error){finish(error)}
  });
  __wave39Banks.set(ctx,pending);pending.catch(()=>__wave39Banks.delete(ctx));return pending;
}
function __wave39Owned(ctx) {
  const route=rg.get(ctx);
  return !!(route?.owned && route.waveEnabled!==false && route.host?.waveReady);
}
function __wave39Lease(input, profile, gain, options) {
  return {...options,acquireVoice:()=>{
    const plan=input.beginTransientEvent('wave',1,gain);
    return plan?NF(input.transientRuntime,plan,.64,[]):null;
  }};
}
function __wave39CompoundLease(runtime,count,intensity) {
  const tickets=[];
  let released=false;
  const release=()=>{if(released)return;released=true;for(const ticket of tickets)runtime.releaseVoice(ticket)};
  for(let i=0;i<count;i++){const ticket=runtime.admitVoice(runtime.beginEvent('wave',1,intensity),1);if(!ticket){release();return null}tickets.push(ticket)}
  return {release};
}
function __wave39Reserve(ctx, start, units) {
  const route=rg.get(ctx);if(!__wave39Owned(ctx))return null;
  if(!route.ready || !route.host.canSubmit)return false;
  const host=route.host,token=route.token++>>>0||(route.token=1),frame=Math.round(start*ctx.sampleRate);
  host.observeInputAge((ctx.currentTime-start)*1000);
  if(!host.tryReserveAttack(token,frame,units,1)){route.failed++;I0(ctx,route);return false;}
  return {route,host,token,frame,epoch:host.epoch};
}
class __wave39Encoder {
  u32=new Uint32Array(64);
  f32=new Float32Array(this.u32.buffer);
  begin(reservation, model, waveform, held, stopFrames, mask=0, immediate=false) {
    this.u32.fill(0);this.u32[0]=259|(immediate?65536:0);this.u32[1]=reservation.token;this.u32[2]=reservation.epoch;
    this.u32[3]=reservation.frame>>>0;this.u32[4]=Math.floor(reservation.frame/4294967296);
    this.u32[5]=model;this.u32[7]=waveform|(held?65536:0);this.u32[26]=stopFrames;this.u32[44]=mask;
    this.f32[45]=1e-4;this.f32[47]=1;this.f32[48]=1;this.f32[55]=1;return this;
  }
  set(slot,value){if(!Number.isFinite(value))throw new RangeError('Wave field '+slot);this.f32[slot]=value;return this;}
}
function __wave39Submit(reservation, onEnded, held, ctx, activeScheduledTonesRef, ticket) {
  const {route,host,token,epoch}=reservation;
  let cleanup=null,handle=null,finished=false;
  const end=()=>{if(finished)return;finished=true;handle?.end();if(cleanup)cleanup();else onEnded()};
  host.onFinished(token,end);
  if(!host.trySubmitRecord(route.waveEncoder.u32)){end();return false;}
  route.submitted++;I0(ctx,route);
  if(!finished){handle=__ent29HeldHandle(ctx,token,epoch);handle.backend='wave-c11-held';handle.holdOwner=held?'wave-sustain':undefined;handle.liveLengthOwner='wave';handle.ticket=ticket;
    cleanup=Xx({activeScheduledTonesRef,transientRuntime:{releaseVoice:onEnded},activeTone:handle,disconnect:()=>handle.end()});}
  return true;
}
function __wave39PlayTone(e, shape, intended) {
  if(!__wave39Owned(e.ctx))return null;
  const ctx=e.ctx,gradient=!shape.useScheduledTonePath,sr=ctx.sampleRate;
  // Keep the same bounded 20ms input deadline as VW. An ordinary direct
  // keyboard event is already a few milliseconds old when it reaches C11;
  // requiring its ORIGINAL timestamp to be >= currentTime drops valid notes.
  // Start is still clamped to currentTime + K3 below: no queue or late replay.
  if(!Jp(ctx,intended,.02))return false;
  const type={sine:0,triangle:1,sawtooth:2,square:3}[e.waveform];
  if(type===undefined)return false;
  const start=Math.max(intended,ctx.currentTime+K3);
  const reservation=__wave39Reserve(ctx,start,gradient?24:4);
  if(!reservation)return false;
  let ticket,released=false;
  const release=()=>{if(!released){released=true;e.transientRuntime.releaseVoice(ticket)}};
  try {
    ticket=e.wavePlan?e.transientRuntime.admitVoice(e.wavePlan,e.prominence):null;
    if(e.wavePlan&&!ticket){reservation.host.cancelUnsubmitted(reservation.token);return false;}
    const gainScale=ticket?.plan.gainScale??1,softening=ticket?.plan.envelopeScale??1;
    const targets=ticket?(e.waveTargetPrefixes&&e.transientRuntime.pickPreparedTargets?e.transientRuntime.pickPreparedTargets(e.waveTargetPrefixes,ticket):e.transientRuntime.pickTargets(e.waveTargets,ticket)):e.waveTargets;
    const mask=reservation.host.resolveAuxRouteMask(targets??[]);
    if(mask<0){reservation.host.cancelUnsubmitted(reservation.token);release();return false;}
    const host=reservation.host;
    if(e.mainOutput&&host.waveMainDestination!==e.mainOutput){
      if(host.waveMainDestination)try{host.node.disconnect(host.waveMainDestination,8,0)}catch{}
      host.node.connect(e.mainOutput,8,0);host.waveMainDestination=e.mainOutput;
    }
    const encoder=reservation.route.waveEncoder;
    if(gradient){
      const g=e.waveGradient,p=lAe({waveGradient:g,toneFreq:e.toneFreq,now:start,gradientDuration:shape.gradientDuration,shapedVolume:shape.shapedVolume,activeCount:e.activeScheduledTonesRef.current.length,heldLong:e.heldLong,gainScale,overloadSoftening:softening,attackSoftening:e.attackSoftening??1});
      encoder.begin(reservation,1,type,e.heldLong,Math.ceil((p.stopAt-start)*sr),mask|128)
        .set(8,e.toneFreq).set(9,shape.shapedCutoff).set(10,Math.max(280,shape.shapedCutoff*(.88+g.shine*.05))).set(11,shape.shapedResonance)
        .set(12,p.coreLevel).set(13,g.dryLateMul).set(14,p.actualDur*sr).set(15,(p.corePeakAt-start)*sr).set(16,(p.dryDuckAt-start)*sr)
        .set(17,p.colorLevel).set(18,p.colorDelay*sr).set(19,(p.colorPeakAt-start)*sr).set(20,g.exciterPreGain).set(21,g.exciterDrive).set(22,g.jawariDrive)
        .set(23,g.jawariQ).set(24,g.jawariGain).set(25,g.vowel1Q).set(27,g.vowel1Gain).set(28,g.vowel2Q).set(29,g.vowel2Gain).set(30,g.shineGain)
        .set(31,p.jawariStart).set(32,p.jawariPeak).set(33,p.jawariEnd).set(34,p.vowel1Start).set(35,p.vowel1Peak).set(36,p.vowel1End)
        .set(37,p.vowel2Start).set(38,p.vowel2Peak).set(39,p.vowel2End).set(40,p.shineHpStart).set(41,p.shineHpEnd)
        .set(46,Math.min(p.actualDur*.52,.19)*sr).set(47,.92);
    } else {
      const duration=shape.gradientDuration*(e.heldLong?6:1);
      const attack=Math.min(.032,Math.max(.005,duration*.18*softening));
      const release=Math.max(.01,Math.min(.14,Math.max(.03,duration*.42*softening))*.45);
      // Same safe-start and catch-up calculation as the old scheduled tone.
      const intendedPeak=intended+attack,actualPeak=start>=intendedPeak?start+.0035:intendedPeak;
      encoder.begin(reservation,0,type,e.heldLong,Math.ceil((duration+release+.08)*sr),mask|128)
        .set(8,e.toneFreq).set(9,shape.shapedCutoff).set(11,shape.shapedResonance).set(12,Math.max(2e-4,shape.shapedVolume*gainScale))
        .set(14,duration*sr).set(15,(actualPeak-start)*sr).set(42,duration*sr).set(43,release*sr);
    }
    return __wave39Submit(reservation,release,e.heldLong,ctx,e.activeScheduledTonesRef,ticket);
  }catch(error){reservation.host.cancelUnsubmitted(reservation.token);if(ticket)release();return false;}
}
function __wave39Scheduled(e,t) {
  const held=t.options?.heldLong===true||e.heldLong===true;
  const plan=t.options?.plan??e.transientRuntime.beginEvent('wave',1,t.volume);
  return __wave39PlayTone({ctx:e.ctx,toneFreq:t.freq,waveform:t.type,wavePlan:plan,prominence:t.options?.prominence??1,
    mainOutput:e.getMainOutput?.(e.ctx),waveTargets:ZMe(t.targetDestinations),heldLong:held,activeScheduledTonesRef:e.activeScheduledTonesRef,transientRuntime:e.transientRuntime},
    {useScheduledTonePath:true,gradientDuration:t.dur,shapedVolume:t.volume,shapedCutoff:t.cutoff??2400,shapedResonance:t.q??1},
    t.options?.intendedStartTimeSec??e.ctx.currentTime+t.offset);
}
function __wave39Body(e, profile, frequency, gain, options) {
  if(!__wave39Owned(e.audioCtx))return null;
  const ctx=e.audioCtx,route=rg.get(ctx),sr=ctx.sampleRate;
  const modal=e.modal.modes[1]?.freq??e.modal.modes[0]?.freq??frequency;
  const coupling=.28+e.controls.coupling*.72;
  const scaled=Me(gain*Me(options?.bodyScale??1,0,1.25),0,1.4);
  if(scaled<=.001)return false;
  if(route.host.waveBodyDestination!==e.destination){
    if(route.host.waveBodyDestination)try{route.host.node.disconnect(route.host.waveBodyDestination,7,0)}catch{}
    route.host.node.connect(e.destination,7,0);route.host.waveBodyDestination=e.destination;
  }
  const emit=(waveform,freq,level,delay,tail,filterFreq=freq)=>{
    if(waveform===4&&!route.host.waveNoiseReady)return false;
    const immediate=delay===0,start=ctx.currentTime+delay;
    const reservation=__wave39Reserve(ctx,start,8);if(!reservation)return false;
    let ticket,released=false;
    const release=()=>{if(!released){released=true;ticket?.release()}};
    try{
      ticket=options?.acquireVoice?.();if(options?.acquireVoice&&!ticket){reservation.host.cancelUnsubmitted(reservation.token);return false;}
      const peak=Math.max(2e-4,level*(ticket?.gainScale??1));
      route.waveEncoder.begin(reservation,2,waveform,false,Math.ceil((profile.duration+tail)*sr),64,immediate)
        .set(8,freq).set(12,peak).set(49,s2(filterFreq*.78+modal*.22,70,6200)).set(50,profile.q)
        .set(51,profile.highpassHz).set(52,profile.lowpassHz).set(53,profile.attack*sr).set(54,profile.duration*sr);
      const result=__wave39Submit(reservation,release,false,ctx,null,null);
      if(result)e.recordAudioPressureCount('room3-body-exciter',waveform===4?'buffer-source-start':'oscillator-start',1);
      return result;
    }catch(error){reservation.host.cancelUnsubmitted(reservation.token);release();return false;}
  };
  const count=Math.min(profile.voices.length,Math.max(1,options?.voiceBudget??profile.voices.length));
  for(let i=0;i<count;i++){
    const voice=profile.voices[i],base=s2(frequency*voice.ratio,50,4200),pitch=base*2**((voice.detuneCents??0)/1200);
    emit({sine:0,triangle:1,sawtooth:2,square:3}[voice.type],pitch,scaled*coupling*profile.bodyGain*voice.gain,voice.delay??0,.06,base);
  }
  if(profile.noiseGain>0&&e.noiseBuffer)emit(4,modal*1.4,scaled*coupling*profile.bodyGain*profile.noiseGain,0,.04);
  return true; // Owned, including rejection. Never rebuild a legacy graph.
}
function __wave39WarmNoise(ctx,buffer) {
  const route=rg.get(ctx),host=route?.host;
  if(!buffer||!host?.waveReady||host.waveNoiseBuffer===buffer||buffer.length>192000)return;
  const data=buffer.getChannelData(0).slice();host.waveNoiseBuffer=buffer;
  host.node.port.postMessage({type:'WAVE_NOISE',samples:data},[data.buffer]);
}

// F3.29: use existing color voices/body filter; no extra per-note WebAudio graph.
function __ent29Gradient(spec, gradient) {
  if (!gradient || !Number.isFinite(gradient.amount) || gradient.amount <= 0) return spec;
  const wire=Wn(Number.isFinite(gradient.wire)?gradient.wire:0,0,1);
  const shine=Wn(Number.isFinite(gradient.shine)?gradient.shine:0,0,1);
  if (wire===0 && shine===0) return spec;
  // Keep the selected color interval family, shifting its upper colors farther.
  for (let i=0;i<spec.colorFreqs.length;i++) {
    spec.colorFreqs[i]=Wn(spec.colorFreqs[i]*Math.pow(2,(i+1)*(wire*.12+shine*.38)),10,24000);
    spec.colorGains[i]*=1+wire*(.8-i*.1)+shine*(1.3+i*.4);
  }
  // Shape the dominant path as well as its quieter color voices.
  spec.filterFreq=Wn(spec.filterFreq*Math.pow(2,1.45*(shine-wire)),40,19000);
  spec.drive=Wn(spec.drive+wire*.65+shine*.28,0,8);
  spec.filterEnvAmount=Wn(spec.filterEnvAmount+shine*.22+wire*.06,0,2);
  spec.filterQ=Wn(spec.filterQ+wire*1.1+shine*.45,.1,26);
  const bodyBase=Math.max(80,spec.tunedFreq*1.5);
  const bodyTarget=Wn((gradient.jawariFreqStart*(wire/(wire+shine))+
    gradient.vowel2Start*(shine/(wire+shine)))*Math.pow(Wn(spec.tunedFreq/220,.5,4),.08),80,19000);
  spec.gradientBodyFreq=Wn(bodyBase*Math.pow(bodyTarget/bodyBase,Wn(gradient.amount,0,1)),80,19000);
  spec.gradientBodyQ=Wn(3.2+wire*2.8+shine*1.2,.1,12);
  spec.gradientBodyGain=.08+spec.reverbAmount*.14+spec.colorAmount*.04+wire*.10+shine*.16;
  return spec;
}

function __ent29HeldHandle(ctx, token, epoch) {
  let released=false, ended=false,cut=false;
  const send=(op,changes={})=>{
    const route=rg.get(ctx),host=route?.host;
    if(ended || !route?.ready || !route.owned || !host?.canSubmit ||
      host.epoch!==epoch || host.reservations.find(token)<0 || !host.node?.port) return false;
    const pitch=changes.pitchMul??1,gain=changes.gainMul??1,rampSec=changes.rampSec??.012;
    if(!Number.isFinite(pitch)||pitch<.125||pitch>8||!Number.isFinite(gain)||gain<0||gain>4||
      !Number.isFinite(rampSec)||rampSec<0||rampSec>1) return false;
    try {host.node.port.postMessage({type:'ENTROPHON_CONTROL',token,epoch,op,pitch,gain,
      ramp:Math.round(rampSec*ctx.sampleRate),releaseFrames:Math.max(1,Math.round((changes.releaseSec??.18)*ctx.sampleRate))});return true;}
    catch {host.panic();return false;}
  };
  const handle={
    backend:'entrophon-c11-held',token,epoch,holdOwner:'wave-sustain',
    release(){if(released||ended)return false;released=true;return send(2)},
    cut(){if(cut||ended)return false;cut=true;released=true;return send(2,{releaseSec:.003})},
    update(changes){return !released&&!ended&&send(1,changes)},
    end(){ended=true}
  };
  return handle;
}


// F3.28: processing ownership and audible admission are separate contracts.
const __entResults = Object.freeze({
  admitted: Object.freeze({handled:true, admitted:true, reason:"submitted"}),
  legacy: Object.freeze({handled:true, admitted:true, reason:"legacy"}),
  invalid: Object.freeze({handled:true, admitted:false, reason:"invalid"}),
  stale: Object.freeze({handled:true, admitted:false, reason:"target-past"}),
  ingress: Object.freeze({handled:true, admitted:false, reason:"ingress-full"}),
  pressure: Object.freeze({handled:true, admitted:false, reason:"voice-budget"}),
  failed: Object.freeze({handled:true, admitted:false, reason:"owned-rejected"})
});
function __entResult(t, key, legacyHandled = false) {
  const result = __entResults[key];
  return t.options?.admissionResult === true ? result : result.admitted || legacyHandled;
}
function __entWasAdmitted(result) {
  return result === true || result?.admitted === true;
}
function __entLeadFrames(ctx) {
  // Same 5.333 ms as F3.27 at 48 kHz; no extra attack latency or catch-up queue.
  return Math.max(1, Math.round(ctx.sampleRate * (256 / 48000)));
}
function __entTargetFrame(ctx, intendedStart) {
  return Math.round(intendedStart * ctx.sampleRate) + __entLeadFrames(ctx);
}
function __entTargetIsCurrent(ctx, intendedStart) {
  const target = __entTargetFrame(ctx, intendedStart);
  return Number.isSafeInteger(target) && target >= Math.round(ctx.currentTime * ctx.sampleRate);
}
function __entCanPrepare(ctx, held, explicitEntrophon = false) {
  if (!explicitEntrophon && !Hd()) return true;
  const route = rg.get(ctx);
  if (!route?.owned) return true;
  const host = route.host;
  // Coarse reflex gate only. Each actual voice still takes its own reservation.
  return !!(route.ready && host?.canSubmit && host.writer &&
    host.writer.availableRecords > host.building &&
    host.reservations.usedVoices < host.reservations.voiceLimit &&
    host.reservations.usedUnits < host.reservations.unitLimit);
}
const __entConfigCache = new WeakMap();
function __entPreparedConfig(config,surface='wave') {
  let family=__entConfigCache.get(config),prepared=family?.[surface];
  if(prepared)return prepared;
  const count=Math.max(1,Math.min(6,Math.round(config.unison))),unison=[];
  for(let i=0;i<count;i++){
    const cents=count===1?0:config.unisonSpread>0?
      Zie(i,count,config.detune,config.unisonSpread):(i-(count-1)/2)*config.detune;
    unison.push(Math.pow(2,cents/1200));
  }
  const colorSet=config.colorSet==='default'?null:Wie[config.colorSet];
  const colorRatios=colorSet?colorSet.ratios:surface==='particle'?[Math.pow(2,6/19),Math.pow(2,11/19),.5]:
    surface==='spectral'?[2,Math.pow(2,31/53),Math.pow(2,7/53)]:[.5,Math.pow(2,19/31),Math.pow(2,7/31)];
  const colorLevel=config.enabled?config.colorAmount*config.engineAmount:0;
  const colorGains=(colorSet?colorSet.gains:surface==='particle'?[.36,.22,.12]:surface==='spectral'?[.26,.18,.12]:[.24,.2,.14]).map(g=>g*colorLevel);
  prepared={unison,colorRatios,colorGains};
  if(!family){family=Object.create(null);__entConfigCache.set(config,family);}
  family[surface]=prepared;return prepared;
}

// F3_41 visual donor workbench. Analysis is immutable; manual annotations are independent.
// F3-47: selection edges are not evidence of an attack.
function __F347OnsetEvidence(samples,sampleRate,start,length){
 const block=Math.max(32,Math.round(sampleRate*.005)),end=Math.min(samples.length,start+length),levels=[];
 const rms=(a,b)=>{let sum=0;for(let i=Math.max(0,a);i<Math.min(samples.length,b);i++){const x=samples[i];if(Number.isFinite(x))sum+=x*x;}return Math.sqrt(sum/Math.max(1,Math.min(samples.length,b)-Math.max(0,a)));};
 for(let a=start;a<end;a+=block)levels.push(rms(a,Math.min(end,a+block)));
 const sorted=[...levels].sort((a,b)=>a-b),reference=sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.8))]??0;
 if(!(reference>1e-7))return {version:'onset-evidence-f347',kind:'uncertain',confidence:0,startSec:0,endSec:0,reason:"Level too low to estimate an onset."};
 const ratio=levels.map(x=>x/reference),lookback=Math.min(start,block*6),before=lookback>=block*2?rms(start-lookback,start)/reference:null;
 const initial=ratio.slice(0,Math.min(4,ratio.length)),initialLevel=initial.reduce((a,b)=>a+b,0)/Math.max(1,initial.length);
 // An already present tone may vary, but no entrance is asserted at its cut edge.
 if(initialLevel>=.55&&(before===null||before>=.4))return {version:'onset-evidence-f347',kind:'selection-boundary',confidence:before===null?.55:.9,startSec:0,endSec:0,preLevel:before,reason:before===null?"Sound is already present at the selection boundary; its onset was not observed.":"Sound is already active before and at the selection boundary."};
 let peakIndex=ratio.findIndex(x=>x>=.7);if(peakIndex<0)peakIndex=ratio.indexOf(Math.max(...ratio));
 let lowIndex=peakIndex;while(lowIndex>0&&ratio[lowIndex-1]>.15)lowIndex--;
 const riseSec=Math.max(0,(peakIndex-lowIndex)*block/sampleRate);
 const prior=lowIndex>0?ratio[lowIndex-1]:before;
 const observedLow=prior!==null&&prior<=.2||lowIndex===0&&ratio[0]<=.2;
 if(!observedLow)return {version:'onset-evidence-f347',kind:'uncertain',confidence:.3,startSec:0,endSec:0,preLevel:before,reason:"No sufficient level rise was observed at the boundary."};
 const startSec=lowIndex*block/sampleRate,endSec=Math.min(length/sampleRate,(peakIndex+1)*block/sampleRate);
 const sharp=riseSec<=.04;
 return {version:'onset-evidence-f347',kind:sharp?'transient':'level-rise',confidence:Math.min(.95,.65+(1-Math.min(1,prior??ratio[0]))*.25),startSec,endSec,riseSec,preLevel:before,reason:sharp?"Brief measured level rise; possible attack.":"Gradual level rise; no sharp attack."};
}

function __F347OnsetText(body){
 const e=body?.onsetEvidence;
 if(!e)return "No onset estimate available.";
 if(e.kind==='transient')return "Possible attack · "+(e.startSec*1000).toFixed(0)+'–'+(e.endSec*1000).toFixed(0)+' ms · '+(e.confidence*100).toFixed(0)+' % Evidenz';
 if(e.kind==='level-rise')return "Gradual Onset · "+(e.endSec*1000).toFixed(0)+" ms · no sharp attack";
 return (e.kind==='selection-boundary'?"Sound Already Present at Selection Boundary":"Onset Undetermined")+" · no attack claimed";
}

// Planner and renderer share this exact rule; the limits are PCM containment, not timbre labels.
function __F347FilmSize(model,runs,sampleRate,params){
 const base=__ForgeF33.spectralFilmSize(model,runs,sampleRate);
 const factor=2**Math.round(Math.log2(params.detail??1));
 if((params.windowStrategy??'capacity')==='capacity')return Math.max(32,base*factor);
 let desiredMs=params.windowMs??35;
 if(params.windowStrategy==='structure'){
  const frames=(model.workbenchAnalysis?.frames??[]).filter(f=>runs.some(r=>f.timeSec*model.sampleRate>=r.sourceStart&&f.timeSec*model.sampleRate<=r.sourceEnd));
  let changes=0,count=0;
  for(let i=1;i<frames.length;i++){const a=frames[i-1],b=frames[i],ae=a.formantEnvelope??[],be=b.formantEnvelope??[];let d=0,n=0;for(let k=0;k<Math.min(ae.length,be.length);k++){d+=Math.abs(ae[k]-be[k]);n++;}changes+=Math.abs(b.relativeLevel-a.relativeLevel)+Math.abs(b.aperiodicity-a.aperiodicity)+(n?d/n:0);count++;}
  const flux=count?changes/count:0;
  const pitches=frames.filter(f=>f.f0Hz>35&&f.pitchConfidence>=.55).map(f=>f.f0Hz).sort((a,b)=>a-b),f0=pitches[Math.floor(pitches.length/2)]??0;
  desiredMs=Math.max(12,Math.min(85,(f0?4000/f0:45)/(1+Math.min(2,flux*5))));
 }
 const requested=2**Math.round(Math.log2(sampleRate*desiredMs/1000));
 return Math.max(32,Math.min(base,requested)*factor);
}

/* F3.56.22 · Forge UI-only boundaries. No storage or audio ownership changes. */
function __f35622LibraryPagination(items,filter,page){
const matches=items.filter(x=>(x.name+' '+x.sourceLabel+' '+(x.tags??[]).join(' ')).toLocaleLowerCase().includes(filter.toLocaleLowerCase().trim()));
 const pageSize=8,pageCount=Math.max(1,Math.ceil(matches.length/pageSize)),safePage=Math.min(page,pageCount-1),visible=matches.slice(safePage*pageSize,(safePage+1)*pageSize);
 return {matches,pageCount,safePage,visible};
}
function __f35622LibraryView({runtime,route,items,loaded,filter,setFilter,name,setName,message,saving,busy,active,apply,save,favorite,matches,pageCount,safePage,visible,setPage}){
 return u.jsxs('section',{className:'f347-library f348-library','data-f347-donor-library':'true','aria-label':"Donor Library",children:[
  u.jsxs('div',{className:'f347-library-heading',children:[u.jsxs('div',{children:[u.jsx('h3',{children:"01 · Donor Library"}),u.jsx('p',{children:"Load saved audio selections. The carrier figure is preserved when switching donors."})]}),u.jsx('span',{className:'f341-muted',children:loaded?items.length+' saved selections':"Loading library …"})]}),
  u.jsxs('div',{className:'f347-library-tools',children:[u.jsx('input',{'aria-label':"Search Workshop Library",placeholder:"Search name, file or tag",value:filter,onChange:e=>{setFilter(e.currentTarget.value);setPage(0)}}),u.jsx('input',{'aria-label':"Name Audio Selection",placeholder:"Name Audio Selection",value:name,maxLength:100,onChange:e=>setName(e.currentTarget.value)}),u.jsx('button',{type:'button',disabled:busy||!runtime.model||!name.trim(),onClick:()=>void save(),children:saving?"Saving …":"Save Audio Selection"})]}),
  loaded&&!matches.length?u.jsx('p',{className:'f341-muted',children:items.length?"No matching entries.":"No saved audio selections for this browser origin yet. You can save a loaded selection here."}):null,
  u.jsx('div',{className:'f347-library-items',children:visible.map(item=>u.jsxs('div',{className:'f347-library-item f348-library-item','aria-current':active===item.id,children:[u.jsxs('div',{children:[u.jsx('strong',{title:item.name,children:item.name}),u.jsx('small',{title:item.sourceLabel,children:item.sourceLabel+' · '+Number(item.selectionStartSec).toFixed(2)+'–'+Number(item.selectionStartSec+item.selectionDurationSec).toFixed(2)+' s'+(item.tags?.length?' · '+item.tags.join(', '):'')})]}),u.jsx('button',{type:'button','aria-label':(item.favorite?'Remove favorite: ':'Mark as favorite: ')+item.name,disabled:busy,onClick:()=>void favorite(item),children:item.favorite?'★':'☆'}),u.jsx('button',{type:'button',disabled:busy,'aria-label':(active===item.id?'Reload: ':'Load donor: ')+item.name,onClick:()=>void apply(item.id),children:active===item.id?'Reload':'Load donor'})]},item.id))}),
  pageCount>1?u.jsxs('nav',{className:'f348-library-pages','aria-label':'Bibliotheksseiten',children:[u.jsx('span',{children:(safePage+1)+' / '+pageCount+' · '+matches.length+' Treffer'}),u.jsx('button',{type:'button','aria-label':'Vorherige Bibliotheksseite',disabled:safePage===0,onClick:()=>setPage(n=>Math.max(0,n-1)),children:"‹ Back"}),u.jsx('button',{type:'button','aria-label':"Next library page",disabled:safePage>=pageCount-1,onClick:()=>setPage(n=>Math.min(pageCount-1,n+1)),children:'Weiter ›'})]}):null,
  busy&&!saving?u.jsxs('p',{role:'status',children:[route.message||"Analyzing donor …",' ',u.jsx('button',{type:'button',onClick:()=>__ForgeDonorRoutingF317.cancel(),children:"Cancel"})]}):null,
  message?u.jsx('p',{role:'status',children:message}):null,
  u.jsxs('details',{className:'f348-library-help',children:[u.jsx('summary',{children:"What data are stored here?"}),u.jsx('p',{className:'f341-muted',children:"Library = audio + selection. Recipe preset = transfer controls. Donor variant = controls + markings for this particular selection."})]})
 ]});
}
function __f35622WorkbenchDock({showLibrary,showRack,setShowLibrary,setShowRack,action}){
 return (showLibrary||showRack)?u.jsxs('aside',{className:'f349-library-dock f351-side-dock','aria-label':"Donor Library & Combination Rack",children:[
  showLibrary?u.jsxs('section',{id:'f351-library-panel',className:'f351-side-card f351-library-card',children:[u.jsxs('div',{className:'f351-card-bar',children:[u.jsx('span',{children:"01 / SOUND MATERIAL"}),action("Collapse",()=>setShowLibrary(false),false,{'aria-label':"Collapse Donor Library"})]}),u.jsx(__F347Library,{})]}):null,
  showRack?u.jsxs('section',{id:'f351-combination-panel',className:'f351-side-card f351-rack-card',children:[u.jsxs('div',{className:'f351-card-bar',children:[u.jsx('span',{children:'02 / KLANGKOMBINATION'}),action("Collapse",()=>setShowRack(false),false,{'aria-label':"Collapse Combination Rack"})]}),u.jsx(__F351CombinationRack,{})]}):null
 ]}):null;
}
function __F347Library(){
 const runtime=cU(),route=P.useSyncExternalStore(__ForgeDonorRoutingF317.subscribe,__ForgeDonorRoutingF317.getSnapshot,__ForgeDonorRoutingF317.getSnapshot);
 const [items,setItems]=P.useState([]),[loaded,setLoaded]=P.useState(false),[filter,setFilter]=P.useState(''),[name,setName]=P.useState(''),[message,setMessage]=P.useState(''),[saving,setSaving]=P.useState(false),[page,setPage]=P.useState(0),alive=P.useRef(false);
 P.useEffect(()=>{alive.current=true;let serial=0;const refresh=async()=>{const n=++serial;try{const list=await __DonorLibraryF36.donorLibrary.list();if(alive.current&&n===serial){setItems(list);setLoaded(true);}}catch(e){if(alive.current){setLoaded(true);setMessage("Could not read library: "+(e.message??e));}}};void refresh();window.addEventListener('xensonar:donor-library-changed',refresh);return()=>{alive.current=false;serial++;window.removeEventListener('xensonar:donor-library-changed',refresh);};},[]);
 P.useEffect(()=>{setName((runtime.source?.fileName??'').replace(/\.[^.]+$/,''));},[runtime.source]);
 const busy=saving||route.phase!=='idle'||runtime.phase==='analyzing',active=__ForgeDonorRoutingF317.activeId();
 const apply=async id=>{setMessage('');__ForgeDonorRoutingF317.setDraft(id);try{await new Promise((resolve,reject)=>{const req={id,resolve,reject,handled:false};window.dispatchEvent(new CustomEvent('xensonar:forge:apply-library-donor',{detail:req}));if(!req.handled)reject(Error("Please open the Forge Sound Material panel; the library interface is not ready yet."));});if(alive.current)setMessage("Donor loaded and activated for the figure. The sound material has been reanalyzed.");}catch(e){if(alive.current&&e.name!=='AbortError')setMessage("Could not load donor: "+(e.message??e));}};
 const save=async()=>{if(busy||!runtime.source)return;setSaving(true);setMessage('');try{const s=runtime.source;await __DonorLibraryF36.donorLibrary.save(name,'',{source:{label:s.fileName,durationSec:s.originalDuration,sampleRate:s.sampleRate,channelCount:s.channelCount,sourceAsset:s},selection:{fineLoopRange:{startSec:s.importStartSec,durationSec:s.importDurationSec},detailViewport:{startSec:s.importStartSec,durationSec:s.importDurationSec}},readMode:s.projectionReadMode??'hybrid',sourceAdapterId:'local-file'});window.dispatchEvent(new Event('xensonar:donor-library-changed'));if(alive.current)setMessage("Audio selection saved to the Donor Library. Transfer recipes are saved separately below.");}catch(e){if(alive.current)setMessage("Save failed: "+(e.message??e));}finally{if(alive.current)setSaving(false);}};
 const favorite=async item=>{try{await __DonorLibraryF36.donorLibrary.favorite(item.id,!item.favorite);window.dispatchEvent(new Event('xensonar:donor-library-changed'));}catch(e){if(alive.current)setMessage(e.message??String(e));}};
 const {matches,pageCount,safePage,visible}=__f35622LibraryPagination(items,filter,page);
 return __f35622LibraryView({runtime,route,items,loaded,filter,setFilter,name,setName,message,saving,busy,active,apply,save,favorite,matches,pageCount,safePage,visible,setPage});
}

function __F347Memory(){
 const [state,setState]=P.useState(()=>__ForgeF33.experimentStatePersistenceStatus());
 P.useEffect(()=>{const refresh=()=>setState(__ForgeF33.experimentStatePersistenceStatus());refresh();const timer=setInterval(refresh,800);return()=>clearInterval(timer);},[]);
 const time=state.lastSavedAt||state.lastRestoredAt;
 const text=state.restoring?"Browser storage: loading saved state …":state.lastError?"Browser storage: "+state.lastError+(state.protectingSavedState?" · existing state remains protected.":''):state.lastSavedAt?"Browser storage: state saved · "+new Date(time).toLocaleTimeString():state.lastRestoredAt?"Browser storage: state restored":state.restoreComplete?"Browser storage: autosave enabled":"Checking browser storage …";
 return u.jsxs('div',{className:'f347-memory',role:'status','data-f347-memory':'true',children:[u.jsx('span',{children:text}),u.jsx('button',{type:'button',disabled:state.restoring||!state.restoreComplete||state.protectingSavedState,onClick:async()=>{await __f333Persistence?.saveNow();setState(__ForgeF33.experimentStatePersistenceStatus());},children:"Save Current State"}),state.protectingSavedState?u.jsx('button',{type:'button',disabled:state.restoring,onClick:async()=>{await __f333Persistence?.restore();setState(__ForgeF33.experimentStatePersistenceStatus());},children:"Reload Saved State"}):null]});
}

// F3-50. Pure offline donor module. Original PCM is the source of every grain.
// The carrier controls timing, gain and voiced pitch; it never masks the source spectrum.
// F3-50. Pure offline donor module. Original PCM is the source of every grain.
// The carrier controls timing, gain and voiced pitch; it never masks the source spectrum.
var __F350Donor=(()=>{
 const VERSION='donor-state-analysis-f3.55';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
 const yieldTask=()=>new Promise(r=>setTimeout(r,0));
 const check=o=>{if(o?.isCancelled?.())throw new DOMException('Donor-Berechnung abgebrochen.','AbortError');};
 const cache=new WeakMap();
 function fft(re,im,inverse=false){
  const n=re.length;
  for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
  for(let s=2;s<=n;s*=2){const angle=(inverse?2:-2)*Math.PI/s,cs=Math.cos(angle),sn=Math.sin(angle);
   for(let a=0;a<n;a+=s){let wr=1,wi=0;for(let k=0;k<s/2;k++){const x=a+k,y=x+s/2,tr=re[y]*wr-im[y]*wi,ti=re[y]*wi+im[y]*wr;re[y]=re[x]-tr;im[y]=im[x]-ti;re[x]+=tr;im[x]+=ti;const w=wr*cs-wi*sn;wi=wr*sn+wi*cs;wr=w;}}}
  if(inverse)for(let i=0;i<n;i++){re[i]/=n;im[i]/=n;}
 }
 function pitch(samples,sr,center){
  // A low-pass decimated autocorrelation, with the first strong local maximum
  // preferred over its octave/subharmonic. A noisy source can stay unpitched.
  const stride=Math.max(1,Math.floor(sr/10000)),rate=sr/stride,n=Math.round(rate*.055),a=new Float64Array(n);
  const start=Math.round(center-n*stride/2);let mean=0;
  for(let i=0;i<n;i++){let v=0,count=0;for(let j=0;j<stride;j++){const at=start+i*stride+j;if(at>=0&&at<samples.length){v+=samples[at];count++;}}a[i]=count?v/count:0;mean+=a[i];}mean/=n;
  for(let i=0;i<n;i++)a[i]-=mean;
  const lo=Math.max(3,Math.floor(rate/1600)),hi=Math.min(Math.floor(n*.55),Math.ceil(rate/45)),corr=new Float64Array(hi+1);
  let maximum=0;
  for(let lag=lo;lag<=hi;lag++){let xy=0,xx=0,yy=0;for(let i=0;i<n-lag;i++){xy+=a[i]*a[i+lag];xx+=a[i]*a[i];yy+=a[i+lag]*a[i+lag];}corr[lag]=xy/Math.sqrt(Math.max(1e-30,xx*yy));maximum=Math.max(maximum,corr[lag]);}
  if(maximum<.57)return {hz:0,confidence:Math.max(0,maximum)};
  let best=-1;for(let k=lo+1;k<hi;k++)if(corr[k]>=Math.max(.57,maximum*.89)&&corr[k]>=corr[k-1]&&corr[k]>corr[k+1]){best=k;break;}
  if(best<0)return {hz:0,confidence:maximum};
  const delta=clamp(.5*(corr[best-1]-corr[best+1])/(corr[best-1]-2*corr[best]+corr[best+1]||1),-.5,.5);
  return {hz:rate/(best+delta),confidence:clamp(corr[best],0,1)};
 }
 async function prepare(samples,sr,options={}){
  check(options);
  if(!(sr>=8000&&sr<=192000)||samples.length<128||samples.length>sr*8.01)throw Error("Donor grains require a selection between 128 samples and 8 seconds.");
  const pcm=new Float32Array(samples.length),prefix=new Float64Array(samples.length+1);let mean=0;
  for(let i=0;i<samples.length;i++)mean+=Number.isFinite(samples[i])?samples[i]:0;mean/=samples.length;
  for(let i=0;i<pcm.length;i++){pcm[i]=(Number.isFinite(samples[i])?samples[i]:0)-mean;prefix[i+1]=prefix[i]+pcm[i]*pcm[i];}
  const hop=Math.max(1,Math.round(sr*.020)),radius=Math.max(64,Math.round(sr*.025)),nodes=[];
  const fftSize=2**Math.ceil(Math.log2(Math.min(4096,Math.max(512,sr*.045))));
  const re=new Float64Array(fftSize),im=new Float64Array(fftSize);let maxRms=0;
  for(let c=0;c<pcm.length;c+=hop){
   check(options);const a=Math.max(0,c-radius),b=Math.min(pcm.length,c+radius),rms=Math.sqrt((prefix[b]-prefix[a])/Math.max(1,b-a));maxRms=Math.max(maxRms,rms);
   const p=pitch(pcm,sr,c);re.fill(0);im.fill(0);
   for(let j=0;j<fftSize;j++)re[j]=(pcm[c+j-Math.floor(fftSize/2)]??0)*(.5-.5*Math.cos(2*Math.PI*j/(fftSize-1)));fft(re,im);
   const env=new Array(32).fill(0),peaks=[];let energy=0,logPower=0,centroid=0;
   for(let k=1;k<fftSize/2;k++){const hz=k*sr/fftSize,power=re[k]*re[k]+im[k]*im[k];energy+=power;logPower+=Math.log(power+1e-24);centroid+=power*hz;const band=clamp(Math.floor(Math.log(Math.max(40,hz)/40)/Math.log(sr*.48/40)*32),0,31);env[band]+=power;if(k>1&&k<fftSize/2-1&&power>re[k-1]**2+im[k-1]**2&&power>=re[k+1]**2+im[k+1]**2)peaks.push({hz,amplitude:Math.sqrt(power)});}
   const flatness=Math.exp(logPower/Math.max(1,fftSize/2-1))/Math.max(1e-24,energy/(fftSize/2-1));
   const sum=env.reduce((s,x)=>s+x,0);for(let j=0;j<32;j++)env[j]=Math.sqrt(env[j]/Math.max(1e-24,sum));
   peaks.sort((a,b)=>b.amplitude-a.amplitude);
   nodes.push({id:nodes.length,center:c,timeSec:c/sr,rms,f0Hz:p.hz,pitchConfidence:p.confidence,aperiodicity:p.hz?clamp(1-p.confidence+Math.sqrt(flatness)*.4,0,1):1,centroidHz:centroid/Math.max(1e-24,energy),formantEnvelope:env,harmonicAmplitudes:[],spectralPeaks:peaks.slice(0,12),role:'sustain',attackStart:null,attackEnd:null});
   if(nodes.length%6===0){options.onProgress?.(.8*c/pcm.length);await yieldTask();}
  }
  if(maxRms<1e-7)throw Error("The donor selection contains no usable audio signal.");
  const active=nodes.filter(n=>n.rms>maxRms*.005),logs=active.map(n=>Math.log(Math.max(1e-9,n.rms))).sort((a,b)=>a-b);
  const low=logs[Math.floor((logs.length-1)*.06)],high=logs[Math.floor((logs.length-1)*.94)];
  const attacks=[];let lastAttack=-sr;
  for(let i=0;i<nodes.length;i++){
   const n=nodes[i];n.relativeLevel=n.rms/maxRms;n.level=high-low>.08?clamp((Math.log(Math.max(1e-9,n.rms))-low)/(high-low),0,1):.5;
   const prev=nodes[Math.max(0,i-1)],before=nodes[Math.max(0,i-2)];
   // A sounding selection boundary is never invented as an attack.
   if(i>=2&&n.center-lastAttack>sr*.12&&n.rms>maxRms*.12&&n.rms>Math.max(maxRms*.025,before.rms)*2.2&&n.rms>prev.rms*1.12){
    const block=Math.max(16,Math.round(sr*.003)),from=Math.max(0,before.center-radius),to=Math.min(pcm.length,n.center+radius),env=[];
    for(let x=from;x+block<=to;x+=block)env.push({x,rms:Math.sqrt((prefix[x+block]-prefix[x])/block)});
    let transition=null;
    for(let k=3;k<env.length;k++){const left=env[k-3].rms,right=env[k].rms;if(right>maxRms*.14&&right>Math.max(maxRms*.025,left)*2.1){transition={start:Math.max(from,env[k-3].x),end:Math.min(pcm.length,env[k].x+sr*.035)};break;}}
    if(transition){attacks.push({...transition,confidence:clamp((n.rms-before.rms)/n.rms,0,1)});lastAttack=n.center;}
   }
  }
  for(const n of nodes){const attack=attacks.find(a=>n.center>=a.start&&n.center<=a.end);if(attack){n.role='attack';n.attackStart=attack.start;n.attackEnd=attack.end;}else if(n.relativeLevel<.10)n.role='quiet';else if(n.id>1&&n.rms<nodes[n.id-2].rms*.72)n.role='release';}
  // Local marks follow local fundamental, including vibrato. No mark clock is
  // invented in unvoiced regions, and source marks never cross an excluded span.
  const filtered=new Float32Array(pcm.length);let lp=0,lp2=0;
  for(let i=0;i<pcm.length;i++){const n=nodes[Math.min(nodes.length-1,Math.round(i/hop))],hz=n.f0Hz||200,pole=1-Math.exp(-2*Math.PI*Math.min(2000,hz*1.3)/sr);lp+=pole*(pcm[i]-lp);lp2+=pole*(lp-lp2);filtered[i]=lp2;}
  const marks=[];let at=0;
  while(at<pcm.length-2){const n=nodes[Math.min(nodes.length-1,Math.round(at/hop))];if(!(n.f0Hz>0&&n.pitchConfidence>.60)){at+=hop;continue;}const period=sr/n.f0Hz,pred=at+period,a=Math.max(Math.floor(at+period*.70),Math.round(pred-period*.22)),b=Math.min(pcm.length-2,Math.round(pred+period*.22));if(a>b)break;let best=a;for(let j=a+1;j<=b;j++)if(filtered[j]>filtered[best])best=j;const off=clamp(.5*(filtered[best-1]-filtered[best+1])/(filtered[best-1]-2*filtered[best]+filtered[best+1]||1),-.5,.5);at=best+off;marks.push(at);}
  const pitches=active.filter(n=>n.f0Hz>0&&n.pitchConfidence>.60).map(n=>n.f0Hz).sort((a,b)=>a-b),referenceHz=pitches[Math.floor(pitches.length/2)]||220;
  const voiced=active.filter(n=>n.f0Hz>0&&n.pitchConfidence>.60).length/Math.max(1,active.length),kind=voiced>.40?'periodic':'texture';
  const analysis={referenceHz,frameHopSec:hop/sr,eventStartSec:0,eventDurationSec:pcm.length/sr,attackEndSec:attacks[0]?.end/sr||0,onsetEvidence:attacks[0]?{kind:'transient',startSec:attacks[0].start/sr,endSec:attacks[0].end/sr,confidence:attacks[0].confidence}:{kind:'selection-boundary',startSec:0,endSec:0,confidence:0},frames:nodes,voicedFrameRatio:voiced,meanPitchConfidence:active.reduce((s,n)=>s+n.pitchConfidence,0)/Math.max(1,active.length)};
  const levels=Float32Array.from(nodes,n=>Math.max(maxRms*.005,n.rms));
  const model={version:VERSION,samples:pcm,sampleRate:sr,kind,referenceHz,marks:Float64Array.from(marks),levels,levelHop:hop,bodyStart:0,bodyEnd:pcm.length-1,attackEnd:attacks[0]?.end||0,atlas:{version:VERSION,nodes,attacks,hop,maxRms,lowLogRms:low,highLogRms:high},workbenchAnalysis:analysis,workbenchContext:{eventStartSec:0,selectionDurationSec:pcm.length/sr},sourceIndex:{windows:[{id:0,startSample:0,endSample:pcm.length-1,stateDistance:0,level:maxRms}],selection:'source-state-atlas',representativeLevel:maxRms,acceptedFrames:nodes.map(n=>n.id),frameDecisions:nodes.map(n=>({frame:n.id,reasons:['source-state'],stateDistance:0})),fallback:false}};
  options.onProgress?.(1);return model;
 }
 async function ensure(model,options={}){
  if(model.atlas)return model;if(model.sourceGrains)return model.sourceGrains;
  let prepared=cache.get(model);if(!prepared){prepared=prepare(model.samples,model.sampleRate,options);cache.set(model,prepared);prepared.catch(()=>{if(cache.get(model)===prepared)cache.delete(model);});}
  return prepared;
 }
 return {version:'donor-analysis-sustain-f3.55',prepare,ensure};
})();
/* F3-55: original PCM loop bodies, bounded seam repair and independent pitch transport.
 * Offline only. No synthetic layer is added; transformed frames come from the body.
 * FFT peaks keep their neighbourhood phases (Laroche/Dolson 1999). */



var __F354SustainScout=(()=>{
 'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(x))?Number(x):a));
 const defaults=Object.freeze({mode:'auto',minMs:8,maxMs:170,targetMs:35,hopRatio:.5,preRollMs:0,microDensity:1,jitter:0,maxSourceMs:1400});
 const normalize=(v={})=>{
  const p={...defaults,...v};p.mode=['auto','bounded','fixed'].includes(p.mode)?p.mode:'auto';
  p.minMs=clamp(p.minMs,8,170);p.maxMs=clamp(p.maxMs,p.minMs,170);p.targetMs=clamp(p.targetMs,8,170);p.hopRatio=clamp(p.hopRatio,.1,1);p.preRollMs=clamp(p.preRollMs,0,250);p.microDensity=clamp(p.microDensity,.5,3);p.jitter=clamp(p.jitter,0,1);p.maxSourceMs=clamp(p.maxSourceMs,250,1800);
  return p;
 };
 return Object.freeze({normalize});
})();


/* Carrier-owned articulation for the existing original-PCM Gestalt renderer.
 * Pure preparation: no timers, audio graph, source mutation or stochastic selection. */
/* Carrier-owned articulation for the existing original-PCM Gestalt renderer.
 * Pure preparation: no timers, audio graph, source mutation or stochastic selection. */
function __f35636ArticulationFactory() {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const median = a => { const s=a.slice().sort((x,y)=>x-y); return s[Math.floor(s.length/2)]??0; };
  function apply(carrier, model, sr, duration, cfg, material) {
    const amount=clamp(cfg.params.articulationAmount??1,0,1), sourceRate=model.sampleRate;
    for (const run of material.runs) {
      const band=carrier.bands[run.voice], count=run.endSample-run.startSample;
      const nodes=(model.atlas?.nodes??[]).filter(n=>n.center>=run.sourceStart+sourceRate*.028&&n.center<=run.sourceEnd-sourceRate*.028);
      const attacks=(model.atlas?.attacks??[]).filter(a=>a.start>=run.sourceStart&&a.end<=run.sourceEnd&&a.end>a.start);
      const gains=band.gainCurve.slice(run.firstCell,run.lastCell+1), peak=gains.reduce((a,b)=>Math.max(a,b),1e-8);
      let rise=0; while(rise<gains.length-1&&gains[rise]<peak*.8)rise++;
      let fall=gains.length-1; while(fall>0&&gains[fall]<peak*.8)fall--;
      const cellSeconds=duration/Math.max(1,band.gainCurve.length-1), seconds=count/sr;
      // The carrier's edge supplies duration; no donor pre-roll can move the onset.
      const onsetFraction=clamp((rise*cellSeconds+.012)/Math.max(.001,seconds),.025,.32);
      const releaseFraction=clamp(((gains.length-1-fall)*cellSeconds+.018)/Math.max(.001,seconds),.025,.32);
      const span=run.sourceEnd-run.sourceStart, attack=attacks.reduce((best,a)=>!best||(a.strength??a.peak??0)>(best.strength??best.peak??0)?a:best,null);
      const from=attack?Math.max(run.sourceStart,attack.start-sourceRate*.002):run.sourceStart;
      const attackEnd=attack?Math.min(run.sourceEnd,attack.end):Math.min(run.sourceEnd,from+span*.12);
      const aper=median(nodes.map(n=>n.aperiodicity??.5)), rms=median(nodes.map(n=>n.rms??.05));
      let stable=null, best=Infinity;
      // Typical for THIS source, not a bias towards the cleanest or most periodic frame.
      for(let i=1;i<nodes.length-1;i++) {
        const n=nodes[i]; if(n.center<attackEnd||n.center>run.sourceEnd-span*.1)continue;
        const score=Math.abs((n.aperiodicity??aper)-aper)+.3*Math.abs(Math.log(((n.rms??rms)+1e-6)/(rms+1e-6)))+
          .5*Math.abs((nodes[i+1].aperiodicity??aper)-(nodes[i-1].aperiodicity??aper));
        if(score<best){best=score;stable=n;}
      }
      const sustainCenter=stable?.center??clamp(from+span*.52,attackEnd,run.sourceEnd);
      const available=Math.max(0,run.sourceEnd-sustainCenter), motion=clamp(cfg.params.gestaltMotion??.6,0,1);
      const extent=Math.min(available*.45,sourceRate*(.035+seconds*.09*motion));
      const sustainStart=Math.max(attackEnd,sustainCenter-extent*.5), sustainEnd=Math.min(run.sourceEnd,sustainCenter+extent*.5);
      const tail=nodes.filter(n=>n.center>=sustainEnd&&n.center>run.sourceEnd-span*.22);
      const release=tail.find(n=>(n.rms??Infinity)<rms*.85);
      const releaseStart=Math.max(sustainEnd,release?.center??sustainEnd);
      const releaseEnd=release?run.sourceEnd:Math.min(run.sourceEnd,sustainEnd+sourceRate*.025);
      const old=run.gestalt.sourceCurve, curve=new Float64Array(old.length);
      const bridge=Math.min(.035/Math.max(.001,seconds),.12), bodyEnd=1-releaseFraction;
      const lerp=(a,b,t)=>{t=clamp(t,0,1);return a+(b-a)*t*t*(3-2*t);};
      for(let i=0;i<curve.length;i++) {
        const t=i/Math.max(1,curve.length-1); let at;
        if(t<onsetFraction) at=lerp(from,attackEnd,t/onsetFraction);
        else if(t<onsetFraction+bridge) at=lerp(attackEnd,sustainStart,(t-onsetFraction)/bridge);
        else if(t<bodyEnd-bridge) at=lerp(sustainStart,sustainEnd,(t-onsetFraction-bridge)/Math.max(.001,bodyEnd-onsetFraction-2*bridge));
        else if(t<bodyEnd) at=lerp(sustainEnd,releaseStart,(t-bodyEnd+bridge)/bridge);
        else at=lerp(releaseStart,releaseEnd,(t-bodyEnd)/releaseFraction);
        // A dot uses a compact attack excerpt; no sustain is fabricated inside it.
        if(seconds<=.16)at=lerp(from,Math.min(run.sourceEnd,Math.max(attackEnd,from+sourceRate*seconds)),t);
        curve[i]=clamp(lerp(old[i],at,amount),run.sourceStart,run.sourceEnd);
      }
      run.gestalt.sourceCurve=curve;
      run.articulation={version:'carrier-articulation-f3.56.41',amount,onsetFraction,releaseFraction,
        attackObserved:!!attack,sustainObserved:!!stable,releaseObserved:!!release,
        sourceAttack:[from,attackEnd],sourceSustain:[sustainStart,sustainEnd],sourceRelease:[releaseStart,releaseEnd],
        role:seconds<=.16?'attack':'attack-sustain-release',carrierOnsetSample:run.startSample,carrierEndSample:run.endSample};
      run.workbenchRead.firstSourceCenter=curve[0];run.workbenchRead.lastSourceCenter=curve.at(-1);
    }
    material.articulation={version:'carrier-articulation-f3.56.41',amount,events:material.runs.length,
      authority:'carrier-time-pitch-gain-silence',source:'observed-donor-PCM',addedNoise:0,addedOscillators:0};
    return material;
  }
  return Object.freeze({apply});
}

const __F35636Articulation=__f35636ArticulationFactory();