'use strict';
// ROOM5-02: the Main Room grid layer was moved out of the Live Room draw function (V2e) into one shared function.
// The NEW V2e must issue exactly the same canvas operations as the OLD one (fixture = parent text), in the real app
// scope, for several states: grid off, grid on, snapped (green line), muted steps, offsets, window offset.
// Usage: node tests/e2e/room5_grid_layer_equivalence.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');const oldSrc=fs.readFileSync(path.resolve(__dirname,'../fixtures/v2e_pre_roomgrid.txt'),'utf8');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+html);await p.waitForTimeout(3500);
  const result=await p.evaluate(oldSrc=>{
    const D=window.__xenProbe.draw,oldV2e=D.evalInBundle(oldSrc+';V2e'),newV2e=D.V2e(),{vr,ir}=D.geometry();
    const record=()=>{const log=[];const grads=[];const mk=name=>(...a)=>{log.push(name+JSON.stringify(a.map(x=>typeof x==='number'?+x.toFixed(6):x)));};
      const ctx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return(...a)=>{const id=grads.length;grads.push([]);log.push(k+JSON.stringify(a.map(x=>+x.toFixed(6)))+'#'+id);return{addColorStop:(o,c)=>log.push('stop#'+id+':'+o+':'+c)}};
          return mk(k)},set(t,k,v){t[k]=v;log.push('set '+k+'='+(typeof v==='object'?'[gradient]':v));return true}});return{ctx,log}};
    const nowReal=performance.now.bind(performance);let clock=1000;performance.now=()=>clock;
    const params=(over)=>({gridOn:true,lockCursorToGrid:false,gridBase:440,gridTuning:'12edo',gridMode:'chromatic',manualGridMutedSteps:[],manualGridStepOffsets:[],resonanceHotkeyMode:'material',dronePreset:'dark_sub',droneEnabled:true,rootFollowLoopActive:false,...over});
    const cases=[['grid off',params({gridOn:false}),{cursorX:300,cursorY:200},0],['grid on, free cursor',params({}),{cursorX:300,cursorY:200},0],
      ['locked to grid (green line)',params({lockCursorToGrid:true}),{cursorX:700,cursorY:333},0],['locked, muted steps + offsets',params({lockCursorToGrid:true,manualGridMutedSteps:[1,3,6],manualGridStepOffsets:[0,12,-8,0,0,30,0,0,0,0,0,0]}),{cursorX:80,cursorY:410},0],
      ['19 edo, window offset 5',params({gridTuning:'19edo',lockCursorToGrid:true}),{cursorX:900,cursorY:120},5],['just intonation',params({gridTuning:'ji',gridBase:396}),{cursorX:500,cursorY:260},2]];
    const out=[];
    for(const[name,r,state,off]of cases){const run=fn=>{const{ctx,log}=record();const trackers={s:{current:null},l:{current:0},c:{current:null},d:{current:0}};const rows=()=>window.__xenProbe.draw.rowsFor?window.__xenProbe.draw.rowsFor(r):null;
        // rows come from the real owner: pEe(params)
        const get=D.evalInBundle('(p=>()=>pEe(p))')(r);
        const arg={ctx,state:{...state,cursorX:state.cursorX,cursorY:state.cursorY},params:r,t:1.5,focusCursorRef:{current:{x:state.cursorX+30,y:state.cursorY-20}},getVisibleGridLines:get,activeGridLineFreqRef:trackers.s,activeGridLineSinceRef:trackers.l,previousGridLineFreqRef:trackers.c,previousGridLineAtRef:trackers.d,keyboardWindowOffsetRef:{current:off},droneVolume:.5};
        clock=1000;fn(arg);clock=1090;fn(arg);return log};
      const a=run(oldV2e),c=run(newV2e);out.push({name,ops:a.length,same:a.length===c.length&&a.every((x,i)=>x===c[i]),firstDiff:a.findIndex((x,i)=>x!==c[i]),sample:[a[0],c[0]]})}
    // Room V's option: edgeLines changes only the gradient of the plain lines; without it (or false) the ops are the same as the old code's
    {const {Zs,Qa}=D.geometry(),layer=D.layer(),r=params({lockCursorToGrid:true}),get=D.evalInBundle('(p=>()=>pEe(p))')(r);
     const run=edge=>{const{ctx,log}=record();clock=1000;layer({ctx,state:{cursorX:300,cursorY:200},params:r,t:1.5,focusCursorRef:{current:{x:330,y:180}},getVisibleGridLines:get,activeGridLineFreqRef:{current:null},activeGridLineSinceRef:{current:0},previousGridLineFreqRef:{current:null},previousGridLineAtRef:{current:0},keyboardWindowOffsetRef:{current:0},edgeLines:edge},vr,Zs,Qa);return log};
     const plain=run(undefined),off=run(false),on=run(true);
     out.push({name:'edgeLines undefined = false',ops:plain.length,same:plain.length===off.length&&plain.every((x,i)=>x===off[i]),firstDiff:-1,sample:[]});
     out.push({name:'edgeLines true changes the line gradient only',ops:on.length,same:(a=>a.length>0&&a.length===on.filter(x=>!/stop#/.test(x)).length&&a.every((x,i)=>x===on.filter(y=>!/stop#/.test(y))[i]))(plain.filter(x=>!/stop#/.test(x)))&&on.filter(x=>/stop#/.test(x)).length===plain.filter(x=>/stop#/.test(x)).length+3,firstDiff:-1,sample:[]})}
    performance.now=nowReal;return out});
  console.table(result.map(r=>({case:r.name,ops:r.ops,same:r.same})));
  for(const r of result){assert(r.same,'canvas ops differ in case "'+r.name+'" at op '+r.firstDiff);assert(r.ops>10||r.name==='grid off')}
  assert(result.find(r=>r.name==='locked to grid (green line)').ops>100,'real grid drawn');assert.deepEqual(errors,[]);
  console.log('PASS ROOM5-02 shared grid layer draws exactly what the old Live Room code drew');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
