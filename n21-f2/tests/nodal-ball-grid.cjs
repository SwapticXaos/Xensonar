'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const rows=[{id:'high',freq:800},{id:'mid',freq:500},{id:'low',freq:200},{id:'muted',freq:650,manualMuted:true}];let calls=0;
const config={paramsRef:{current:{gridTuning:'shared',gridBase:1000}},mixRef:{current:{rootLevel:.62,ballToneMode:'grid'}},modeRef:{current:'installation'}};
const context={tc:600,myzelGClamp:(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number.isFinite(v)?v:lo)),__xenGridMuted:p=>p?.muted,pEe:p=>(calls++,rows),gj:()=>({min:100,max:1000})};
vm.createContext(context);vm.runInContext(fs.readFileSync('src/nodal/13_installation_ball_grid.js','utf8')+';this.api=__NodalBallGrid',context);const api=context.api;api.bind(config);
const lines=api.lines();assert.equal(lines.length,3);assert.equal(api.lines(),lines,'unchanged canonical lines reuse the projected view');assert.equal(lines[1].y,500/900);
let state={};const control=(y,time,mix=config.mixRef.current)=>api.control({cursorNormalizedY:y},mix,state,time);
assert.equal(control(.1,0).gate,0,'enabling never fabricates a crossing');assert.equal(control(.3,.03).hz,800);assert.equal(control(.3,.06).gate<1,true);
assert.equal(control(.3,.2).gate,0,'stationary ball becomes silent');assert.equal(control(.7,.23).hz,500);assert.equal(control(.1,.26).hz,800,'reverse sweep chooses the freshest crossed line');
assert.equal(control(.9,1).gate,0,'no catch-up burst after a stalled frame');
config.paramsRef.current={...config.paramsRef.current,muted:true};assert.equal(control(.1,1.03).gate,0,'shared mute stops the grid');
config.paramsRef.current={...config.paramsRef.current,muted:false};assert.equal(control(.9,1.06).gate,0,'unmute starts with a fresh baseline');
state={};const count=calls;assert.equal(control(.2,2,{rootLevel:.62}).gate,1);assert.equal(calls,count,'legacy continuous mode does not build a grid');
state={};control(.22,3);control(.223,3.03);const hit=state.lastHit;control(.221,3.06);assert.equal(state.lastHit,hit,'small boundary jitter does not retrigger');
const muted=control(.9,3.09,{rootLevel:0,ballToneMode:'grid'});assert.equal(muted.gate,0,'zero root volume cannot create a grid note');
// Compare the complete original production kernel, not a duplicate oscillator.
function kernel(file){const c={};vm.createContext(c);vm.runInContext(fs.readFileSync(file,'utf8')+';this.create=createMyzelGDSP',c);return c.create(48000);}
function render(k,data,seconds=.5){k.controls(data);const values=[];for(let at=0;at<48000*seconds;at+=128){const out=[new Float32Array(128),new Float32Array(128)];k.process([],out);values.push(...out[0]);}return values;}
const original=kernel('tests/fixtures/nodal-ball-grid/myzel-g-before.js'),current=kernel('src/audio/09_myzel_g_dsp.js');
const legacy={active:1,reset:true,root:220,frequency:330,neighbourFrequency:440,rootLevel:.62,ballLevel:.34,nodeLevel:.78,gesture:.5};
assert.deepEqual(render(current,legacy),render(original,legacy),'legacy continuous PCM remains bit-identical');
const note=kernel('src/audio/09_myzel_g_dsp.js');const pulse=render(note,{...legacy,root:220,ballLevel:0,nodeLevel:0,ballToneHz:500,ballToneGate:1});assert.ok(Math.max(...pulse.map(Math.abs))>.01);
const silence=render(note,{rootLevel:0,ballToneGate:0},2);const tail=silence.slice(-4800);assert.ok(Math.max(...tail.map(Math.abs))<1e-7,'zero level fades to silence with no gain floor');
for(const kind of ['resonator','formant_filter','spectral_tilt','wavefolder','sub_harmonic','shimmer_delay','comb_filter','grain_blur','drive','chorus','bitcrusher']){
 const a=kernel('tests/fixtures/nodal-ball-grid/myzel-g-before.js'),b=kernel('src/audio/09_myzel_g_dsp.js');const state={...legacy,stages:[{id:'reference',type:kind,strength:.8,frequency:330,x:.4,y:.6,memory:1.2}]};
 assert.deepEqual(render(b,state,.17),render(a,state,.17),'preserve legacy PCM through '+kind);
}
const ts=require('typescript'),core=fs.readFileSync('src/rhythm/04_workspace_and_transport.js','utf8'),ast=ts.createSourceFile('core.js',core,99,true),names=['__xenGridOffsetValue','__xenGridShiftCents','__xenShiftGridOffsets','lEe'];
const code=ast.statements.filter(node=>names.includes(node.name?.text)).map(node=>node.getText(ast)).join('\n');const shiftScope={Me:(v,a,b)=>Math.max(a,Math.min(b,v)),Zd:()=>3};vm.createContext(shiftScope);vm.runInContext(code+';this.shift=__xenShiftGridOffsets;this.mean=__xenGridShiftCents',shiftScope);
const offsets=[-5,0,5],moved=Array.from(shiftScope.shift('test',offsets,120));assert.deepEqual(moved,[7,12,17]);assert.deepEqual(offsets,[-5,0,5]);const limited=Array.from(shiftScope.shift('test',offsets,500));assert.deepEqual(limited,[40,45,50],'boundary clamp shifts all steps equally; intervals do not stretch');
console.log('PASS shared-grid projection, cache, crossing direction, jitter/stall/mute guards, zero gain and bit-identical legacy G PCM');
