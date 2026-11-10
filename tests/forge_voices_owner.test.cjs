'use strict';
// FORGE-VOICES-01: the recipe owner. One draft per mode, kept in localStorage and in Forge projects;
// older projects keep the current draft; only a sound change invalidates the render; the lazy
// runtime is loaded on first use; Fractalia's live-transfer identity is unchanged.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const read=p=>fs.readFileSync(path.join(__dirname,'../src',p),'utf8');
function fixture(stored){
 const store=new Map(stored?[['xensonar.forge.voices.v1',stored]]:[]),log={stops:0,states:[],saves:0,loads:0};
 const state={carrierIntegralSelection:{machineId:'gaia-terrain-carrier'},renderVersion:7};
 const c={console,JSON,Object,Math,Number,String,Error,DOMException,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))},
  pe:{getState:()=>state,setState:p=>log.states.push(p)},__f333Stop:()=>log.stops++,__f333Idle:()=>({isPlaying:false}),__f333Persistence:{scheduleSave:()=>log.saves++},
  __xenLoadDeferred:kind=>{log.loads++;assert.equal(kind,'lab');c.__ForgeVoices.register({renderCarrier:async a=>({buffer:{machine:a.machineId},report:{engine:'gaia',notes:3}})})}};
 vm.createContext(c);vm.runInContext(read('forge/voices/00_spec.js')+'\n'+read('forge/voices/02_owner.js')+'\nthis.__ForgeVoices=__ForgeVoices;this.__forgeSelfMachine=__forgeSelfMachine;this.__forgeRenderedMachine=__forgeRenderedMachine;',c);
 return {c,v:c.__ForgeVoices,store,log,state};
}
test('draft: defaults, storage, damaged storage',()=>{
 let f=fixture();assert.equal(f.v.snapshot().gaia.params.lobes,1);assert.equal(f.store.size,0,'reading never writes');
 f.v.preset('gaia','canyon');assert.equal(JSON.parse(f.store.get('xensonar.forge.voices.v1')).gaia.preset,'canyon');
 f=fixture(f.store.get('xensonar.forge.voices.v1'));assert.equal(f.v.snapshot().gaia.preset,'canyon');assert.equal(f.v.snapshot().gaia.params.lobes,2);
 for(const bad of ['{nonsense','null','[]','{"gaia":{"schema":"other"},"isolde":{"params":{"equave":3}}}']){const g=fixture(bad);assert.equal(g.v.snapshot().gaia.params.lobes,1);}
 assert.equal(fixture('{"gaia":{"schema":"other"},"isolde":{"params":{"equave":3}}}').v.snapshot().isolde.params.equave,3,'one damaged mode does not take the others with it');
});
test('a sound change invalidates the render of the selected mode only',()=>{
 const f=fixture(),before=f.v.snapshot();
 f.v.set('gaia',{params:{...before.gaia.params,lift:.2}});assert.equal(f.log.stops,1);assert.equal(f.log.states[0].renderVersion,8);assert.equal(f.log.states[0].audioBufferDirty,true);assert.equal(f.log.saves,1);
 assert.notEqual(f.v.snapshot(),before,'new identity for memoised readers');assert.equal(f.v.snapshot().isolde,before.isolde);
 f.v.set('isolde',{params:{...before.isolde.params,spiral:2}});assert.equal(f.log.stops,1,'another mode is not sounding: no stop');
 f.v.set('gaia',{preset:'x',params:f.v.snapshot().gaia.params});assert.equal(f.log.stops,1,'same sound: nothing happens');
 const key=f.v.semanticKey('gaia-terrain-carrier');f.v.set('gaia',{preset:'canyon',params:f.v.snapshot().gaia.params});assert.equal(f.v.semanticKey('gaia-terrain-carrier'),key,'a label is not sound');
 assert.notEqual(f.v.semanticKey('gaia-terrain-carrier',{gaia:{params:{lift:-1}}}),key);
});
test('projects: recipes travel with the project, older projects keep the draft',()=>{
 const f=fixture();f.v.preset('hildegard','marimba');const saved=JSON.parse(JSON.stringify(f.v.snapshot()));
 const g=fixture();g.v.preset('isolde','tritave');g.v.loadProject(null);g.v.loadProject(undefined);g.v.loadProject({});assert.equal(g.v.snapshot().isolde.preset,'tritave','a project without recipes changes nothing');
 g.v.loadProject({hildegard:saved.hildegard});assert.equal(g.v.snapshot().hildegard.preset,'marimba');assert.equal(g.v.snapshot().isolde.preset,'tritave');assert.equal(g.log.stops,0,'loading a project is not a user edit');
 assert.equal(g.v.normalizeProject('x'),null);assert.equal(g.v.normalizeProject({gaia:{schema:'bad'}}),null);
 assert.deepEqual(Object.keys(g.v.normalizeProject({gaia:{params:{lift:9}},nobody:{}})),['gaia']);assert.equal(g.v.normalizeProject({gaia:{params:{lift:9}}}).gaia.params.lift,1.5);
});
test('lazy runtime, errors, machine predicates',async()=>{
 const f=fixture();assert.equal(f.log.loads,0);
 const buffer=await f.v.renderCarrier({machineId:'gaia-terrain-carrier'});assert.equal(buffer.machine,'gaia-terrain-carrier');assert.equal(f.log.loads,1);assert.equal(f.v.lastReport().notes,3);
 await f.v.renderCarrier({machineId:'gaia-terrain-carrier'});assert.equal(f.log.loads,1,'loaded once');
 f.v.register({renderCarrier:async()=>{throw new Error('The carrier figure is empty.')}});await assert.rejects(f.v.renderCarrier({}),/empty/);assert.equal(f.v.lastError(),'The carrier figure is empty.');
 f.v.register({renderCarrier:async()=>{throw new DOMException('x','AbortError')}});f.v.set('gaia',{params:{lift:0}});await assert.rejects(f.v.renderCarrier({}),{name:'AbortError'});assert.equal(f.v.lastError(),null,'a cancelled render is not an error');
 for(const id of ['gaia-terrain-carrier','hildegard-mirror-carrier','isolde-spiral-carrier']){assert(f.c.__forgeSelfMachine(id));assert(f.c.__forgeRenderedMachine(id));assert(f.v.is(id))}
 assert(f.c.__forgeSelfMachine('emilia-nodal-carrier'));assert(!f.c.__forgeRenderedMachine('emilia-nodal-carrier'));assert(f.c.__forgeRenderedMachine('fractalia-self-carrier'));
 for(const id of ['branch-c-interval-body','raw-darkpsy-oscillator',undefined,null])assert(!f.c.__forgeSelfMachine(id)&&!f.v.is(id));
});
test('live transfer: Fractalia keeps its identity, the voices carry their own',()=>{
 const c={console,JSON,eze:t=>t==='nowhere'?null:'dest:'+t,FK:({machineId,destination})=>({from:machineId,destination}),mo:id=>({shortLabel:id.split('-')[0]}),
  __ForgeVoices:{is:id=>/^(gaia|hildegard|isolde)-/.test(id),engineOf:id=>id.split('-')[0]}};
 vm.createContext(c);vm.runInContext(read('forge/fractalia/14_live_transfer.js')+'\nthis.T=__FractaliaLiveTransfer;',c);
 const f=c.T.plan({targetId:'materialspur-export',machineId:'fractalia-self-carrier'}),legacy=c.T.plan({targetId:'materialspur-export'});
 assert.deepEqual(JSON.parse(JSON.stringify(f)),JSON.parse(JSON.stringify(legacy)));
 assert.equal(f.renderSource,'fractalia-rendered-pcm');assert.equal(f.sourceVersion,'xensonar-fractalia-rendered-live-f432');assert.equal(f.stableIdPrefix,'fractalia-rendered-live');assert.equal(f.renderModePrefix,'carrier-integral-rendered-material-fractalia');
 assert.equal(f.summary,'Fractalia · prepared audio body for live playback');assert.equal(f.contract.summary,'Fractalia is computed in the workshop and played as rendered audio.');
 const g=c.T.plan({targetId:'root-follow-export',machineId:'gaia-terrain-carrier'});assert.equal(g.machineId,'gaia-terrain-carrier');assert.equal(g.renderSource,'forge-voice-rendered-pcm');assert.equal(g.stableIdPrefix,'forge-voice-gaia-rendered-live');
 assert.equal(g.contract.defaultElasticity,'raw-granular-elastic');assert.equal(g.requiresAudibleRenderedBody,true);assert.match(g.summary,/^gaia · prepared/);
 assert.equal(c.T.plan({targetId:'nowhere',machineId:'gaia-terrain-carrier'}),null);
});
