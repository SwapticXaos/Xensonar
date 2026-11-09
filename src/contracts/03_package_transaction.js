/* XenSonar P2.1 — cold-path package transaction contracts.
 * Decode and validate before opening IDB's synchronous transaction lifetime.
 * Never call from the realtime audio path; this layer owns no PCM buffers.
 */
const __XenPackageTransactionsV1 = (() => {
  const format='xensonar.package-import', schemaVersion=1;
  const bands=['monoSamples','leftSamples','rightSamples'];
  function prepareAssets(rows,unpack,assertAsset) {
    if (!Array.isArray(rows) || typeof unpack!=='function' || typeof assertAsset!=='function')
      throw new TypeError('Invalid package preflight arguments');
    // The decoded PCM is retained only until the IDB write commits or aborts.
    return rows.map(row=>{
      const value=unpack(row.value);
      assertAsset(value,row.id);
      return {id:row.id,value,updatedAt:Date.now()};
    });
  }
  function samePCM(left,right) {
    if (!left || !right) return false;
    for (const field of ['sampleRate','channelCount']) {
      if (Number.isFinite(left[field]) && Number.isFinite(right[field]) && left[field]!==right[field]) return false;
    }
    for (const name of bands) {
      const a=left[name],b=right[name];
      if (a == null && b == null) continue;
      if (!a || !b || typeof a.length!=='number' || a.length!==b.length) return false;
      for (let i=0;i<a.length;i++) if (!Object.is(a[i],b[i])) return false;
    }
    return true;
  }
  return Object.freeze({format,schemaVersion,prepareAssets,samePCM});
})();
