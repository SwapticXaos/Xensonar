'use strict';
const assert=require('node:assert/strict');const fs=require('fs');
const s=fs.readFileSync(process.argv[2]||'src/audio/01_voice_and_rfl_ownership.js','utf8');
const marker='const __XenMaterialStandalonePreview=';const start=s.indexOf(marker);
assert(start>=0,'Material Track independent preview helper must exist');
const end=s.indexOf('const FI=',start);assert(end>start);
const body=s.slice(start,end);
const URLs=[];const revoked=[];const played=[];const Audios=[];
const fakeAudio=function(){const a={paused:false,src:'',onended:null,onerror:null,load(){},pause(){this.paused=true},play(){played.push(this.src);return Promise.resolve()}};Audios.push(a);return a};
const URL={createObjectURL(blob){URLs.push(blob);return 'blob:test-'+URLs.length},revokeObjectURL(x){revoked.push(x)}};
const a=new Function('Audio','URL','bs','Blob',body+';return __XenMaterialStandalonePreview;')(
 fakeAudio,URL,()=>({entries:[{id:'sample-a',blob:{size:10},name:'A'},{id:'sample-b',blob:{size:10},name:'B'}]}),class Blob{});
(async()=>{
 assert.equal(await a.toggleById('sample-a'),'playing');assert.equal(played.length,1);
 assert.equal(await a.toggleById('sample-a'),'stopped');assert.equal(Audios[0].paused,true);assert.deepEqual(revoked,['blob:test-1']);
 assert.equal(await a.toggleById('sample-b'),'playing');assert.equal(played.length,2);
 assert.equal(await a.toggleById('missing'),'unavailable');assert.equal(Audios[1].paused,true);
 assert.equal(a.activeId(),null);
 console.log('PASS independent preview plays/stops/revokes by id without main power or transport');
})().catch(err=>{console.error(err);process.exitCode=1});
