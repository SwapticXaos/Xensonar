from pathlib import Path
import sys
s=Path(sys.argv[1]).read_text()
checks={
    'Space key no longer enables swell': 't.setSwellHoldActive(!0)' not in s and 't.setSwellHoldActive(!1)' not in s,
    'momentary detachment controller': 'const __xenKeyboardFoundationDetach=' in s and 'function __XenKeyboardDetachBadge()' in s,
    'Keyboard event passes explicit gesture marker': s.count('keyboardFoundationGesture:true') >= 2,
    'Root commit gated during detachment': 'if(!__xenKeyboardFoundationDetach.freezeActive())Sc.current=wr' in s,
    'RFL root and uninitialized cursor fallback frozen': 'Wh=()=>{const heldRoot=__xenKeyboardFoundationDetach.rootHz()' in s,
    'Bass root frozen from remembered root': 'const heldRoot=__xenKeyboardFoundationDetach.rootHz()' in s,
    'Drone cursor-follow frozen from remembered position': 'const heldY=__xenKeyboardFoundationDetach.cursorY()' in s,
    'Keyboard legend updated': '(hold): play the Keyboard melody freely while Bass, Drone and Root Follow keep their last root' in s,
    'State badge updated': 'u.jsx(__XenKeyboardDetachBadge,{})' in s,
    'Explicit release does not catch up': 'function __xenKeyboardFoundationReleaseAfterNextGesture' in s,
    'Retains P5 echo fix': 'e.updateNParams({echoOn:false})' in s,
    'Retains P5 Forge preview': 'function __f333PreviewNavigatorSample' in s,
    'Retains P4 linked tuning': 'Link to Other Grid' in s,
}
for key,ok in checks.items():print(('PASS' if ok else 'FAIL'),key)
assert all(checks.values())
