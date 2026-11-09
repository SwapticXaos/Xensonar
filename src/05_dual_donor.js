
const __F35634Default=()=>({schema:'xensonar-dual-donor-ui-v2',revision:'revised',name:'Untitled sound crossing',sources:{A:{kind:'active',id:null,label:'Current Forge donor',revision:null},B:null},regions:[],links:[],operation:'cross',imprintDirection:'A_to_B',remainder:'undecided',updatedAt:0});

/* xen-lazy:lab */


/* xen-lazy:lab */


// Identity is content based. WebCrypto is preferred; the full-byte FNV fallback is diagnostic,
// not a security signature. Never use file name or lastModified as a content identity.

/* xen-lazy:lab */


/* xen-lazy:lab */


const __f35635FeatureName={all:'Sound character',resonance:'Resonances',texture:'Texture',motion:'Motion'};
// Deterministic first-hear recipe follows the selected method; existing marks survive.
// Never mutate a manual blueprint or infer its intended property-to-property links.
/* F3.56.46: editable draft and completed-render provenance have separate owners. */

/* xen-lazy:lab */


/* xen-lazy:lab */



/* xen-lazy:lab */




/* xen-lazy:lab */


/* xen-lazy:lab */


/* xen-lazy:lab */


/* xen-lazy:lab */


/* xen-lazy:lab */



/* xen-lazy:lab */



/* xen-lazy:lab */




/* xen-lazy:lab */




/* xen-lazy:lab */


/* xen-lazy:lab */

__F341Workbench.attach({
 beforeChange(){Vt.stop();xt.stop();},
 afterChange(){const s=pe.getState();pe.setState({audioBufferDirty:true,renderVersion:s.renderVersion+1});xt.invalidateBuffer();},
 loadPresets(){return JSON.parse(localStorage.getItem('xensonar:donor-workbench:presets:v1')||'[]')},
 savePresets(items){try{localStorage.setItem('xensonar:donor-workbench:presets:v1',JSON.stringify(items))}catch(e){throw Error("Could not save preset: "+e.message)}}
});
let __F341LastSource=null;
Vt.subscribe(()=>{const source=Vt.getSnapshot().source;if(source&&source!==__F341LastSource){__F341LastSource=source;__F341Workbench.sourceChanged(source);}});

__f333AttachTransitionGuard(pe);
__f333Persistence=__ForgeF33.attachExperimentStatePersistence({runtime:Vt,store:pe,prepareDonor:kE});
// F447: mounted Forge canvas / explicit playback owns the subscriptions.
globalThis.__SpectralForgeF35={version:"F3-56.29",baseVersion:"F3-56.27",klanggestalt:__F356Gestalt,klanggestaltWorker:__F356GestaltWorker,restoreExperiment:()=>__f333Persistence?.restore(),planner:__F356Material,analysisCache:__F353AnalysisCache,hybrid:__F352Runtime,combination:__F352Session,legacy:{playDonor:__f352LegacyPlayDonor,exportDonor:__f352LegacyExportDonor},sourceGrains:__F350Donor,onsetEvidence:__F347OnsetEvidence,workbench:__F341Workbench,master:__F3564Master,saveExperiment:()=>__f333Persistence?.saveNow(),...__ForgeF33,analyze:KNe,prepareDonor:kE,runtime:Vt,store:pe,engine:xt,prepareCache:fU};

Object.assign(globalThis.__SpectralForgeF35,{version:"F3-56.40",dualDonor:__F35636DualDSP,articulation:__F35636Articulation});

Object.assign(globalThis.__SpectralForgeF35,{version:"F3-56.43",donorField:__F35641Field,comparisonRevision:41});

Object.assign(globalThis.__SpectralForgeF35,{variants:{original:{gestalt:__F356GestaltOriginal,material:__F356MaterialOriginal,dual:__F35636DualDSPOriginal},revised:{gestalt:__F356Gestalt,material:__F356Material,dual:__F35636DualDSPUpdated}}});

/* Starter presets retain their existing durable material entries for legacy Material Track
   consumers. Their Root Follow configuration uses the SAME synth descriptor as the
   ordinary Melodic Loop -> Root Follow send action (rather than a flowing PCM route).
   On re-entry, an already-rendered legacy starter needs only its RFL recipe updated;
   do not re-render its WAV. No startup renderer is added. */
function __xenStarterDemoComposer(project,pattern){
 const state=$n(project.composer);
 state.tracks=state.tracks.map(track=>({...track,patternPresetId:pattern}));
 return _7(state,project.patternVariants,project.patternLinks);
}
function __xenStarterIsDirectSynth(id){
 const cfg=Yp().entryConfigs[id];
 return cfg?.sourceKind==='synth'&&cfg?.renderMode==='direct'&&
        Array.isArray(cfg?.synthPattern?.notes)&&cfg.synthPattern.notes.length>0;
}
async function __xenStarterRenderDemo(){
 await u0e();
 if(!__XenQuick.adapters.has('material')||!__XenQuick.adapters.has('rootFollow'))throw Error('Open the Main Room to prepare starter materials.');
 const project=z7(4)[0].project,patterns=['patternA','patternB','patternC'],outputs=[];
 for(let i=0;i<patterns.length;i++){
  const id=__XenStarterDemoIds[i],letter='ABC'[i],name='Random Demo · Pattern '+letter;
  const loop=__xenStarterDemoComposer(project,patterns[i]);
  const config=L9e({loopComposer:loop});
  if(config?.sourceKind!=='synth'||config?.renderMode!=='direct'||!config.synthPattern?.notes?.length){
   throw Error('Starter Pattern '+letter+' is not eligible for direct Melodic Loop synthesis.');
  }
  let entry=bs().entries.find(item=>item.id===id);
  // Existing legacy audio remains available to Material Track. Migration only rebinds RFL.
  const stored=entry?await Uhe(QT,id,'Failed to verify starter material'):null;
  if(!stored?.blob||stored.blob.size<=44){
   const rendered=await VR({loopComposer:loop,materialExport:{name,bpm:108}});
   const meta=I9e({material:{name,role:'loop',bpm:108},loopComposer:loop,rendered,handoff:{}});
   const pkg=$M('canonical-forge-bridge',Ly(meta,rendered.blob));
   entry=await __registerDurableMaterial({...pkg,id,rootFollowPreferred:true});
  }
  ri('rootFollowBankMembership',{entryId:entry.id,enabled:true,activate:false,config});
  outputs.push({id:entry.id,name});
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 if(!__XenMetaSessions.completeStarterDemo(outputs))throw Error('Starter-demo references could not be saved.');
 localStorage.removeItem(__XenStarterPendingKey);
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
}
__XenStarterMaterial.attach(__xenStarterRenderDemo,value=>!__XenStarterMaterial.pending()&&__XenStarterDemoIds.filter(id=>!__XenStarterMaterial.requested(value)||id===(typeof value==='string'?value:value.id)).every(id=>{const blob=bs().entries.find(entry=>entry.id===id)?.blob;return !!blob&&blob.size>44&&__xenStarterIsDirectSynth(id)}));
