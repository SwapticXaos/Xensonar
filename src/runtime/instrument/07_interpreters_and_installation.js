/* TS-MOD-02: Nodal interpreter device matrix & Room III focus metadata live in src/ts/nodal/nodalDeviceMatrix.ts. */
let {NODAL_SOUND_TARGETS:ZP,DEFAULT_NODAL_DEVICE_MATRIX:eI,normalizeNodalDeviceMatrix:eT,patchNodalDevice:tI,setNodalDeviceTarget:qae,NODAL_ROOM3_FOCUS_TABS:b2,DEFAULT_NODAL_ROOM3_FOCUS:toe,MYZEL_COLOR_VOICE_SLIDERS:noe}=__XenTs_nodalDeviceMatrix;
/* TS-MOD-01: Nodal modulation matrix lives in src/ts/nodal/nodalModulationMatrix.ts; the old short names stay bound for the minified callers (let: like the former function declarations, probes may wrap them). */
let {NODAL_MOD_TARGET_IDS:Uae,NODAL_MOD_SOURCE_LABELS:Kae,NODAL_MOD_TARGET_LABELS:$ae,DEFAULT_NODAL_MOD_ROUTES:R0,normalizeNodalModRoutes:Xae,applyNodalModCurve:Yae,deriveNodalModSourceValues:Jae,evaluateNodalModRoute:Zae,evaluateNodalModulationMatrix:eoe}=__XenTs_nodalModulationMatrix;
/* xen-lazy:nodal */

/* xen-lazy:nodal */
const aoe="Xensonar Variante",ooe="Variant Support · Machine Room",ioe="Variant Support · Listening Room",soe="Variant Root",loe="Move Resident Nodes and observe or interactively explore wave attacks and ball coupling separately in Xensonar Classic and the Xensonar Variant.";
/* xen-lazy:nodal */
/* TS-MOD-03: Resident node tuning, logarithmic Hz mapping & placement live in src/ts/nodal/residentNodeTuning.ts. */
let {RESIDENT_MIN_FREQ_HZ:$d,RESIDENT_MAX_FREQ_HZ:Gy,maskMutedStates:doe,isParticleWithOverlay:moe,clampResidentFreq:CS,normToResidentFreq:hoe,residentFreqToNorm:rI}=__XenTs_residentNodeTuning;
let {resolveMode:aI,syncMutes:kS,retuneNodes:boe,createCustomNode:voe}=__XenTs_residentNodeTuning.bindResidentTuningRuntime({getStepCents:e=>Kp(e),getModeOptions:e=>Ka(e),getModeMask:(m,s)=>Au(m,s),getJiSteps:()=>fc,getBpRatios:()=>tj});
/* xen-lazy:nodal */
