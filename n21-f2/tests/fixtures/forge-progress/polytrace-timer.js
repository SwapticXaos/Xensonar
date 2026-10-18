async function __forgePolytraceTimer(args, {onProgress, check = () => {}} = {}) {
    const frames = __forgePolytraceFrames(args);
    let lastYield = performance.now();
    try {
        for (;;) {
            check();
            const step = frames.next();
            if (step.done) { check(); onProgress?.(1); return step.value; }
            if (performance.now() - lastYield >= 12) {
                onProgress?.(step.value);
                // Leave React's progress commit and browser paint a task turn.
                // Higher-priority continuations can starve those UI updates.
                await new Promise(resolve => setTimeout(resolve, 0));
                lastYield = performance.now();
            }
        }
    } finally { frames.return(); }
}
