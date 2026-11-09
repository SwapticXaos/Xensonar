/* F4.1 pilot: the donor owns the sound; Fractalia shapes its spectral families.
   No extra oscillators, frequency rounding, synthetic noise or mutation of PCM. */
function createFractaliaDonorEnvelope(atlas, referenceHz, amount) {
 const p=atlas.recipe.params,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const rows=atlas.material.rows,base=atlas.relations.base;
 const point=(points,u)=>{const x=u*(points.length-1),a=Math.floor(x),b=Math.min(a+1,points.length-1),f=x-a;
  const q={};for(const k of ['center','width','mass','near','branch','bend'])q[k]=points[a][k]*(1-f)+points[b][k]*f;return q;};
 return ({bins,binHz,ageSec})=>{
  const u=p.motion===0?0:clamp(ageSec/atlas.evolutionSec,0,1),gains=new Float64Array(bins);
  const families=atlas.relations.modes.map(m=>{
   const q=point(m.points,u),sig=m.signature;
   const raw=(q.center-base)/rows*6,aligned=Math.log2(Math.max(1,Math.round(2**raw)));
   return {center:aligned*(1-p.geometry)+raw*p.geometry,
    width:clamp(q.width*6+.22,.22,1.4)*(p.body==='hollow'?1.3:p.body==='reed'?.85:1),
    weight:Math.sqrt(Math.max(0,.5*q.mass+.5*sig.mass)),
    relation:.5*(q.near+q.branch+sig.near+sig.branch),bend:q.bend};
  });
  let norm=families.reduce((n,f)=>n+f.weight,0)||1;
  for(let k=0;k<bins;k++){
   const x=Math.log2(Math.max(binHz,k*binHz)/Math.max(35,referenceHz));let shape=0;
   for(const f of families){const d=(x-f.center)/f.width;
    let recursive=0;
    for(let level=0;level<p.depth;level++)recursive+=Math.cos(d*Math.PI*2**level+f.bend*.4)/(2**(level+1));
    shape+=f.weight/norm*Math.exp(-.5*d*d)*(.55+.35*f.relation+.55*p.fold*recursive);
   }
   // Bounded coloration of existing bins. Never fill an absent source partial.
   const tilt=(p.brightness-.5)*.12*clamp(x,0,5);
   gains[k]=Math.exp(amount*clamp((shape-.25)*1.5+tilt,-.69,.69));
  }
  return gains;
 };
}
function fractaliaDonorSnapshot() {
 const runtime=Vt.getSnapshot(),config=__F341Workbench.getConfig();
 const source=runtime.model?.hybrid?.sourceGrains??runtime.model?.hybrid;
 const ready=!!(runtime.source&&source?.samples?.length)&&runtime.phase!=='analyzing';
 const key=JSON.stringify([runtime.sourceRevision,runtime.modelRevision,ready,__F353SourceIdentity.key(runtime.source),config.regions,config.sourceKey]);
 return {runtime,source,config,key,ready,name:runtime.source?.fileName||'Donor'};
}
async function renderFractaliaDonorPCM({grid,durationSec,previewPitchRatio=1,atlas,sampleRate,check,onProgress}) {
 const captured=fractaliaDonorSnapshot();
 if(!captured.ready)throw Error('Prepare a donor in the donor tile first. Fractalia uses its active sample.');
 const valid=()=>{check();if(fractaliaDonorSnapshot().key!==captured.key)throw new DOMException('Donor changed during Fractalia rendering','AbortError');};
 valid();
 const preset=__F341PresetCatalog.presets.find(p=>p.id==='material-flow');
 const config={version:2,preset:'material-flow',params:{...__F341PresetCatalog.defaults,...preset.values},regions:captured.config.regions.map(r=>({...r})),sourceKey:captured.config.sourceKey};
 const plan=__ForgeF33.buildCarrierSupportPlan(grid,durationSec);
 if(!plan.bands.some(b=>b.gainCurve.some(v=>v>0)))throw Error('The carrier figure is empty.');
 const carrier={...plan,rootReferenceHz:plan.rootReferenceHz*previewPitchRatio};
 const amount=atlas.recipe.donor.amount;
 const reference=captured.source.referenceHz||captured.runtime.model?.hybrid?.referenceHz||220;
 const pcm=await __F356Material.render(carrier,captured.source,sampleRate,durationSec,{
  workbench:config,isCancelled:()=>{valid();return false;},onProgress,
  spectralEnvelope:amount>0?createFractaliaDonorEnvelope(atlas,reference,amount):undefined
 });
 valid();return {left:pcm,sampleRate,donorKey:captured.key};
}
if(typeof module!=='undefined'&&module.exports)module.exports={createFractaliaDonorEnvelope};
