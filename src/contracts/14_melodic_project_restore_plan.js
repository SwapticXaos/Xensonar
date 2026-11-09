/* XenSonar P3.5 — Melodic project import preparation.
 * No database, UI, audio or global application state. The historical codecs,
 * ID allocator and unique-name allocator are injected by the caller.
 * The caller remains responsible for applying the resulting projects to React.
 */
const __XenMelodicProjectRestoreP35=(()=>{
  const modes=new Set(['merge','replace','differential']);
  function prepare({incoming,existing,mapping,mode,packageId,convert,contentHash,
    normalizeName,allocateId,uniqueName,reservations=null}){
    if(!modes.has(mode))throw new TypeError('P3.5 invalid import mode');
    if(!Array.isArray(incoming)||!Array.isArray(existing)||!(mapping instanceof Map))
      throw new TypeError('P3.5 project inventory or sample mapping invalid');
    if(reservations!==null && (!Array.isArray(reservations)||reservations.length!==incoming.length||
      reservations.some(p=>!p||typeof p.id!=='string'||!p.id||typeof p.name!=='string')))
      throw new TypeError('P3.6 invalid project reservations');
    for(const fn of [convert,contentHash,normalizeName,allocateId,uniqueName])
      if(typeof fn!=='function')throw new TypeError('P3.5 missing project codec');
    // Use precisely the historical original-case name Set and last-wins
    // normalized-name Map. Neither stored records nor the sample Map mutate.
    const usedNames=new Set(existing.map(project=>project.name));
    const existingByName=new Map();
    for(const project of existing)existingByName.set(normalizeName(project),project);
    let replacedCount=0;
    const projects=incoming.map((archived,index)=>{
      const restored=convert(archived,mapping,{origin:'importedPackage',
        sourcePackageId:packageId,syncState:'imported'});
      restored.contentHash=archived.contentHash??contentHash(restored);
      const previous=mode==='differential'?existingByName.get(normalizeName(archived)):null;
      if(previous)replacedCount+=1;
      // Preserve evaluation order: assign ID first, then reserve name.
      restored.id=previous?.id??(reservations?reservations[index].id:allocateId());
      restored.name=previous?.name??(reservations?reservations[index].name:uniqueName(restored.name,usedNames));
      return restored;
    });
    return {projects,replacedCount};
  }
  function workspace({archived,mapping,packageId,convert,cloneComposer,cloneVariants,cloneLinks}){
    if(!(mapping instanceof Map))throw new TypeError('P3.5 invalid workspace mapping');
    const restored=convert(archived,mapping,{origin:'importedPackage',
      sourcePackageId:packageId,syncState:'imported'});
    // Preserve the original additional copies prior to the React state apply.
    return {composer:cloneComposer(restored.composer),
      variants:cloneVariants(restored.patternVariants),
      links:cloneLinks(restored.patternLinks)};
  }
  return Object.freeze({prepare,workspace});
})();
