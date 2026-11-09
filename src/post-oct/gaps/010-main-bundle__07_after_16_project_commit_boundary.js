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
