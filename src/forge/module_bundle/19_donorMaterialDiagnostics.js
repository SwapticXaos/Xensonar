"module-source/src/features/l3lab/spectralForge/donorHybrid/donorMaterialDiagnostics.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports,"__esModule",{value:true});
exports.bindRenderProgressKey=bindRenderProgressKey;
exports.attachDonorDiagnostics=attachDonorDiagnostics;
exports.captureDonorMaterialPlan=captureDonorMaterialPlan;
exports.capturePreparedDonorOutput=capturePreparedDonorOutput;
exports.diagnosticsSnapshot=diagnosticsSnapshot;
// Material provenance is audio metadata. It must not own an output FFT,
// canvases, store subscriptions or a separate Donor visualization.
let bindings=null,last=null,revision=0;
const plans=new Map(),materialByBuffer=new WeakMap();
function bindRenderProgressKey(progress,key){
 const wrapped=fraction=>progress?.(fraction);
 Object.defineProperty(wrapped,'__forgeF321RenderKey',{value:key});
 return wrapped;
}
function attachDonorDiagnostics(next){bindings=next}
function captureDonorMaterialPlan(pcm,sourceTimeline,progress){
 if(sourceTimeline)return;
 const key=progress?.__forgeF321RenderKey,plan=pcm.donorMaterialPlan;
 if(key&&plan)plans.set(key,plan);
 while(plans.size>4)plans.delete(plans.keys().next().value);
}
async function capturePreparedDonorOutput(key,buffer,prepared={}){
 if(!bindings||bindings.key()!==key||bindings.runtime.getSnapshot().model?.renderMethod!=='hybrid')return;
 const material=plans.get(key)??materialByBuffer.get(buffer)??null;
 if(material)materialByBuffer.set(buffer,material);
 plans.delete(key);
 const state=bindings.runtime.getSnapshot();
 last={key,renderKey:key,sourceRevision:state.sourceRevision,renderVersion:bindings.store.getState().renderVersion,
  renderMethod:state.model?.renderMethod,registerPolicy:state.model?.bodyV3?.registerPolicy,
  material,prepared:{cacheHit:prepared.cacheHit,sharedInFlight:prepared.sharedInFlight,partialRender:prepared.partialRender,reusedFraction:prepared.reusedFraction},outputDurationSec:buffer.duration};
 revision++;
 __F341Workbench.captureOutput(key,buffer,null,material);
}
function diagnosticsSnapshot(){return {revision,...last,current:!!last&&bindings?.key()===last.key,mantle:null}}
},
