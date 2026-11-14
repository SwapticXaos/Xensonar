'use strict';
// RFL-CLOCK (real app, probe build): Root-Follow loop playing in the live room together with drums and bass (graph changes on
// the main thread). The browser hands AudioWorklets a stale currentFrame now and then (measured by the frame-exact probe taps);
// the resident RFL worklet must nevertheless never deliver a repeated block, and no click may reach the RFL bus.
// Runs the rflTap scenario of tools/probes/rfl_click_scenarios.js (synthetic 1-bar test loop, no user data).
// Since VOICE-HOST-01 drums and bass no longer change the graph; this test therefore runs the previous native drum/bass path
// (?xenVoiceHost=0) as a deliberate source of graph churn, to keep proving the RFL clock guard under that stress.
// Usage: node tests/e2e/rfl_resident_clock_live.cjs dist/XenSonar_PROBE.html
const {spawnSync}=require('node:child_process');const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs');const os=require('node:os');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');const root=path.join(__dirname,'..','..');
const out=path.join(os.tmpdir(),'rfl_clock_live_'+process.pid+'.json');
const r=spawnSync('node',[path.join(root,'tools/probes/live_glitch_probe.js'),html,'--scenarios-file',path.join(root,'tools/probes/rfl_click_scenarios.js'),'--scenario','rflTap','--json',out],
  {encoding:'utf8',maxBuffer:1<<28,env:{...process.env,RFL_SEC:process.env.RFL_SEC||'60',RFL_STILL:'1',XEN_QUERY:'xenVoiceHost=0'},timeout:400000});
const line=(r.stdout||'').split('\n').find(l=>l.startsWith('RFL-TAP '));
assert.ok(line,'rflTap ran: '+(r.stderr||'').slice(-400));
const d=JSON.parse(line.slice(8));
const stale=Math.max(0,...Object.values(d.staleFrameCalls||{}));
console.log('taps',JSON.stringify(d.taps),'ops/s',d.graphOps&&d.graphOps.perSec,'stale-frame observations',stale,'resident repeats',JSON.stringify(d.repeatAt&&d.repeatAt.resident),'real clicks',JSON.stringify(d.realClicks));
assert.ok(d.taps.resident>=1,'the resident RFL worklet plays');
assert.ok(d.graphOps&&d.graphOps.perSec>10,'drums/bass are changing the graph (the stress that produces stale frames)');
assert.ok(stale>=1,'the browser produced stale currentFrame calls during the run (otherwise the test proves nothing)');
assert.deepEqual(d.repeatAt.resident,[],'no repeated block at the resident output');
assert.equal(d.realClicks.resident||0,0,'no click at the resident output');
assert.equal(d.realClicks.bus||0,0,'no click on the RFL bus');
try{const m=JSON.parse(fs.readFileSync(out,'utf8')).results[0].pcm.clickList.filter(c=>c.ch===0);console.log('master clicks',m.length);fs.unlinkSync(out)}catch{}
console.log('PASS RFL-CLOCK resident RFL worklet renders on its own monotonic clock');
