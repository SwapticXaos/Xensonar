'use strict';
// The old matrix remains the full release contract. Its results are captured
// before restoring historical P7.38 evidence to its original bytes.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const app=path.resolve(__dirname,'..'),results=path.join(app,'results/combined-startup'),native=process.argv.includes('--browser');
const run=(file,args=[])=>spawnSync(process.execPath,[file,...args],{cwd:app,encoding:'utf8',timeout:1200000,maxBuffer:16*1024*1024});
fs.mkdirSync(results,{recursive:true});
let result=run('tests/combined-startup-preservation.cjs');if(result.status!==0){process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');process.exit(result.status||1)}
const focused=native?['combined-nodal-durability-browser','combined-nodal-export-browser','combined-starter-grid-browser','combined-starter-demand-browser','combined-startup-intake-browser']:['combined-startup-intake','combined-startup-owner','combined-starter-demand','combined-starter-native'];
const focusedRows=[];let focusedLog='';
for(const name of focused){const start=Date.now(),r=run('tests/'+name+'.cjs');const passed=r.status===0&&!r.error;focusedRows.push({name,passed,exit:r.status,error:r.error?.message,milliseconds:Date.now()-start});focusedLog+='\n## '+name+'\n'+(r.stdout||'')+(r.stderr||'');console.log((passed?'PASS ':'FAIL ')+name)}
const focusedSuffix=native?'focused-browser-validation':'focused-host-validation';fs.writeFileSync(path.join(results,focusedSuffix+'.json'),JSON.stringify({rows:focusedRows,failed:focusedRows.filter(r=>!r.passed).length},null,2)+'\n');fs.writeFileSync(path.join(results,focusedSuffix+'.log'),focusedLog);
result=run('tools/consolidation_validate.cjs',native?['--browser']:[]);process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
const suffix=native?'browser-validation':'host-validation';
for(const ext of ['json','log']){const source=path.join(app,'results/sessions-reviewed/'+suffix+'.'+ext);if(fs.existsSync(source))fs.copyFileSync(source,path.join(results,suffix+'.'+ext))}
const capture=path.join(results,native?'matrix-browser-capture':'matrix-host-capture');fs.mkdirSync(capture,{recursive:true});
const inventory=require('../docs/combined-startup/baseline.json');for(const file of Object.keys(inventory.sha256))if(file.startsWith('n21-f2/results/')){const source=path.join(app,'..',file);if(fs.existsSync(source)){const data=fs.readFileSync(source),sha=require('node:crypto').createHash('sha256').update(data).digest('hex');if(sha!==inventory.sha256[file]){const dest=path.join(capture,file.slice(7));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data)}}}
const restore=spawnSync('python3',['tools/combined_startup_restore_history.py','--restore'],{cwd:app,encoding:'utf8',timeout:180000,maxBuffer:1024*1024});process.stdout.write(restore.stdout||'');process.stderr.write(restore.stderr||'');
process.exitCode=result.status===0&&restore.status===0&&focusedRows.every(r=>r.passed)?0:1;
