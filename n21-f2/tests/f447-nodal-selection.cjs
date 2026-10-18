'use strict';const fs=require('fs'),assert=require('assert/strict');
const create=new Function('__XenNodalLibrary','__XenNodalLive','__XenNodalModel',fs.readFileSync('src/nodal/12_surface_runtime.js','utf8')+';return createNodalSurfaceRuntime')({}, {}, {});
let compiled=0,prepared=true,calls=0;const instrument=Object.freeze({name:'Test',nodes:[{id:'one',muted:false}]});const ctx={state:'running',sampleRate:48000,currentTime:0};
const player={snapshot:()=>({disposed:false}),isPrepared:()=>prepared,prepare:async()=>{calls++;prepared=true},route(){},dispose(){}};
const lib={list:()=>[{id:'one',revision:1,instrument}]};const api=create({library:lib,live:{createPlayer:async()=>player},model:{compile:()=>{compiled++;return {cost:1,silent:false}}}});
(async()=>{for(let i=0;i<100;i++)api.options([]);assert.equal(compiled,0,'P2B: React option renders must not compile DSP on the main thread');
 api.configure({getContext:()=>ctx,ensureReady:async()=>{},getOutput:()=>({})});await api.select('wave','nodal:one@1');prepared=false;await api.select('wave','nodal:one@1');assert.equal(calls,2,'returning to evicted plan must prepare it again');console.log('PASS deferred Nodal option eligibility, preparation renewed after plan eviction');})().catch(e=>{console.error(e);process.exitCode=1});
