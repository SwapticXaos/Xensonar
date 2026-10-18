'use strict';
// Falsifiable freshness gate: recompute the ownership index from the CURRENT manifest.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'xensonar-rw2-index-'));
try {
 fs.mkdirSync(path.join(temp,'tools'));
 fs.copyFileSync(path.join(root,'tools/source_index.cjs'),path.join(temp,'tools/source_index.cjs'));
 fs.copyFileSync(path.join(root,'source-manifest.json'),path.join(temp,'source-manifest.json'));
 fs.symlinkSync(path.join(root,'src'),path.join(temp,'src'),'dir');
 // Resolve the repository's pinned TypeScript from the temporary verification
 // checkout instead of assuming a globally installed compiler.
 fs.symlinkSync(path.join(root,'node_modules'),path.join(temp,'node_modules'),'dir');
 const exec=cp.spawnSync(process.execPath,[path.join(temp,'tools/source_index.cjs')],{cwd:temp,env:{...process.env,NODE_PATH:process.env.NODE_PATH||cp.execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim()},encoding:'utf8',timeout:30000});
 assert.equal(exec.status,0,`Source index generator failed: ${exec.stderr||exec.stdout}`);
 const expected=fs.readFileSync(path.join(temp,'source-index.json'),'utf8');
 const current=fs.readFileSync(path.join(root,'source-index.json'),'utf8');
 assert(current===expected,'source-index.json is STALE: run npm run map:sources');
 const idx=JSON.parse(current), names=['src/audio/03_rfl_transport_legacy.js','src/audio/03_flac_encoder.js','src/audio/03_recorder.js'];
 const owner=n=>idx.declarations.find(d=>d.name===n)?.file;
 assert.equal(owner('ove'),names[0]);
 assert.equal(owner('f319RecorderFlacEncode'),names[1]);
 assert.equal(owner('FW'),'src/audio/03_recorder_helpers.js');
 assert.equal(owner('TW'),'src/audio/03_pcm_range.js');
 const manifest=require('../source-manifest.json');
 assert.equal(new Set(idx.declarations.map(d=>d.file)).size<=manifest.files.length,true);
 console.log(`PASS RW2 source-index freshness, ${manifest.files.length} manifest entries, ${idx.declarations.length} declarations, ${idx.dependencies.length} file dependency pairs`);
} finally {fs.rmSync(temp,{recursive:true,force:true});}
