/* P3.4 – Root-Follow / Material Track restoration is prepared before applying.
 * This cold-path module has no IndexedDB, localStorage, DOM or Audio dependencies.
 * Legacy bank codecs remain injected at the existing composition root. No write
 * happens until the workspace orchestrator explicitly calls UA(nextBank).
 */
const __XenRootFollowImportP34=(()=>{
  const modes=new Set(['merge','replace','differential']);
  const requireMode=mode=>{if(!modes.has(mode))throw new TypeError('P3.4 invalid mode')};
  const prepare=({rootFollowBank,archiveMaterialLibrary,materialIdMap,validMaterialIds,mode,normalizeBank,reconstructLegacy}={})=>{
    requireMode(mode);
    if(!(materialIdMap instanceof Map)||!(validMaterialIds instanceof Set))throw new TypeError('P3.4 material references required');
    if(rootFollowBank){
      if(typeof normalizeBank!=='function')throw new TypeError('P3.4 bank decoder required');
      // Historical semantics: if there are no known material IDs, the old
      // normalizer is deliberately given no validity filter.
      const imported=normalizeBank({payload:rootFollowBank,idMap:materialIdMap,
        validIds:validMaterialIds.size?validMaterialIds:undefined});
      const unresolvedMaterialRefs=rootFollowBank.memberIds.filter(
        id=>!imported.memberIds.includes(materialIdMap.get(id)??id));
      return Object.freeze({kind:'bank',imported,
        originalCount:rootFollowBank.memberIds.length,unresolvedMaterialRefs});
    }
    if(typeof reconstructLegacy!=='function')throw new TypeError('P3.4 legacy bank decoder required');
    const imported=reconstructLegacy({archiveMaterialLibrary,materialIdMap,validMaterialIds});
    if(imported)return Object.freeze({kind:'legacy',imported});
    return Object.freeze({kind:mode==='replace'?'cleared':'none'});
  };
  const resolve=({prepared,mode,currentBank,mergeBank,emptyBank}={})=>{
    requireMode(mode);
    if(!prepared||!['bank','legacy','cleared','none'].includes(prepared.kind))
      throw new TypeError('P3.4 invalid prepared Root-Follow plan');
    if(prepared.kind==='none')return Object.freeze({kind:'none'});
    if(prepared.kind==='cleared'){
      if(typeof emptyBank!=='function')throw new TypeError('P3.4 empty bank adapter required');
      return Object.freeze({kind:'cleared',bank:emptyBank(),ledger:{present:true},report:{kind:'cleared'}});
    }
    if(typeof mergeBank!=='function')throw new TypeError('P3.4 merge bank adapter required');
    const bank=mergeBank({current:currentBank,imported:prepared.imported,mode});
    const activatedEntryId=bank.orderedIds[0]??bank.memberIds[0]??null;
    if(prepared.kind==='bank')return Object.freeze({kind:'bank',bank,ledger:{
      imported:prepared.imported.memberIds.length,
      importedBankEntries:prepared.imported.memberIds.length,
      unresolvedMaterialRefs:prepared.unresolvedMaterialRefs,
      activatedEntryId
    },report:{kind:'bank',restored:prepared.imported.memberIds.length,original:prepared.originalCount}});
    return Object.freeze({kind:'legacy',bank,ledger:{present:true,
      imported:prepared.imported.memberIds.length,
      reconstructedLegacyEntries:prepared.imported.memberIds.length,activatedEntryId},
      report:{kind:'legacy',restored:prepared.imported.memberIds.length}});
  };
  return Object.freeze({prepare,resolve});
})();
