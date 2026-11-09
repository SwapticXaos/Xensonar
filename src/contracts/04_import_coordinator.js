/* XenSonar P2.2 — cold-path resumable repository import journal.
 * Checkpoints are small: NO PCM, package bodies or mutable audio state stored.
 * NOT distributed ACID; recovery requires reselecting EXACTLY the same archive.
 * A local repository phase is replay-safe ONLY if its operation is idempotent.
 */
const __XenImportCoordinatorV1 = (() => {
  const key='xensonar.package-import.journal.v1',schemaVersion=1;
  function fingerprint(text) {
    if (typeof text !== 'string') throw new TypeError('Package fingerprint requires source text');
    // Two noncryptographic rolling checksums and length: accidental identity guard,
    // not a security signature. Scanned without creating a second UTF-8 buffer.
    let a=0x811c9dc5,b=0x9e3779b9;
    for(let i=0;i<text.length;i++) {
      const c=text.charCodeAt(i);
      a=Math.imul(a^c,0x01000193)>>>0;
      b=Math.imul(b^(c+i),0x85ebca6b)>>>0;
    }
    return 'fnv2:'+text.length+':'+a.toString(16)+':'+b.toString(16);
  }
  function mappingFingerprint(mapping) {
    if (!(mapping instanceof Map)) throw new TypeError('Expected Sample ID map');
    return fingerprint(JSON.stringify([...mapping.entries()].sort(([a],[b])=>String(a).localeCompare(String(b)))));
  }
  function journalStorage(provided) {
    try { const store=provided===undefined?globalThis.localStorage:provided;
      if (!store || typeof store.getItem!=='function' || typeof store.setItem!=='function' || typeof store.removeItem!=='function') throw Error('not available');
      store.getItem(key);return store;
    }catch{throw new Error('XenSonar import journal unavailable; import stopped before Donor/Forge changes.');}
  }
  function decode(raw) {
    if (raw==null) return null;
    let doc;try{doc=JSON.parse(raw);}catch{throw new Error('Invalid import journal; preserve it for recovery.');}
    if(doc?.schemaVersion!==schemaVersion || typeof doc.fingerprint!=='string' || !Array.isArray(doc.order) || !doc.phases)
      throw new Error('Unknown import journal version; import stopped for recovery.');
    return doc;
  }
  function inspect(provided) {return decode(journalStorage(provided).getItem(key));}
  function abandon(expectedFingerprint,confirmation,provided) {
    if(confirmation!=='KEEP_PARTIAL_IMPORT_DATA')throw new Error('Explicit recovery acknowledgement required');
    const storage=journalStorage(provided),record=decode(storage.getItem(key));
    if(!record||record.fingerprint!==expectedFingerprint)throw new Error('Recovery journal fingerprint mismatch');
    try{storage.removeItem(key);}catch{throw new Error('Import recovery journal could not be cleared');}
    return {abandoned:true,partialDataMayRemain:true,phases:record.phases};
  }
  function assertCompatible({fingerprint:identity,mode,phases},provided) {
    const record=inspect(provided);
    if(record && (record.fingerprint!==identity || record.mode!==mode ||
                  record.order.join('|')!==phases.join('|')))
      throw new Error('Unfinished/unterbrochen XenSonar import: select the original archive and mode before changing workspace data.');
    return record;
  }
  function open({fingerprint:identity,mode,sampleMapSignature,phases},provided) {
    if(!identity || typeof identity!=='string' || !['merge','replace','differential'].includes(mode) ||
       typeof sampleMapSignature!=='string' || !Array.isArray(phases) || !phases.length ||
       phases.some(p=>typeof p!=='string'||!p)||new Set(phases).size!==phases.length)
      throw new TypeError('Invalid package coordinator plan');
    const storage=journalStorage(provided), current=decode(storage.getItem(key));
    const order=phases.join('|');
    if(current && (current.fingerprint!==identity || current.mode!==mode ||
      current.sampleMapSignature!==sampleMapSignature || current.order.join('|')!==order)) {
      if(current.fingerprint===identity && current.mode===mode && current.sampleMapSignature!==sampleMapSignature)
        throw new Error('Interrupted import: Sample mapping/Zuordnung changed; resume stopped to protect Donor references.');
      throw new Error('An unfinished/unterbrochen XenSonar import belongs to another archive or mode. Reselect the original package before another import.');
    }
    const record=current || {schemaVersion,fingerprint:identity,mode,sampleMapSignature,order:phases.slice(),
      phases:Object.fromEntries(phases.map(p=>[p,{state:'pending',result:null}]))};
    function persist() {try{storage.setItem(key,JSON.stringify(record));}catch{throw new Error('XenSonar import journal unavailable; import stopped to avoid untracked partial changes.');}}
    // Persist BEFORE even the first repository receives changes.
    if(!current)persist();
    let busy=false,closed=false;
    return Object.freeze({
      async execute(phase,apply) {
        if(closed||busy||typeof apply!=='function')throw new Error('Import phase busy/closed or invalid');
        const index=record.order.indexOf(phase);if(index<0)throw new Error('Unknown import phase: '+phase);
        if(record.order.slice(0,index).some(p=>record.phases[p]?.state!=='committed'))throw new Error('Import phases must commit in order');
        const slot=record.phases[phase];
        if(slot.state==='committed')return slot.result;
        busy=true;
        try {
          slot.state='applying';persist();
          const result=await apply();
          // A crash HERE leaves 'applying'. Replaying the *idempotent* repository
          // commit on the same inputs repairs that uncertainty without deleting PCM.
          slot.result=result??null;slot.state='committed';persist();return result;
        } finally {busy=false;}
      },
      sealSampleMap(signature) {
        if(closed||busy||typeof signature!=='string'||!signature)
          throw new Error('Invalid Sample mapping signature');
        if(!record.phases.samples || record.phases.samples.state!=='committed')
          throw new Error('Sample mapping must commit before sealing');
        if(record.resolvedSampleMapSignature && record.resolvedSampleMapSignature!==signature)
          throw new Error('Sample mapping signature mismatch: imported references changed');
        if(!record.resolvedSampleMapSignature){record.resolvedSampleMapSignature=signature;persist();}
        return signature;
      },
      finish() {
        if(closed||busy||record.order.some(p=>record.phases[p]?.state!=='committed'))throw new Error('Import journal has unfinished phases');
        try{storage.removeItem(key);}catch{throw new Error('XenSonar import journal could not be cleared');}
        closed=true;
      }
    });
  }
  return Object.freeze({key,schemaVersion,fingerprint,mappingFingerprint,inspect,assertCompatible,open,abandon});
})();

// Recovery is intentionally explicit. Abandoning the JOURNAL never deletes PCM/records.
if(typeof window!=='undefined')window.__XenPackageImportRecoveryP22=Object.freeze({
  inspect:()=>__XenImportCoordinatorV1.inspect(),
  abandon:(fingerprint,confirmation)=>__XenImportCoordinatorV1.abandon(fingerprint,confirmation)
});
