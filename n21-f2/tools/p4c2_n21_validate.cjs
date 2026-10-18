'use strict';
const fs=require('fs'),{spawnSync}=require('child_process');
// N20 replaces the historical N5 cost constants and N6→N7 file whitelist
// with explicit new tests; all DSP/preparation/input contracts are retained.
const old=fs.readFileSync('tools/p4c2_n7_validate.cjs','utf8');
const original=new Function('return '+old.slice(old.indexOf('const tests=')+12,old.indexOf(';\nlet log')) )();
const tests=[...original.filter(t=>!['p4c2-n7-preservation','p4c2-n5-tail-budget'].includes(t)),
 'p4c2-n20-cost-policy','p4c2-n20-shared-runtime','p4c2-n20-worker-preparation','p4c2-n20-melodic-transport','p4c2-n20-tail-budget','p4c2-n21-length-control','p4c2-n21-quickdock','p4c2-n21-c11-release','p4c2-n21-runtime-release','p4c2-n21-preservation','p4c2-n20-mixed-render',
 'f442-rfl-runtime','f442-rfl-resident','p4b-entrophon-library','p4b-eight-instruments','p4b-entrophon-melodic-audio','p4b-integration','p4b-stem-isolation','nodal_backend'];
const rows=[];let log='';
for(const test of tests){const r=spawnSync(process.execPath,['tests/'+test+'.cjs'],{encoding:'utf8',timeout:120000});rows.push({test,passed:r.status===0,exit:r.status,error:r.error?.message});log+='\n## '+test+'\n'+r.stdout+r.stderr;console.log(r.status===0?'PASS':'FAIL',test);}
const r=spawnSync(process.execPath,['build.cjs','--verify'],{encoding:'utf8'});rows.push({test:'build --verify',passed:r.status===0});log+=r.stdout+r.stderr;
fs.writeFileSync('results/p4c2-n21-validation.log',log);fs.writeFileSync('results/p4c2-n21-validation.json',JSON.stringify({rows,failed:rows.filter(x=>!x.passed).length,scope:'Host tests with production DSP and real Worker threads; browser/hardware checks reported separately'},null,2)+'\n');process.exitCode=rows.some(x=>!x.passed)?1:0;
