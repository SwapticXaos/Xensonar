import { P0BoundedClient, P0_PROTOCOL } from './p0-client.js';
import { P0PcmTapClient, P0_TAP_FRAMES_PER_BUFFER, P0_TAP_PROTOCOL } from './p0-pcm-tap-client.js';
import { AUDITED_WASM_SHA256, pcmMetrics, comparePcm, expectedProgramStarts, renderProgramOracle, assessCaptureSuite } from './p0-capture-oracle.js';
import { assessBrowserResult } from './p0-verdict.js';
import { playScheduledToneWithLifecycle } from '../reference323/compiled/features/xensonar/audio/scheduledTonePlaybackBoundary.js';
import { P0_PROGRAM_STEPS, legacy323Envelope, gatedEnvelope, makeLegacyNote, makeGatedNote, webAudioLowpassCoefficients } from './p0-fixtures.js';

const $ = (id) => document.getElementById(id);
const logLines = [];
function log(message, data) {
  const line = `${new Date().toISOString()} ${message}${data === undefined ? '' : ' ' + JSON.stringify(data)}`;
  logLines.push(line); if (logLines.length > 120) logLines.shift();
  if ($('log')) $('log').textContent = logLines.slice(-120).join('\n');
  console.log('[P0-W]', message, data ?? '');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const longTaskEntries=[];
const traceSupported=globalThis.PerformanceObserver?.supportedEntryTypes?.includes('longtask')===true;
try {
  if(traceSupported) {
    const observer=new PerformanceObserver(list=>{for(const e of list.getEntries()){longTaskEntries.push({name:e.name,startTime:e.startTime,duration:e.duration});if(longTaskEntries.length>128)longTaskEntries.shift();}});
    observer.observe({type:'longtask',buffered:true});
  }
} catch {}
function busyStall(ms) { const until = performance.now() + ms; while (performance.now() < until) {} }

function audioMetrics(data) {
  let peak = 0, sumSq = 0, finite = true;
  for (let i = 0; i < data.length; i++) {
    const x = data[i];
    if (!Number.isFinite(x)) finite = false;
    const a = Math.abs(x); if (a > peak) peak = a; sumSq += x * x;
  }
  return { peak, rms: Math.sqrt(sumSq / Math.max(1, data.length)), finite };
}

async function renderReference323({ freqs = [220], heldLong = false, seconds = 1.5 }) {
  const sr = 48000;
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * seconds), sr);
  const neutralBus = ctx.createGain();
  neutralBus.gain.value = 1;
  neutralBus.connect(ctx.destination);
  const activeScheduledTonesRef = { current: [] };
  const transientRuntime = {
    admitVoice: () => null,
    pickTargets: (targets) => targets.filter(Boolean),
    releaseVoice: () => {},
  };
  for (const freq of freqs) {
    const ok = playScheduledToneWithLifecycle({
      ctx,
      activeScheduledTonesRef,
      transientRuntime,
      getMainOutput: () => neutralBus,
      heldLong,
      recordCount: () => {},
      recordAdaptiveAction: () => {},
      silentHotPathSources: { other: true },
    }, {
      freq, offset: 0.05, dur: 0.18, type: 'sine', volume: 0.04, cutoff: 2400, q: 1,
      targetDestinations: null, options: { source: 'other' },
    });
    if (!ok) throw new Error(`323 reference rejected ${freq}Hz`);
  }
  const rendered = await ctx.startRendering();
  return Float32Array.from(rendered.getChannelData(0));
}

async function instantiateOfflineCore(sr = 48000) {
  const bytes = await (await fetch('../artifacts/p0_core.wasm')).arrayBuffer();
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const e = instance.exports;
  e.p0_init(sr);
  const table = new Float32Array(e.memory.buffer, e.p0_sine_table_ptr(), 4096);
  for (let i = 0; i < table.length; i++) table[i] = Math.sin(2 * Math.PI * i / table.length);
  e.p0_set_frame(0n);
  e.p0_arm(1, BigInt(sr * 2));
  e.p0_set_state(1, 1n, 220, 1);
  return e;
}

function wasmEnqueue(e, ownerEpoch, groupId, intendedFrame, deadlineFrame, notes) {
  let r = e.p0_begin_attack_group(ownerEpoch, BigInt(groupId), notes.length, BigInt(intendedFrame), BigInt(deadlineFrame));
  if (r !== 1) return r;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    r = e.p0_set_attack_note(i, n.tokenSlot, n.tokenGeneration, n.kind, n.frequencyHz, n.peak,
      n.b0, n.b1, n.b2, n.a1, n.a2, n.attackFrames, n.releaseStartFrames, n.stopFrames, n.releaseCoef);
    if (r !== 1) return r;
  }
  return e.p0_commit_attack_group();
}

async function renderCandidateOffline({ freqs = [220], heldLong = false, seconds = 1.5, block = 128 }) {
  const sr = 48000;
  const e = await instantiateOfflineCore(sr);
  const notes = freqs.map((f, i) => makeLegacyNote(sr, i + 1, 1, f, heldLong));
  const intended = Math.round(0.05 * sr);
  const env = legacy323Envelope(sr, 0.18, heldLong);
  const deadline = intended + Math.round(env.maxLatenessSeconds * sr);
  if (wasmEnqueue(e, 1, 1, intended, deadline, notes) !== 1) throw new Error('candidate enqueue failed');
  const total = Math.ceil(sr * seconds);
  const result = new Float32Array(total);
  let cursor = 0;
  while (cursor < total) {
    const n = Math.min(block, total - cursor);
    e.p0_render(n);
    const inter = new Float32Array(e.memory.buffer, e.p0_output_ptr(), n * 2);
    for (let i = 0; i < n; i++) result[cursor + i] = inter[i * 2];
    cursor += n;
  }
  return result;
}

function compareAudio(a, b) {
  const n = Math.min(a.length, b.length);
  let maxAbs = 0, sumSq = 0;
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i]; const ad = Math.abs(d); if (ad > maxAbs) maxAbs = ad; sumSq += d * d;
  }
  const rms = Math.sqrt(sumSq / Math.max(1, n));
  return { lengthEqual: a.length === b.length && a.length > 0, framesA: a.length, framesB: b.length, maxAbs, rms, rmsDbFs: rms > 0 ? 20 * Math.log10(rms) : -Infinity };
}

let live = null, livePromise = null, automatedRunning = false;
let capturedTakes=[],probeCancelled=false;
function assertProbeActive(){if(probeCancelled)throw new Error('Probe cancelled by Panic');}
function probeBusy(busy){
  automatedRunning=busy;if(busy)probeCancelled=false;
  for(const id of ['start','chord','hold','program','stall','autotest','stallcapture']){
    const element=$(id);if(element)element.disabled=busy||(['chord','hold','program'].includes(id)&&(!live||live.client.closed));
  }
  for(const id of ['download','downloadstall','downloadpcm'])if($(id))$(id).disabled=busy;
}
async function withTimeout(promise,ms,message){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]);}finally{clearTimeout(timer);}}
async function waitForEvidence(read,ms=4000){const deadline=performance.now()+ms;while(performance.now()<deadline){const value=read();if(value)return value;await sleep(10);}throw new Error('Current evidence timeout');}
const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
async function stopLive() {
  const old=live;if(!old)return;
  clearInterval(old.heartbeat);old.tap?.cancel('session-stop');old.client.postSafety({kind:'panic'});
  await sleep(250 + 1000*(old.ctx.baseLatency+(old.ctx.outputLatency??0)));
  old.tap?.close();old.node.disconnect();old.testBus.disconnect();old.tapNode?.disconnect();old.tapSink?.disconnect();await old.ctx.close();if(live===old)live=null;
}
async function startLive() {
  if(live&&!live.client.closed)return live;
  if(livePromise)return livePromise;
  livePromise=(async()=>{if(live)await stopLive();return prepareLive();})();
  try{return await livePromise;}finally{livePromise=null;}
}
async function prepareLive() {
  const ctx = new AudioContext({ latencyHint: 'interactive', sampleRate: 48000 });
  try {
  await withTimeout(ctx.resume(),4000,'AudioContext resume timeout; start with a user gesture');
  await ctx.audioWorklet.addModule('../worklet/p0-worklet.js');
  await ctx.audioWorklet.addModule('../worklet/p0-pcm-tap.js');
  const wasmBytes = await (await fetch('../artifacts/p0_core.wasm')).arrayBuffer();
  const wasmModule = await WebAssembly.compile(wasmBytes);
  const wasmSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',wasmBytes)),b=>b.toString(16).padStart(2,'0')).join('');
  const scope={sessionId:crypto.randomUUID(),engineEpoch:crypto.randomUUID(),ownerEpoch:1};
  const node = new AudioWorkletNode(ctx, 'xensonar-p0-w', {
    numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { wasmModule, ...scope }
  });
  const testBus = ctx.createGain(); testBus.gain.value = 1;
  const tapNode=new AudioWorkletNode(ctx,'xensonar-p0-pcm-tap',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{...scope,monitorOnly:true}});
  const tapSink=ctx.createGain();tapSink.gain.value=0;
  node.connect(testBus);testBus.connect(ctx.destination);
  testBus.connect(tapNode).connect(tapSink).connect(ctx.destination);
  const tapEvents=[];
  const tap=new P0PcmTapClient(tapNode.port,scope,message=>{tapEvents.push({at:performance.now(),...message});if(tapEvents.length>128)tapEvents.shift();});
  const messages = [], faults=[];
  const client = new P0BoundedClient(node.port, (message) => {
    messages.push({at:performance.now(),...message});if(messages.length>128)messages.shift();
    if(message.kind==='fault'){faults.push(message.message);if(faults.length>32)faults.shift();log('FAULT',message);}
  },scope);
  node.onprocessorerror=()=>{faults.push('synth-processorerror');if(faults.length>32)faults.shift();client.postSafety({kind:'panic'});log('FAULT','synth-processorerror');};
  tapNode.onprocessorerror=()=>{faults.push('tap-processorerror');if(faults.length>32)faults.shift();tap.cancel('tap-processorerror');log('FAULT','tap-processorerror');};
  await withTimeout(ctx.resume(),4000,'AudioContext resume timeout; start with a user gesture');
  const preparedFrame=Math.ceil(ctx.currentTime*ctx.sampleRate);
  const readyLimit=performance.now()+4000;
  while(!tap.ready||!tap.poolReady||!messages.some(m=>m.kind==='render-proof'&&m.frame>=preparedFrame+ctx.sampleRate*.25)) {
    if(performance.now()>readyLimit||faults.length){await ctx.close();throw new Error('No current render proof');}
    await sleep(25);
  }
  const ownerEpoch = 1;
  const nowFrame = Math.ceil(ctx.currentTime * ctx.sampleRate);
  client.postNormal({ kind: 'arm', ownerEpoch, leaseValidThroughFrame: nowFrame + Math.round(ctx.sampleRate * 1.5) });
  let stateRevision = 1;
  client.postState({ kind: 'state', ownerEpoch, revision: stateRevision, rootHz: 220, programGain: 1, leaseValidThroughFrame: nowFrame + Math.round(ctx.sampleRate * 1.5) });
  const coeff = webAudioLowpassCoefficients(ctx.sampleRate, 2400, 1);
  const env = legacy323Envelope(ctx.sampleRate, 0.18, false);
  client.postNormal({ kind: 'program-config', ownerEpoch, header: { revision: 1, tempoMilli: 120000, ...coeff,
    attackFrames: env.attackFrames, releaseStartFrames: env.releaseStartFrames, stopFrames: env.stopFrames, releaseCoef: env.releaseCoef }, steps: P0_PROGRAM_STEPS });
  const session = { ctx, node, client, testBus, tapNode, tapSink, tap, tapEvents, messages, faults, wasmSha256, wasmModule, scope, ownerEpoch, groupId: 1, tokenGen: new Uint32Array(128), heartbeat: null, stateRevision, rootHz: 220, programGain: 1 };
  live=session;
  const renew = () => {
    if (live!==session || client.closed) {clearInterval(session.heartbeat);session.heartbeat=null;return;}
    const f = Math.ceil(ctx.currentTime * ctx.sampleRate);
    live.stateRevision += 1;
    client.postState({ kind: 'state', ownerEpoch, revision: live.stateRevision, rootHz: live.rootHz, programGain: live.programGain, leaseValidThroughFrame: f + Math.round(ctx.sampleRate * 1.5) });
  };
  renew();
  live.heartbeat = setInterval(renew, 250);
  for(const id of ['chord','hold','program'])$(id).disabled=automatedRunning;
  log('live-ready', { sampleRate: ctx.sampleRate, baseLatency: ctx.baseLatency, outputLatency: ctx.outputLatency ?? null });
  return session;
  } catch(error) {if(ctx.state!=='closed')await ctx.close();throw error;}
}

function latestProof(l) { for (let i = l.messages.length - 1; i >= 0; i--) if (l.messages[i].kind === 'render-proof') return l.messages[i]; return null; }
function nextToken(l, slot) { const g = ++l.tokenGen[slot]; return { tokenSlot: slot, tokenGeneration: g }; }

async function liveChord(freqs = [220,330,440], gated = false, eventAt = performance.now(), onOwner = null) {
  if(automatedRunning)return [];
  const l = await startLive(); onOwner?.(l.client); const sr = l.ctx.sampleRate;
  const eventAge=performance.now()-eventAt;
  if(!Number.isFinite(eventAge)||eventAge < -1 || eventAge>90)return [];
  const start = Math.max(0,Math.ceil(l.ctx.currentTime*sr-eventAge*sr/1000)+256);
  const maxLate = legacy323Envelope(sr, 0.18, false).maxLatenessSeconds;
  const notes = freqs.map((f, i) => {
    const t = nextToken(l, i + 1); return gated ? makeGatedNote(sr, t.tokenSlot, t.tokenGeneration, f) : makeLegacyNote(sr, t.tokenSlot, t.tokenGeneration, f);
  });
  const accepted=l.client.postNormal({ kind: 'attack-group', ownerEpoch: l.ownerEpoch, groupId: l.groupId++, intendedFrame: start,
    latestAdmissionFrame: start + Math.round(maxLate * sr), notes });
  return accepted?notes:[];
}

async function runAutomated() {
  if(automatedRunning)throw new Error('A probe is already running');
  probeBusy(true);$('download').disabled=true;
  const result = { pass: false, protocol: P0_PROTOCOL, scope: 'Browser smoke and offline A/W; physical device and complete P0 acceptance remain separate', tests: {}, environment: {} };
  try {
    // Exact 323 transpiled module vs portable core, on-time fixture.
    const ref = await renderReference323({ freqs: [220], heldLong: false });
    const cand = await renderCandidateOffline({ freqs: [220], heldLong: false });
    const cmp = compareAudio(ref, cand);
    result.tests.referenceNormal = { reference: audioMetrics(ref), candidate: audioMetrics(cand), compare: cmp };

    const refHeld = await renderReference323({ freqs: [220], heldLong: true, seconds: 1.5 });
    const candHeld = await renderCandidateOffline({ freqs: [220], heldLong: true, seconds: 1.5 });
    result.tests.referenceHeld = { reference: audioMetrics(refHeld), candidate: audioMetrics(candHeld), compare: compareAudio(refHeld, candHeld) };

    await stopLive();
    const l = await startLive();
    const refChord=await renderReference323({freqs:[220,330,440]});
    const candChord=await renderCandidateOffline({freqs:[220,330,440]});
    result.tests.referenceChord={reference:audioMetrics(refChord),candidate:audioMetrics(candChord),compare:compareAudio(refChord,candChord)};
    result.wasmSha256=l.wasmSha256;
    result.environment = { userAgent: navigator.userAgent, crossOriginIsolated, sampleRate: l.ctx.sampleRate, baseLatency: l.ctx.baseLatency, outputLatency: l.ctx.outputLatency ?? null };
    const sr = l.ctx.sampleRate;
    assertProbeActive();
    const programStart = Math.ceil(l.ctx.currentTime * sr) + 512;
    l.client.postNormal({ kind: 'program-start', ownerEpoch: l.ownerEpoch, startFrame: programStart });
    await sleep(400);
    const before = latestProof(l);
    const stallStart = performance.now(); busyStall(500); const stallActual = performance.now() - stallStart;
    await sleep(350);
    const after = latestProof(l);
    result.tests.stall500 = { stallActualMs: stallActual, before, after,
      frameAdvance: before && after ? after.frame - before.frame : null,
      programStartsAdvance: before && after ? after.startedProgram - before.startedProgram : null };

    // Stale attack delivered after its deadline must never start.
    const startsBeforeStale = after?.startedExternal ?? 0;
    const oldIntended = Math.ceil(l.ctx.currentTime * sr) - Math.round(0.20 * sr);
    const oldDeadline = oldIntended + Math.round(0.09 * sr);
    const tok = nextToken(l, 20);
    l.client.postNormal({ kind: 'attack-group', ownerEpoch: l.ownerEpoch, groupId: l.groupId++, intendedFrame: oldIntended,
      latestAdmissionFrame: oldDeadline, notes: [makeLegacyNote(sr, tok.tokenSlot, tok.tokenGeneration, 550)] });
    await sleep(150);
    const afterStale = latestProof(l);
    result.tests.staleAttack = { startsBefore: startsBeforeStale, startsAfter: afterStale?.startedExternal, expired: afterStale?.expired, expiredBefore: after?.expired ?? 0 };

    // Pending gated start followed by release: no resurrection.
    const tok2 = nextToken(l, 21);
    const future = Math.ceil(l.ctx.currentTime * sr) + Math.round(0.30 * sr);
    l.client.postNormal({ kind: 'attack-group', ownerEpoch: l.ownerEpoch, groupId: l.groupId++, intendedFrame: future,
      latestAdmissionFrame: future + Math.round(0.09 * sr), notes: [makeGatedNote(sr, tok2.tokenSlot, tok2.tokenGeneration, 660)] });
    l.client.postSafety({ kind: 'release', ownerEpoch: l.ownerEpoch, tokenSlot: tok2.tokenSlot, tokenGeneration: tok2.tokenGeneration,
      releaseFrames: gatedEnvelope(sr).releaseFrames });
    const beforeReleaseWait = latestProof(l)?.startedExternal ?? 0;
    await sleep(450);
    const afterReleaseWait = latestProof(l);
    result.tests.releaseBeforeStart = { startsBefore: beforeReleaseWait, startsAfter: afterReleaseWait?.startedExternal, cancelled: afterReleaseWait?.cancelled, cancelledBefore: afterStale?.cancelled ?? 0 };

    // State high-water mark. Stop lease heartbeats so the expected revision is deterministic.
    clearInterval(l.heartbeat); l.heartbeat = null;
    const expectedRevision=Math.max(l.stateRevision+2,21);
    l.stateRevision = expectedRevision; l.rootHz = 330; l.client.postState({ kind: 'state', ownerEpoch: l.ownerEpoch, revision: expectedRevision, rootHz: 330, programGain: 1, leaseValidThroughFrame: Math.ceil(l.ctx.currentTime*sr)+Math.round(sr*1.5) });
    l.client.postState({ kind: 'state', ownerEpoch: l.ownerEpoch, revision: expectedRevision-1, rootHz: 440, programGain: 1, leaseValidThroughFrame: Math.ceil(l.ctx.currentTime*sr)+Math.round(sr*1.5) });
    await sleep(150);
    result.tests.stateHighWater = { stateRevision: latestProof(l)?.stateRevision, expectedRevision };

    // Panic must stop program and old owner.
    const panicRequestedFrame=Math.ceil(l.ctx.currentTime*sr);
    l.client.postSafety({ kind: 'panic', ownerEpoch: l.ownerEpoch, fadeFrames: gatedEnvelope(sr).panicFrames });
    await sleep(250);
    const panicProof = latestProof(l);
    result.tests.panic = {...panicProof,requestedFrame:panicRequestedFrame};

    if (l.heartbeat) { clearInterval(l.heartbeat); l.heartbeat = null; }
    result.faults=l.faults.slice();
    assertProbeActive();result.pass=assessBrowserResult(result);
    window.__P0_RESULT__ = result;
    document.body.dataset.testStatus = result.pass ? 'pass' : 'fail';
    log('AUTOTEST-DONE', result);
  } catch (error) {
    result.error = String(error?.stack || error);
    window.__P0_RESULT__ = result;
    document.body.dataset.testStatus = 'fail';
    log('AUTOTEST-ERROR', result.error);
    if(live){clearInterval(live.heartbeat);live.client.postSafety({kind:'panic'});}
  } finally {probeBusy(false);$('download').disabled=false;}
  return result;
}


async function waitForAudioFrame(ctx,targetFrame,timeoutMs=4000) {
  const deadline=performance.now()+timeoutMs;
  while(Math.ceil(ctx.currentTime*ctx.sampleRate)<targetFrame){if(performance.now()>deadline)throw new Error('audio-frame wait timeout');await sleep(4);}
}
async function runCapturedProgramTake(stallMs=0,{overflowReturns=false}={}) {
  if(!Number.isFinite(stallMs)||stallMs<0||stallMs>500)throw new Error('UI stall profile must be 0 to 500 ms');
  assertProbeActive();await stopLive();const l=await startLive();const sr=l.ctx.sampleRate;
  try {
    assertProbeActive();
    if(l.wasmSha256!==AUDITED_WASM_SHA256)throw new Error('Audited WASM hash mismatch');
    await waitForEvidence(()=>l.messages.find(m=>m.kind==='receipt'&&m.op==='program-config'&&m.result===1));
    const frameCount=Math.round(sr*(overflowReturns?3:1.25)),relativeProgramStartFrame=Math.round(sr*.10);
    const oracle=renderProgramOracle(l.wasmModule,sr,frameCount,relativeProgramStartFrame);
    const now=Math.ceil(l.ctx.currentTime*sr),captureStart=now+Math.max(P0_TAP_FRAMES_PER_BUFFER,Math.ceil(sr*.12));
    const programStart=captureStart+relativeProgramStartFrame,stallFrame=programStart+Math.round(sr*.22);
    const take=l.tap.startCapture(captureStart,frameCount),postedAt=performance.now();
    if(!l.client.postNormal({kind:'program-start',ownerEpoch:l.ownerEpoch,startFrame:programStart}))throw new Error('Program start transport rejected');
    const programReceipt=await waitForEvidence(()=>l.messages.find(m=>m.kind==='receipt'&&m.op==='program-start'&&m.at>=postedAt));
    if(programReceipt.result!==1)throw new Error('Engine rejected program start: '+programReceipt.result);
    await waitForAudioFrame(l.ctx,stallFrame);assertProbeActive();
    const perfStart=performance.now(),audioBefore=Math.ceil(l.ctx.currentTime*sr),outputTimestampBefore=l.ctx.getOutputTimestamp?.()??null;
    const holdRequestedMs=1800;let returnReleaseFrame=null;
    if(overflowReturns){l.tap.holdBufferReturns(true);try{await sleep(holdRequestedMs);}finally{returnReleaseFrame=Math.ceil(l.ctx.currentTime*sr);l.tap.holdBufferReturns(false);}}
    else if(stallMs>0)busyStall(stallMs);
    const perfEnd=performance.now(),audioAfter=Math.ceil(l.ctx.currentTime*sr),outputTimestampAfter=l.ctx.getOutputTimestamp?.()??null;
    const completed=await withTimeout(take.done,5000,'Capture timeout');assertProbeActive();
    const proof=await waitForEvidence(()=>{const p=latestProof(l);return p&&p.frame>=captureStart+frameCount?p:null;});
    await sleep(50);
    const ranges=completed.chunks.map(c=>[(c.firstFrame-captureStart)*2,(c.firstFrame-captureStart+c.frames)*2]);
    const result={...l.scope,wasmSha256:l.wasmSha256,stallRequestedMs:stallMs,stallActualMs:overflowReturns?0:perfEnd-perfStart,
      stallPerfStart:perfStart,stallPerfEnd:perfEnd,audioFrameBefore:audioBefore,audioFrameAfter:audioAfter,outputTimestampBefore,outputTimestampAfter,
      sampleRate:sr,channels:2,captureStartFrame:captureStart,programStartFrame:programStart,relativeProgramStartFrame,stallFrame,frameCount,
      expectedStarts:expectedProgramStarts(sr,captureStart,programStart,frameCount),validation:completed.validation,end:completed.end,chunks:completed.chunks,
      traceSupported,longTasks:longTaskEntries.filter(e=>e.startTime<=perfEnd+5&&e.startTime+e.duration>=perfStart-5),proof,programReceipt,faults:l.faults.slice(),
      metrics:pcmMetrics(completed.data),oracleCompare:comparePcm(oracle,completed.data,overflowReturns?ranges:null),data:completed.data,
      environment:{userAgent:navigator.userAgent,crossOriginIsolated,sampleRate:sr,baseLatency:l.ctx.baseLatency,outputLatency:l.ctx.outputLatency??null}};
    if(overflowReturns)Object.assign(result,{faultInjection:'withheld-buffer-returns',holdRequestedMs,holdActualMs:perfEnd-perfStart,returnReleaseFrame,
      recoveryMetrics:pcmMetrics(completed.data.subarray(Math.min(frameCount,Math.max(0,returnReleaseFrame-captureStart+256))*2))});
    result.pcmSha256=await digest(completed.data.buffer);assertProbeActive();return result;
  } finally {l.tap.holdBufferReturns(false);await stopLive();}
}
async function runOneCaptureProbe(ms=0,options={}){
  if(automatedRunning)throw new Error('A probe is already running');probeBusy(true);
  try{return await runCapturedProgramTake(ms,options);}finally{probeBusy(false);}
}
async function runStallCaptureSuite(){
  if(automatedRunning)throw new Error('A probe is already running');
  // W-G1 is executed automatically if it is not already valid for this artifact.
  if(window.__P0_RESULT__?.pass!==true||window.__P0_RESULT__.wasmSha256!==AUDITED_WASM_SHA256)await runAutomated();
  probeBusy(true);capturedTakes=[];
  const report={runId:crypto.randomUUID(),createdAt:new Date().toISOString(),protocol:P0_PROTOCOL,tapProtocol:P0_TAP_PROTOCOL,wasmSha256:AUDITED_WASM_SHA256,wg1:window.__P0_RESULT__??null,
    scope:'Digital graph PCM/real UI-stall capture; physical output and callback deadline proof remain separate',takes:{},pass:false};
  try{
    if(report.wg1?.pass!==true)throw new Error('W-G1 did not pass; PCM suite is not approved to continue');
    const baseline=await runCapturedProgramTake(0);capturedTakes.push({name:'baseline',...baseline});report.takes.baseline={...baseline,data:undefined};report.environment=baseline.environment;
    for(const ms of [100,250,500]){const take=await runCapturedProgramTake(ms);take.compare=comparePcm(baseline.data,take.data);capturedTakes.push({name:'stall'+ms,...take});report.takes['stall'+ms]={...take,data:undefined};}
    const overflow=await runCapturedProgramTake(0,{overflowReturns:true});capturedTakes.push({name:'overflowReturns',...overflow});report.takes.overflowReturns={...overflow,data:undefined};
    assertProbeActive();report.gates=assessCaptureSuite(report);report.pass=report.gates.pass;
    report.status=report.pass?'digital-capture-pass':report.gates.sampleContinuityPass&&!report.gates.tracePass?'trace-evidence-pending':'failed';
    log('STALL-CAPTURE-DONE',report);
  }catch(error){report.error=String(error?.stack??error);report.status='failed';log('STALL-CAPTURE-ERROR',report.error);}
  finally{window.__P0_STALL_CAPTURE_RESULT__=report;document.body.dataset.captureStatus=report.status;probeBusy(false);}
  return report;
}
async function downloadCaptureEvidence(){
  if(automatedRunning||!window.__P0_STALL_CAPTURE_RESULT__)return;
  const pcm=[];
  for(const t of capturedTakes){const bytes=new Uint8Array(t.data.buffer,t.data.byteOffset,t.data.byteLength);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));pcm.push({name:t.name,encoding:'f32le-interleaved-stereo',sampleRate:t.sampleRate,frames:t.frameCount,sha256:t.pcmSha256,base64:btoa(binary)});}
  downloadJson('P0_STALL_CAPTURE_EVIDENCE.json',{format:'p0-pcm-evidence/1',captureOrigin:'browser-page',report:window.__P0_STALL_CAPTURE_RESULT__,pcm});
}

function downloadJson(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

window.p0 = { startLive:()=>{if(automatedRunning)throw new Error('A probe is running');return startLive();}, stopLive, liveChord, runAutomated, runStallCaptureSuite, runCapturedProgramTake:runOneCaptureProbe, renderReference323, renderCandidateOffline };
function uiError(error){log('UI-ERROR',String(error?.stack??error));}
$('start')?.addEventListener('click', () => startLive().catch(uiError));
$('chord')?.addEventListener('click', event => liveChord([220,330,440],false,event.timeStamp).catch(uiError));
let heldGesture=null;
function releaseHeld(event) {
  const g=heldGesture;if(!g||event&&event.pointerId!==undefined&&event.pointerId!==g.pointerId)return;
  g.released=true;heldGesture=null;
  if(g.note)g.client.postSafety({kind:'release',tokenSlot:g.note.tokenSlot,tokenGeneration:g.note.tokenGeneration});
}
$('hold')?.addEventListener('pointerdown',async event=>{
  releaseHeld();const g={pointerId:event.pointerId,released:false,note:null,client:null};heldGesture=g;
  $('hold').setPointerCapture(event.pointerId);
  let notes;try {notes=await liveChord([220],true,event.timeStamp,client=>{g.client=client;});} catch(error){releaseHeld();uiError(error);return;}g.note=notes[0];
  if(g.released&&g.note)g.client.postSafety({kind:'release',tokenSlot:g.note.tokenSlot,tokenGeneration:g.note.tokenGeneration});
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('hold')?.addEventListener(name,releaseHeld);
window.addEventListener('blur',()=>releaseHeld());
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseHeld();});
$('program')?.addEventListener('click', () => startLive().then(l=>l.client.postNormal({kind:'program-start',ownerEpoch:l.ownerEpoch,startFrame:Math.ceil(l.ctx.currentTime*l.ctx.sampleRate)+256})).catch(uiError));
$('stall')?.addEventListener('click', () => busyStall(500));
$('panic')?.addEventListener('click', async () => { if(automatedRunning)probeCancelled=true;const l=live;if(!l)return;clearInterval(l.heartbeat);releaseHeld();for(const id of ['chord','hold','program'])$(id).disabled=true;l.client.postSafety({kind:'panic',ownerEpoch:l.ownerEpoch,fadeFrames:gatedEnvelope(l.ctx.sampleRate).panicFrames}); });
$('autotest')?.addEventListener('click', ()=>runAutomated().catch(uiError));
$('stallcapture')?.addEventListener('click',()=>runStallCaptureSuite().catch(uiError));
if (new URLSearchParams(location.search).get('autotest') === '1') setTimeout(()=>runAutomated().catch(uiError), 100);

$('download')?.addEventListener('click',()=>{if(window.__P0_RESULT__)downloadJson('P0_BROWSER_RESULT.json',window.__P0_RESULT__);});
$('downloadstall')?.addEventListener('click',()=>{if(window.__P0_STALL_CAPTURE_RESULT__)downloadJson('P0_STALL_CAPTURE_RESULT.json',window.__P0_STALL_CAPTURE_RESULT__);});

$('downloadpcm')?.addEventListener('click',()=>downloadCaptureEvidence().catch(uiError));
