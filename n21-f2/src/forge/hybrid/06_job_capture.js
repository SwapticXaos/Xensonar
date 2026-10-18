// Snapshot identity, carrier memo and immutable render capture have one owner.
function __createF352JobCapture({pe,Vt,__F341Workbench,__F352Session,xR,__f333Signature,__f352Clone,__f352Freeze,Zp,ph,__ForgeF33,__f3565PitchSemis,__f3565PitchSupport,sourceKey,readTuning}){
 const carrierCapture=__createForgeCarrierCapture({signature:__f333Signature,Grid:ph,buildPlan:__ForgeF33.buildCarrierSupportPlan,freeze:__f352Freeze});
 let signatureMemo=null;
function carrierSignature(state){if(!signatureMemo||signatureMemo.grid!==state.spectralData||signatureMemo.revision!==state.renderVersion)signatureMemo={grid:state.spectralData,revision:state.renderVersion,key:__f333Signature(state.spectralData)};return signatureMemo.key;}
function effectiveRecipe(){const recipe=__F352Session.export();return {...recipe,amount:recipe.enabled?recipe.amount:0};}
function identity(state=pe.getState()){
  const r=Vt.getSnapshot(),config=__F341Workbench.getConfig();
  const recipe=effectiveRecipe(),voice=recipe.amount>0?xR('vocal',state.carrierIntegralSynthLab?.readerSettings):null;
  return JSON.stringify(['forge-f3.55',sourceKey(r.source),r.model?.hybrid?.sourceGrains?.version,r.model?.bodyV3?.registerPolicy,
   carrierSignature(state),readTuning(),state.spectralData.melodicCarrier??null,state.materialExport.bars,state.materialExport.bpm,state.materialExport.beatsPerBar,__F341Workbench.fingerprint(config),recipe.amount>0?recipe:{amount:0},voice]);
 }
function capture(state){const runtime=Vt.getSnapshot(),source=runtime.model?.hybrid?.sourceGrains??runtime.model?.hybrid;
  if(!runtime.selected||!source?.atlas)throw Error("Please extract and activate Donor Sustain from a donor selection.");
  const workbenchConfig=__f352Clone(__F341Workbench.getConfig());
  const config=__f352Freeze({...workbenchConfig,params:{...workbenchConfig.params,carrierTranspose:workbenchConfig.params.carrierTranspose}});
  // F3.56: the PCM material experiment is a separate supported source path.
  // It intentionally keeps engine='spectral' in saved recipes so that the
  // retired historical Sustain presets are not silently reactivated.
  if(!config.params.materialPilot)
   throw Error("Please choose a compatible donor listening mode (Sound Material or Donor Sustain).");
  const durationSec=Zp(state.materialExport.bars,state.materialExport.bpm,state.materialExport.beatsPerBar),sampleRate=48000,recipe=__f352Freeze(effectiveRecipe()),cecilia=__f352Freeze(xR('vocal',state.carrierIntegralSynthLab?.readerSettings));
  // Snapshot providers read the current store. Explicit older states bypass hits.
  const captured=carrierCapture.capture(state,durationSec,sampleRate,state===pe.getState()),carrierKey=captured.key;
  const donorKey=JSON.stringify([carrierKey,sourceKey(runtime.source),__F341Workbench.fingerprint(config),__f3565PitchSemis()]),syntheticKey=JSON.stringify([carrierKey,cecilia,__f3565PitchSemis(),recipe.mode==='state'?[donorKey,recipe.coupling]:null]);
  const model=__F341Workbench.materialModel(source,config);
  // Atlas and PCM are read-only owned extraction data; materialModel only replaces windows.
  return Object.freeze({key:identity(state),donorKey,syntheticKey,support:__f3565PitchSupport(captured.support,__f3565PitchSemis()),model,config,cecilia,recipe,sampleRate,durationSec,
   manifest:__f352Freeze({schema:'xensonar-forge-result-v1',audioOrigin:recipe.amount===0?'SOURCE_ONLY':'SOURCE_PLUS_SYNTH',carrierKey,donorKey,syntheticKey,sourceRevision:runtime.sourceRevision,sourceName:runtime.source?.fileName??'',sourceSelection:[runtime.source?.importStartSec,runtime.source?.importDurationSec],bars:state.materialExport.bars,bpm:state.materialExport.bpm,beatsPerBar:state.materialExport.beatsPerBar,config,cecilia,recipe})});
 }
 return Object.freeze({identity,capture});
}
