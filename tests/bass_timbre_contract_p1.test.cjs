'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,'src',p),'utf8');
function fixture(){
 const code=read('sessions/v2-session-store.js');
 const start=code.indexOf('const __f48BassVoices ='),end=code.indexOf('/* P5: Persist',start);
 assert.ok(start>=0&&end>start);
 const ctx={Number,Object,Math,JSON};vm.createContext(ctx);
 vm.runInContext(code.slice(start,end)+'\nglobalThis.clean=__xenBassTimbreClean;globalThis.snapshot=__xenBassTimbreCapture;globalThis.patch=__xenBassTimbrePatch;',ctx);
 return ctx;
}
const expected={bassVoice:'hollow',bassTone:.34,bassGrit:.27,bassResonance:.61,bassEnvelope:1.3,bassDecay:.8,bassSub:.42};
test('Bass definition sound captures exactly the seven live DSP controls',()=>{
 const x=fixture();assert.deepEqual(JSON.parse(JSON.stringify(x.snapshot({...expected,bassVolume:.9,droneTimbre:.2}))),expected);
});
test('invalid voice and out-of-range values are normalized and no globals enter the saved clip',()=>{
 const x=fixture(),value=JSON.parse(JSON.stringify(x.clean({bassVoice:'invalid',bassTone:Infinity,bassGrit:-2,bassResonance:8,bassEnvelope:3,bassDecay:-9,bassSub:10})));
 assert.equal(value.bassVoice,'classic');assert.equal(value.bassResonance,1);assert.equal(value.bassGrit,0);assert.equal(value.bassDecay,.25);assert.equal(value.bassEnvelope,2);assert.equal(value.bassSub,1.5);
});
test('legacy without an explicit timbre does not silently import current workbench into a library clip',()=>{
 const x=fixture();assert.equal(x.patch(null),null);assert.deepEqual(JSON.parse(JSON.stringify(x.patch(expected))),expected);
});
test('bass library save and load paths own timbre; selecting a named clip restores the sound',()=>{
 const code=read('rhythm/02_bass_and_rack.js');
 assert.match(code,/function Pce\([^]*?__xenBassTimbreCapture/);
 assert.match(code,/function Ice\([^]*?__xenBassTimbreCapture/);
 assert.match(code,/handleSelectBassClip:[^]*?__xenBassTimbrePatch\(ee\.timbre\)/);
});
test('import fingerprints distinguish identical notes with different timbres',()=>{
 const code=read('app/forge/02_boot_and_workspace_tools.js');
 const p=code.slice(code.indexOf('function W1('),code.indexOf('function gO(',code.indexOf('function W1(')));
 assert.match(p,/timbre:/);assert.match(p,/JSON\.stringify\(t\.timbre/);
});
test('real Bass Save As/Update helpers write a complete canonical sound record',()=>{
 const x=fixture(),src=read('rhythm/02_bass_and_rack.js'),start=src.indexOf('function Pce('),end=src.indexOf('function Ece(',start);
 assert.ok(start>=0&&end>start);
 x.__store={clips:[],order:[]};
 x.sc=()=>x.__store;x.Pr=v=>structuredClone(v);x.Kle=v=>({...structuredClone(v),id:'new-bass'});
 x.gg=v=>(x.__store=structuredClone(v));
 vm.runInContext(src.slice(start,end)+';globalThis.save=Pce;globalThis.update=Ice;',x);
 const srcClip={id:'original',name:'Original',events:[],generatorMeta:{kind:'manual'}};
 const live={bassVoice:'hollow',bassTone:.44,bassGrit:.22,bassResonance:.71,bassEnvelope:1.1,bassDecay:.65,bassSub:.4};
 const saved=x.save(srcClip,{name:'Hollow Original',params:live});
 assert.equal(saved.name,'Hollow Original');assert.deepEqual(JSON.parse(JSON.stringify(saved.timbre)),live);
 x.update({...saved,events:[{id:'n1',startStep:1}]},{...live,bassVoice:'acid'});
 assert.equal(x.__store.clips.length,1);assert.equal(x.__store.clips[0].timbre.bassVoice,'acid');
});
test('actual Bass import content and differential signatures separate clips by sound',()=>{
 const x=fixture(),src=read('app/forge/02_boot_and_workspace_tools.js'),start=src.indexOf('function W1('),end=src.indexOf('function gO(',start);
 x.Pr=clip=>clip;x.al=text=>text;x.rFe=s=>s;
 vm.runInContext(src.slice(start,end)+';globalThis.contentKey=W1;globalThis.diffKey=q1;',x);
 const clip={id:'id-1',name:'Bass',stepCount:16,bars:1,stepsPerBar:16,segmentCount:1,segmentMarkers:[],pitchSnapMode:'magnet',pitchGuideKind:'ji',generatorMeta:{kind:'manual',presetId:'x'},events:[{id:'n',startStep:0,durationSteps:1,ratioFromRoot:1,centsFromRoot:0,octave:0,velocity:1,accent:1}]};
 const a={...clip,timbre:{bassVoice:'hollow'}},b={...clip,timbre:{bassVoice:'sub'}};
 assert.notEqual(x.contentKey(a),x.contentKey(b));assert.notEqual(x.diffKey(a),x.diffKey(b));
});
