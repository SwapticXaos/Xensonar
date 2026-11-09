/* XenSonar P3.6 — small, cold-path Melodic project identity reservation.
 * Only for journaled MERGE imports. This is NOT a distributed lock, an IDB
 * transaction, or proof that React state has been durably persisted.
 * Keep reservation after returning projects: React applies them later.
 */
const __XenMelodicProjectReservationsP36=(()=>{
  const key='xensonar.melodic-project-reservations.v1',schemaVersion=1;
  function store(provided){
    try{
      const s=provided===undefined?globalThis.localStorage:provided;
      if(!s||typeof s.getItem!=='function'||typeof s.setItem!=='function'||typeof s.removeItem!=='function')throw Error('missing');
      s.getItem(key);return s;
    }catch{throw Error('P3.6 reservation storage unavailable; no project IDs were allocated.');}
  }
  function read(s){
    const raw=s.getItem(key);if(raw==null)return null;
    let r;try{r=JSON.parse(raw);}catch{throw Error('P3.6 project reservation corrupted; preserve it for recovery.');}
    if(!r||r.schemaVersion!==schemaVersion||typeof r.fingerprint!=='string'||r.mode!=='merge'||
      typeof r.packageId!=='string'||!Array.isArray(r.base)||!Array.isArray(r.assignments)||
      !r.assignments.every(a=>a&&typeof a.id==='string'&&a.id.length>0&&typeof a.name==='string')||
      !r.base.every(a=>Array.isArray(a)&&a.length===2)||
      new Set(r.assignments.map(a=>a.id)).size!==r.assignments.length||
      new Set(r.base.map(a=>a[0])).size!==r.base.length)
      throw Error('P3.6 unknown project reservation; preserve it for recovery.');
    return r;
  }
  function baseline(existing,exclude=new Set()){
    return existing.filter(p=>!exclude.has(p.id)).map(p=>[p.id,p.name])
      .sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
  }
  function stableEqual(a,b){return JSON.stringify(a)===JSON.stringify(b);}
  function present(r,existing){
    const byId=new Map(existing.map(p=>[p.id,p]));
    const found=r.assignments.filter(a=>byId.has(a.id));
    for(const a of found){const p=byId.get(a.id);
      if(p.name!==a.name||p.sourcePackageId!==r.packageId)
        throw Error('P3.6 reserved project ID collision or changed project; import stopped.');
    }
    const ids=new Set(r.assignments.map(a=>a.id));
    if(!stableEqual(baseline(existing,ids),r.base))
      throw Error('P3.6 local project inventory changed since reservation; import stopped.');
    return found.length;
  }
  function open({fingerprint,mode,packageId,incoming,existing,allocateId,uniqueName},provided){
    if(mode!=='merge'||typeof fingerprint!=='string'||!fingerprint||
       typeof packageId!=='string'||!Array.isArray(incoming)||!Array.isArray(existing)||
       typeof allocateId!=='function'||typeof uniqueName!=='function')
      throw new TypeError('P3.6 requires a journaled merge and explicit project codecs');
    if(incoming.length===0)return Object.freeze({assignments:[],replay:false,alreadyPresent:0});
    const s=store(provided);let r=read(s);let replay=false;
    if(r){
      const found=present(r,existing);
      if(r.fingerprint!==fingerprint||r.packageId!==packageId||r.mode!==mode||
         r.assignments.length!==incoming.length){
        if(found!==r.assignments.length)
          throw Error('P3.6 unfinished project reservation belongs to another import; resume original package.');
        // All previously reserved projects are now visible to the caller.
        // This says nothing about cross-tab durability; it only retires the
        // previous *identity reservation* to permit an explicit new import.
        r=null;
      }else replay=true;
    }
    if(!r){
      const usedNames=new Set(existing.map(p=>p.name)),usedIds=new Set(existing.map(p=>p.id));
      const assignments=incoming.map(p=>{
        let id=null;
        for(let attempt=0;attempt<16;attempt++){
          const candidate=allocateId();
          if(typeof candidate==='string'&&candidate.length>0&&!usedIds.has(candidate)){
            id=candidate;break;
          }
        }
        if(id==null)throw Error('P3.6 could not reserve a unique project ID');
        usedIds.add(id);
        return {id,name:uniqueName(p.name,usedNames)};
      });
      r={schemaVersion,fingerprint,mode,packageId,base:baseline(existing),assignments};
      try{s.setItem(key,JSON.stringify(r));}catch{throw Error('P3.6 failed to persist project reservation; import stopped.');}
    }
    const found=present(r,existing);
    return Object.freeze({assignments:r.assignments.map(a=>Object.freeze({...a})),replay,alreadyPresent:found});
  }
  // P3.10: an imported contentHash is historical metadata, not a trusted
  // recomputation of notes/patterns. Replay must compare the actual musical
  // payload, while ignoring ephemeral bookkeeping fields (e.g. updatedAt).
  function musicalPayload(project){
    return JSON.stringify({composer:project.composer,patternVariants:project.patternVariants,
      patternLinks:project.patternLinks},(key,value)=>{
      if(value&&typeof value==='object'&&!Array.isArray(value))
        return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0));
      return value;
    });
  }
  function applyMerge(existing,incoming){
    if(!Array.isArray(existing)||!Array.isArray(incoming))throw new TypeError('P3.6 invalid project merge');
    const byId=new Map(existing.map(p=>[p.id,p]));
    for(const project of incoming){
      const prior=byId.get(project.id);
      if(prior){
        if(prior.name!==project.name||prior.sourcePackageId!==project.sourcePackageId||
           prior.contentHash!==project.contentHash||
           musicalPayload(prior)!==musicalPayload(project))
          throw Error('P3.10 conflicting reserved project musical content in local inventory');
        continue;
      }
      byId.set(project.id,project);
    }
    return [...byId.values()].sort((a,b)=>a.name.localeCompare(b.name));
  }
  function inspect(provided){return read(store(provided));}
  function abandon(expectedFingerprint,confirmation,provided){
    if(confirmation!=='KEEP_EXISTING_PROJECTS')throw Error('P3.6 explicit recovery acknowledgement required');
    const s=store(provided),r=read(s);
    if(!r||r.fingerprint!==expectedFingerprint)throw Error('P3.6 reservation fingerprint mismatch');
    try{s.removeItem(key);}catch{throw Error('P3.6 failed to clear reservation');}
    return Object.freeze({abandoned:true,existingProjectsUnaffected:true});
  }
  return Object.freeze({key,schemaVersion,open,applyMerge,inspect,abandon});
})();
if(typeof window!=='undefined')window.__XenProjectIdentityRecoveryP36=Object.freeze({
  inspect:()=>__XenMelodicProjectReservationsP36.inspect(),
  abandon:(fingerprint,confirmation)=>__XenMelodicProjectReservationsP36.abandon(fingerprint,confirmation)
});
