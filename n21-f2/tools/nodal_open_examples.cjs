'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,'src/nodal',f),'utf8');
const {model,dsp,starter}=new Function(['01_instrument_model.js','02_synthesis_kernel.js','07_sound_designer.js'].map(read).join('\n')+';return{model:__XenNodalModel,dsp:__XenNodalDSP,starter:nodalOpenStarter}')();
const out=path.join(root,'examples/nodal_open');fs.mkdirSync(out,{recursive:true});
const sr=48000,segmentSec=4.5,notes=[{at:0,ratio:1,durationSec:.28,velocity:.8},{at:.52,ratio:7/6,durationSec:.12,velocity:.55},{at:.86,ratio:11/8,durationSec:.58,velocity:.75,pitchCurve:[0,.18,.4,.1,0]},{at:1.65,ratio:13/8,durationSec:.22,velocity:.6},{at:2.15,ratio:1,durationSec:.45,velocity:.85}];
const ids=['prism','ember','hollow','filament','reed','obsidian'],frames=Math.round(segmentSec*sr),left=new Float32Array(frames*ids.length),right=new Float32Array(left.length),segments=[];
for(let index=0;index<ids.length;index++){
 const id=ids[index],instrument=starter(id),plan=model.compile(instrument),l=new Float32Array(frames),r=new Float32Array(frames);
 for(const note of notes){const result=dsp.render(plan,{frequency:220*note.ratio,durationSec:note.durationSec,velocity:note.velocity,gain:.7,pitchCurve:note.pitchCurve},sr),offset=Math.round(note.at*sr);for(let k=0;k<result.pcm.length&&offset+k<frames;k++){l[offset+k]+=result.left[k];r[offset+k]+=result.right[k];}}
 let sum=0,peak=0;for(let k=0;k<frames;k++){sum+=(l[k]*l[k]+r[k]*r[k])*.5;peak=Math.max(peak,Math.abs(l[k]),Math.abs(r[k]));}const rms=Math.sqrt(sum/frames),normalizationGain=Math.min(.035/Math.max(1e-12,rms),.75/Math.max(1e-12,peak));
 for(let k=0;k<frames;k++){left[index*frames+k]=l[k]*normalizationGain;right[index*frames+k]=r[k]*normalizationGain;}
 fs.writeFileSync(path.join(out,id+'.xen-nodal.json'),model.serialize(instrument)+'\n');segments.push({instrument:id,startSec:index*segmentSec,endSec:(index+1)*segmentSec,normalizationGain,rawRms:rms,rawPeak:peak});
}
// IEEE float stereo WAV, no intermediate lossy encoding.
const bytes=left.length*8,wav=Buffer.alloc(44+bytes);wav.write('RIFF');wav.writeUInt32LE(36+bytes,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(3,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(sr,24);wav.writeUInt32LE(sr*8,28);wav.writeUInt16LE(8,32);wav.writeUInt16LE(32,34);wav.write('data',36);wav.writeUInt32LE(bytes,40);for(let k=0;k<left.length;k++){wav.writeFloatLE(left[k],44+k*8);wav.writeFloatLE(right[k],48+k*8);}
const name='Nodal_Open_Soundspace_Identical_Phrase.wav';fs.writeFileSync(path.join(out,name),wav);fs.writeFileSync(path.join(out,'comparison_fixture.json'),JSON.stringify({sampleRate:sr,referenceHz:220,notes,segments,wavSha256:crypto.createHash('sha256').update(wav).digest('hex'),note:'One constant gain per complete segment for level-controlled comparison; no dynamic normalization.'},null,2)+'\n');
console.log('Created six exact instrument recipes and 27-second level-controlled stereo comparison.');
