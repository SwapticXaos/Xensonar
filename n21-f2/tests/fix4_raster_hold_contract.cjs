'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),vm=require('node:vm');
const dir=path.resolve(__dirname,'..');
const graphics=fs.readFileSync(path.join(dir,'src/rhythm/03_live_drum_bodies.js'),'utf8');
const source=fs.readFileSync(path.join(dir,'src/runtime/instrument/05_timing_and_admission.js'),'utf8');
function extract(name){const i=graphics.indexOf('function '+name+'(');assert(i>=0);const j=graphics.indexOf('function W2e(',i);return vm.runInNewContext('('+graphics.slice(i,j).trim()+')',{Me:(x,a,b)=>Math.min(b,Math.max(a,x)),Qa:y=>440,Zs:x=>x,uw:()=>[440,550],vr:1100,iw:Array(13).fill(0),performance:{now:()=>1000},Math});}
const grid=extract('V2e');
function paint(initialWidth,partMask){
 let move=null,line=null,strokes=[],stack=[];let ctx={lineWidth:initialWidth,strokeStyle:'rgba(200,200,200,1)',fillStyle:'',beginPath(){},closePath(){},moveTo(x,y){move=[x,y]},lineTo(x,y){line=[x,y]},arc(){},fill(){},save(){stack.push({lineWidth:this.lineWidth,strokeStyle:this.strokeStyle,fillStyle:this.fillStyle})},restore(){Object.assign(this,stack.pop()||{})},setLineDash(){},fillText(){},stroke(){if(move&&line&&move[0]===0&&line[0]===1100&&move[1]===line[1])strokes.push({y:move[1],style:String(this.strokeStyle),width:this.lineWidth})},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})};
 const ref={current:null},zero={current:0};
 grid({ctx,state:{cursorX:110,cursorY:190},params:{gridOn:true,gridBase:440,gridTuning:'12edo',manualGridMutedSteps:[],manualGridStepOffsets:[],lockCursorToGrid:false,agentEnabled:partMask,particleSystem:'ji',churchMode:'ionian'},t:0,focusCursorRef:{current:{x:110,y:190}},getVisibleGridLines:()=>[{freq:440,label:'A4',stepIndex:0,manualMuted:false,modeMuted:false},{freq:550,label:'C#5',stepIndex:1,manualMuted:false,modeMuted:false}],activeGridLineFreqRef:ref,activeGridLineSinceRef:zero,previousGridLineFreqRef:ref,previousGridLineAtRef:zero,keyboardWindowOffsetRef:zero});return strokes;
}
const before=paint(3,[true,true]); const after=paint(1,[false,true]);
assert(before.length>=2,'real raster strokes captured');
assert.deepEqual(after,before,'N/M must not change raster stroke width when particle trails alter canvas state');
console.log('PASS raster drawing ignores inherited particle canvas lineWidth');
// The resident worklet must fade only targeted held particle voice rather than zeroing audio instantly.
const marker='registerProcessor("xensonar-particle-resident-v1"';
const pos=source.indexOf(marker);const start=source.lastIndexOf('=`',pos)+2,end=source.indexOf('`,ire=`',pos);
assert(pos>0&&end>start);let Processor;
class FakeAudioWorkletProcessor{constructor(){this.port={postMessage(){},onmessage:null}}}
vm.runInNewContext(source.slice(start,end).replace(/export\{F as ParticleResidentProcessor\};\s*$/,''),{AudioWorkletProcessor:FakeAudioWorkletProcessor,registerProcessor:(name,ctor)=>{if(name==='xensonar-particle-resident-v1')Processor=ctor},sampleRate:48000,currentFrame:0,Float32Array,Float64Array,Uint8Array,Uint16Array,Math,Number,ArrayBuffer});
assert(Processor);let resident=new Processor({processorOptions:{session:31}}),core=resident.core;resident.ready=true;
core.bank=new Float32Array(782718);for(let i=0;i<2049;i++)core.bank[i]=Math.sin(i/2048*Math.PI*2);
function armFake(index,id){core.active[index]=1;core.activeCount++;let rec=core.records[index];rec[1]=id;rec[2]=1;rec[3]=0;rec[4]=1;rec[5]=48000;rec[6]=96000;rec[7]=.0001;rec[8]=.8;rec[9]=.8;rec[10]=1;rec[11]=.99999;rec[12]=90000;rec[13]=.8;rec[14]=.05;rec[15]=0;rec[16]=1;rec[17]=1;rec[20]=1;core.filterCost++;}
armFake(0,42);armFake(1,43);
function render(frame){const buf=[new Float32Array(128),new Float32Array(128)];core.render(frame,[buf]);return buf[0];}
const playing=render(0);assert(playing.some(x=>Math.abs(x)>.05));
resident.port.onmessage({data:{type:'cut',session:31,id:42}});
assert(core.active[0]===1,'targeted held particle should remain active during short declick release');
assert(core.active[1]===1,'unrelated particle must remain active');
const tail=render(128);assert(tail.some(x=>Math.abs(x)>.05),'release begins with audible samples, no discontinuity');
for(let f=256;f<=768;f+=128) render(f);
assert.equal(core.active[0],0,'held particle must end within a few milliseconds');
assert.equal(core.active[1],1,'unrelated tone continues');
console.log('PASS resident processor performs targeted, bounded declick fade');
