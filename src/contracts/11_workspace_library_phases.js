/* P3.1: explicit cold-path workspace library import ports.
 * No IndexedDB, audio or shared mutable state. Port implementations are provided
 * by the legacy composition root; they remain responsible for their own commits.
 * Callers retain sequencing and ledger updates between individual phases.
 */
const __XenWorkspaceLibraryPhasesP31=(()=>{
  const required=Object.freeze(['material','bass','drums','forgeProjects','forgeStamps']);
  const create=({mode,ports}={})=>{
    if(!['merge','replace','differential'].includes(mode))throw new TypeError('P3.1 invalid workspace import mode');
    if(!ports||typeof ports!=='object')throw new TypeError('P3.1 library ports are required');
    for(const name of required){
      if(typeof ports[name]!=='function')throw new TypeError('P3.1 missing library port: '+name);
    }
    return Object.freeze({
      run(name,payload){
        if(!required.includes(name))throw new TypeError('P3.1 unknown library phase: '+name);
        // Preserve historical truthiness and absent-package behavior.
        if(!payload)return null;
        return ports[name]({payload,mode});
      }
    });
  };
  return Object.freeze({create,phases:required});
})();
