function __createF341WorkbenchStore({recipe: recipe, selection: selection, restoreSound: restoreSound, soundSettings: soundSettings, emitChange: emitChange}) {
    const {clamp: clamp, defaults: defaults, limits: limits, presets: presets, make: make, portable: portable, sourceKey: sourceKey} = recipe;
    let bindings = null, revision = 0, config = make(), snapshot = {
        revision: revision,
        config: config
    }, saved = [], lastOutput = null, notice = "", past = [], future = [], compareA = null, compareB = null, compareSide = "B";
    const listeners = new Set;
    let restoringProject = 0;
    function fingerprint(value = config) {
        return recipe.fingerprint(value);
    }
    function notify() {
        snapshot = {
            revision: ++revision,
            config: config,
            notice: notice,
            canUndo: past.length > 0,
            canRedo: future.length > 0,
            hasA: !!compareA,
            compareSide: compareSide
        };
        for (const l of listeners) l();
    }
    function set(value, {restore: restore = !1, history: history = !0} = {}) {
        const next = make(value);
        if (fingerprint(next) === fingerprint(config) && next.preset === config.preset) return;
        if (!restore) {
            bindings?.beforeChange?.();
            if (history) {
                past = [ ...past.slice(-63), config ];
                future = [];
            }
            notice = "";
        }
        config = next;
        notify();
        if (!restore) {
            bindings?.afterChange?.();
            emitChange();
        }
    }
    function patch(params) {
        set({
            ...config,
            preset: "custom",
            params: {
                ...config.params,
                ...params
            }
        });
    }
    function exportRecipe() {
        return JSON.parse(JSON.stringify(config));
    }
    return {
        defaults: defaults,
        presets: presets,
        layers: [ {
            id: "material",
            label: "Materialfenster",
            color: "#2dd4bf"
        }, {
            id: "noise",
            label: "Noise indicator",
            color: "#f472b6"
        }, {
            id: "pitch",
            label: "Pitch / confidence",
            color: "#a3e635"
        }, {
            id: "resonance",
            label: "Resonances",
            color: "#fbbf24"
        }, {
            id: "dynamics",
            label: "Level",
            color: "#60a5fa"
        }, {
            id: "attack",
            label: "Onset / Attack Evidence",
            color: "#c084fc"
        } ],
        limits: limits,
        clamp: clamp,
        make: make,
        fingerprint: fingerprint,
        set: set,
        patch: patch,
        sustainWindows: function(next) {
            patch({
                sustainWindows: {
                    ...config.params.sustainWindows,
                    ...next
                }
            });
        },
        setSustainRegion: function(start, end) {
            const a = clamp(start, 0, 1), b = clamp(end, 0, 1);
            if (b - a < .01) throw Error("Sustain window is too short.");
            set({
                ...config,
                preset: "custom",
                regions: [ ...config.regions.filter(r => "include" !== r.role), {
                    id: "sustain-" + Date.now(),
                    role: "include",
                    start: a,
                    end: b
                } ]
            });
        },
        reset: function() {
            set({
                sourceKey: config.sourceKey
            });
        },
        preset: function(id) {
            const item = presets.find(x => x.id === id) || saved.find(x => x.id === id);
            if (item) {
                if (item.variant) return item.variant.sourceKey !== config.sourceKey ? (notice = "This donor variant belongs to another selection. Please load the matching donor.", 
                void notify()) : (set({
                    ...item.variant,
                    preset: id
                }), void restoreSound(item));
                set({
                    params: portable(item.values),
                    preset: id,
                    regions: config.regions,
                    sourceKey: config.sourceKey
                }), restoreSound(item), ("pin" === item.values.windowMode || item.migratedPin) && (notice = "Parameter preset loaded: source-specific pinned window reset to Auto. Markings remain.", 
                notify());
            }
        },
        addRegion: function(start, end, role) {
            set({
                ...config,
                preset: "custom",
                regions: [ ...config.regions, {
                    id: "r" + Date.now() + Math.random().toString(36).slice(2, 5),
                    start: start,
                    end: end,
                    role: role
                } ]
            });
        },
        removeRegion: function(id) {
            set({
                ...config,
                preset: "custom",
                regions: config.regions.filter(r => r.id !== id)
            });
        },
        savePreset: function(name, variant = !1) {
            if (!name?.trim()) throw Error("Please enter a name.");
            if (variant && !config.sourceKey) throw Error("Donor variants require a loaded source.");
            const item = {
                id: "user-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
                name: name.trim().slice(0, 80) + (variant ? " · Donor-Variante" : ""),
                description: variant ? "Complete recipe for the same donor selection, including markings" : "Transfer, structure planning and optional Cecilia timbre · without source markings",
                values: portable(config.params),
                ...variant ? {
                    variant: exportRecipe()
                } : {},
                ...soundSettings()
            }, next = [ ...saved, item ];
            return bindings?.savePresets?.(next), saved = next, notify(), item;
        },
        attach: function(next) {
            bindings = next;
            try {
                const loaded = next.loadPresets?.() ?? [];
                if (!Array.isArray(loaded)) throw Error("Invalid preset data.");
                saved = loaded.filter(x => x && "string" == typeof x.id && "string" == typeof x.name).map(x => ({
                    ...x,
                    migratedPin: "pin" === x.values?.windowMode,
                    values: portable(x.values)
                }));
            } catch (e) {
                notice = "Could not read saved parameter presets: " + (e.message ?? e) + ". Saved data will not be deleted.";
            }
            return notify(), () => {
                bindings = null;
            };
        },
        sourceKey: sourceKey,
        sourceChanged: function(source) {
            const key = sourceKey(source);
            if (config.sourceKey && key !== config.sourceKey) {
                const reusable = presets.some(p => p.id === config.preset) || saved.some(p => p.id === config.preset && !p.variant);
                past = [], future = [], compareA = null, compareB = null, compareSide = "B", set({
                    params: {
                        ...config.params,
                        windowMode: "auto",
                        windowId: 0,
                        referenceStart: 0,
                        referenceEnd: 1,
                        ..."reference" === config.params.planning ? {
                            planning: "neutral"
                        } : {}
                    },
                    preset: reusable ? config.preset : "custom",
                    sourceKey: key
                }, {
                    restore: !0
                }), notice = "New donor selection: material markings, pinned window and A/B state have been reset. Sound parameters and parameter preset are retained.", 
                notify();
            } else key !== config.sourceKey && set({
                ...config,
                sourceKey: key
            }, {
                restore: !0
            });
        },
        bindBody: selection.bindBody,
        localRegions: (model, cfg = config) => selection.localRegions(model, cfg),
        materialModel: (model, cfg = config) => selection.materialModel(model, cfg),
        readPosition: selection.readPosition,
        spectralWeight: selection.spectralWeight,
        spectrumEnvelope: selection.spectrumEnvelope,
        metrics: selection.metrics,
        captureOutput: function(key, buffer, mantle, material) {
            lastOutput = {
                key: key,
                buffer: buffer,
                mantle: mantle,
                material: material,
                configKey: fingerprint()
            }, notify();
        },
        getOutput: function() {
            return lastOutput;
        },
        undo: function() {
            if (!past.length) return;
            const next = past[past.length - 1];
            past = past.slice(0, -1), future.push(config), set(next, {
                history: !1
            });
        },
        redo: function() {
            if (!future.length) return;
            const next = future.pop();
            past.push(config), set(next, {
                history: !1
            });
        },
        storeA: function() {
            compareA = config, compareB = null, compareSide = "B", notice = "A saved. Source, carrier and tempo remain the same when comparing recipes.", 
            notify();
        },
        toggleAB: function() {
            compareA && ("B" === compareSide ? (compareB = config, set(compareA), compareSide = "A") : (set(compareB ?? config), 
            compareSide = "B"), notify());
        },
        exportSession: function() {
            return JSON.parse(JSON.stringify({
                past: past,
                future: future,
                compareA: compareA,
                compareB: compareB,
                compareSide: compareSide
            }));
        },
        restoreSession: function(session = {}) {
            const same = v => v && v.sourceKey === config.sourceKey;
            past = (session.past ?? []).filter(same).slice(-64).map(make), future = (session.future ?? []).filter(same).slice(-64).map(make), 
            compareA = same(session.compareA) ? make(session.compareA) : null, compareB = same(session.compareB) ? make(session.compareB) : null, 
            compareSide = "A" === session.compareSide ? "A" : "B", notify();
        },
        exportPresets: function() {
            return JSON.parse(JSON.stringify(saved));
        },
        restorePresets: function(items) {
            if (!Array.isArray(items)) return;
            const merged = new Map;
            for (const x of [ ...items, ...saved ]) x && "string" == typeof x.id && "string" == typeof x.name && merged.set(x.id, {
                ...x,
                values: portable(x.values)
            });
            const next = [ ...merged.values() ];
            try {
                bindings?.savePresets?.(next);
            } catch (e) {
                notice = "Presets loaded from workspace; browser preset storage is not writable: " + (e.message ?? e);
            }
            saved = next, notify();
        },
        withSnapshotRestore: function(fn) {
            restoringProject++;
            try {
                return fn();
            } finally {
                restoringProject--;
            }
        },
        isProjectRestore: () => restoringProject > 0,
        subscribe: fn => (listeners.add(fn), () => listeners.delete(fn)),
        getSnapshot: () => snapshot,
        getConfig: () => config,
        getPresets: () => [ ...presets, ...saved ],
        restore: function(value) {
            past = [], future = [], compareA = null, compareB = null, compareSide = "B", notice = "source-grains" === value?.params?.engine ? "Earlier Sustain settings have been switched to Resonant Body. Material markings are preserved." : "", 
            set(value ?? {}, {
                restore: !0
            }), notify();
        },
        export: exportRecipe
    };
}
