/* XenSonar P2.6: read-only cross-repository reference index. Cold-path only.
 * No IDB, PCM, render, or mutation. A legacy 'asset:' ID is repository-scoped:
 * a Donor asset NEVER satisfies a Forge asset edge with the same string ID.
 * Adapter schemas are limited to fields confirmed in their actual importers.
 */
const __XenReferenceGraphP26 = (() => {
  const modes=new Set(['merge','replace','differential']);
  const adapters=Object.freeze([
    'melodic.composer.instrumentPreset',
    'donor.preset.assetId',
    'donor.material-workspace.sourceAsset',
    'forge.workspace.sources'
  ]);
  const frozenRows=rows=>Object.freeze(rows);
  const edge=(kind,source,targetScope,targetId,path,origin='import')=>
    Object.freeze({kind,source,targetScope,targetId,path,origin});
  const samplePreset=__XenReferenceIntegrityP25.collectComposerReferences;
  if(typeof samplePreset!=='function')throw new Error('P2.6 needs P2.5 composer adapter');
  function inspect({archive,mode,existingSamples,localProjects=[],activeComposer=null,sampleImpact=null}){
    if(!modes.has(mode))throw new TypeError('Invalid import mode for reference graph');
    if(!archive||!Array.isArray(archive.samples)||!Array.isArray(archive.projects)||
       !Array.isArray(existingSamples)||!Array.isArray(localProjects))
      throw new TypeError('Reference graph requires validated archive and sample/project inventories');
    const donor=archive.donorLibrary;
    if(donor!=null&&(!Array.isArray(donor.presets)||!Array.isArray(donor.workspaces)||!Array.isArray(donor.assets)))
      throw new TypeError('Invalid Donor reference payload');
    const forge=archive.forgeExperiment;
    if(forge!=null&&(!Array.isArray(forge.workspaces)||!Array.isArray(forge.assets)))
      throw new TypeError('Invalid Forge reference payload');
    const incoming=new Set(archive.samples.map(s=>s?.archivedId).filter(s=>typeof s==='string'));
    const existing=new Set(existingSamples.map(s=>s?.id).filter(s=>typeof s==='string'));
    const donorAssets=new Set(donor?.assets.map(s=>s?.id)??[]);
    const forgeAssets=new Set(forge?.assets.map(s=>s?.id)??[]);
    const edges=[],localEdges=[],missing=[];
    function record(next){edges.push(next);
      const ok=next.targetScope==='sample-db'?
        (next.kind==='donor.sample' || mode==='replace'? incoming.has(next.targetId):
          incoming.has(next.targetId)||existing.has(next.targetId)):
        next.targetScope==='donor-db'?donorAssets.has(next.targetId):
        forgeAssets.has(next.targetId);
      if(!ok)missing.push(next);
    }
    function addComposer(composer,source,origin='import'){
      for(const r of samplePreset(composer,source)){
        const next=edge('composer.sample',source,'sample-db',r.sampleId,
          'composer.tracks['+r.trackIndex+'].instrumentPreset',origin);
        if(origin==='local')localEdges.push(next);else record(next);
      }
    }
    // P2.9: reuse the immutable P2.5 preflight observation on the real import path.
    // Standalone P2.6 callers can still inspect composers directly as before.
    if(sampleImpact!==null){
      if(sampleImpact.schemaVersion!==1||sampleImpact.mode!==mode||
         !Array.isArray(sampleImpact.incomingReferences)||!Array.isArray(sampleImpact.localReferences)||
         !Object.isFrozen(sampleImpact.incomingReferences)||!Object.isFrozen(sampleImpact.localReferences))
        throw new TypeError('Invalid or incompatible P2.5 composer reference snapshot');
      function addObserved(ref,origin){
        if(!ref||typeof ref.sampleId!=='string'||typeof ref.source!=='string'||
           !Number.isInteger(ref.trackIndex)||ref.trackIndex<0)
          throw new TypeError('Invalid P2.5 composer reference snapshot row');
        const next=edge('composer.sample',ref.source,'sample-db',ref.sampleId,
          'composer.tracks['+ref.trackIndex+'].instrumentPreset',origin);
        if(origin==='local')localEdges.push(next);else record(next);
      }
      sampleImpact.incomingReferences.forEach(r=>addObserved(r,'import'));
      sampleImpact.localReferences.forEach(r=>addObserved(r,'local'));
    }else{
      addComposer(archive.workspace?.composer,'Workspace');
      archive.projects.forEach((p,i)=>addComposer(p?.composer,
        'Project '+String(p?.name??p?.id??i).slice(0,100)));
      addComposer(activeComposer,'Active composer','local');
      localProjects.forEach((p,i)=>addComposer(p?.composer,
        'Existing project '+String(p?.name??p?.id??i).slice(0,100),'local'));
    }
    donor?.presets.forEach((preset,i)=>{
      const id=preset?.value?.assetId;
      const source='Donor preset '+String(preset?.id??i).slice(0,120);
      if(typeof id!=='string')return; // structural validation remains owned by donor importer
      if(id.startsWith('melodic-sample:'))
        record(edge('donor.sample',source,'sample-db',id.slice('melodic-sample:'.length),'value.assetId'));
      else if(id.startsWith('asset:'))
        record(edge('donor.asset',source,'donor-db',id,'value.assetId'));
    });
    donor?.workspaces.forEach((ws,i)=>{
      const id=ws?.value?.source?.sourceAsset?.__materialIntakeAssetRef;
      if(typeof id==='string')record(edge('material-workspace.asset',
        'Material workspace '+String(ws?.id??i).slice(0,120),'donor-db',id,
        'value.source.sourceAsset.__materialIntakeAssetRef'));
    });
    forge?.workspaces.forEach((ws,i)=>{
      const value=ws?.value;
      const source='Forge workspace '+String(ws?.id??i).slice(0,120);
      for(const field of ['mainSource','donorSource']){
        const id=value?.[field]?.assetId;
        if(typeof id==='string')record(edge('forge.asset',source,'forge-db',id,'value.'+field+'.assetId'));
      }
    });
    const localAtRisk=mode==='replace'?localEdges.filter(x=>existing.has(x.targetId)):[];
    const counts=Object.freeze({imported:edges.length,local:localEdges.length,
      missing:missing.length,localAtRisk:localAtRisk.length});
    return Object.freeze({schemaVersion:1,mode,adapters,edges:frozenRows(edges),
      localEdges:frozenRows(localEdges),missing:frozenRows(missing),
      localAtRisk:frozenRows(localAtRisk),counts,
      coverage:'composer/sample, donor sample+asset, material-intake asset, forge source asset; no other schema asserted'});
  }
  function assertSafe(report){
    if(!report||report.schemaVersion!==1||!Array.isArray(report.missing))
      throw new TypeError('Invalid reference graph preflight');
    if(report.missing.length){
      const first=report.missing[0];
      throw new Error('Missing '+first.targetScope+' reference "'+first.targetId+'" in '+first.source+
        ' ('+first.path+'); '+report.missing.length+' unresolved reference(s). Import stopped before writes.');
    }
    return report;
  }
  return Object.freeze({schemaVersion:1,adapters,inspect,assertSafe});
})();
