/* XenSonar P2.8 – cold-path, read-only local library inventories.
 * IndexedDB adapters expose only committed primary keys, never Blob values.
 * Nodal library identities include revision: nodal:<id>@<revision>.
 * An unavailable store is unknown, NEVER empty. A missing key is an advisory
 * snapshot observation, not deletion authority; writers may run concurrently.
 */
const __XenLibraryInventoryP28 = (() => {
  const scopes = Object.freeze(['material-library','drum-config-library','nodal-instrument']);
  const replaceRisk = new Set(['material-library','drum-config-library']);
  const isRecord = value => value!==null && typeof value==='object' && !Array.isArray(value);
  const freeze = Object.freeze;
  function keys(values,scope){
    if(!Array.isArray(values))throw new TypeError('Invalid '+scope+' inventory: expected keys array');
    if(scope==='nodal-instrument'){
      return values.map(item=>{
        if(!isRecord(item)||typeof item.id!=='string'||!item.id.length||
            !Number.isInteger(item.revision)||item.revision<1)
          throw new TypeError('Invalid Nodal inventory entry');
        return 'nodal:'+item.id+'@'+item.revision;
      });
    }
    if(values.some(id=>typeof id!=='string'||id.length===0))
      throw new TypeError('Invalid '+scope+' inventory ID');
    return values;
  }
  function inspect({graph,mode,ports}){
    if(!['merge','replace','differential'].includes(mode))
      throw new TypeError('Invalid library inventory mode');
    if(!graph || !Array.isArray(graph.edges) || graph.schemaVersion!==1 || !isRecord(ports))
      throw new TypeError('Invalid P2.7 reference graph or inventory ports');
    for(const name of ['material','drum','nodal'])if(typeof ports[name]!=='function')
      throw new TypeError('Missing '+name+' inventory read port');
    // Don't open or even initialize an unused repository on import.
    const needed=new Set(graph.edges.filter(edge=>edge.status==='external-possible')
      .map(edge=>edge.targetScope));
    const jobs=[ports.material,ports.drum,ports.nodal]
      .map((fn,i)=>needed.has(scopes[i])?Promise.resolve().then(fn):Promise.resolve(null));
    return Promise.allSettled(jobs).then(results=>{
      const inventories={};
      const available=new Map();
      results.forEach((out,i)=>{
        const scope=scopes[i];
        if(!needed.has(scope)){
          inventories[scope]=freeze({state:'not-needed',count:null});
          return;
        }
        if(out.status!=='fulfilled'){
          inventories[scope]=freeze({state:'unavailable',count:null});
          return;
        }
        // A malformed provider response is unknown, not an empty catalogue.
        let ids;
        try{ids=keys(out.value,scope);}catch{
          inventories[scope]=freeze({state:'unavailable',count:null});
          return;
        }
        const set=new Set(ids);
        available.set(scope,set);
        inventories[scope]=freeze({state:'available',count:set.size});
      });
      const edges=graph.edges.map(original=>{
        if(original.status!=='external-possible' || !scopes.includes(original.targetScope))
          return original;
        const inventory=available.get(original.targetScope);
        const status=!inventory ? 'inventory-unavailable' :
          !inventory.has(original.targetId) ? 'absent-in-snapshot' :
          mode==='replace'&&replaceRisk.has(original.targetScope) ?
            'local-at-risk-on-replace' : 'local-present-now';
        return freeze({...original,status});
      });
      const counts=freeze({edges:edges.length,
        packagedOrEmbedded:edges.filter(e=>e.status==='packaged'||e.status==='embedded').length,
        localPresent:edges.filter(e=>e.status==='local-present-now').length,
        localAtRisk:edges.filter(e=>e.status==='local-at-risk-on-replace').length,
        absentInSnapshot:edges.filter(e=>e.status==='absent-in-snapshot').length,
        inventoryUnavailable:edges.filter(e=>e.status==='inventory-unavailable').length});
      return freeze({schemaVersion:1,mode,source:'P2.7 reference graph',
        inventories:freeze(inventories),edges:freeze(edges),counts,
        advisory:true,
        safety:'Key-only local snapshots are not post-import guarantees or deletion authority'});
    });
  }
  return freeze({schemaVersion:1,scopes,inspect});
})();
