'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const target=process.argv[2]||path.resolve(__dirname,'..');
const directory=fs.statSync(target).isDirectory();
const runtime=fs.readFileSync(directory?path.join(target,'src/audio/05_live_voice_runtime.js'):target,'utf8');
const controller=directory?fs.readFileSync(path.join(target,'src/audio/hold_resident.js'),'utf8'):runtime.slice(runtime.indexOf('const __XenHoldResident='),runtime.indexOf('\n})();',runtime.indexOf('const __XenHoldResident='))+7);
const start=runtime.indexOf('function nq(e){'),end=runtime.indexOf('\n\nconst PAe=',start);assert(start>=0&&end>start,'nq source anchors');
const observations=[],spec={tones:[0,1,2],bodyExciter:{profile:null,freq:220,gain:0,options:{}}};
const box={console,performance:{now:()=>0},queueMicrotask,Uint32Array,Map,Set,
 tq:()=>spec,__entWasAdmitted:x=>x,__XenHoldCompositeIntegrity:{observe(...x){observations.push(x)}}};
vm.createContext(box);vm.runInContext(controller+'\nglobalThis.H=__XenHoldResident;\n'+runtime.slice(start,end),box);
function mock(){const listeners=new Set,posts=[];return {host:{profile:1,epoch:7,canSubmit:true,node:{port:{addEventListener(type,fn){listeners.add(fn)},removeEventListener(type,fn){listeners.delete(fn)},postMessage(m){posts.push(m)}}}},posts,reply(m){for(const fn of [...listeners])fn({data:m})}}}
function begin(key){return box.H.session(key,{intervalMs:100,startedAtMs:0,pulseCount:0},{state:'running',currentTime:0,sampleRate:48000},[1,1,1],'glass',217.37)}
function attack(s,m,failIndex=-1){let i=0;box.nq({holdSession:s,callbacks:{playGradientTone(){const index=i++,ok=index!==failIndex;if(ok){const r=new Uint32Array(64);r[3]=128+index*32;box.H.capture(s,m.host,r)}return ok},triggerBodyExciter(){}}})}
(async()=>{
 const m=mock(),s=begin('complete');attack(s,m);await Promise.resolve();assert(s.sealed);assert.equal(m.posts.filter(x=>x.type==='HOLD_COMMIT').length,1);
 attack(s,m,2);assert.equal(box.H.peek('complete'),s,'sealed full preparation survives later partial fallback');assert(!s.unsupported);assert.equal(observations.at(-1)[3],false,'later live partial is not a resident invalidation');
 m.reply({type:'HOLD_READY',id:s.id,epoch:6,count:3});assert.equal(box.H.diagnostics().totals.ready,0,'stale epoch READY ignored');
 m.reply({type:'HOLD_READY',id:s.id,epoch:7,count:3});assert.equal(m.posts.filter(x=>x.type==='HOLD_GO').length,1);
 m.reply({type:'HOLD_GO_READY',id:s.id,epoch:6});assert(!s.armed,'stale epoch GO_READY ignored');
 m.reply({type:'HOLD_GO_READY',id:s.id,epoch:7});assert(s.armed);assert.equal(m.posts.filter(x=>x.type==='HOLD_FIRE').length,1);
 box.H.stopKey('complete');const before=box.H.diagnostics().totals.active;m.reply({type:'HOLD_ACTIVE',id:s.id,epoch:7});assert.equal(box.H.peek('complete'),null);assert.equal(box.H.diagnostics().totals.active,before,'STOP cannot resurrect');
 const failure=mock(),f=begin('prefix-failure');attack(f,failure);await Promise.resolve();
 failure.reply({type:'HOLD_READY',id:f.id,epoch:7,count:3});failure.reply({type:'HOLD_GO_READY',id:f.id,epoch:7});assert(f.armed);
 failure.reply({type:'HOLD_PREFIX_UNDERRUN',id:f.id,epoch:6});assert(f.armed,'stale failure cannot stop a new epoch');
 failure.reply({type:'HOLD_PREFIX_UNDERRUN',id:f.id,epoch:7});assert(!f.armed);assert.equal(box.H.peek(f.key),null);assert.equal(failure.posts.at(-1).type,'HOLD_STOP');assert.equal(box.H.diagnostics().totals.prefixUnderruns,1);
 const partial=mock(),u=begin('initial-partial');attack(u,partial,2);await Promise.resolve();assert(u.unsupported,'initial partial remains unsupported');assert.equal(box.H.peek('initial-partial'),null);assert.equal(partial.posts.filter(x=>x.type==='HOLD_COMMIT').length,0,'partial capture cannot become a full program');
 const limit=mock(),large=begin('too-large');for(let i=0;i<9;i++)box.H.capture(large,limit.host,new Uint32Array(64));await Promise.resolve();assert(large.unsupported);assert.equal(limit.posts.filter(x=>x.type==='HOLD_COMMIT').length,0,'oversized capture must not arm a truncated group');
 const masked=mock(),v=begin('mask-change');attack(v,masked);await Promise.resolve();const replaced=box.H.session(v.key,{intervalMs:100,startedAtMs:0,pulseCount:0},{state:'running',currentTime:0,sampleRate:48000},[1,0,1],'glass',217.37);assert.notEqual(replaced,v);assert.equal(masked.posts.at(-1).type,'HOLD_STOP');box.H.clear();assert.equal(box.H.diagnostics().sessions,0);
 const summary={controllerLifecycle:'GREEN',sealedPrepSurvivesPartial:true,initialPartialRejected:true,staleEpochIgnored:true,stopFenced:true,completeInstrumentBeforeAdmission:'BLOCKED: capture still follows successful callback admission; this fix does not repair first attacks'};
 console.log(JSON.stringify(summary,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
