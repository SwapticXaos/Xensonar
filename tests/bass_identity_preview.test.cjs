'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const read=p=>fs.readFileSync(path.join(__dirname,'../src',p),'utf8');
test('direct audition renders saved clip timbre without selecting it or mutating live sound',async()=>{
 const registered={},live={bassVoice:'sub',bassDecay:1,bassRootHz:55,bassVolume:.4,quantizeBpm:120};
 let rendered;
 const clip={id:'a',bars:1,events:[],generatorMeta:{},timbre:{bassVoice:'hollow',bassDecay:.7,bassTone:.2}};
 const ctx={console,Math,JSON,Number,Object,
  P:{useRef:v=>({current:v}),useEffect:fn=>fn()},
  __XenMetaAudition:{register:(kind,adapter)=>(registered[kind]=adapter,()=>{})},
  eH:()=>clip,Pr:v=>v,lce:()=>{},__XenBassGrid:{resolveBassRoot:(m,h)=>h},__XenPan:{snapshot:()=>({bass:0})},
  OfflineAudioContext:class{constructor(){this.destination={}}createStereoPanner(){return{pan:{},connect(){}}}async startRendering(){return{}}},
  OPe:options=>(rendered=options.nexusParamsRef.current,{playBassNote(){}}),
  __XenSessionPCM:{check(){},play:async()=>()=>{}}
 };
 vm.createContext(ctx);
 const store=read('sessions/v2-session-store.js'),a=store.indexOf('const __f48BassVoices ='),b=store.indexOf('/* P5: Persist',a);
 vm.runInContext(store.slice(a,b),ctx);
 const source=read('mix/03_session_auditions.js');
 vm.runInContext(source.slice(source.indexOf('function __useSessionRhythmAuditions(')),ctx);
 ctx.input={params:live,bassPatterns:[],bassContext:{}};
 vm.runInContext('__useSessionRhythmAuditions(input)',ctx);
 await registered.bass.start({id:'clip:a'},()=>{},{});
 assert.equal(rendered.bassVoice,'hollow');assert.equal(rendered.bassDecay,.7);
 assert.equal(rendered.bassVolume,.4);assert.equal(live.bassVoice,'sub');
 assert.equal(clip.timbre.bassVoice,'hollow');
});
test('Workshop Preview snapshots unsaved live sound and stage tuning without changing the selected library clip',()=>{
 const source=read('runtime/instrument/12_rhythm_and_bass_editor.js'),a=source.indexOf('function __bassLiveClip('),b=source.indexOf('const __bassAudition',a);
 const saved={id:'original',timbre:{bassVoice:'hollow'},tuning:{version:1,source:'main'},events:[]};
 const c={I:saved,t:{bassVoice:'wire'},Pr:v=>structuredClone(v),__xenBassTimbreCapture:v=>({...v}),
  __XenBassGrid:{captureTuning:()=>({version:1,source:'nested',tuningId:'19edo',config:{offsetsCents:{0:100}}})}};
 vm.createContext(c);vm.runInContext(source.slice(a,b)+';globalThis.preview=__bassLiveClip()',c);
 assert.equal(c.preview.timbre.bassVoice,'wire');assert.equal(c.preview.tuning.config.offsetsCents[0],100);
 assert.equal(saved.timbre.bassVoice,'hollow');assert.equal(saved.tuning.source,'main');
});
