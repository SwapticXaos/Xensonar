// LIVE-LANE-01 (unit): (1) a Loop-Rec take saves the instruments in use; built-in factory sounds (Nodal factory "troodle", Entrophon factory) carry no revision
// and must be skipped, not refused (a Nodal factory sound on the Keyboard used to stop every take with "Invalid song instrument source");
// (2) the lane input of the Live Room is the only way a synth reaches Loop-Rec: one input per lane and synth family, the family travels to the stems.
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function cut(src,start,end){const a=src.indexOf(start),b=src.indexOf(end,a);assert(a>=0&&b>a,'marker '+start);return src.slice(a,b+end.length)}

test('song instruments: factory sounds are skipped, unknown unversioned ids are still refused',()=>{
  const body=cut(read('src/instruments/05_entrophon_integration.js'),'const __XenSongInstrumentDefinitions=(()=>{','})();');
  const lib=[{id:'n',revision:3,instrument:{name:'mine',nodes:[]}}];
  const api=new Function('__XenNodalLibrary','__XenNodalModel','normalizeEntrophonInstrument','entrophonFindInstrument','__EntrophonLiveDefinitions','window','Event',body+';return __XenSongInstrumentDefinitions')
   ({list:()=>lib},{normalize:x=>x},x=>x,()=>null,new Map(),undefined,undefined);
  const f=api.capture(['nodal:factory:troodle','entrophon:factory:glass-harp','classic-bell','psylab:factory:Liquid Bell']);
  assert.deepStrictEqual([Object.keys(f.nodal).length,Object.keys(f.entrophon).length],[0,0],'nothing to store for built-in sounds');
  const own=api.capture(['nodal:factory:troodle','nodal:n@3']);assert.deepStrictEqual(Object.keys(own.nodal),['nodal:n@3'],'a saved Nodal sound is still stored');
  assert.throws(()=>api.capture(['nodal:troodle']),/Invalid song instrument source/,'an unversioned non-factory id is refused as before');
  assert.throws(()=>api.capture(['nodal:gone@1']),/Missing song instrument/);
});

test('lane input: one per lane and family, family recorded for the stems, Loop-Rec gets every one',()=>{
  const src=read('src/post-oct/gaps/010-main-bundle__15_after_03_pcm_master_recorder.js');
  const body=cut(src,'const __XenLoopRec=(()=>{','\n})();');
  // a minimal audio context: gain nodes that remember their connections
  const mkNode=()=>{const n={out:[],connect(d){n.out.push(d);return d},disconnect(){}};n.gain={value:1};return n};
  const ctx={state:'running',createGain:mkNode,addEventListener(){}};
  const stubs={__XenEQ:{route:(c,kind,node)=>{const i=mkNode();i.connect(node);i.eqKind=kind;return i}},__XenAvalanche:{isInput:()=>false},__XenMetaSessions:{},bs:()=>({entries:[]}),__XenLoopRecWitness:{},__xenCreateMasterPCMRecorder:null,P:{},u:{}};
  const LR=new Function(...Object.keys(stubs),body.replace('const __XenLoopRec=','return '))(...Object.values(stubs));
  const master=mkNode();
  const classic=LR.route(ctx,'keyboard',master),again=LR.route(ctx,'keyboard',master),psy=LR.route(ctx,'keyboard',master,{family:'psylab'}),psy2=LR.route(ctx,'keyboard',master,{family:'psylab'}),wave=LR.route(ctx,'wave',master,{family:'psylab'});
  assert.strictEqual(classic,again,'one lane input per lane: every classic keyboard voice shares it');
  assert.strictEqual(psy,psy2,'one input per lane and family');assert.notStrictEqual(psy,classic,'a synth family keeps its own instrument EQ device');assert.notStrictEqual(wave,psy);
  assert.strictEqual(psy.eqKind,'keyboard','the family input goes through the instrument EQ of its lane');
  const taps=LR.kindTaps(ctx);assert.deepStrictEqual(taps.map(t=>t.kind+'|'+t.family).sort(),['keyboard|','keyboard|psylab','wave|psylab']);
  for(const t of taps)assert(t.node.out.includes(master),'every lane tap feeds the master');
  // the public name a synth uses
  assert(/const __XenLiveLane=Object\.freeze\(\{input:\(ctx,lane,destination,family\)=>__XenLoopRec\.route\(ctx,lane,destination,family\?\{family\}:undefined\)\}\)/.test(src));
});

test('Psy Lab enters through the lane input; no synth-specific path to Loop-Rec or the stems is left',()=>{
  const psy=read('src/post-oct/034-xen-room-psylab.js'),stems=read('src/post-oct/036-xen-stem-recorder.js'),cat=read('src/mix/02_performance_catalog.js');
  assert(/__XenLiveLane\.input\(ctx,kind,bridge\.getMasterInput\(ctx\),'psylab'\)/.test(psy),'Psy Lab uses the lane input');
  assert(!/__XenEQ\.route\(/.test(psy),'Psy Lab no longer builds its own EQ route next to Loop-Rec');
  for(const [name,s] of [['psylab',psy],['stems',stems],['catalog',cat]])assert(!/__psyOutWatchers|__XenPsyLab\.(outputs|watch)\(|outWatch/.test(s),name+': the Psy Lab special path is gone');
});
