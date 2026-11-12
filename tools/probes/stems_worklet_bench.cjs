// TEST ONLY: CPU cost of the stem capture processor per 128-frame quantum (V8, same engine as the audio thread), 4 and 5 stereo inputs, against the 2.9 ms budget at 44.1 kHz.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../../src/post-oct/036-xen-stem-recorder.js'),'utf8');
const code=src.slice(src.indexOf('function __xenStemsWorkletModule(){'),src.indexOf('const __XenStemRecorder='));
for(const stems of[1,4,5]){
 const box={Float32Array,Array,Math,Number,Infinity,ArrayBuffer};box.globalThis=box;box.currentFrame=0;let Cls;
 box.AudioWorkletProcessor=class{constructor(){this.port={postMessage(m){if(m.kind==='chunk')pending.push(m)},onmessage:null}}};box.registerProcessor=(n,c)=>{Cls=c};
 const pending=[];vm.createContext(box);vm.runInContext(code+';__xenStemsWorkletModule();',box);
 const p=new Cls({processorOptions:{stems,maxFrames:0}});p.port.onmessage({data:{kind:'start',startFrame:0}});
 const ins=Array.from({length:stems},(_,s)=>[Float32Array.from({length:128},(_,i)=>Math.sin(i*.1+s)),Float32Array.from({length:128},(_,i)=>Math.cos(i*.1+s))]);
 const N=200000;
 for(let i=0;i<20000;i++){p.process(ins);box.currentFrame+=128;while(pending.length){const m=pending.pop();p.port.onmessage({data:{kind:'recycle',stem:m.stem,data:new ArrayBuffer(8192*8)}})}}
 const t0=process.hrtime.bigint();
 for(let i=0;i<N;i++){p.process(ins);box.currentFrame+=128;if(pending.length)while(pending.length){const m=pending.pop();p.port.onmessage({data:{kind:'recycle',stem:m.stem,data:new ArrayBuffer(8192*8)}})}}
 const us=Number(process.hrtime.bigint()-t0)/1000/N;
 console.log(`${stems} stereo inputs: ${us.toFixed(2)} µs per 128-frame quantum = ${(us/2902*100).toFixed(3)} % of the 2.9 ms budget (44.1 kHz)`);
}
