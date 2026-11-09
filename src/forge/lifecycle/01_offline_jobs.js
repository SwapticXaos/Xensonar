

/* Shared lifecycle for Forge offline jobs; DSP code stays at its caller. */
const __F35640OfflineJob = (() => {
  const abort = () => new DOMException('Offline rendering cancelled.', 'AbortError');
  function small({samples, sampleRate, durationSec, bands = 1}) {
    const length = Math.round(sampleRate * durationSec);
    return Number.isSafeInteger(length) && length > 0 && length <= 96000 &&
      durationSec > 0 && durationSec <= 2 && Number.isFinite(bands) && bands <= 16 &&
      length * Math.max(1, bands) <= 1536000 &&
      (samples?.byteLength ?? Infinity) <= 4 * 1024 * 1024;
  }
  function run({script, payload, transfer, options = {}, decode, fallback, label}) {
    let cancel;
    const promise = new Promise((resolve, reject) => {
      let worker = null, url = null, done = false, ready = false, recovering = false;
      let poll = null, boot = null, idle = null, deadline = null;
      const cleanup = () => {
        clearInterval(poll); clearTimeout(boot); clearTimeout(idle); clearTimeout(deadline);
        if (worker) {
          worker.onmessage = worker.onerror = worker.onmessageerror = null;
          try { worker.terminate(); } catch {}
          worker = null;
        }
        if (url) { try { URL.revokeObjectURL(url); } catch {} url = null; }
      };
      const finish = (error, value) => {
        if (done) return;
        done = true; cleanup(); error ? reject(error) : resolve(value);
      };
      cancel = () => finish(abort());
      const cancelled = () => {
        try { if (options.isCancelled?.()) { cancel(); return true; } }
        catch (error) { finish(error); return true; }
        return done;
      };
      const recover = reason => {
        if (done || recovering || cancelled()) return;
        recovering = true; cleanup();
        if (!fallback) { finish(Error(label + ': worker startup unavailable (' + reason + ').')); return; }
        poll = setInterval(cancelled, 20);
        const guarded = {...options, isCancelled: () => done || !!options.isCancelled?.()};
        Promise.resolve().then(() => {
          if (guarded.isCancelled()) throw abort();
          return fallback(reason, guarded);
        }).then(value => { if (!cancelled()) finish(null, value); }, error => finish(error));
      };
      if (cancelled()) return;
      if (typeof Worker !== 'function') { recover('Worker API unavailable'); return; }
      try {
        url = URL.createObjectURL(new Blob([script], {type:'text/javascript'}));
        worker = new Worker(url);
      } catch (error) { recover(error.message || 'constructor failed'); return; }
      const touch = () => {
        clearTimeout(idle);
        idle = setTimeout(() => finish(Error(label + ': worker stopped responding.')), 120000);
      };
      poll = setInterval(cancelled, 20);
      boot = setTimeout(() => recover('no startup receipt'), 12000);
      worker.onmessage = event => {
        if (recovering || cancelled()) return;
        try {
          const message = event.data;
          if (!message || typeof message !== 'object') throw Error(label + ': invalid worker receipt.');
          if (message.ready === true) {
            if (ready) return;
            ready = true; clearTimeout(boot);
            URL.revokeObjectURL(url); url = null;
            touch(); deadline = setTimeout(() => finish(Error(label + ': offline job exceeded its time budget.')), 600000);
            // Start only after acknowledgement; a failed boot never starts duplicate CPU work.
            const sent = typeof payload === 'function' ? payload() : payload;
            worker.postMessage(sent, typeof transfer === 'function' ? transfer(sent) : (transfer || []));
            return;
          }
          if (!ready) throw Error(label + ': result before startup receipt.');
          touch();
          if (message.progress != null) {
            if (!Number.isFinite(message.progress) || message.progress < 0 || message.progress > 1)
              throw Error(label + ': invalid progress receipt.');
            options.onProgress?.(message.progress); return;
          }
          if (message.error) {
            finish(message.name === 'AbortError' ? new DOMException(message.error,'AbortError') : Error(message.error)); return;
          }
          const value = decode(message);
          if (!cancelled()) finish(null, value);
        } catch (error) { finish(error); }
      };
      worker.onerror = event => {
        event.preventDefault?.();
        if (!ready) recover(event.message || 'boot error');
        else finish(Error(label + ': ' + (event.message || 'worker error')));
      };
      worker.onmessageerror = () => finish(Error(label + ': worker message could not be decoded.'));
    });
    return {promise, cancel: () => cancel?.()};
  }
  function pcm(message) {
    if (!(message.pcm instanceof Float32Array) || !message.pcm.length || !message.material)
      throw Error('Incomplete Forge PCM result.');
    Object.defineProperty(message.pcm, 'donorMaterialPlan', {value:message.material});
    return message.pcm;
  }
  function fallback(renderer, plan, model, sampleRate, durationSec, options, reason) {
    const raw = model.sourceGrains ?? model;
    if (!small({samples:raw.samples,sampleRate,durationSec,bands:plan.bands?.length ?? Infinity}))
      throw Error('Worker unavailable (' + reason + '). This render exceeds the protected CPU fallback budget.');
    return renderer(plan, model, sampleRate, durationSec, options);
  }
  return Object.freeze({run, small, pcm, fallback});
})();

