'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),h=require('./helpers/rfl-resident.cjs'),s=h.sources();
const old=fs.readFileSync('tests/fixtures/live-stability/rfl-preparation-baseline.js','utf8'),rows=[];
for(const rate of [44100,48000,96000])for(const channels of [1,2]){
 const pcm=Array.from({length:channels},(_,c)=>Float32Array.from({length:4096},(_,i)=>.2*Math.sin(i*.039+c*.7)+.08*Math.cos(i*.137)));
 const pair=[old,s.preparation].map(source=>h.prepare(source,pcm,rate));let comparedBytes=0;
 for(const key of ['amp','slope','energy','peak','base','cross']){
  const a=pair[0][key],b=pair[1][key];assert.equal(a.constructor,b.constructor);
  assert(Buffer.from(a.buffer).equals(Buffer.from(b.buffer)),'worker extraction must retain the exact '+key+' map');comparedBytes+=a.byteLength;
 }
 for(const key of ['version','sourceId','sr','n','duration','hop'])assert.equal(pair[0][key],pair[1][key]);
 rows.push({rate,channels,comparedBytes,byteIdentical:true});
}
fs.writeFileSync('results/live-stability/preparation.json',JSON.stringify({rows},null,2)+'\n');
console.log('PASS fragment worker extraction: all six cut-map arrays byte-identical in mono/stereo at 44.1/48/96kHz');
