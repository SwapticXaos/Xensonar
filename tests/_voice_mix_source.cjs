'use strict';
// R2: __XenMaterialVoiceMix is built by a factory (Live Room instance + Room IV instances).
// Returns runnable source: the control notifier, the factory, and the Live Room instance.
module.exports = function voiceMixSource(text) {
  const notifier = text.indexOf('function __xenControlNotifier(');
  const notifierEnd = text.indexOf('\n}\n', notifier) + 3;
  const factory = text.indexOf('function __xenCreateMaterialVoiceMix(');
  const instance = 'const __XenMaterialVoiceMix=__xenCreateMaterialVoiceMix();';
  const end = text.indexOf(instance);
  if (notifier < 0 || factory < 0 || end < 0) throw Error('Could not locate __XenMaterialVoiceMix source');
  return text.slice(notifier, notifierEnd) + text.slice(factory, end) + instance;
};
