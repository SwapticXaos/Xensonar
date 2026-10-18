'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const files=['tests/f444-kernel-identity.cjs','tests/f445-pitch-family.cjs','tests/f445-surface-realtime.cjs',
 'tests/f445-worklet-equivalence.cjs','tests/f445-forge-lifecycle.cjs','tests/f445-offline-ownership.cjs','tests/f445-preservation.cjs',
 'tests/nodal_surface_direct.cjs','tests/nodal_surface_wiring.cjs','tests/f4-jobs.cjs','tests/f443-capture.cjs',
 'tests/f443-capture-real.cjs','tests/rw2-pcm-contract.cjs','tests/rw2-source-index.cjs'];
const checks=[];
for(const file of files){const result=spawnSync(process.execPath,[file],{cwd:root,stdio:'inherit',env:{...process.env,NODE_PATH:path.join(root,'node_modules')}});checks.push({file,status:result.status});if(result.status!==0)break;}
if(checks.length===files.length&&checks.every(c=>c.status===0)){const result=spawnSync(process.execPath,['build.cjs','--verify'],{cwd:root,stdio:'inherit'});checks.push({file:'build.cjs --verify',status:result.status});}
const status=checks.length===files.length+1&&checks.every(c=>c.status===0)?'PASS':'FAIL';
fs.writeFileSync(path.join(root,'results/f445-release.json'),JSON.stringify({status,checks,browser:'npm run test:f445:browser (separate)',deviceListening:'open; see handover'},null,2)+'\n');
if(status!=='PASS')process.exitCode=1;
