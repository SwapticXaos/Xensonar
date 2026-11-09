
;/* TEST-ONLY probe (tools/build.py --probe). Never part of index.html. Exposes existing owners
   so end-to-end tests can drive the real app through its own APIs. */
window.__xenProbe={meta:__XenMetaSessions,bridge:__XenMainRoomSessionBridge,quick:__XenQuick};
