'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const files=['tests/f444-kernel-identity.cjs','tests/f445-pitch-family.cjs','tests/f446-prepared-control.cjs','tests/f446-lane-outputs.cjs','tests/f446-routing.cjs','tests/f446-surface-realtime.cjs',
 'tests/f445-forge-lifecycle.cjs','tests/f445-offline-ownership.cjs','tests/f446-preservation.cjs','tests/f4-jobs.cjs','tests/f443-capture-real.cjs','tests/rw2-pcm-contract.cjs','tests/rw2-source-index.cjs'];
const checks=[];
for(const file of files){const r=spawnSync(process.execPath,[file],{cwd:root,stdio:'inherit',env:{...process.env,NODE_PATH:path.resolve(root,'node_modules')}});checks.push({file,status:r.status});if(r.status!==0)break;}
if(checks.length===files.length&&checks.every(c=>c.status===0)){const r=spawnSync(process.execPath,['build.cjs','--verify'],{cwd:root,stdio:'inherit'});checks.push({file:'build.cjs --verify',status:r.status});}
const status=checks.length===files.length+1&&checks.every(c=>c.status===0)?'PASS':'FAIL',m=require('../source-manifest.json');
fs.writeFileSync(path.join(root,'results/f446-release.json'),JSON.stringify({status,checks,htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,m.entry))).digest('hex'),browser:'npm run test:f446:browser (separate)',deviceListening:'open'},null,2)+'\n');if(status!=='PASS')process.exitCode=1;
