// P3: Myzel Post-FX keeps stable inlet objects, but OFF owns no connected DSP.
const __xenMyzelPostNodes=['merge','highpass','lowpass','color','shaper','delay','feedback','wet','output'];
function __xenWakeMyzelPostFx(f){
 if(f.parkTimer!==undefined){clearTimeout(f.parkTimer);delete f.parkTimer;}
 if(!f.parked)return;
 for(const input of Object.values(f.inputs))input.connect(f.merge);
 f.merge.connect(f.highpass);f.highpass.connect(f.lowpass);f.lowpass.connect(f.color);f.color.connect(f.shaper);
 f.shaper.connect(f.wet);f.shaper.connect(f.delay);f.delay.connect(f.feedback);f.feedback.connect(f.delay);f.delay.connect(f.wet);f.wet.connect(f.output);f.output.connect(f.destination);
 f.parked=false;
}
function __xenParkMyzelPostFx(f,time){
 if(f.parked||f.parkTimer!==undefined)return;
 f.output.gain.setTargetAtTime(0,time,.08);
 const cached=yP.get(f);if(cached)cached.targets[cached.targets.length-1]=NaN;
 const detach=()=>{delete f.parkTimer;for(const input of Object.values(f.inputs))input.disconnect();for(const key of __xenMyzelPostNodes)f[key].disconnect();f.parked=true;};
 if(Kz.get(f)?.state==='running')f.parkTimer=setTimeout(detach,650);else detach();
}
// P3: graph-local drive requests; a new graph always receives its first targets.
const __xenDriveTargets=new WeakMap();
const __xenDriveFields=['enabled','bodyCoupling','bodyFlux','bodyTension','shimmer','myzelGate','bodyRoughness','amount','mix','tone','output','resonanceFocus'];
