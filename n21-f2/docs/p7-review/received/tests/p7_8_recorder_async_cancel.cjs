const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.argv[2]||require('node:path').resolve(__dirname,'..');
const src=fs.readFileSync(root+'/src/audio/03_rfl_transport_legacy.js','utf8');
const impl=src.slice(src.indexOf('function pve('),src.indexOf('function hve('));
assert(impl.startsWith('function pve('));
const events=[],ctx={Blob, eL:(t)=>events.push(t),ave:(data)=>['waveform'],dve:({decoded})=>({hasTake:true,durationMs:decoded.duration*1000})};
vm.createContext(ctx);vm.runInContext(impl+';this.fn=pve',ctx);
const ref=v=>({current:v});
async function scenario(aborted,abortDuringDecode){
 let writes=0,decodeCalls=0,resume;
 const marker=ref([]),buffer=ref(null),state={isRecording:true,hasTake:false};
 const setState=fn=>{writes++;Object.assign(state,fn(state));};
 const media={mimeType:'audio/webm'};
 const data={ctx:{decodeAudioData:async()=>{decodeCalls++;if(abortDuringDecode) await new Promise(r=>{resume=r});return {duration:1}}},recorder:media,mimeType:'audio/webm',recordingChunksRef:ref([new Blob(['abc'])]),recordedBufferRef:buffer,recordingMarkersRef:marker,lastRecordingSourceModeRef:ref('with_drums'),updateRecordingPreviewUrl:()=>{writes++},setRecordingWaveform:()=>{writes++},setRecordingPlayheadMs:()=>{writes++},setRecordingState:setState,isDiscarded:()=>aborted};
 const done=ctx.fn(data)();
 if(abortDuringDecode){while(!resume)await new Promise(r=>setTimeout(r,0));aborted=true;data.isDiscarded=()=>aborted; /* closure captures mutable isDiscarded variable below */resume();}
 await done;return {writes,decodeCalls,buffer:buffer.current,state};
}
(async()=>{
 // callback is already rejected when cancelled before onstop
 const cancelled=await scenario(true,false);
 assert.equal(cancelled.decodeCalls,0);assert.equal(cancelled.writes,0);assert.equal(cancelled.buffer,null);
 const normal=await scenario(false,false);
 assert.equal(normal.decodeCalls,1);assert.equal(normal.state.hasTake,true);
 // Cancellation during decode - closure must read changing cancellation state
 let cancelledNow=false,releaseDecode,buffer=ref(null),updates=0;
 const media={mimeType:'audio/webm'},onstop=ctx.fn({ctx:{decodeAudioData:async()=>new Promise(res=>releaseDecode=res)},recorder:media,mimeType:'audio/webm',recordingChunksRef:ref([new Blob(['abc'])]),recordedBufferRef:buffer,recordingMarkersRef:ref([]),lastRecordingSourceModeRef:ref('with_drums'),updateRecordingPreviewUrl:()=>{},setRecordingWaveform:()=>{updates++},setRecordingPlayheadMs:()=>{updates++},setRecordingState:()=>{updates++},isDiscarded:()=>cancelledNow});
 const job=onstop();for(let n=0;n<100&&!releaseDecode;n++)await new Promise(r=>setTimeout(r,0));assert(releaseDecode,'decoder not reached');cancelledNow=true;releaseDecode({duration:1});await job;assert.equal(buffer.current,null);assert.equal(updates,0);
 console.log('PASS recorder normal/aborted/abort-in-decoder callback contracts');
})().catch(e=>{console.error(e);process.exit(1)});
