import assert from 'node:assert/strict';
import { getOrRenderSpectralForgePreviewBuffer as render, clearSpectralForgePreviewRenderCache as clear, getSpectralForgePreviewRenderInflightSize as inflight, hasSpectralForgePreviewBuffer as has } from '../../src/features/l3lab/spectralForge/audio/spectralPreviewRenderCache';
async function main(){
 let resolveOld!:(x:any)=>void, resolveNew!:(x:any)=>void;
 clear();const old=render('same',()=>new Promise(r=>resolveOld=r));
 clear();const fresh=render('same',()=>new Promise(r=>resolveNew=r));
 const oldBuffer={id:'old'} as any, newBuffer={id:'new'} as any;
 resolveOld(oldBuffer);assert.equal((await old).buffer,oldBuffer);
 assert.equal(has('same'),false);assert.equal(inflight(),1);
 let duplicate=0;const shared=render('same',async()=>{duplicate++;return oldBuffer;});
 resolveNew(newBuffer);assert.equal((await fresh).buffer,newBuffer);assert.equal((await shared).buffer,newBuffer);assert.equal(duplicate,0);assert.equal(inflight(),0);
 const cached=await render('same',async()=>oldBuffer);assert.equal(cached.buffer,newBuffer);assert.equal(cached.cacheHit,true);
 clear();await assert.rejects(render('bad',()=>Promise.reject(Error('render failed'))));assert.equal(inflight(),0);assert.equal(has('bad'),false);
 console.log(JSON.stringify({proofClass:'behavioural-async-cache',passed:4,results:['clear does not resurrect stale cache','old completion preserves new inflight ownership','deduplication returns new body','failure releases inflight entry']},null,2));
}main().catch(e=>{console.error(e);process.exitCode=1;});
