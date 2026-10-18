'use strict';
const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const tests=[
 'p4c2-n5-pointer','p4c2-n5-particle-motion','p4c2-n5-tail-budget','p4c2-n5-preservation','p4c2-n5-review-regressions',
 'p4b-l5-cursor-contract','p4b-l8-cursor-gate','p3b-host-admission','p3b5-triple-nodal-burst-budget','p3b5-three-lane-integration',
 'p3b1-keyboard-directness','p3b1-keyboard-backend','p3b1-keyboard-nodal',
 'p3b2-keyboard-entrophon','p3b2-entrophon-body','p3b2-active-gate',
 'p3b3-wave-c11-stale-boundary','p3b3-keyboard-c11-lead','p3b4-c11-complexity-timing','p3b4-wave-cost-boundary',
 'p3b6-coefficient-hotpath','p3b6-worker-frequency-coalescing','p3b6-worker-pitch-parity',
 'p4c1-source-preparation','p4c1-production-handoff',
 'p4c2-n4-sample-parity','p4c2-n4-template-placement','p4c2-n3-particle-grid','p4c2-n3-particle-worker','p4c2-n2-worker-runtime','p2-staged-audio-parity',
 'f4311-ripple-and-psy','f4312-ripple-release','f4313-ripple-pacing','f3-instruments'
];
let log='',failed=0;const rows=[];
for(const test of tests){const file='tests/'+test+'.cjs';if(!fs.existsSync(file)){rows.push({test,status:'missing'});failed++;console.log('MISSING',file);continue;}const r=spawnSync(process.execPath,[file],{encoding:'utf8',timeout:120000});const status=r.status===0?'passed':'failed';log+='\n## '+file+'\n'+r.stdout+r.stderr;rows.push({test,status,exit:r.status,error:r.error?.message});console.log(status.toUpperCase(),test);if(r.status!==0)failed++;}
for(const args of [['build.cjs','--verify']]){const r=spawnSync(process.execPath,args,{encoding:'utf8'});log+=r.stdout+r.stderr;rows.push({test:args.join(' '),status:r.status===0?'passed':'failed'});if(r.status!==0)failed++;}
fs.writeFileSync('results/p4c2-n5-validation.log',log);fs.writeFileSync('results/p4c2-n5-validation.json',JSON.stringify({rows,failed,browserAndHardware:'Not run: browser binary absent; no device burst-free claim'},null,2)+'\n');process.exitCode=failed?1:0;
