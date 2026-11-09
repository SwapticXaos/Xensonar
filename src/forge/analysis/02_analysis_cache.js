function __createF353AnalysisCache({keyForSource: keyForSource, prepareSource: prepareSource, sizeOfValue: sizeOfValue, budget: budget = 64 * 1024 * 1024, maxEntries: maxEntries = 8}) {
    const cache = new Map;
    let bytes = 0;
    let generation = 0;
    const stats = {
        hits: 0,
        analyses: 0
    };
    async function prepare(source, isCancelled) {
        if (isCancelled?.()) throw new DOMException("Donor analysis cancelled.", "AbortError");
        const key = keyForSource(source), hit = cache.get(key);
        if (hit) {
            cache.delete(key);
            cache.set(key, hit);
            stats.hits++;
            return hit.value;
        }
        stats.analyses++;
        const startedIn = generation;
        const value = await prepareSource(source, isCancelled);
        if (isCancelled?.()) throw new DOMException("Donor analysis cancelled.", "AbortError");
        const count = sizeOfValue(value);
        if (startedIn === generation && count <= budget) {
            const old = cache.get(key);
            if (old) bytes -= old.size;
            cache.delete(key);
            cache.set(key, {
                value: value,
                size: count
            });
            bytes += count;
            while (bytes > budget || cache.size > maxEntries) {
                const first = cache.keys().next().value;
                bytes -= cache.get(first).size;
                cache.delete(first);
            }
        }
        return value;
    }
    return Object.freeze({
        prepare: prepare,
        clear: () => {generation++; cache.clear(); bytes = 0;},
        diagnostics: () => ({
            ...stats,
            bytes: bytes,
            entries: cache.size,
            budget: budget
        })
    });
}
