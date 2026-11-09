/* XenSonar P2.3 — cold-path, merge-only sample import recovery.
 * Never called by the audio engine. Sample blobs stay in the existing Sample DB.
 * Deterministic IDs make the window between DB commit and journal checkpoint replayable.
 */
const __XenSampleImportP23 = (() => {
  function preflight(samples) {
    if(!Array.isArray(samples))throw new TypeError('Sample package must contain an array');
    const seen=new Set();let approxDecodedBytes=0;
    for(const row of samples){
      if(!row || typeof row.archivedId!=='string'||!row.archivedId||
         typeof row.dataBase64!=='string'||typeof row.name!=='string')
        throw new Error('Invalid archived sample record');
      if(seen.has(row.archivedId))throw new Error('Duplicate archived sample ID: '+row.archivedId);
      seen.add(row.archivedId);
      approxDecodedBytes+=Math.ceil(row.dataBase64.length*3/4);
      if(!Number.isSafeInteger(approxDecodedBytes))throw new Error('Sample package size overflow');
    }
    return Object.freeze({count:seen.size,approxDecodedBytes});
  }
  function deterministicId(packageFingerprint,archivedId){
    if(typeof packageFingerprint!=='string'||!packageFingerprint||typeof archivedId!=='string'||!archivedId)
      throw new TypeError('Invalid deterministic Sample reference');
    // The package fingerprint already incorporates the source archive. The namespace
    // intentionally differs from historical/random sample IDs. NOT a security hash.
    const part=s=>__XenImportCoordinatorV1.fingerprint(s).replace(/[^a-zA-Z0-9]/g,'-');
    return 'xen-p23-'+part(packageFingerprint)+'-'+part(archivedId);
  }
  async function sameBlob(a,b){
    if(!a||!b||a.size!==b.size)return false;
    // Bound peak verification memory: compare 256 KiB slices rather than loading
    // two complete potentially large sample buffers at once.
    for(let offset=0;offset<a.size;offset+=262144){
      const end=Math.min(a.size,offset+262144);
      const [one,two]=await Promise.all([
        a.slice(offset,end).arrayBuffer(),b.slice(offset,end).arrayBuffer()
      ]);
      const u=new Uint8Array(one),v=new Uint8Array(two);
      for(let i=0;i<u.length;i++)if(u[i]!==v[i])return false;
    }
    return true;
  }
  async function importMerge({samples,existing,fingerprint,packageId,write,makeBlob,readBlob,identityOf}){
    preflight(samples);
    if(!Array.isArray(existing)||typeof write!=='function'||typeof makeBlob!=='function'||
       typeof readBlob!=='function'||typeof identityOf!=='function')throw new TypeError('Invalid Sample import ports');
    const byId=new Map(existing.map(row=>[row.id,row]));
    const byIdentity=new Map();
    for(const row of existing){const id=identityOf(row);if(!byIdentity.has(id))byIdentity.set(id,row);}
    const mapping=[];let imported=0,reused=0;
    for(const row of samples){
      const target=deterministicId(fingerprint,row.archivedId);
      const id=identityOf(row);
      const owned=byId.get(target);
      if(owned && (identityOf(owned)!==id || !(await sameBlob(await readBlob(target),makeBlob(row)))))
        throw new Error('Sample deterministic ID collision: '+row.archivedId);
      if(!owned && await readBlob(target))
        throw new Error('Sample deterministic ID collision: target exists outside inventory');
      const match=owned??byIdentity.get(id);
      if(match){mapping.push([row.archivedId,match.id]);reused++;continue;}
      const blob=makeBlob(row);
      const saved=await write(row,{replaceSampleId:target,blob,sourcePackageId:packageId});
      if(saved?.id!==target)throw new Error('Sample storage did not preserve deterministic import ID');
      mapping.push([row.archivedId,target]);imported++;
      byId.set(target,saved);byIdentity.set(id,saved);
    }
    return {mapping,imported,reused};
  }
  async function verifyMapping(result,samples,existing,identityOf,readBlob,makeBlob,fingerprint){
    preflight(samples);
    if(!result||!Array.isArray(result.mapping)||result.mapping.length!==samples.length)
      throw new Error('Sample recovery mapping missing or incomplete');
    const map=new Map(result.mapping),rows=new Map(existing.map(row=>[row.id,row]));
    if(map.size!==samples.length)throw new Error('Sample recovery mapping has duplicate source entries');
    for(const sample of samples){
      const id=map.get(sample.archivedId),stored=rows.get(id);
      if(typeof id!=='string'||!stored||identityOf(sample)!==identityOf(stored))
        throw new Error('Sample recovery mapping missing or modified: '+sample.archivedId);
      if(readBlob){
        const blob=await readBlob(id);
        if(!blob)throw new Error('Sample recovery mapping missing audio: '+sample.archivedId);
        if(fingerprint && id===deterministicId(fingerprint,sample.archivedId) &&
           !(await sameBlob(blob,makeBlob(sample))))
          throw new Error('Sample recovery mapping audio collision: '+sample.archivedId);
      }
    }
    return map;
  }
  return Object.freeze({preflight,deterministicId,importMerge,verifyMapping});
})();
