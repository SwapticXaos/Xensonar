'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),tests=[
 'f443-preservation','f443-gain','f443-capture','f443-capture-real','f443-audio','forge_preservation_node',
 'f442-nodal-editing','f442-rfl-runtime','f442-rfl-resident','nodal_open_soundspace','nodal_open_completion','nodal_backend','nodal_library_preview_edit_fix12c','nodal_library_fix10','nodal_edit_fix9','nodal_composition_routes','nodal_rfl_preview_control',
 'f3-instruments','f4-relational','f4-jobs','f4-integration','f41-donor-ecology','f42-material-relations','f43-spectrum-and-recombination','f431-offline-workshop',
 'f433-compare-cache','f434-hearing-spectra','f435-interaction-routing','f435-emilia-gesture','f435-emilia-visual-graph','f435-lazy-mask-audio',
 'f436-independent-periods','f437-bar-resize-integrity','f438-storage-protection','f439-entrophon-ji-ratio','f4310-swarm-pitch-diversity','f4311-ripple-and-psy','f4312-ripple-release','f4313-ripple-pacing',
 'drum_room_sample_regression','drum_sample_reload_regression'
];
const results=[],logs=path.join(root,'results/f443-logs');fs.mkdirSync(logs,{recursive:true});
for(const name of tests){
 const start=Date.now(),run=spawnSync(process.execPath,['tests/'+name+'.cjs'],{cwd:root,encoding:'utf8',timeout:180000,maxBuffer:4*1024*1024});
 const log=(run.stdout||'')+(run.stderr||'')+(run.error?String(run.error):'');fs.writeFileSync(path.join(logs,name+'.log'),log);
 const item={test:name,status:run.status===0?'pass':'fail',exitCode:run.status,elapsedMs:Date.now()-start};results.push(item);
 console.log(item.status.toUpperCase(),name);if(item.status==='fail')console.log(log.slice(-2000));
}
fs.writeFileSync(path.join(root,'results/f443-validation.json'),JSON.stringify({date:'2026-10-16',scope:'Node/component/offline/actual Node-worker regression; excludes browser/device listening',tests:results},null,2)+'\n');
if(results.some(item=>item.status==='fail'))process.exitCode=1;
