const {modules}=require('./speed3_film_contract.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const mods=process.argv.slice(2).map(modules),rows=[];
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
for(const [sourceRate,target] of [[22050,16000],[48000,44100],[96000,44100],[96000,48000],[48001,44100]]){
 const model={sampleRate:sourceRate,samples:Float32Array.from({length:120000},(_,i)=>.17*Math.sin(i*.091)+.05*Math.cos(i*.041)),referenceHz:173};
 const geometry=mods.map(m=>m.film.spectralFilmGeometry(model,{sourceStart:0,sourceEnd:120000},target,2048));
 const times=[[],[]],references=[];
 for(let rep=-1;rep<3;rep++)for(const idx of rep%2===0?[1,0]:[0,1]){
  const buffers=[];const t=performance.now();
  for(let frame=0;frame<8;frame++){const out=mods[idx].film.readSpectralFilm(model,geometry[idx],12000.123456789+frame*83.27);buffers.push(Buffer.from(out.re.buffer),Buffer.from(out.im.buffer));}
  const elapsed=performance.now()-t,bytes=Buffer.concat(buffers);if(!references[0])references[0]=bytes;else assert.deepEqual(bytes,references[0]);if(rep>=0)times[idx].push(elapsed);
 }
 const row={sourceRate,target,size:2048,frames:8,baselineMs:median(times[0]),candidateMs:median(times[1]),times,float64Identical:true};row.savingPercent=100*(1-row.candidateMs/row.baselineMs);rows.push(row);console.log(JSON.stringify(row));
}
fs.writeFileSync(process.env.OUT||path.join(__dirname,'../results/speed3-film-perf.json'),JSON.stringify({runtime:process.version,rows},null,2)+'\n');
