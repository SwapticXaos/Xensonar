/* Raw focus is owned by input events. Only downstream ball/controller work is
   coalesced; an actual click or keyboard commit always takes the direct path. */
const __resonancePointerMotionOwners=new WeakMap();
function __flushResonancePointerMotion(ref){__resonancePointerMotionOwners.get(ref)?.flush();}
function __cancelResonancePointerMotion(ref){__resonancePointerMotionOwners.get(ref)?.cancel();}
function __resonancePointerMotionFor(config){
  const ref=config.nexusRefs;
  let owner=__resonancePointerMotionOwners.get(ref);
  if(owner){owner.configure(config);return owner;}
  let current=config,pending=null,frame=null;
  function cancel(){if(frame!==null)cancelAnimationFrame(frame);frame=null;pending=null;}
  function flush(){
    if(frame!==null)cancelAnimationFrame(frame);frame=null;
    const next=pending;pending=null;
    if(!next||ref.current!==next.state)return;
    // Another controller may have moved the ball before this display callback.
    if(next.state.cursorX!==next.previousX||next.state.cursorY!==next.previousY)return;
    next.state.cursorX=next.x;
    current.commitResonanceCursorY(next.y,{primeSource:'resonance',pointerMotion:true});
  }
  owner={configure(next){current=next;},cancel,flush,move(x,y){
    const state=ref.current;
    pending={state,x,y,previousX:state.cursorX,previousY:state.cursorY};
    if(frame===null)frame=requestAnimationFrame(flush);
  }};
  __resonancePointerMotionOwners.set(ref,owner);return owner;
}
