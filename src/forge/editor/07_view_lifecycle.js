// The editor is kept mounted across rooms. Stop only its workshop playback on
// navigation; the PCM display owns its separate React lifetime and cleanup.
const __ForgeWorkspaceVisibility=P.createContext(false);
let __forgeWorkspaceVisible=false;
function __deactivateForgeWorkspace(){
 if(typeof __Emilia!=='undefined')__Emilia.stopPreview();
 if(typeof __F352Runtime!=='undefined')__F352Runtime.detach();
 if(typeof __f333Stop==='function')__f333Stop();
 if(typeof __f449ReleaseForgeDerivedCaches==='function')__f449ReleaseForgeDerivedCaches();
}
function __setForgeWorkspaceVisible(visible){
 if(visible===__forgeWorkspaceVisible)return;
 __forgeWorkspaceVisible=visible;
 if(visible){if(typeof __F352Runtime!=='undefined')__F352Runtime.attach()}
 else __deactivateForgeWorkspace();
}
