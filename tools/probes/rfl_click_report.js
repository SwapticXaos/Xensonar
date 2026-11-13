#!/usr/bin/env node
// TEST ONLY. Repeats the RFL click scenarios N times (the clicks are not deterministic) and classifies every click event:
//   near-leave  = within 1.3 s after the cursor started to leave the playfield   near-enter = within 1.0 s after it started to re-enter   steady = anywhere else (sporadic, cursor inside)
// Usage: node tools/probes/rfl_click_report.js dist/XenSonar_PROBE.html [--runs 3] [--scenario rflControlLeave,rflSteady,rflLeaveSlow,rflLeaveFast,rflEdgeWiggle] [--out report.json]
const {spawnSync}=require('child_process');const fs=require('fs');const path=require('path');
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i<0?d:process.argv[i+1]};
const HTML=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),RUNS=+arg('--runs',3),SC=arg('--scenario','rflControlLeave,rflSteady,rflLeaveSlow,rflLeaveFast,rflEdgeWiggle'),OUT=arg('--out',null);
const agg={};
for(let run=0;run<RUNS;run++){
  const tmp=path.join(require('os').tmpdir(),'rfl_run_'+process.pid+'_'+run+'.json');
  const r=spawnSync('node',[path.join(__dirname,'live_glitch_probe.js'),HTML,'--scenarios-file',path.join(__dirname,'rfl_click_scenarios.js'),'--scenario',SC,'--json',tmp],{encoding:'utf8',maxBuffer:1<<28});
  const tl={};for(const line of r.stdout.split('\n'))if(line.startsWith('RFL-TIMELINE '))tl[JSON.parse(line.slice(13)).scenario]=JSON.parse(line.slice(13));
  const res=JSON.parse(fs.readFileSync(tmp,'utf8')).results;
  for(const x of res){const t=tl[x.scenario],sr=t.sr;const a=agg[x.scenario]||(agg[x.scenario]={runs:0,seconds:0,events:0,nearLeave:0,nearEnter:0,steady:0,maxStep:0,leaves:0,enters:0});
    a.runs++;a.seconds+=x.sec;a.leaves+=t.marks.filter(m=>m[0]==='leave').length;a.enters+=t.marks.filter(m=>m[0]==='enter').length;
    for(const c of x.pcm.clickList){if(c.ch!==0)continue;a.events++;a.maxStep=Math.max(a.maxStep,c.step);const fr=t.f0+c.at*sr;const prev=t.marks.filter(m=>m[1]<=fr+4096).pop();const d=prev?(fr-prev[1])/sr:99;
      if(prev&&prev[0]==='leave'&&d<=1.3)a.nearLeave++;else if(prev&&prev[0]==='enter'&&d<=1.0)a.nearEnter++;else a.steady++}}
  console.error('run '+(run+1)+'/'+RUNS+' done');
}
console.log('scenario        runs  sec  leaves enters | click events: near-leave near-enter steady | max step');
for(const [k,a] of Object.entries(agg))console.log(k.padEnd(15),String(a.runs).padStart(4),String(Math.round(a.seconds)).padStart(4),String(a.leaves).padStart(7),String(a.enters).padStart(7),' |',String(a.events).padStart(13),String(a.nearLeave).padStart(10),String(a.nearEnter).padStart(10),String(a.steady).padStart(7),' |',a.maxStep.toFixed(3));
if(OUT)fs.writeFileSync(OUT,JSON.stringify({html:HTML,runs:RUNS,agg},null,1));
