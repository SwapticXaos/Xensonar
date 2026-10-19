function __f334ReceiveCarrier(){
  const transfer=DM.get('legacy');
  if(!transfer)return false;
  try{
    if(transfer.audioPrepared)return __mlReceiveRenderedAudio(transfer);
    if(transfer.origin!=='melodic-loop'||!transfer.carrier)throw new Error("This transfer contains no Melodic carrier figure. Please send again from Melodic Loop.");
    const state=pe.getState(),target=state.spectralData,grid=new ph(target.width,target.height);
    // Validate and prepare everything before touching the current drawing.
    const carrier=__f333MaterializeCarrier(transfer.carrier,grid);
    const materialExport=IDe(state.materialExport,{name:transfer.name,role:'loop',bars:transfer.bars,
      bpm:transfer.bpm,beatsPerBar:transfer.beatsPerBar,guideSegments:transfer.guideSegments,guideMarkers:transfer.guideMarkers});
    const canvas=typeof document==='undefined'?null:document.querySelector('[data-forge-carrier-canvas="true"]');
    const bounds=canvas?.getBoundingClientRect();
    // The element's premount bounding height is not the painted canvas height.
    // Let the mounted drawing surface own vertical fit; keep the request across resizes.
    const viewPort={offsetX:0,offsetY:0,zoomX:bounds?.width>0?bounds.width/target.width:1,
      zoomY:1,autoFitY:true};
    state.pushUndo();++__f333RestoreBarrier;__f333Stop();ys().clear();
    target.restoreData(grid.cloneData());target.melodicCarrier=carrier;
    pe.setState(current=>({...__f333Idle(),melodicCarrier:carrier,lastCommitDomain:'carrier',
      sourceAsset:null,sourceAssetContext:'none',sourcePreviewMode:'forge',forge3EditTarget:'workbench',
      spectralEmbodimentSourceAsset:null,embodimentField:null,embodimentStatus:'missing',
      embodimentMessage:"Melodic Loop transferred as carrier figure.",
      stampData:null,stampPhase:'idle',stampSelStart:null,lineStart:null,
      carrierDonorV2:{...current.carrierDonorV2,skeleton:null,summary:null,continuityGraph:null,
        bindingPreview:[],overlayVisible:false,continuityOverlayVisible:false,bindingOverlayVisible:false},
      carrierIntegralSelection:{...current.carrierIntegralSelection,source:'user'},
      materialExport,viewPort,showGrainLayer:false,renderVersion:current.renderVersion+1,audioBufferDirty:true}));
    // Acknowledge only the exact successfully committed item.
    if(DM.get('legacy')===transfer)DM.delete('legacy');
    __f333PersistNow();
    __f334Notice("Pitch figure transferred · "+carrier.notes.length+' Noten · '+transfer.bars+" bars · carrier without body lens");
    requestAnimationFrame(()=>document.querySelector('#spectralforge-station-draw')?.scrollIntoView({block:'start',behavior:'auto'}));
    return true;
  }catch(error){
    __f334Notice(error instanceof Error?error.message:"Melodic carrier transfer failed.");
    return false;
  }
}

