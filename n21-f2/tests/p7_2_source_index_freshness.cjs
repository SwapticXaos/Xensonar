'use strict';
// Read-only fresh-index gate. Uses repository TypeScript when installed, with
// global TypeScript only as an explicit fallback for the isolated QA environment.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||'.');
const tempfile=fs.mkdtempSync(path.join(os.tmpdir(),'p72-index-'));
try{
 fs.mkdirSync(path.join(tempfile,'tools'));
 fs.copyFileSync(path.join(root,'tools/source_index.cjs'),path.join(tempfile,'tools/source_index.cjs'));
 fs.copyFileSync(path.join(root,'source-manifest.json'),path.join(tempfile,'source-manifest.json'));
 fs.symlinkSync(path.join(root,'src'),path.join(tempfile,'src'),'dir');
 const local=path.join(root,'node_modules');
 if(fs.existsSync(local))fs.symlinkSync(local,path.join(tempfile,'node_modules'),'dir');
 const globalModules=cp.execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim();
 const exec=cp.spawnSync(process.execPath,[path.join(tempfile,'tools/source_index.cjs')],{
   cwd:tempfile,encoding:'utf8',timeout:60000,env:{...process.env,NODE_PATH:[local,globalModules,process.env.NODE_PATH||''].join(path.delimiter)}
 });
 assert.equal(exec.status,0,`Index generation failed: ${exec.stderr||exec.stdout}`);
 const expected=fs.readFileSync(path.join(tempfile,'source-index.json'),'utf8');
 const current=fs.readFileSync(path.join(root,'source-index.json'),'utf8');
 assert.equal(current,expected,'source-index.json is stale: regenerate with npm run map:sources');
 const index=JSON.parse(current);assert(index.declarations.some(x=>x.file==='src/handoff/00_chat_feature_addons.js'),'New tuning/keyboard addon missing in index');
 console.log(`PASS fresh source-index: ${index.declarations.length} declarations / ${index.dependencies.length} file dependencies`);
}finally{fs.rmSync(tempfile,{recursive:true,force:true})}
