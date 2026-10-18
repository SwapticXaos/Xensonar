'use strict';const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('src/instruments/00_diagnostics.js','utf8');
const probe=new Function(src+';return __XenAudioProbe')();
probe.record('test','wave','ignored',.2);assert.deepEqual(probe.read().counts,{});
probe.start();for(let i=0;i<4100;i++)probe.record('gate32','particle',i%2?'admitted':'secondary-rate32',i/100);
const r=probe.stop();assert.equal(r.records.length,4096);assert.equal(r.truncated,4);assert.equal(r.records[0].seq,5);assert.equal(r.records.at(-1).seq,4100);assert.equal(r.counts['gate32|particle|admitted'],2050);assert.equal(r.counts['gate32|particle|secondary-rate32'],2050);
console.log('PASS P0 diagnostics disabled, finite 4096-event ring, complete counters and monotonic trace indices');
