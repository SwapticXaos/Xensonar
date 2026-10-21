'use strict';
// A release gate exercises behavior, not just a moving list of source hashes.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),manifest=require('../source-manifest.json');
const native=process.argv.includes('--browser');
const tests=native?['song-projects-browser','p7-24-entrophon-saved-live-browser','live-control-ownership-browser','forge-request-browser','forge-smoothness-browser','forge-efficiency-browser','p7-review-browser','nodal-ball-grid-browser','forge-spatial-browser','mute-auto-preview-browser','integrated-patches-browser','consolidation-browser','forge-ready-browser','forge-pitch-browser']:[
 'p7-24-preservation','song-projects','p7_keyboard_wave_volume_isolation','p7-24-entrophon-reservation','live-control-ownership','live-control-preservation','forge-request-contract','forge-request-lifecycle','f447-hearing-coalescing','forge-request-preservation','forge-persistence-ownership','architecture-stability-preservation','live-grid-snap','forge-save-lifecycle','forge-save-dispose','master-output-contract','forge-smoothness-preservation',
 'forge-efficiency','forge-efficiency-preservation',
 'p7-review-regressions','p7-review-preservation','p7_live_grid_space_behavior','p7_2_installation_ball_audio','p7_3_forge_navigator','p7_4_repeat_pointer','p7_5_forge_main_handles','p7_6_expression_mode','p7_7_keyboard_source_gate','p7_8_recorder_async_cancel','test_entrophon_live_revision','test_material_standalone_preview',
 'myzel_g2_concept','myzel_g_worklet','nodal-ball-grid','nodal-ball-grid-preservation','forge-spatial-contracts','forge-spatial-preservation','history-sharing','patch-integration','consolidation-snapshots','consolidation-history','consolidation-preservation','rw2-source-index',
 'forge-pitch-space','forge-ready-contract','forge-progress-jobs','live-rfl-lifecycle',
 'nodal-envelope-zero','workflow-grid-runtime','workflow-hotkeys','microphone-capture','audio-carrier-analysis'];
const results=path.join(__dirname,'../results/p7-24-song-projects');fs.mkdirSync(results,{recursive:true});
const suffix=native?'browser-validation':'host-validation',startedAt=new Date().toISOString();
fs.writeFileSync(path.join(results,suffix+'.json'),JSON.stringify({entry:manifest.entry,sha256:manifest.sha256,startedAt,running:true,rows:[],failed:null},null,2)+'\n');
const rows=[];let log='';
for(const name of tests){
 const start=Date.now(),r=spawnSync(process.execPath,['tests/'+name+'.cjs',...(['p7_live_grid_space_behavior','p7_2_installation_ball_audio','p7_3_forge_navigator','p7_4_repeat_pointer','p7_5_forge_main_handles','p7_6_expression_mode','p7_7_keyboard_source_gate'].includes(name)?['.']:[])],{cwd:path.join(__dirname,'..'),encoding:'utf8',timeout:native?240000:120000,maxBuffer:4*1024*1024});
 const passed=r.status===0&&!r.error;rows.push({name,passed,exit:r.status,signal:r.signal,error:r.error?.message,milliseconds:Date.now()-start});
 log+='\n## '+name+'\n'+(r.stdout||'')+(r.stderr||'');console.log((passed?'PASS ':'FAIL ')+name);
 if(native && name==='consolidation-browser' && passed)fs.copyFileSync('results/consolidation/browser.json',path.join(results,'consolidation-browser.json'));
 if(native && name==='forge-ready-browser' && passed)fs.copyFileSync('results/forge-ready/browser.json',path.join(results,'forge-ready-browser.json'));
 if(native && name==='forge-pitch-browser' && passed)fs.copyFileSync('results/pitch-space/browser.json',path.join(results,'forge-pitch-browser.json'));
}
const build=spawnSync(process.execPath,['build.cjs','--verify'],{cwd:path.join(__dirname,'..'),encoding:'utf8'});rows.push({name:'build-reproducibility',passed:build.status===0});log+=(build.stdout||'')+(build.stderr||'');
fs.writeFileSync(path.join(results,suffix+'.json'),JSON.stringify({entry:manifest.entry,sha256:manifest.sha256,startedAt,completedAt:new Date().toISOString(),running:false,scope:native?'Native Chromium; no physical audio interface or cross-browser claim':'Host behavior, production DSP/Worker tests and source preservation',rows,failed:rows.filter(r=>!r.passed).length},null,2)+'\n');fs.writeFileSync(path.join(results,suffix+'.log'),log);
process.exitCode=rows.some(r=>!r.passed)?1:0;
