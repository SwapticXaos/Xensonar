'use strict';
// RFL-GUARD (real app, probe build): with the Root-Follow loop playing in the live room together with drums and bass,
// the resident RFL worklet feeds the repeat guard, the guard feeds the RFL bus chain, and no click reaches the bus or the
// guard output. Repeats at the resident output (browser under graph churn) are counted by the guard.
// Runs the rflTap scenario of tools/probes/rfl_click_scenarios.js (synthetic 1-bar test loop, no user data).
// Usage: node tests/e2e/rfl_repeat_guard_live.cjs dist/XenSonar_PROBE.html
const {spawnSync}=require('node:child_process');const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs');const os=require('node:os');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');const root=path.join(__dirname,'..','..');
const out=path.join(os.tmpdir(),'rfl_guard_live_'+process.pid+'.json');
const r=spawnSync('node',[path.join(root,'tools/probes/live_glitch_probe.js'),html,'--scenarios-file',path.join(root,'tools/probes/rfl_click_scenarios.js'),'--scenario','rflTap','--json',out],
  {encoding:'utf8',maxBuffer:1<<28,env:{...process.env,RFL_SEC:process.env.RFL_SEC||'40'},timeout:300000});
const line=(r.stdout||'').split('\n').find(l=>l.startsWith('RFL-TAP '));
assert.ok(line,'rflTap ran: '+(r.stderr||'').slice(-400));
const d=JSON.parse(line.slice(8));
const up=JSON.stringify(d.upstream||{});
console.log('taps',JSON.stringify(d.taps),'ops/s',d.graphOps&&d.graphOps.perSec,'resident clicks',(d.clicks.resident||[]).length,'guard',JSON.stringify(d.guardReport));
assert.ok(d.taps.resident>=1&&d.taps.guard>=1,'resident and guard nodes exist while the loop plays');
assert.ok(up.includes('AudioWorkletNode:xensonar-rfl-repeat-guard-v1'),'guard is upstream of the RFL bus');
assert.ok(up.indexOf('xensonar-rfl-repeat-guard-v1')<up.indexOf('xensonar-raw-resident-v1'),'resident feeds the guard (guard nearer to the bus)');
assert.ok(d.graphOps&&d.graphOps.perSec>10,'drums/bass are changing the graph (the stress the guard is for)');
// a quantum the measuring tap itself was not called for reads as a gap in that tap; such clicks are measurement artefacts (tapArtefact)
console.log('real clicks',JSON.stringify(d.realClicks),'tap holes',JSON.stringify(d.tapHoles));
assert.equal(d.realClicks.guard||0,0,'no click behind the guard');
assert.equal(d.realClicks.bus||0,0,'no click on the RFL bus');
assert.ok(d.guardReport&&d.guardReport.repeats+d.guardReport.gaps>=(d.realClicks.resident||0),'every click at the resident output was a repeat/gap the guard caught');
try{const m=JSON.parse(fs.readFileSync(out,'utf8')).results[0].pcm.clickList.filter(c=>c.ch===0);console.log('master clicks',m.length);fs.unlinkSync(out)}catch{}
console.log('PASS RFL-GUARD repeat guard in the live Root-Follow path');
