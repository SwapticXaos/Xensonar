'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),catalogueSource=fs.readFileSync(path.join(root,'src/package_station/02_export_selection.js'),'utf8'),engineSource=fs.readFileSync(path.join(root,'src/package_station/01_binary_archive.js'),'utf8').split('let __xenPackageStation4Instance;')[0];
const {catalogue,create}=new Function(catalogueSource+'\n'+engineSource+'\nreturn {catalogue:__XenPackageSelection41,create:__createXenPackageStation4};')();
(async()=>{
 assert.equal(catalogue.ids.length,28);assert.equal(new Set(catalogue.ids).size,28);assert.equal(catalogue.groups.length,5);assert(Object.values(catalogue.all()).every(Boolean));assert(Object.values(catalogue.none()).every(v=>v===false));assert(catalogue.scope(catalogue.all()).complete);assert(!catalogue.scope({...catalogue.all(),unusedAssets:false}).complete);
 assert.throws(()=>catalogue.normalize({unexpected:true}),/Unbekannte/);
 for(const key of ['xensonar.meta-sessions.v2','xensonar-melodic-loop-projects-v1','xensonar:forge:hybrid-session:v2','xensonar.fractalia.instruments.v4','xensonar.forge.emilia-hx-reciprocal.v4','xensonar.melodic.custom-instruments.v1'])assert(catalogue.ids.includes(catalogue.keyCategory(key)));
 assert.equal(catalogue.recordCategory('xensonar-spectral-forge-material-intake-v1','records','asset:old'),'unusedAssets');assert.equal(catalogue.recordCategory('xensonar-spectral-forge-material-intake-v1','records','donor-library:preset:a'),'donors');
 let pickerCalls=0;const api=create({__XEN_PACKAGE_STATION_TEST__:true,showSaveFilePicker(){pickerCalls++;throw Error('must not open')}});await assert.rejects(api.prepare({selection:catalogue.none()}),/Mindestens/);assert.equal(pickerCalls,0);
 const parts=[],sink={write:async b=>parts.push(b.slice()),close:async()=>new Blob(parts)};const t=api._test,w=await t.writer(sink);
 await w.json({kind:'header',schema:'xensonar.browser-workspace',version:4,createdAt:'test',databases:0});await w.json({kind:'storage'});await t.encode(w,{local:[],session:[]});await w.json({kind:'runtime'});await t.encode(w,null);await w.json({kind:'end',databases:0,records:0});const legacy=await w.finish();const old=await api.inspect(legacy);assert.equal(old.records,0);assert.equal(old.scope,null);
 const before=path.join(root,'../p4_base/src/package_station/01_binary_archive.js');const selected=path.join(root,'test-results-p41/donors-only.xenpack');
 if(fs.existsSync(before)&&fs.existsSync(selected)){const oldText=fs.readFileSync(before,'utf8').split('let __xenPackageStation4Instance;')[0];const oldApi=new Function(oldText+'\nreturn __createXenPackageStation4;')()({__XEN_PACKAGE_STATION_TEST__:true});await assert.rejects(oldApi.inspect(new Blob([fs.readFileSync(selected)])),/Unbekannte Paketversion/)}
 console.log('PASS P4.1 category catalogue, empty selection gate, legacy v4 read, old v4 rejects scoped v5 before writes');
})().catch(e=>{console.error(e);process.exitCode=1});
