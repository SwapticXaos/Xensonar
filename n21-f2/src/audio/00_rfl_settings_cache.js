// Cache only control-derived settings. Audio buffers, live root, clock, gates
// and pressure admission remain current on every scheduler tick.
const __f442RFLSettingsCache = new WeakMap();
const __f442RFLSettingFields = ['preset','powerMode','windowMs','stepMs','leadMs','startLeadMs','qualityMode','microDensity','sourceSpread','jitter','maxGrainsPerWindow'];
function __f442RFLBaseSettings(refs, raw, mode) {
  let cache = __f442RFLSettingsCache.get(refs);
  if (!cache) {
    cache = {mode:null, values:[], base:null, effective:null, material:null};
    __f442RFLSettingsCache.set(refs, cache);
  }
  let changed = !cache.base || cache.mode !== mode;
  for (let i=0;i<__f442RFLSettingFields.length;i++) {
    const value = raw?.[__f442RFLSettingFields[i]];
    if (!Object.is(cache.values[i],value)) changed = true;
    cache.values[i] = value;
  }
  if (changed) {
    cache.mode = mode;
    cache.base = Fw(raw,mode);
    cache.effective = null;
    cache.material = null;
  }
  return cache.base;
}
function __f442RFLMaterialSettings(refs, raw, mode, envelope) {
  const base = __f442RFLBaseSettings(refs,raw,mode), cache = __f442RFLSettingsCache.get(refs);
  if (!cache.material || cache.densityScale !== envelope.densityScale || cache.densityReduction !== envelope.densityReduction) {
    cache.densityScale = envelope.densityScale;
    cache.densityReduction = envelope.densityReduction;
    cache.effective = nW({settings:base,envelope});
    cache.material = {settings:cache.effective,tuning:vG(cache.effective)};
  }
  return cache.material;
}

/* Control-derived impulse policy is compiled once per scheduler generation.
   Bypass uses the existing continuous policy; authored divisions/pattern stay
   in the parameter state and are restored by disabling this one master gate. */
let __f442RFLContinuousRaster=null;
function __f442RFLRasterPolicy(fields, muted=false){
  if(!muted)return fu(fields);
  return __f442RFLContinuousRaster??(__f442RFLContinuousRaster=fu({every:1,cycleDiv:1,counterDiv:1,clockMode:'mute-pattern',pattern:[1]}));
}
