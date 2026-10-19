'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),ts=require('typescript');
const source=fs.readFileSync('src/forge/editor/09_workflow_controls.js','utf8'),ast=ts.createSourceFile('workflow.js',source,99,true);
const names=['__forgeMaterialRootHz','__ForgeMaterialMetadata'],code=ast.statements.filter(n=>names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
let patches=[];const ctx={P:{createElement:(type,props,...children)=>({type,props:props??{},children})}};
vm.createContext(ctx);vm.runInContext(code+';this.api={root:__forgeMaterialRootHz,view:__ForgeMaterialMetadata}',ctx);
for(const value of [null,undefined,0,-1,Infinity,NaN,'110',24001])assert.equal(ctx.api.root(value),null);
for(const value of [1,55,110.125,24000])assert.equal(ctx.api.root(value),value);
function walk(node,result=[]){if(!node||typeof node!=='object')return result;if(node.type)result.push(node);for(const c of node.children??[])walk(c,result);return result;}
for(const role of ['loop','waveMaterial','particleExciter','droneTexture']){
 const meta={name:'Old project',role,bars:3,guideSegments:7,rootHz:110,beatsPerBar:4};const before=JSON.stringify(meta);
 const tree=walk(ctx.api.view({meta,onPatch:patch=>patches.push(patch),selection:{fineLoopRange:{durationSec:2}}}));
 assert.equal(tree.some(n=>n.type==='select'),false,'no usage role disguised as sample kind');assert.equal(JSON.stringify(meta),before);
 const anchor=tree.find(n=>n.props['aria-label']==='Material Frequency Anchor (Hz)');
 assert.equal(anchor.props.value,110);anchor.props.onChange({currentTarget:{value:''}});assert.equal(patches.at(-1).rootHz,null);
 anchor.props.onChange({currentTarget:{value:'123.45'}});assert.equal(patches.at(-1).rootHz,123.45);
 const bars=tree.find(n=>n.props['aria-label']==='Number of Bars');bars.props.onChange({currentTarget:{value:'2.6'}});assert.equal(patches.at(-1).bars,3);
 bars.props.onChange({currentTarget:{value:'99'}});assert.equal(patches.at(-1).bars,16);
 assert.ok(tree.some(n=>n.type==='details'),'visual guides are optional');
}
assert.ok(patches.every(patch=>!Object.hasOwn(patch,'role')),'UI does not migrate or rewrite legacy roles');
// Only metadata changes while rendering must also invalidate a pending export.
const routing=fs.readFileSync('src/forge/ui/02_donor_routing_and_hearing.js','utf8'),routingAst=ts.createSourceFile('routing.js',routing,99,true);
const guard=routingAst.statements.find(n=>n.name?.text==='__createDonorRoutingF317').getText(routingAst);
(async()=>{
 let release;const rawPlayer={isPlaying:()=>false,stop(){}};const state={phase:'idle'},runtime={getSnapshot:()=>state,stop(){},selectCarrier(){},subscribe(){return()=>{}}};
 let meta={bars:2,bpm:120,rootHz:110};const store={materialExport:meta};
 const sandbox={pe:{getState:()=>store},__F352Runtime:runtime,console,Promise};vm.createContext(sandbox);vm.runInContext(guard+';this.create=__createDonorRoutingF317',sandbox);
 const api=sandbox.create(runtime,rawPlayer,{});
 const pending=api.guardExport(()=>new Promise(resolve=>{release=resolve}));
 store.materialExport={...meta,rootHz:220};release(new Blob(['test']));
 await assert.rejects(pending,/changed during rendering/);
 console.log('PASS metadata validation, unchanged legacy roles, optional guides and stale pitch-anchor export rejection');
})().catch(error=>{console.error(error);process.exitCode=1});
