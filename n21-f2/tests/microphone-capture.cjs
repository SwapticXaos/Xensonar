'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('src/forge/ui/03_microphone_intake.js','utf8');
let serial=0;const timers=new Map(),context=vm.createContext({Blob,File,Date,Error,navigator:{},performance:{now:()=>1000},setInterval:fn=>(timers.set(++serial,fn),serial),clearInterval:id=>timers.delete(id),setTimeout:fn=>(timers.set(++serial,fn),serial),clearTimeout:id=>timers.delete(id)});
vm.runInContext(source+';globalThis.create=__createForgeMicCapture;',context);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function stream(){const track={stops:0,onended:null,stop(){this.stops++;}};return{track,getTracks:()=>[track],getAudioTracks:()=>[track]};}
class Recorder{
 static isTypeSupported(type){return type==='audio/webm;codecs=opus';}
 constructor(s,options){this.state='inactive';this.mimeType=options?.mimeType||'audio/webm';Recorder.last=this;}
 start(){this.state='recording';}
 stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['actual-chunk'],{type:this.mimeType})});this.onstop?.();});}
}
function fixture(mediaDevices,RecorderClass=Recorder,secure=true){const states=[],files=[];const owner=context.create({onState:s=>states.push(s),onFile:async file=>{files.push(file);return true;},mediaDevices,Recorder:RecorderClass,secure});return{owner,states,files};}
(async()=>{
 const input=stream(),success=fixture({getUserMedia:async constraints=>{assert.equal(constraints.video,false);assert.equal(constraints.audio.echoCancellation,false);return input;}});
 await success.owner.start();assert.equal(success.states.at(-1).phase,'recording');assert.equal(timers.size,2);
 success.owner.stop();await flush();assert.equal(success.files.length,1);assert.equal(success.files[0].type,'audio/webm;codecs=opus');assert.match(success.files[0].name,/^Mikrofon_.*\.webm$/);assert.equal(await success.files[0].text(),'actual-chunk');assert.equal(input.track.stops,1);assert.equal(timers.size,0);assert.equal(success.states.at(-1).phase,'idle');success.owner.dispose();
 let resolve;const lateInput=stream(),late=fixture({getUserMedia:()=>new Promise(r=>resolve=r)});const pending=late.owner.start();late.owner.cancel();resolve(lateInput);await pending;assert.equal(lateInput.track.stops,1);assert.equal(late.files.length,0);late.owner.dispose();
 const abandonedInput=stream(),abandoned=fixture({getUserMedia:async()=>abandonedInput});await abandoned.owner.start();abandoned.owner.dispose();await flush();assert.equal(abandonedInput.track.stops,1);assert.equal(abandoned.files.length,0);
 const denied=fixture({getUserMedia:async()=>{throw Object.assign(Error('denied'),{name:'NotAllowedError'});}});await denied.owner.start();assert.equal(denied.states.at(-1).phase,'failed');assert.match(denied.states.at(-1).message,/Berechtigung|berechtigung/);denied.owner.dispose();
 const brokenInput=stream(),broken=fixture({getUserMedia:async()=>brokenInput},class{constructor(){throw Error('encoder failed');}});await broken.owner.start();assert.equal(brokenInput.track.stops,1);assert.equal(broken.states.at(-1).phase,'failed');broken.owner.dispose();
 const emptyInput=stream(),empty=fixture({getUserMedia:async()=>emptyInput},class extends Recorder{stop(){this.state='inactive';queueMicrotask(()=>this.onstop?.());}});await empty.owner.start();empty.owner.stop();await flush();assert.equal(empty.files.length,0);assert.equal(empty.states.at(-1).phase,'failed');assert.equal(emptyInput.track.stops,1);empty.owner.dispose();
 const capInput=stream(),cap=fixture({getUserMedia:async()=>capInput});await cap.owner.start();[...timers.values()].at(-1)();await flush();assert.equal(cap.files.length,1);assert.equal(capInput.track.stops,1);cap.owner.dispose();
 const errorInput=stream(),error=fixture({getUserMedia:async()=>errorInput});await error.owner.start();Recorder.last.onerror({error:Error('device failed')});await flush();assert.equal(error.files.length,0);assert.equal(errorInput.track.stops,1);assert.equal(error.states.at(-1).phase,'failed');error.owner.dispose();
 const unsupported=fixture({getUserMedia:()=>{throw Error('must not request');}},Recorder,false);await unsupported.owner.start();assert.equal(unsupported.states.at(-1).phase,'failed');unsupported.owner.dispose();assert.equal(timers.size,0);
 fs.mkdirSync('results/microphone',{recursive:true});fs.writeFileSync('results/microphone/lifecycle.json',JSON.stringify({passed:true,completedFile:true,noMonitoring:true,latePermissionReleased:true,unmountReleased:true,denial:true,encoderFailure:true,emptyCapture:true,timeCap:true,recorderError:true,secureContextCheck:true,timersRemaining:timers.size},null,2)+'\n');
 console.log('PASS microphone lifecycle: file handoff, late permission/cancel, unmount, denial, encoder/error/empty data, 60s cap and complete resource cleanup');
})().catch(error=>{console.error(error);process.exitCode=1});
