// Buffer accounting for readonly analysis graphs: shared/cyclic nodes are visited once.
function __f353AnalysisSize(value) {
    const buffers = new Set, seen = new WeakSet;
    const pending = [value];
    while (pending.length) {
        const x = pending.pop();
        if (!x || typeof x !== "object" || seen.has(x)) continue;
        seen.add(x);
        if (ArrayBuffer.isView(x)) {
            buffers.add(x.buffer);
            continue;
        }
        const children = Object.values(x);
        for (let i = children.length - 1; i >= 0; i--) pending.push(children[i]);
    }
    return [ ...buffers ].reduce((n, b) => n + b.byteLength, 0) + (value.hybrid?.sourceGrains?.atlas?.nodes?.length ?? 0) * 1024;
}
