/* XenSonar P1.2: read-only, control-plane asset reference resolution.
 * Domain stores remain authoritative: this layer owns neither bytes nor cache,
 * never serializes, converts, retains or schedules audio, and must NOT be used
 * from a realtime callback. Legacy IDs are preserved verbatim.
 */
const __XenAssetResolutionV1 = (() => {
  const format = 'xensonar.asset-ref', schemaVersion = 1;
  const prefixes = Object.freeze({'asset':'asset:', 'melodic-sample':'melodic-sample:'});
  const fail = (message, code) => { const error = new TypeError('XenSonar asset reference: ' + message);
    if (code) error.code = code; throw error; };
  function parse(input) {
    if (typeof input !== 'string' || input.length > 512 || /[\u0000-\u001f\u007f]/.test(input))
      fail('invalid reference or length');
    const namespace = Object.keys(prefixes).find(key => input.startsWith(prefixes[key]));
    if (!namespace) fail('unsupported reference namespace');
    const key = input.slice(prefixes[namespace].length);
    if (!key) fail('empty asset reference');
    // A historical asset fingerprint contains pipes and user-provided names.
    // Never normalize its bytes: archived metadata uses the exact same ID.
    if (namespace === 'melodic-sample' && !/^[A-Za-z0-9_.:/-]{1,480}$/.test(key))
      fail('invalid melodic sample reference');
    return Object.freeze({format,schemaVersion,namespace,id:input,key});
  }
  function validate(description) {
    if (!description || description.format !== format || description.schemaVersion !== schemaVersion)
      fail('unknown or unsupported reference version');
    const normalized=parse(description.id);
    if (description.namespace !== normalized.namespace || description.key !== normalized.key)
      fail('reference metadata does not match ID');
    return normalized;
  }
  function createResolver(ports) {
    if (!Array.isArray(ports)) fail('provider ports must be an array');
    const table = new Map();
    for (const port of ports) {
      if (!port || !Object.hasOwn(prefixes,port.namespace)) fail('unsupported provider namespace');
      if (table.has(port.namespace)) fail('duplicate provider for '+port.namespace);
      if (typeof port.load !== 'function' || typeof port.producer !== 'string' ||
          !/^[a-z][a-z0-9-]{0,79}$/.test(port.producer)) fail('invalid provider port');
      table.set(port.namespace,Object.freeze({producer:port.producer,load:port.load}));
    }
    // Read-only control-plane lookup. A scoped repository owns the returned
    // bytes; raw reads deliberately do not impose *new* PCM shape constraints
    // on historical Forge workspace assets. Use resolve() for strict PCM data.
    async function read(ref, options) {
      const reference = typeof ref === 'string' ? parse(ref) : validate(ref);
      const port=table.get(reference.namespace);
      if (!port) fail('no provider registered for '+reference.namespace);
      const asset=await port.load(reference.key,reference.id,options);
      if (asset == null) fail('audio asset missing: '+reference.id,'XEN_ASSET_MISSING');
      return Object.freeze({reference,asset});
    }
    async function resolve(ref, options) {
      const {reference,asset}=await read(ref,options);
      const port=table.get(reference.namespace);
      const xenData=__XenDataContractsV1.describeLegacyPCM(asset,
        {producer:port.producer,assetId:reference.id});
      return Object.freeze({reference,asset,xenData});
    }
    return Object.freeze({read,resolve});
  }
  return Object.freeze({format,schemaVersion,parse,validate,createResolver});
})();
