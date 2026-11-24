'use strict';
// METER-BENCH: Taktometer meter analysis + song parts on real audio files, optional ground truth (gen_prog.py).
// Usage:
//   node tools/meter_bench/bench.cjs <dir with .wav/.mp3/.ogg/.flac> [truth.json]
// Decodes with ffmpeg (mono, 44.1 kHz). Prints per file: meter of the song (segments per bar, BPM, grouping) and the parts
// (letter @ start · bars × segments). With truth.json (from gen_prog.py) it also scores the song meter, the parts and
// 2-bar Taktometer masks per section, exact and imprecise (+18 ms start, +27 ms end).
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const extract=require('../../tests/helpers/extract_function.cjs'),src=p=>fs.readFileSync(path.join(__dirname,'..','..','src','rooms',p),'utf8');
const P=new Function(extract(src('00_meter_analysis.js'),'__xenMeterAnalysisFactory')+'\n'+extract(src('00_song_parts.js'),'__xenSongPartsFactory')+
 '\nconst m=__xenMeterAnalysisFactory();return {M:m,S:__xenSongPartsFactory(m)};')();
const dir=process.argv[2],truth=process.argv[3]?JSON.parse(fs.readFileSync(process.argv[3],'utf8')):null,SR=44100;
if(!dir){console.error('usage: node tools/meter_bench/bench.cjs <audio dir> [truth.json]');process.exit(2)}
const decode=f=>{const b=execFileSync('ffmpeg',['-v','error','-i',f,'-ac','1','-ar',String(SR),'-f','f32le','-'],{maxBuffer:1<<30});return new Float32Array(b.buffer,b.byteOffset,b.length/4)};
const score={songMeter:0,songParts:0,takt:0,taktTop3:0,taktN:0,files:0};
for(const f of fs.readdirSync(dir).filter(f=>/\.(wav|mp3|ogg|flac|m4a)$/i.test(f)).sort()){
 const x=decode(path.join(dir,f)),asset={monoSamples:x,sampleRate:SR,originalDuration:x.length/SR},t0=Date.now();
 const r=P.S.snap(P.S.analyze(P.S.decimate(x,SR)),asset),ms=Date.now()-t0;score.files++;
 const meter=r.rhythmic?`${r.segmentsPerBar} per bar${r.groups?' ('+r.groups.join('+')+')':''} · ${r.bpm.toFixed(2)} BPM`:'no meter';
 console.log(`${f} · ${(x.length/SR).toFixed(1)} s · ${ms} ms · ${meter}\n   ${r.parts.map(p=>`${p.label}@${p.loopStartSec.toFixed(2)} ${p.bars}×${p.segmentsPerBar}${p.ownMeter?'*':''}`).join('  ')}`);
 const t=truth?.find(t=>f.startsWith(t.name));if(!t)continue;
 const seg=t.segSec,s0=t.sections[0],bar=r.rhythmic?r.segmentsPerBar*60/r.bpm:0,g0=s0.groups;
 const mOK=r.rhythmic&&Math.abs(bar/(s0.S*seg)-1)<.03&&(r.segmentsPerBar===s0.S||(g0.every(g=>g===g0[0])&&r.segmentsPerBar*g0[0]===s0.S));
 let lab=r.parts.map(p=>p.label).join('');if(lab.length===t.sections.length+1&&r.parts.at(-1).bars<=2)lab=lab.slice(0,-1);
 const pOK=lab===t.sections.map(s=>s.label).join('')&&t.sections.every((s,i)=>i===0||Math.abs(s.startSeg*seg-r.parts[i].loopStartSec)<seg*1.5);
 score.songMeter+=mOK;score.songParts+=pOK;console.log(`   truth ${t.sections.map(s=>s.label+s.bars+'×'+s.S).join(' ')} · meter ${mOK?'ok':'WRONG'} · parts ${pOK?'ok':'WRONG'}`);
 for(const s of t.sections){const st=(s.startSeg+s.S)*seg,len=2*s.S*seg;for(const [ds,de] of [[0,0],[.018,.045]]){
  const a=P.M.analyze(asset,st+ds,len+de-ds);score.taktN++;
  const eq=(n,S)=>(n===2*s.S&&S===s.S)||(s.groups.every(g=>g===s.groups[0])&&n*s.groups[0]===2*s.S&&S*s.groups[0]===s.S);
  score.takt+=!!(a.ok&&eq(a.segments,a.best?.segmentsPerBar));score.taktTop3+=!!(a.ok&&a.readings.slice(0,3).some(q=>eq(a.segments,q.segmentsPerBar)))}}
}
console.log(JSON.stringify(score));
