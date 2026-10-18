function __createF352Session(model, storage) {
    const {defaults: defaults, modes: modes, providers: providers, normalize: normalize} = model;
    const KEY = "xensonar:forge:hybrid-session:v2";
    let recipe = defaults;
    try {
        const raw = storage.read(KEY) ?? storage.read("xensonar:forge:combination-rack:v1");
        if (raw) recipe = normalize(JSON.parse(raw));
    } catch {}
    let recipeKey = JSON.stringify(recipe);
    let revision = 0, snapshot = Object.freeze({
        recipe: recipe,
        revision: revision,
        backendConnected: true,
        status: "ready"
    });
    const listeners = new Set;
    function emit() {
        snapshot = Object.freeze({
            recipe: recipe,
            revision: revision,
            backendConnected: true,
            status: recipe.enabled ? "active" : "ready"
        });
        for (const f of listeners) f();
    }
    function commit(next) {
        next = normalize(next);
        const nextKey = JSON.stringify(next);
        if (nextKey === recipeKey) return;
        recipe = next;
        recipeKey = nextKey;
        revision++;
        try {
            storage.write(KEY, nextKey);
        } catch {}
        emit();
    }
    return Object.freeze({
        defaults: defaults,
        modes: modes,
        providers: providers,
        getSnapshot: () => snapshot,
        subscribe(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
        patch(fields) {
            commit({
                ...recipe,
                ...fields
            });
        },
        restore(value) {
            commit(value ?? defaults);
        },
        reset() {
            commit(defaults);
        },
        export: () => ({
            ...recipe
        }),
        getRenderRequest(context = {}) {
            return {
                contractVersion: 2,
                backendConnected: true,
                recipe: {
                    ...recipe
                },
                ...context
            };
        }
    });
}
