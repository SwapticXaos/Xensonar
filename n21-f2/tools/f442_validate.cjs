'use strict';
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),tests=[
 'f442-nodal-editing','f442-preservation','nodal_open_soundspace','nodal_open_completion','nodal_backend','nodal_library_preview_edit_fix12c','nodal_library_fix10','nodal_edit_fix9','nodal_composition_routes','nodal_rfl_preview_control',
 'f4-relational','f4-jobs','f4-integration','f433-compare-cache','f434-hearing-spectra','f435-interaction-routing','f435-emilia-gesture','f435-emilia-visual-graph','f435-lazy-mask-audio',
 'f436-independent-periods','f437-bar-resize-integrity','f438-storage-protection','f439-entrophon-ji-ratio','f4310-swarm-pitch-diversity','f4311-ripple-and-psy','f4312-ripple-release','f4313-ripple-pacing',
 'drum_room_sample_regression','drum_sample_reload_regression'];
const results=[];fs.mkdirSync(path.join(root,'results/f442-logs'),{recursive:true});
for(const name of tests){const started=Date.now(),r=spawnSync(process.execPath,['tests/'+name+'.cjs'],{cwd:root,encoding:'utf8',timeout:180000,maxBuffer:4*1024*1024});const log=(r.stdout||'')+(r.stderr||'')+(r.error?String(r.error):'');fs.writeFileSync(path.join(root,'results/f442-logs',name+'.log'),log);const item={test:name,status:r.status===0?'pass':'fail',exitCode:r.status,elapsedMs:Date.now()-started};results.push(item);console.log(item.status.toUpperCase(),name);if(item.status==='fail')console.log(log.slice(-1800));}
fs.writeFileSync(path.join(root,'results/f442-validation.json'),JSON.stringify({date:'2026-10-16',tests:results},null,2)+'\n');if(results.some(x=>x.status==='fail'))process.exitCode=1;
