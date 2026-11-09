/* XenSonar P2.4 — staged replace of Sample DB contents (cold package import only).
 * This is copy-before-delete recovery, NOT atomic commit of the entire Workspace.
 * Never remove a previous sample until all replacements exist and are verified.
 */
const __XenSampleImportP24 = (() => {
  function preflight(samples,mode){
    if(mode!=='replace' && mode!=='differential')throw new TypeError('P2.4 guard requires replace or differential mode');
    const scan=__XenSampleImportP23.preflight(samples);
    for(const row of samples){
      const s=row.dataBase64;
      // Validate canonical Base64 without decoding audio or allocating a second full buffer.
      if(s.length%4!==0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s))
        throw new Error('Invalid sample base64 payload: '+row.archivedId);
    }
    return scan;
  }
  const targetId=(fingerprint,archivedId)=>__XenSampleImportP23.deterministicId(fingerprint,archivedId);
  async function stageReplace({samples,existing,fingerprint,packageId,identityOf,makeBlob,readBlob,write}){
    preflight(samples,'replace');
    if(!Array.isArray(existing))throw new TypeError('Missing canonical Sample inventory');
    const reserved=new Set(samples.map(x=>targetId(fingerprint,x.archivedId)));
    // Only re-use our own deterministic targets; never dedupe to old rows scheduled for deletion.
    const owned=existing.filter(x=>reserved.has(x.id));
    // Preserve one target per archived ID, even if two samples have the same content hash.
    const mapping=[];let imported=0,reused=0;
    for(const sample of samples){
      const target=targetId(fingerprint,sample.archivedId);
      const result=await __XenSampleImportP23.importMerge({samples:[sample],
        existing:owned.filter(x=>x.id===target),fingerprint,packageId,identityOf,makeBlob,readBlob,write});
      mapping.push(result.mapping[0]);imported+=result.imported;reused+=result.reused;
    }
    return {mapping,imported,reused};
  }
  async function pruneOld({original,mapping,deleteOld,verifiedEmpty=false}){
    if(!Array.isArray(original)||!(mapping instanceof Map)||typeof deleteOld!=='function')
      throw new TypeError('Invalid replacement cleanup ports');
    if(!mapping.size && original.length && !verifiedEmpty)throw new Error('Cannot prune without verified target mapping');
    const keep=new Set(mapping.values());
    let deleted=0;
    for(const row of original){
      if(!row?.id || typeof row.id!=='string')throw new Error('Invalid old Sample ID');
      if(keep.has(row.id))continue;
      if(await deleteOld(row.id))deleted++;
    }
    return {deleted};
  }
  return Object.freeze({preflight,targetId,stageReplace,pruneOld});
})();
