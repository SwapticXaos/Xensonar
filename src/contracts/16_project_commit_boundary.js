/* XenSonar P3.7 — synchronous, verified project-library commit barrier.
 * Cold import only. This verifies localStorage acceptance/readback, NOT an
 * fsync guarantee or an atomic commit spanning React and IndexedDB.
 */
const __XenProjectCommitP37=(()=>{
  function validate(projects){
    if(!Array.isArray(projects))throw new TypeError('P3.7 project library must be an array');
    const ids=new Set();
    for(const p of projects){
      if(!p||typeof p!=='object'||typeof p.id!=='string'||!p.id||ids.has(p.id))
        throw new Error('P3.7 duplicate or invalid project ID; commit refused');
      ids.add(p.id);
    }
    return projects;
  }
  function assertBaseline(raw,existing){
    validate(existing);
    let saved;
    try{saved=raw==null?[]:JSON.parse(raw);}catch{throw new Error('P3.7 invalid saved project library; import stopped.');}
    validate(saved);
    // P3.8: compare all persisted musical content, not only name/ID/hash.
    // Existing contentHash can lag unsaved or legacy edits. Canonical key order
    // avoids false rejections from JSON property-order differences.
    const stable=entries=>JSON.stringify(entries,(key,value)=>{
      if(value && typeof value==='object' && !Array.isArray(value))
        return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0));
      return value;
    });
    if(stable(saved)!==stable(existing))
      throw new Error('P3.8 stale React project CONTENT differs from persisted library; import stopped.');
    return true;
  }
  let activeImport=false;
  async function runExclusive(operation,locks){
    if(activeImport)throw new Error('P3.7 another workspace import is already running in this tab');
    if(typeof operation!=='function')throw new TypeError('P3.7 import operation required');
    // Web Locks coordinate cooperating tabs on the SAME origin where supported.
    // A file:// origin can vary between browsers; this does not replace CAS.
    activeImport=true;
    try{
      if(locks&&typeof locks.request==='function')
        return await locks.request('xensonar.workspace-import.v1',{mode:'exclusive',ifAvailable:true},
          lock=>{if(!lock)throw new Error('P3.7 another workspace import is running in this browser origin');return operation();});
      return await operation();
    }finally{activeImport=false;}
  }
  function commit({mode,existing,incoming,expectedRaw,readRaw,write,reserved=false,mergeReserved}){
    if(!['merge','replace','differential'].includes(mode))throw new TypeError('P3.7 unsupported import mode');
    validate(existing);validate(incoming);
    if(typeof readRaw!=='function'||typeof write!=='function'||
       !(expectedRaw===null||typeof expectedRaw==='string'))
      throw new TypeError('P3.7 requires a storage snapshot and explicit read/write ports');
    assertBaseline(expectedRaw,existing);
    // Reject observed changes made while the asynchronous repository importer ran.
    // This guard is optimistic, not an atomic CAS against uncooperative tabs.
    if(readRaw()!==expectedRaw)
      throw new Error('P3.7 project library changed during import; refusing stale commit. Preserve partial imported assets for recovery.');
    let projects;
    if(mode==='replace')projects=incoming.slice();
    else if(mode==='differential'){
      const replacing=new Set(incoming.map(p=>p.id));
      projects=[...existing.filter(p=>!replacing.has(p.id)),...incoming].sort((a,b)=>a.name.localeCompare(b.name));
    }else if(reserved){
      if(typeof mergeReserved!=='function')throw new TypeError('P3.7 reserved import requires identity merge port');
      projects=mergeReserved(existing,incoming);
    }else projects=[...existing,...incoming].sort((a,b)=>a.name.localeCompare(b.name));
    validate(projects);
    const encoded=JSON.stringify(projects);
    if(write(projects)!==true)
      throw new Error('P3.7 project library persistence failed; React apply refused. Partial repository imports may remain.');
    if(readRaw()!==encoded)
      throw new Error('P3.7 project library readback verification failed; React apply refused. Check local storage before recovery.');
    return Object.freeze({projects,stored:true,count:projects.length});
  }
  function plan({mode,existing,incoming,reserved=false,mergeReserved}){
    if(!['merge','replace','differential'].includes(mode))throw new TypeError('P3.7 unsupported import mode');
    validate(existing);validate(incoming);
    let projects;
    if(mode==='replace')projects=incoming.slice();
    else if(mode==='differential'){
      const replacing=new Set(incoming.map(p=>p.id));
      projects=[...existing.filter(p=>!replacing.has(p.id)),...incoming].sort((a,b)=>a.name.localeCompare(b.name));
    }else if(reserved){
      if(typeof mergeReserved!=='function')throw new TypeError('P3.7 reserved import requires identity merge port');
      projects=mergeReserved(existing,incoming);
    }else projects=[...existing,...incoming].sort((a,b)=>a.name.localeCompare(b.name));
    validate(projects);
    return projects;
  }
  return Object.freeze({commit,plan,assertBaseline,runExclusive});
})();
