/* Editing a Melodic instrument keeps the original notes/tracks intact. A new
   immutable source snapshot is substituted for every reference to the edited
   instrument; the unrelated instruments and their notes are untouched. */

/* xen-lazy:nodal */

let __NodalTransferSequence = 0;

/* xen-lazy:nodal */

/* ML-WORKCOPY-P1: the pre-existing Nodal session key is the single Melodic
   working-copy owner. A regular or deliberately empty composer is not an
   absent Nodal instrument. Never erase the last valid state on restore error. */
let __NodalSessionWrite = null;
let __mlWorkingCopyProtected = false;
function nodalPersistComposerSession(session) {
 if(!session?.loopComposer||__mlWorkingCopyProtected)return;
 try {
  const payload={schemaVersion:1,loopComposer:$n(session.loopComposer),materialExport:session.materialExport,
   loopPatternVariants:session.loopPatternVariants,loopPatternLinks:session.loopPatternLinks,logicView:session.logicView};
  if(!window.__XenMelodicCompact.enqueueSave(payload))
   throw Error('IndexedDB Melodic working copy is not ready');
 }catch(error){__mlWorkingCopyProtected=true;console.error('[melodic][working-copy-save-protected]',error)}
}
function nodalRestoreComposerSession() {
 try {
  const payload=window.__XenMelodicCompact.loadedWorking();
  if(payload===null)return null;
  if(payload.schemaVersion!==1||!payload.loopComposer?.tracks?.length)throw Error('Unsupported working copy');
  return {...payload,loopComposer:$n(payload.loopComposer)};
 }catch(error){
  __mlWorkingCopyProtected=true;console.warn('[melodic][working-copy-restore-protected]',error);
  const scratch=iB(oB(4));
  return {loopComposer:scratch.composer,loopPatternVariants:scratch.patternVariants,
   loopPatternLinks:scratch.patternLinks,logicView:'melodic',
   status:'Melodic IndexedDB unreadable; existing data protected. Export before recovery.'};
 }
}
function useNodalNavigation(react, callbacks) {
  const latest = react.useRef(callbacks); latest.current = callbacks;
  react.useEffect(() => {
    const melodic = () => latest.current.openMelodic(), designer = event => latest.current.openDesigner(event.detail);
    window.addEventListener('xensonar:nodal-open-melodic', melodic); window.addEventListener('xensonar:nodal-open-designer', designer);
    return () => { window.removeEventListener('xensonar:nodal-open-melodic', melodic); window.removeEventListener('xensonar:nodal-open-designer', designer); };
  }, []);
}

/* xen-lazy:canonical */

