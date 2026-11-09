/* P3.2 — pure workspace import result projection.
 * A read-only translation from finished repository reports into ledger updates
 * and the historical, byte-for-byte user-facing import strings. No I/O, DOM,
 * IndexedDB, audio allocation, scheduler, retries or changes to commit order.
 */
const __XenWorkspaceResultProjectionP32=(()=>{
  const names=Object.freeze(['material','bass','drums','forgeProjects','forgeStamps']);
  function library(name,result){
    if(!names.includes(name))throw new TypeError('P3.2 unknown library phase: '+name);
    if(!result)return null; // matches legacy truthy test
    const {importedCount,skippedCount,replacedCount,dedupedCount}=result;
    const ledger={imported:importedCount,reused:skippedCount,skipped:skippedCount,
      replaced:replacedCount,deduped:dedupedCount};
    let suffix='';
    switch(name){
      case 'material':
        // Explicitly require the same collection handles as the original ledger.
        // Do not silently report a wrong zero if the adapter violates its contract.
        if(result.importedIdMap==null||result.touchedIds==null)
          throw new TypeError('P3.2 material requires importedIdMap and touchedIds');
        ledger.remapped=result.importedIdMap.size;
        ledger.touched=result.touchedIds.size;
        suffix=` · ${importedCount} Material Tracks imported${skippedCount?` · ${skippedCount} already present`:''}${replacedCount?` · ${replacedCount} incrementally replaced`:''}${dedupedCount?` · ${dedupedCount} Material Track duplicates removed`:''}`;
        break;
      case 'bass':
        suffix=` · ${importedCount} bass patterns/lines imported${skippedCount?` · ${skippedCount} already present`:''}${replacedCount?` · ${replacedCount} incrementally replaced`:''}`;
        break;
      case 'drums':
        ledger.playlistImported=result.playlistImported;
        suffix=` · ${importedCount} drum pattern(s) imported${skippedCount?` · ${skippedCount} already present`:''}${replacedCount?` · ${replacedCount} incrementally replaced`:''}${result.playlistImported?' · Drum Playlist applied':''}`;
        break;
      case 'forgeProjects':
        suffix=` · ${importedCount} Spectral Forge project(s) imported${skippedCount?` · ${skippedCount} already present`:''}${replacedCount?` · ${replacedCount} incrementally replaced`:''}`;
        break;
      case 'forgeStamps':
        suffix=` · ${importedCount} Spectral Forge stamps imported${skippedCount?` · ${skippedCount} already present`:''}${replacedCount?` · ${replacedCount} incrementally replaced`:''}`;
        break;
    }
    return {ledger,suffix};
  }
  // P3.3: phase-local, read-only legacy message fragments. The importer owns
  // all commits and ledger mutations; this projection does not inspect storage.
  function fragment(name,report){
    switch(name){
      case 'sample':{
        const {replaced:g,reused:y,deduped:x}=report;
        return g||x||y?' · '+(g?g+' samples replaced incrementally':'')+
          (y?(g?' · ':'')+y+' samples already present':'')+
          (x?' · '+x+' old sample copies removed':''):'';
      }
      case 'grid':
        return report?` · ${report.importedCount} grids imported${report.mode==='replace'?` · ${report.nextRack?.length??0} Rack-Slots`:''}`:'';
      case 'forgeWorkspaces':{
        const {saved,restoredCurrent}=report;
        return saved?` · ${saved.importedCount} saved Synthetic Forge workspaces imported${saved.skippedCount?` · ${saved.skippedCount} already present`:''}${saved.replacedCount?` · ${saved.replacedCount} replaced`:''}${restoredCurrent?' · open workspace restored':''}`:
          restoredCurrent?' · open Synthetic Forge workspace restored':'';
      }
      case 'mirror':
        return report.importedCount?` · ${report.importedCount} local browser-library entries mirrored`:'';
      case 'nodal':
        return report.present?` · ${report.importedCount} Room III constellation(s) imported${report.skippedCount?` · ${report.skippedCount} already present`:''}${report.replacedCount?` · ${report.replacedCount} replaced`:''}`:'';
      case 'rootFollow':{
        switch(report.kind){
          case 'bank':return report.restored?` · ${report.restored} Root Follow loop(s) restored`:report.original?' · Root Follow bank without a valid Material Track':'';
          case 'legacy':return ` · ${report.restored} Root Follow loop(s) activated from older package marker`;
          case 'cleared':return ' · Root-Follow-Bank geleert';
          case 'none':return '';
          default:throw new TypeError('P3.3 unknown rootFollow kind: '+report.kind);
        }
      }
      default:throw new TypeError('P3.3 unknown fragment: '+name);
    }
  }
  function tail({settingsCount,summary,donor,forge,forgeApplied}){
    return `${settingsCount>0?' · Global sound and mix settings will be active after reload':''} · ${summary}${donor?` · ${donor.donorCount} donors · ${donor.workspaceCount} material recordings · ${donor.audioImported} raw audio assets restored`:''}${forge?` · ${forge.workspaceCount} Forge-Experimentstände · ${forge.audioImported} Forge-Audio-Assets${forge.activeWorkspaceImported?(forgeApplied?' · active Forge workspace restored':' · reopen Forge to activate'):''}`:''}`;
  }
  function status({mode,sampleCount,projectCount,segments,tail:ending}){
    if(!['merge','replace','differential'].includes(mode))throw new TypeError('P3.2 unknown import mode: '+mode);
    const s=segments;
    const detail=`${s.sample}${s.grid}${s.material}${s.bass}${s.drums}${s.forgeProjects}${s.forgeStamps}${s.forgeWorkspaces}${s.nodal}${s.mirror}${s.rootFollow}.${ending}`;
    if(mode==='merge')return `Workspace Package added additively: ${sampleCount} samples · ${projectCount} projects added ${detail}`;
    if(mode==='differential')return `Workspace Package combined differentially as a working copy: ${sampleCount} samples · ${projectCount} projects ${detail}`;
    return `Workspace Package loaded as a local working copy: ${sampleCount} samples · ${projectCount} projects ${detail}`;
  }
  return Object.freeze({library,fragment,tail,status});
})();
