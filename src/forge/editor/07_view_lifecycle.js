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
/* LIVEZONE-01: rooms outside the live zone (Live Room + Nodal Center). */
function __xenIsColdRoom(room){return room==="L3LAB"||room==="MULTITRACK"||room==="PSYLAB"}
/* R3: cold rooms that still play through the live AudioContext (e.g. a future
   multitrack room). The live-zone sleep never suspends the context for them. */
const __xenRoomsUsingLiveContext=new Set(["MULTITRACK","PSYLAB"]);/* ROOM5-01: Room V plays through the live context via the same shell bridge */
/* ROOM4-01: services the lazy Multitrack room needs from the shell (set by REe). */
const __xenMultitrackBridge={current:null};
function __xenRoomUsesLiveContext(room){return __xenRoomsUsingLiveContext.has(room)}
function __setForgeWorkspaceVisible(visible){
 if(visible===__forgeWorkspaceVisible)return;
 __forgeWorkspaceVisible=visible;
 /* FORGE-SLEEP-01: the parked Forge is a separate, sleeping app. Its Wave Editor drops its document key/pointer
    listeners (Backspace = octave hold in the Live Room); the focus never stays in the hidden box (also inert, see the keepalive wrapper). */
 globalThis.__XenWaveUIW01?.setAwake?.(visible);
 if(visible){if(typeof __F352Runtime!=='undefined')__F352Runtime.attach()}
 else{__deactivateForgeWorkspace();const a=document.activeElement;if(a&&a!==document.body&&a.closest?.('[data-package-station-keepalive]'))a.blur?.()}
}
