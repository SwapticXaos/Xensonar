/* XenSonar P2.5 – cold-path, read-only reference impact assessment.
 * Deliberately schema-specific: composer.tracks[].instrumentPreset = 'sample:<id>'.
 * This does not claim to enumerate every legacy/workspace reference type.
 * Never loaded by an AudioWorklet and never materializes audio data.
 */
const __XenReferenceIntegrityP25 = (() => {
  const modes=new Set(['merge','replace','differential']);
  function collect(composer,source) {
    if (!Array.isArray(composer?.tracks)) return [];
    const references=[];
    composer.tracks.forEach((track,index)=>{
      const preset=track?.instrumentPreset;
      if(typeof preset==='string' && preset.startsWith('sample:')) {
        const id=preset.slice(7);
        references.push(Object.freeze({sampleId:id,source,trackIndex:index}));
      }
    });
    return references;
  }
  function inspect({archive,mode,existingSamples,localProjects=[],activeComposer=null}) {
    if(!modes.has(mode))throw new TypeError('Invalid import mode for Sample reference integrity');
    if(!archive||!Array.isArray(archive.samples)||!Array.isArray(archive.projects))
      throw new TypeError('Reference preflight requires a validated Workspace archive');
    if(!Array.isArray(existingSamples)||!Array.isArray(localProjects))
      throw new TypeError('Reference preflight requires explicit Sample inventory and local projects');
    const incomingIds=new Set(archive.samples.map(x=>x?.archivedId).filter(x=>typeof x==='string'));
    const existingIds=new Set(existingSamples.map(x=>x?.id).filter(x=>typeof x==='string'));
    const references=[...collect(archive.workspace?.composer,'Workspace')];
    archive.projects.forEach((project,index)=>references.push(...collect(project?.composer,
      `Project ${String(project?.name??project?.id??index).slice(0,100)}`)));
    // 'replace' removes old Sample IDs, while merge/differential may retain them.
    const missing=references.filter(ref=>!incomingIds.has(ref.sampleId)&&
      (mode==='replace'||!existingIds.has(ref.sampleId)));
    const localReferences=[...collect(activeComposer,'Active composer')];
    localProjects.forEach((project,index)=>localReferences.push(...collect(project?.composer,
      `Existing project ${String(project?.name??project?.id??index).slice(0,100)}`)));
    const localAtRisk=mode==='replace'?localReferences.filter(ref=>
      existingIds.has(ref.sampleId)):[];
    // localAtRisk is diagnostic only: the caller may replace local projects too.
    // Never claim the output is a complete, all-module reference graph.
    const freezeRows=rows=>Object.freeze(rows.slice());
    return Object.freeze({schemaVersion:1,mode,sampleCount:incomingIds.size,
      incomingReferenceCount:references.length,
      // Immutable observation is shared with P2.6 instead of parsing the same tracks twice.
      incomingReferences:freezeRows(references),localReferences:freezeRows(localReferences),
      missing:freezeRows(missing),
      localAtRisk:freezeRows(localAtRisk),deletableCount:mode==='replace'?existingIds.size:0,
      coverage:'composer.tracks.instrumentPreset only'});
  }
  function verifyResolved({archive,mapping,availableSamples,sampleImpact=null}){
    if(!archive||!Array.isArray(archive.projects)||!(mapping instanceof Map)||!Array.isArray(availableSamples))
      throw new TypeError('Missing resolved Sample mapping or inventory');
    const available=new Set(availableSamples.map(x=>x?.id));
    // P2.9: the mapping gate verifies durable target IDs against the SAME
    // immutable composer observation used for both prewrite checks.
    // Legacy standalone callers may omit the snapshot.
    let references;
    if(sampleImpact!==null){
      if(sampleImpact.schemaVersion!==1||!Array.isArray(sampleImpact.incomingReferences)||
         !Object.isFrozen(sampleImpact.incomingReferences))
        throw new TypeError('Invalid P2.5 composer reference snapshot for resolution');
      references=sampleImpact.incomingReferences;
    }else{
      references=[...collect(archive.workspace?.composer,'Workspace')];
      archive.projects.forEach((project,index)=>references.push(...collect(project?.composer,
        `Project ${String(project?.name??project?.id??index).slice(0,100)}`)));
    }
    for(const ref of references){
      const resolved=mapping.get(ref.sampleId)??ref.sampleId;
      if(!available.has(resolved))
        throw new Error('Unresolved imported Sample reference "'+ref.sampleId+'" in '+ref.source+
          ' (expected '+resolved+'). Import stopped before project restoration.');
    }
    return Object.freeze({resolvedCount:references.length});
  }
  function assertSafe(plan){
    if(!plan||plan.schemaVersion!==1||!Array.isArray(plan.missing))
      throw new TypeError('Missing Sample reference preflight');
    if(plan.missing.length){
      const first=plan.missing[0];
      throw new Error('Workspace import references missing Sample "'+first.sampleId+'" in '+first.source+
        ' (track '+(first.trackIndex+1)+'); '+plan.missing.length+' unresolved reference(s). Import stopped before writes.');
    }
    return plan;
  }
  return Object.freeze({inspect,assertSafe,verifyResolved,collectComposerReferences:collect});
})();
