'use strict';
const assert=require('node:assert/strict');
const core=require('../src/forge/fractalia/01_core.js')();
const grid={width:96,height:128,getColumn:x=>Float32Array.from({length:128},(_,y)=>{
 const a=Math.sin(x/95*Math.PI*11)*14+50;
 return Math.abs(y-a)<1.2||Math.abs(y-(a+22))<.8? .9:0;
})};
const track={gainAt:t=>t>=.04&&t<.5?.6:0,at:t=>({gain:t>=.04&&t<.5?.6:0,hz:220})};
(async()=>{
 const normal=core.capture({grid,resolution:'standard'}),fine=core.capture({grid,resolution:'fine'});
 assert.equal(normal.columns,24);assert.equal(normal.rows,128);assert.equal(fine.columns,48);assert.equal(fine.rows,256);
 assert.equal(fine.field.length,12288);
 const recipe=core.settings({name:'Fine visual spectrum',material:fine});
 const saved=JSON.parse(JSON.stringify({schema:'xensonar.fractalia-instrument',version:3,engine:core.ENGINE,recipe}));
 const reopened=core.importInstrument(saved);
 assert.deepEqual(reopened.material,fine);
 const atlas=await core.compile({grid,tracks:[track],durationSec:1,instrument:recipe});
 const reopenedAtlas=await core.compile({grid,tracks:[track],durationSec:1,instrument:reopened});
 assert.equal(atlas.states.length,17);assert.deepEqual(atlas.states,reopenedAtlas.states);
 const a=await core.renderPCM({tracks:[track],durationSec:.7,atlas,sampleRate:24000});
 const b=await core.renderPCM({tracks:[track],durationSec:.7,atlas:reopenedAtlas,sampleRate:24000});
 assert.deepEqual(a.left,b.left);assert(a.left.some(x=>Math.abs(x)>.0001));
 const normalAtlas=await core.compile({grid,tracks:[track],durationSec:1,instrument:core.settings({name:'Standard',material:normal})});
 assert.equal(normalAtlas.states.length,9);
 assert.notDeepEqual(normal.field,fine.field);
 console.log('PASS fine capture 48x256 and 17 states');
 console.log('PASS fine instrument saved JSON import and replay deterministic audio');
 console.log('PASS standard 24x128 9-state path remains available');
})().catch(e=>{console.error(e);process.exitCode=1});
