
;/* TEST-ONLY probe (tools/build.py --probe). Never part of index.html. Exposes existing owners
   so end-to-end tests can drive the real app through its own APIs. */
window.__xenProbe={meta:__XenMetaSessions,bridge:__XenMainRoomSessionBridge,quick:__XenQuick,holdPlan:__XenHoldPlanRuntime};

/* ROOM5-02 equivalence probe: the grid layer was moved out of V2e; the old V2e is evaluated from a fixture in the bundle scope. */
window.__xenProbe.draw={V2e:()=>V2e,layer:()=>__xenDrawMainGridLayer,evalInBundle:code=>(0,eval)&&eval(code),geometry:()=>({vr,ir,Zs,Qa})};
