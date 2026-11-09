 const savedStyle=__xenBeatDrumStyleSafe(snapshot?.exported?.drumStyle);
 // Existing controls continue to drive edge/softness/air/snap/swing/decay.
 // Non-room pan/choke remain part of a saved beat for preview and export parity.
 const currentStyle=__mlSharedDrumMachine.liveEdit?.drumStyle||!savedStyle?liveStyle:{...liveStyle,pan:savedStyle.pan,chokeGroup:savedStyle.chokeGroup};
 return {...spec,drumCycleBars:Math.max(1,cycleBars),...(currentStyle?{drumStyle:currentStyle}:{})};
