'use strict';
// LIVE-GF-01: the C11 host must not store per-block samples into plain object fields
// (a double store into an object field boxes a heap number: garbage on the audio thread).
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const s=fs.readFileSync(path.resolve(__dirname,'../src/audio/entrophon/02_worklet_and_voice_backend.js'),'utf8');
const end=s.indexOf('registerProcessor(\\"xensonar-c11-host\\",U);');assert(end>0);
let i=end;do{i=s.lastIndexOf('"',i-1)}while(s[i-1]==='\\');
const src=JSON.parse(s.slice(i,s.indexOf('";',end)+1));
new Function('AudioWorkletProcessor','registerProcessor','sampleRate','currentFrame',src); // still parses
assert(/this\.lastMain=new Float64Array\(2\)/.test(src),'typed last-sample store is allocated once in the constructor');
assert(!/this\.lastMain[LR]\s*=[^=]/.test(src),'no per-block double store into object fields');
assert(/entrophonContextDeclickMainL=this\.lastMain\[0\],this\.entrophonContextDeclickMainR=this\.lastMain\[1\]/.test(src),'declick reads the same last samples');
assert.equal((src.match(/this\.lastMain\[0\]=/g)||[]).length,2);assert.equal((src.match(/this\.lastMain\[1\]=/g)||[]).length,2);
console.log('PASS LIVE-GF-01 C11 host last-sample capture is typed (no boxed doubles per block)');
