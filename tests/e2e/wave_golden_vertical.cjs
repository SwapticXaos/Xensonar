'use strict';
// Wave Editor core: Golden Move & Mix with targetChannels (vertical drag retargets a single-channel
// mask: L -> L+R -> R). Usage: node tests/e2e/wave_golden_vertical.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch();const p=await (await b.newContext()).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForFunction(()=>window.__XenWaveCoreW01,null,{timeout:30000});
  const r=await p.evaluate(()=>{
    const C=__XenWaveCoreW01,mk=()=>{const L=new Float32Array(100),R=new Float32Array(100);for(let i=10;i<20;i++){L[i]=.5;R[i]=-.25}return C.create({sampleRate:48000,channels:[L,R]})};
    const run=(channels,targetChannels,position)=>{const d=C.edit(mk(),{type:'moveMix',range:{start:10,end:20},position,channels,targetChannels});
      const s=c=>[d.channels[c][10],d.channels[c][50]];return {L:s(0),R:s(1),sel:d.selection,d};};
    const out={};
    out.same=run('L',undefined,50);            // old behaviour
    out.toAll=run('L','all',50);               // L cut, L audio into both lanes
    out.toR=run('L','R',50);
    out.toRsame=run('L','R',10).d!==undefined;
    out.allIgnored=run('all',undefined,50);
    const u=C.undo(out.toAll.d);out.undo=[u.channels[0][10],u.channels[1][10],u.channels[0][50],u.channels[1][50]];
    return out;
  });
  assert.deepEqual([r.same.L,r.same.R],[[0,.5],[-.25,0]],'unchanged: L moves within L, R untouched');
  assert.deepEqual([r.toAll.L,r.toAll.R],[[0,.5],[-.25,.5]],'L -> L+R: L cut, L audio mixed into both lanes, R keeps its own');
  assert.deepEqual([r.toR.L,r.toR.R],[[0,0],[-.25,.5]],'L -> R: L audio cut and mixed into R');
  assert.deepEqual([r.allIgnored.L,r.allIgnored.R],[[0,.5],[0,-.25]],'both channels move together');
  assert.deepEqual(r.undo,[.5,-.25,0,0],'undo restores both lanes');
  assert.ok(r.toRsame,'same position but another lane is a valid move');
  assert.deepEqual(errors,[]);
  console.log('PASS wave golden move: vertical retarget L -> L+R -> R (core), undo');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
