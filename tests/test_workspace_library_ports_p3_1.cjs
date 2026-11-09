'use strict';
// P3.1: RED -> GREEN: explicit cold-path library import ports; no implicit global repository calls.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx=vm.createContext({Object,Error,TypeError,Promise});
vm.runInContext(read('src/contracts/11_workspace_library_phases.js'),ctx);
const api=vm.runInContext('__XenWorkspaceLibraryPhasesP31',ctx);
const names=['material','bass','drums','forgeProjects','forgeStamps'];
const calls=[];
const input={}; const output={};
const ports={};
for(const name of names){
  input[name]=Object.freeze({name});
  output[name]=Object.freeze({result:name});
  ports[name]=({payload,mode})=>{
    assert.equal(payload,input[name]);
    assert.equal(mode,'merge');
    calls.push(name);
    return output[name];
  };
}
const phase=api.create({mode:'merge',ports});
(async()=>{
  for(const name of names){
    assert.equal(await phase.run(name,input[name]),output[name],name+' result identity must survive');
  }
  assert.deepEqual(calls,names,'preserve original sequential order');
  assert.equal(await phase.run('material',null),null,'absent payload must not touch storage');
  assert.deepEqual(calls,names);
  assert.throws(()=>phase.run('unknown',{}),/unknown|unsupported|phase/i);
  assert.throws(()=>api.create({mode:'merge',ports:{...ports,material:null}}),/port|material/i,
    'missing port must be rejected at construction, before first write');
  let postFailure=0;
  const thrower=api.create({mode:'replace',ports:{...ports,material:()=>{throw Error('disk failed')},bass:()=>{postFailure++}}});
  assert.throws(()=>thrower.run('material',{}),/disk failed/);
  assert.equal(postFailure,0,'no implicit fallthrough after failure');
  assert.equal(phase.run('bass',input.bass),output.bass,'sync Bass port must remain synchronous');
  const asyncFailure=api.create({mode:'merge',ports:{...ports,material:async()=>{throw Error('commit failed')}}});
  await assert.rejects(asyncFailure.run('material',{}),/commit failed/);
  const source=read('src/app/forge/03_spectral_grid_and_archives.js');
  const begin=source.indexOf('async function _Q(e)');
  const end=source.indexOf('return te(),{mode:"merge"',begin);
  assert(begin>=0 && end>begin);
  const body=source.slice(begin,end);
  assert(body.includes('__XenWorkspaceLibraryPhasesP31.create('));
  assert(body.includes("O=__librariesP31.run('bass',t.bassClipLibrary)"),'Bass must not gain an await/microtask');
  for(const name of names)assert(body.includes("__librariesP31.run('"+name+"'"));
  // P3.2 retains the P3.1 phase-to-ledger sequence through a pure projector.
  const sequence=[
    "__librariesP31.run('material',t.materialLibrary)", 'Object.assign(n.material,__p32material.ledger)',
    "__librariesP31.run('bass',t.bassClipLibrary)", 'Object.assign(n.bassClips,__p32bass.ledger)',
    "__librariesP31.run('drums',t.drumConfigLibrary)", 'Object.assign(n.drumConfigs,__p32drums.ledger)',
    "__librariesP31.run('forgeProjects',t.spectralForgeProjects)", 'Object.assign(n.spectralForgeProjects,__p32forgeProjects.ledger)',
    "__librariesP31.run('forgeStamps',t.spectralForgeCustomStamps)", 'Object.assign(n.spectralForgeCustomStamps,__p32forgeStamps.ledger)'
  ];
  let previous=-1;
  for(const token of sequence){
    const pos=body.indexOf(token);
    assert(pos>previous,`phase execution and intermediate bookkeeping must preserve order: ${token}`);
    previous=pos;
  }
  for(const direct of ['CLe({payload:t.materialLibrary','sFe({payload:t.bassClipLibrary',
    'Sfe({payload:t.drumConfigLibrary','MFe({payload:t.spectralForgeProjects',
    'DFe({payload:t.spectralForgeCustomStamps']){
    assert(!body.includes(direct),`workspace orchestrator must not reach into ${direct}`);
  }
  const sources=JSON.parse(read('source-manifest.json')).sources.flatMap(s=>s.files);
  assert(sources.indexOf('src/contracts/11_workspace_library_phases.js')>sources.indexOf('src/contracts/10_library_inventory_ports.js'));
  assert(sources.indexOf('src/contracts/11_workspace_library_phases.js')<sources.indexOf('src/01_app_runtime.js'));
  console.log('P3.1 PASS: explicit ports, lazy/no-op, ordering, error propagation and wiring');
})().catch(e=>{console.error(e);process.exitCode=1});
