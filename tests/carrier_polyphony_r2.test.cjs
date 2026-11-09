'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,'src',p),'utf8');
const {fixture,grid}=require('./helpers/carrier_runtime.cjs');
function compile(c,g){assert.equal(typeof c.__xenCompileCarrierGeometry,'function','machine-independent carrier geometry compiler is missing');return c.__xenCompileCarrierGeometry(g,{bars:1,beatsPerBar:4,bpm:120,baseHz:110})}
const sounding=(pattern,beat)=>pattern.notes.filter(n=>n.startBeat<=beat&&n.startBeat+n.durationBeats>beat);
test('two simultaneous painted melodies survive the actual raster reader with a quieter second voice',()=>{
 const c=fixture(),g=grid();for(let x=0;x<g.width;x++){g.set(x,35+Math.floor(x/8),.8);g.set(x,65-Math.floor(x/8),.04)}
 const result=compile(c,g),p=result.config.synthPattern;
 assert.equal(sounding(p,1).length,2);assert.equal(sounding(p,3).length,2);
 assert.ok(p.notes.every(n=>n.localField));assert.equal(result.summary.sourceVoiceCount,2);
 assert.equal(result.config.synthPatch.carrierIntegralTimbre.presetId,'basic-carrier');
});
test('geometry has no six-peaks-per-column collapse',()=>{
 const c=fixture(),g=grid();for(let x=0;x<g.width;x++)for(let y=20;y<76;y+=7)g.set(x,y,.7);
 assert.equal(sounding(compile(c,g).config.synthPattern,1).length,8);
});
test('silent intervals remain silent rather than being bridged by a single averaged note',()=>{
 const c=fixture(),g=grid();for(let x=0;x<g.width;x++)if(x<8||x>=24){g.set(x,45,.8);g.set(x,65,.5)}
 const p=compile(c,g).config.synthPattern;
 assert.equal(sounding(p,.5).length,2);assert.equal(sounding(p,2).length,0);assert.equal(sounding(p,3.5).length,2);
});
test('verified source-note identities preserve two true unison voices even at the same raster position',()=>{
 const c=fixture(),g=grid();g.melodicCarrier={version:'melodic-carrier-v1',durationBeats:4,rasterSignature:c.__f333Signature(g),notes:[
  {id:'a',voiceId:'first',trackId:'a',startBeat:0,durationBeats:4,pitchHz:[220,330],gainCurve:[.7,.7]},
  {id:'b',voiceId:'second',trackId:'b',startBeat:0,durationBeats:4,pitchHz:[220,330],gainCurve:[.5,.5]}]};
 assert.equal(sounding(compile(c,g).config.synthPattern,2).length,2);
});
test('empty geometry is a declared unavailable result, never an invented single note',()=>{
 const result=compile(fixture(),grid());assert.equal(result.config,null);assert.equal(result.summary.sourceVoiceCount,0);
});
test('Basic fallback PCM contains both simultaneous source frequencies',async()=>{
 const c=fixture(),g=grid();for(let x=0;x<g.width;x++){g.set(x,45,.8);g.set(x,70,.8)}
 const config=compile(c,g).config,buffer=await c.gze({config,durationSec:.3,bpm:120,sampleRate:8000}),pcm=buffer.getChannelData(0);
 const amplitude=hz=>{let re=0,im=0;for(let i=200;i<pcm.length;i++){const phase=2*Math.PI*hz*i/buffer.sampleRate;re+=pcm[i]*Math.cos(phase);im+=pcm[i]*Math.sin(phase)}return Math.hypot(re,im)/(pcm.length-200)};
 const levels=config.synthPattern.notes.map(n=>amplitude(n.lineHz));
 assert.ok(levels.every(level=>level>.01),'both voices must be audible in synthesized PCM');
 assert.ok(levels.every(level=>level>amplitude(723)*5),'the second voice must be a real spectral component');
});
module.exports={fixture,grid};
test('Basic PCM preserves sub-12ms geometry gaps at the actual output sample rate',async()=>{
 const c=fixture(),g=grid(2048,96);g.set(0,50,.8);g.set(8,50,.8);
 const config=compile(c,g).config;
 const pcm=(await c.gze({config,durationSec:2,bpm:120,sampleRate:8000})).getChannelData(0);
 assert.ok(pcm.slice(1,8).some(x=>x!==0),'first short event must sound');
 assert.ok(pcm.slice(64,72).some(x=>x!==0),'second short event must sound');
 assert.ok(pcm.slice(24,48).every(x=>x===0),'the authored 3–6ms gap must remain silent');
});
