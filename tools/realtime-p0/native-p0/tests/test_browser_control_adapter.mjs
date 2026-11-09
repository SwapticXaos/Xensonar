import assert from 'assert';
import fs from 'fs';
import vm from 'vm';
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';
const here=dirname(fileURLToPath(import.meta.url));
const protocolSource=fs.readFileSync(resolve(here,'../browser/p0_native_control_protocol.js'),'utf8');
const source=fs.readFileSync(resolve(here,'../browser/p0_native_control_adapter.js'),'utf8');
const context={console,setTimeout,clearTimeout,performance:{now:()=>0}};context.globalThis=context;
vm.runInNewContext(protocolSource,context,{filename:'p0_native_control_protocol.js'});
vm.runInNewContext(source,context,{filename:'p0_native_control_adapter.js'});
const {XensonarNativeControl}=context;assert.equal(typeof XensonarNativeControl,'function');
function response(status,body){return {ok:status>=200&&status<300,status,async json(){return body}}}

// Normal one-session contract.
let now=1000,frame=48000,serverRevision=7,stateRequests=0;const requests=[];
const sessionA={token:'secret-token-a',sessionId:'session-a-000001',ownerEpoch:1,controlLeaseMs:5000};
async function fetchImpl(url,opt={}){
  requests.push({url,opt,at:now});
  if(url.endsWith('/v1/session')) return response(200,{...sessionA,physicalAudio:true,sampleRate:48000,channels:2,deviceQuantumFrames:512,callbacks:10});
  const headers=opt.headers||{};
  if(headers['X-Xensonar-Token']!==sessionA.token || headers['X-Xensonar-Session']!==sessionA.sessionId) return response(403,{ok:false,error:'forbidden-session'});
  if(url.endsWith('/v1/status')) { now+=1;frame+=48;return response(200,{ok:true,sessionId:sessionA.sessionId,ownerEpoch:sessionA.ownerEpoch,frame,mailboxRevision:serverRevision}); }
  if(url.endsWith('/v1/state')) { stateRequests++;await Promise.resolve();const m=/revision=(\d+)/.exec(opt.body);serverRevision=Math.max(serverRevision,Number(m[1]));return response(200,{ok:true}); }
  if(url.endsWith('/v1/attack')||url.endsWith('/v1/wavestarter/attack')||url.endsWith('/v1/wavestarter/resolved-attack')) return response(202,{ok:true});
  if(url.endsWith('/v1/release')||url.endsWith('/v1/panic')||url.endsWith('/v1/heartbeat')||url.endsWith('/v1/shutdown')||url.endsWith('/v1/browser-report')) return response(200,{ok:true});
  return response(404,{ok:false});
}
const sleep=async ms=>{now+=ms};
const ctl=new XensonarNativeControl({fetchImpl,now:()=>now,sleep,baseUrl:'http://127.0.0.1:32123',initialSequence:100,initialRevision:99});
const session=await ctl.connect({clockSamples:3,settleMs:2});
assert.equal(session.deviceQuantumFrames,512);assert.equal(session.sessionId,sessionA.sessionId);assert.equal(session.ownerEpoch,1);assert.equal(session.controlLeaseMs,5000);assert.equal(ctl.controlLeaseMs,5000);
assert.equal(ctl.sessionId,sessionA.sessionId);assert.equal(ctl.ownerEpoch,1);assert.equal(ctl.revision,99);assert.ok(Number.isFinite(ctl.clockRttMs));
assert.ok(requests.every(r=>!r.url.includes('secret-token')),'token leaked into URL');
assert.ok(requests.filter(r=>r.url.includes('/v1/status')).every(r=>r.opt.headers['X-Xensonar-Token']===sessionA.token));
assert.ok(requests.filter(r=>r.url.includes('/v1/status')).every(r=>r.opt.headers['X-Xensonar-Session']===sessionA.sessionId));
assert.equal(ctl.clockGeneration,1);
const capturedBeforeRefresh=ctl.captureGesture(now);const capturedSource=capturedBeforeRefresh.sourceFrame;const capturedGeneration=capturedBeforeRefresh.clockGeneration;
await ctl.syncClock({samples:2,settleMs:1});assert.equal(ctl.clockGeneration,2);assert.equal(capturedBeforeRefresh.sourceFrame,capturedSource);assert.equal(capturedBeforeRefresh.clockGeneration,capturedGeneration);
const attackFromCaptured=await ctl.attack({slot:72,frequencyHz:392,capturedGesture:capturedBeforeRefresh});assert.equal(attackFromCaptured.sourceFrame,capturedSource);assert.equal(attackFromCaptured.clockGeneration,capturedGeneration);
await assert.rejects(()=>ctl.connect(),/session-bound/);
const burst=[];for(let i=0;i<17;i++)burst.push(ctl.publishState({rootHz:330+i,gain:0.75}));const results=await Promise.all(burst);assert.equal(ctl.revision,116);assert.equal(serverRevision,116);assert.ok(stateRequests<=2,`continuous state queued ${stateRequests} requests`);assert.ok(results.filter(x=>x.superseded).length>=15);
const gesture=now,expected=ctl.sourceFrameAt(gesture);const attack=await ctl.attack({slot:73,frequencyHz:440,gestureTimeMs:gesture});assert.equal(attack.sourceFrame,expected);assert.equal(attack.sequence,101);const attackReq=requests.filter(r=>r.url.endsWith('/v1/attack')).at(-1);assert.ok(attackReq.opt.body.includes(`sourceFrame=${expected}`));assert.ok(!attackReq.opt.body.includes('secret-token'));
now+=500;const staleExpected=ctl.sourceFrameAt(gesture);const stale=await ctl.attack({slot:74,frequencyHz:523.25,gestureTimeMs:gesture});assert.equal(stale.sourceFrame,staleExpected,'old gesture timestamp was refreshed');
const wsCaptured=ctl.captureGesture(now);const wsCapturedSource=wsCaptured.sourceFrame;const wsCapturedGeneration=wsCaptured.clockGeneration;
await ctl.syncClock({samples:2,settleMs:1});assert.ok(ctl.clockGeneration>wsCapturedGeneration);
const wsAttack=await ctl.waveStarterAttack({presetId:'reed_sigh',frequencyHz:329.63,peak:0.09,capturedGesture:wsCaptured});
assert.equal(wsAttack.sourceFrame,wsCapturedSource,'wavestarter captured gesture was rejuvenated');assert.equal(wsAttack.clockGeneration,wsCapturedGeneration);assert.equal(wsAttack.presetId,'reed_sigh');
const wsReq=requests.filter(r=>r.url.endsWith('/v1/wavestarter/attack')).at(-1);assert.ok(wsReq,'wavestarter route not used');assert.ok(wsReq.opt.body.includes(`sourceFrame=${wsCapturedSource}`));assert.ok(wsReq.opt.body.includes('preset=reed_sigh'));
await assert.rejects(()=>ctl.waveStarterAttack({presetId:'Reed Sigh',frequencyHz:329.63}),/invalid wavestarter attack/);
const resolvedCaptured=ctl.captureGesture(now);
const resolvedTones=[
  {frequencyHz:220,gain:0.08,cutoffHz:4200,resonance:0.9,delaySec:0,durationSec:0.2,waveform:'sine'},
  {frequencyHz:330,gain:0.04,cutoffHz:3200,resonance:1.2,delaySec:0.005,durationSec:0.15,waveform:'triangle'},
];
const resolvedAttack=await ctl.waveStarterResolvedAttack({tones:resolvedTones,capturedGesture:resolvedCaptured});
assert.equal(resolvedAttack.sourceFrame,resolvedCaptured.sourceFrame,'resolved attack rejuvenated captured frame');
assert.equal(resolvedAttack.toneCount,2);
const resolvedReq=requests.filter(r=>r.url.endsWith('/v1/wavestarter/resolved-attack')).at(-1);
assert.ok(resolvedReq,'resolved wavestarter route not used');
assert.equal(resolvedReq.opt.headers['Content-Type'],'application/octet-stream');
assert.equal(resolvedReq.opt.body.byteLength,96);
const rv=new DataView(resolvedReq.opt.body);
assert.equal(rv.getUint32(0,true),0x32535758);
assert.equal(rv.getUint32(4,true),1);
assert.equal(Number(rv.getBigUint64(16,true)),resolvedCaptured.sourceFrame);
assert.equal(rv.getUint32(24,true),2);
assert.ok(Math.abs(rv.getFloat32(32,true)-220)<1e-4);
assert.ok(Math.abs(rv.getFloat32(36,true)-0.08)<1e-6);
assert.equal(rv.getUint32(48,true),0);
assert.equal(rv.getUint32(52,true),Math.round(0.2*48000));
assert.equal(rv.getUint32(56,true),0);
assert.equal(rv.getUint32(80,true),Math.round(0.005*48000));
assert.equal(rv.getUint32(84,true),Math.round(0.15*48000));
assert.equal(rv.getUint32(88,true),1);
await assert.rejects(()=>ctl.waveStarterResolvedAttack({tones:[{...resolvedTones[0],waveform:'noise'}]}),/invalid wavestarter resolved tone/);
now+=500;
await ctl.release({slot:73,generation:1});await ctl.panic();assert.equal(ctl.closed,true);await assert.rejects(()=>ctl.attack({slot:75,frequencyHz:660}),/terminal/);await assert.rejects(()=>ctl.publishState({rootHz:440,gain:0.4}),/terminal/);await assert.rejects(()=>ctl.connect(),/new instance|session-bound/);await ctl.heartbeat();await ctl.shutdown();assert.ok(ctl.clockAgeMs>=500);

// Sidecar restart/session-loss contract. One adapter instance may never cross it.
let lifecycleNow=5000,lifecycleFrame=240000,lifecycleRevision=3,current={token:'token-a',sessionId:'sid-a',ownerEpoch:1};
const lifecycleRequests=[];
async function lifecycleFetch(url,opt={}){
  lifecycleRequests.push({url,opt,session:{...current}});
  if(url.endsWith('/v1/session')) return response(200,{...current,physicalAudio:true,sampleRate:48000,channels:2,deviceQuantumFrames:512,callbacks:1});
  const h=opt.headers||{};
  if(h['X-Xensonar-Token']!==current.token || h['X-Xensonar-Session']!==current.sessionId) return response(403,{ok:false,error:'forbidden-session'});
  if(url.endsWith('/v1/status')) { lifecycleNow+=1;lifecycleFrame+=48;return response(200,{ok:true,sessionId:current.sessionId,ownerEpoch:current.ownerEpoch,frame:lifecycleFrame,mailboxRevision:lifecycleRevision}); }
  if(url.endsWith('/v1/heartbeat')||url.endsWith('/v1/attack')||url.endsWith('/v1/release')||url.endsWith('/v1/state')||url.endsWith('/v1/panic')||url.endsWith('/v1/shutdown')) return response(url.endsWith('/v1/attack')?202:200,{ok:true});
  return response(404,{ok:false});
}
const ctlA=new XensonarNativeControl({fetchImpl:lifecycleFetch,now:()=>lifecycleNow,sleep:async ms=>{lifecycleNow+=ms},baseUrl:'http://127.0.0.1:40000'});
await ctlA.connect({clockSamples:2,settleMs:0});const oldClockSource=ctlA.sourceFrameAt(lifecycleNow);assert.equal(ctlA.sessionId,'sid-a');assert.equal(ctlA.sessionInvalid,false);
// New process/session: token, session id, frame domain and revision all change.
current={token:'token-b',sessionId:'sid-b',ownerEpoch:1};lifecycleFrame=960;lifecycleRevision=0;lifecycleNow+=250;
await assert.rejects(()=>ctlA.heartbeat(),/403/);assert.equal(ctlA.sessionInvalid,true);assert.equal(ctlA.connected,false);assert.equal(ctlA.clockAgeMs,Infinity);
const beforeLocalReject=lifecycleRequests.length;
await assert.rejects(()=>ctlA.attack({slot:1,frequencyHz:220}),/session invalid/);
await assert.rejects(()=>ctlA.publishState({rootHz:220,gain:0.5}),/session invalid/);
await assert.rejects(()=>ctlA.release({slot:1}),/session invalid/);
await assert.rejects(()=>ctlA.connect(),/session-bound/);
assert.equal(lifecycleRequests.length,beforeLocalReject,'invalid adapter leaked network traffic after session loss');
const invalidAdapterNetworkDelta=lifecycleRequests.length-beforeLocalReject;
const ctlB=new XensonarNativeControl({fetchImpl:lifecycleFetch,now:()=>lifecycleNow,sleep:async ms=>{lifecycleNow+=ms},baseUrl:'http://127.0.0.1:40000'});
const freshSession=await ctlB.connect({clockSamples:2,settleMs:0});assert.equal(freshSession.sessionId,'sid-b');assert.equal(ctlB.sessionId,'sid-b');assert.equal(ctlB.ownerEpoch,1);assert.equal(ctlB.sessionInvalid,false);
await assert.rejects(()=>ctlB.attack({slot:2,frequencyHz:330,capturedGesture:{sessionId:'sid-a',ownerEpoch:1,clockGeneration:1,gestureTimeMs:lifecycleNow,sourceFrame:oldClockSource}}),/different session/);
const newClockSource=ctlB.sourceFrameAt(lifecycleNow);assert.ok(newClockSource<oldClockSource,'new adapter reused old engine-frame mapping');
const freshAttack=await ctlB.attack({slot:2,frequencyHz:330,gestureTimeMs:lifecycleNow});assert.equal(freshAttack.sourceFrame,newClockSource);

// Clock mapping must never silently cross an engine-frame regression inside one session.
let regNow=9000,regFrame=50000;const regSession={token:'token-r',sessionId:'sid-r',ownerEpoch:1};
async function regressionFetch(url,opt={}){
  if(url.endsWith('/v1/session')) return response(200,{...regSession,physicalAudio:false,sampleRate:48000,channels:2,deviceQuantumFrames:128,callbacks:1});
  const h=opt.headers||{};if(h['X-Xensonar-Token']!==regSession.token||h['X-Xensonar-Session']!==regSession.sessionId)return response(403,{ok:false});
  if(url.endsWith('/v1/status')){regNow+=1;return response(200,{ok:true,sessionId:regSession.sessionId,ownerEpoch:1,frame:regFrame,mailboxRevision:1});}
  return response(200,{ok:true});
}
const ctlR=new XensonarNativeControl({fetchImpl:regressionFetch,now:()=>regNow,sleep:async ms=>{regNow+=ms},baseUrl:'http://127.0.0.1:40001'});
await ctlR.connect({clockSamples:2,settleMs:0});regFrame=100;await assert.rejects(()=>ctlR.syncClock({samples:2,settleMs:0}),/frame regressed/);assert.equal(ctlR.sessionInvalid,true);assert.equal(ctlR.clockAgeMs,Infinity);

console.log(JSON.stringify({pass:true,checks:49,revision:ctl.revision,stateRequests,clockRttMs:ctl.clockRttMs,clockAgeMs:ctl.clockAgeMs,requests:requests.length,closed:ctl.closed,restart:{oldSession:'sid-a',newSession:ctlB.sessionId,oldClockSource,newClockSource,oldAdapterInvalid:ctlA.sessionInvalid,postInvalidationNetworkRequests:invalidAdapterNetworkDelta,capturedGesture:{sourceFrame:capturedSource,captureGeneration:capturedGeneration,currentGeneration:ctl.clockGeneration},regressionInvalidated:ctlR.sessionInvalid}}));
