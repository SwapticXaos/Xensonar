const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'xensonar-reference-contract-'));
try{
 const input=path.join(temp,'reference.html'),output=path.join(temp,'reference.json');
 // Object shorthand supplies a live function; an unrelated property with the
 // same spelling as a global function must not make that function live.
 fs.writeFileSync(input,'<script type="module" crossorigin>function used(){return 1}function unused(){return 2}function invoke({used}){return used()}const result=invoke({used});console.log(result,{unused:3});</script>');
 const run=spawnSync(process.execPath,[path.join(__dirname,'reachability47.cjs'),input,output],{cwd:root,encoding:'utf8'});assert.equal(run.status,0,run.stderr);
 const report=JSON.parse(fs.readFileSync(output));assert.deepEqual(report.dead.flatMap(x=>x.names),['unused'],'Actual reference analysis must follow shorthand values and distinguish property names');
 const index=JSON.parse(fs.readFileSync(path.join(root,'source-index.json'))),helpers=['__f352Clone','__f352Freeze','__f3565PitchSupport','__f356ProjectCeciliaStates','__f3564ActivateLiveGain'];
 for(const helper of helpers)assert(index.dependencies.some(e=>e.from==='src/forge/hybrid/09_runtime.js'&&e.symbols.includes(helper)),'Missing injected dependency in source index: '+helper);
 const result={status:'PASS',syntheticDeadNames:['unused'],resolvedInjectedHelpers:helpers};fs.writeFileSync(path.join(root,'results/tool_reference_contract.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
