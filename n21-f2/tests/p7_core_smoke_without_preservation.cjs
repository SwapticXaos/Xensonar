'use strict';
// Runs real retained domain suites without hiding known hash-preservation failures.
// This is NOT a replacement for npm run test:merge.
const cp=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(process.argv[2]||'.');
const tests=[
 'forge_save_play_symmetry.cjs',
 'forge_play_ready_save_regression.cjs',
 'p4c2-n20-navigation.cjs',
 'p4c2-n21-length-control.cjs',
 'p4c2-n21-quickdock.cjs',
 'p3b1-keyboard-directness.cjs',
 'p3b3-keyboard-c11-lead.cjs',
 'f447-power-owner.cjs',
 'p4c2-n2-grid-sources.cjs',
 'p4c2-n2-grid-bank.cjs'
];
let failures=0;
for(const file of tests){
 const name=path.join(root,'tests',file);
 if(!fs.existsSync(name)){console.error('FAIL missing suite:',file);failures++;continue}
 const x=cp.spawnSync(process.execPath,[name],{cwd:root,encoding:'utf8',timeout:30000});
 if(x.status===0)console.log('PASS',file);
 else{failures++;console.error('FAIL',file,'status',x.status,'error',x.error?.message,(x.stdout||'').slice(-500),(x.stderr||'').slice(-500));}
}
if(failures)process.exitCode=1;
else console.log(`PASS ${tests.length} retained domain smoke suites. Historical hash-preservation suite remains separate and unresolved.`);
