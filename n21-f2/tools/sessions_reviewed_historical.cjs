'use strict';
// Execute the unchanged Song contract against the exact reversible P7.24 source
// snapshot. This also works in the source ZIP without a Git object database.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const review=require('../tests/sessions-reviewed-preservation.cjs'),base=require('../docs/sessions-reviewed/baseline.json');
const app=path.resolve(__dirname,'..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'xensonar-song-contract-')),native=process.argv.includes('--browser'),name=native?'song-projects-browser':'song-projects',target=path.join(app,'results/sessions-reviewed/historical-contract');
try{
 for(const file of Object.keys(base.hashes)){const output=path.join(temporary,file);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,review.readBaseline(file));}
 fs.mkdirSync(path.join(temporary,'tests'),{recursive:true});fs.copyFileSync(path.join(app,'tests/'+name+'.cjs'),path.join(temporary,'tests/'+name+'.cjs'));
 fs.writeFileSync(path.join(temporary,'source-manifest.json'),JSON.stringify(review.priorManifest));fs.symlinkSync(path.join(app,'node_modules'),path.join(temporary,'node_modules'),'dir');
 const start=Date.now(),result=spawnSync(process.execPath,['tests/'+name+'.cjs'],{cwd:temporary,encoding:'utf8',timeout:240000,maxBuffer:4*1024*1024});fs.mkdirSync(target,{recursive:true});
 const rows=[{name,passed:result.status===0&&!result.error,exit:result.status,error:result.error?.message,milliseconds:Date.now()-start}];
 fs.writeFileSync(path.join(target,(native?'browser':'host')+'.json'),JSON.stringify({base:base.commit,scope:'Original unchanged P7.24 Song contract executed against the exact source/style/template projection proven by sessions-reviewed-preservation; browser uses native Chromium.',rows,failed:rows.filter(r=>!r.passed).length},null,2)+'\n');fs.writeFileSync(path.join(target,name+'.log'),(result.stdout||'')+(result.stderr||''));
 if(native&&fs.existsSync(path.join(temporary,'results')))fs.cpSync(path.join(temporary,'results'),path.join(target,'results'),{recursive:true});
 console.log((rows[0].passed?'PASS ':'FAIL ')+'historical '+name);process.exitCode=rows[0].passed?0:1;
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
