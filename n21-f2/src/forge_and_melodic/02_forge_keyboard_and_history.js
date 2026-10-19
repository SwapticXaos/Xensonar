function FWe(e,t,n='legacy',r='classic'){P.useEffect(()=>{
 if(!e)return;const key=event=>{const state=pe.getState(),target=event.target;
 if(target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName))return;
 if(event.ctrlKey||event.metaKey){if(event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?state.redo():state.undo();}else if(event.key.toLowerCase()==='y'){event.preventDefault();state.redo();}return;}
 if(event.key===' '){event.preventDefault();if(n==='forge3'&&__ForgeTransportAccess.hasOwner()){void __ForgeTransportAccess.toggle();return;}if(state.isPlaying){__f333Stop();pe.setState(__f333Idle());return;}
  __f333PlayCurrent(state,{audioMode:r,fromPosition:state.playheadPosition,onPosition:p=>pe.getState().setPlayheadPosition(p),onEnd:()=>pe.setState(__f333Idle())})
   .then(played=>{if(played)pe.setState({isPlaying:true,showPlayheadMarker:true})}).catch(error=>console.warn('[forge][play]',error));return;}
 const tools={b:'brush',h:'hardBrush',l:'line',a:'harmonicBrush',n:'noiseBrush',s:'spray',f:'formant',t:'stamp',m:'morph',j:'smudge',d:'dodgeBurn',k:'blurSharpen',y:'delaySmear',r:'threshold',u:'sourceTrace'};
 const lower=event.key.toLowerCase();
 if(state.activeTool==='stamp'&&state.stampPhase==='stamping'&&state.stampData){
  if(['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();state.adjustStampScale(event.key==='ArrowRight'?.08:event.key==='ArrowLeft'?-.08:0,event.key==='ArrowUp'?.08:event.key==='ArrowDown'?-.08:0);return;}
  if(lower==='q'||lower==='e'){event.preventDefault();state.rotateStamp(lower==='q'?-Math.PI/32:Math.PI/32);return;}
 }
 if(tools[lower])state.setActiveTool(tools[lower]);else if(lower==='x')state.toggleEraseMode();else if(lower==='g')state.setShowGrainLayer(!state.showGrainLayer);
 };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
},[e,r]);}function LWe(e){const t=new ph(Math.max(8,e.width),Math.max(8,e.height));return t.data.set(e.data),t.grainData.set(e.grainData),t}function __ForgeF38History(){const undo=pe(z=>z.undo),redo=pe(z=>z.redo),clear=pe(z=>z.clearCanvas),reset=pe(z=>z.resetForgeMainPath),uN=pe(z=>z.undoStack.length),rN=pe(z=>z.redoStack.length),ctx=pe(z=>z.sourceAssetContext);return u.jsxs("div",{className:"flex flex-wrap items-center gap-1.5",role:"group","aria-label":"Werkbankverlauf","data-forge-draw-history":"true",children:[u.jsx("button",{type:"button",onClick:undo,disabled:uN===0,title:ctx==="forge3_main"?"Undo: Hauptpfad (Ctrl+Z)":"Undo: Werkbank (Ctrl+Z)",className:"h-7 rounded bg-gray-800 px-2 text-gray-200 hover:bg-gray-700 disabled:opacity-30",children:"↶ Undo"}),u.jsx("button",{type:"button",onClick:redo,disabled:rN===0,title:"Redo (Ctrl+Y)",className:"h-7 rounded bg-gray-800 px-2 text-gray-200 hover:bg-gray-700 disabled:opacity-30",children:"↷ Redo"}),u.jsx("button",{type:"button",onClick:clear,title:"Clear Workbench",className:"h-7 rounded bg-red-900/50 px-2 text-red-300 hover:bg-red-800","aria-label":"Clear Workbench",children:"🗑️"}),u.jsx("button",{type:"button",onClick:reset,title:"Reset Forge Main Path",className:"h-7 rounded bg-amber-900/50 px-2 text-amber-200 hover:bg-amber-800","aria-label":"Reset Forge Main Path",children:"⟲"})]})}
function BWe({onBack: e, variant: t = "legacy", sidebarTop: n, forge3Lens: r = "hear", footerContent: a, externalAudioUploadFile: o = null, externalAudioUploadOrigin: i = null, entryScrollIntent: s = null, onExternalAudioUploadConsumed: l, onEntryScrollIntentConsumed: c}) {
    const d = P.useRef(null), p = P.useRef(null), [f, b] = P.useState(!0), [__forgeSidebarCollapsed, __setForgeSidebarCollapsed] = P.useState(!1), [__advancedOpen, __setAdvancedOpen] = P.useState(false), [g] = P.useState(!1), [y, x] = P.useState("classic"), [A, M] = P.useState(null), [v, w] = P.useState(!1), [R, k] = P.useState(!1), [I, E] = P.useState(null), F = pe(Se => Se.audioBufferDirty), L = pe(Se => Se.setAudioBufferDirty), B = pe(Se => Se.materialExport), O = pe(Se => Se.updateMaterialExport), T = pe(Se => Se.renderVersion), _ = pe(Se => Se.spectralData), G = pe(Se => Se.sourceAsset), j = pe(Se => Se.synthMode), N = pe(Se => Se.waveformMix), W = pe(Se => Se.embodimentField), V = pe(Se => Se.embodimentStatus), U = pe(Se => Se.embodimentMessage), H = pe(Se => Se.embodimentLayersVisibility), q = pe(Se => Se.setEmbodimentField), K = pe(Se => Se.setEmbodimentStatus), Y = pe(Se => Se.setEmbodimentLayersVisibility), J = pe(Se => Se.carrierDonorV2), Z = pe(Se => Se.carrierIntegralSelection), te = pe(Se => Se.carrierIntegralSynthLab), X = pe(Se => Se.spectralEmbodimentSourceAsset), {donorState: Q, donorReady: ne, donorPhase: ee, donorError: ie, donorRenderProgress: de, donorFigurePrepared: oe, extractionGeneration: ue, donorProofActive: fe, stopDonorAudition: he, handleDonorInputChange: re, handleDonorPreview: le, handleDonorProof: Ae, selectOtherHearing: ce, donorRegisterPolicy: ge, donorRegisterAvailable: Ce, handleDonorRegisterPolicy: Re, donorRenderMethod: se, donorHybridAvailable: xe, handleDonorRenderMethod: Be} = v5e(), Ie = P.useRef(null);
    P.useEffect(() => {
        d.current?.focus({
            preventScroll: !0
        });
    }, []), P.useEffect(() => {
        F && (xt.invalidateBuffer(), L(!1));
    }, [ F, L ]), P.useEffect(() => {
        const Se = g3(G, "main");
        return () => {
            Se?.markReleased("spectral-forge-main-source-asset-context-replaced");
        };
    }, [ G ]), P.useEffect(() => {
        const Se = g3(X, "embodiment");
        return () => {
            Se?.markReleased("spectral-forge-embodiment-source-asset-context-replaced");
        };
    }, [ X ]), FWe(f, B, t, y);
    const Qe = () => {
        window.setTimeout(() => {
            p.current?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }, 80);
    }, Ne = P.useMemo(() => Zp(B.bars, B.bpm, B.beatsPerBar), [ B.bars, B.bpm, B.beatsPerBar ]), Ue = `${T}:${Ne}`, Ye = P.useRef(Ue);
    P.useEffect(() => {
        Ye.current !== Ue && (Ye.current = Ue, (ee === "rendering" || ee === "playing") && he());
    }, [ Ue, ee ]), P.useEffect(() => {
        if (!ne || J.donorUseMode !== "timbre_projection" && !Q.selected) return;
        const Se = window.setTimeout(() => {
            const be = pe.getState();
            q(GU(be.spectralData, Ne), "ready", "Carrier Figure · Sound Material Ready");
        }, 150);
        return () => window.clearTimeout(Se);
    }, [ Ue, ne, Q.model, Q.selected, J.donorUseMode, Ne, q ]);
    const Ve = t === "forge3" ? "← Back to III.2" : "← Back to V", tt = P.useMemo(() => cVe({
        spectralData: _,
        synthMode: j,
        waveformMix: N,
        sourceView: "energy",
        activeWorkspace: "wave-material"
    }), [ _, j, N ]), dt = async ({name: Se, stampData: be}) => {
        const ve = await xt.renderToBuffer(LWe(be), j, N), Je = lg(ve);
        await u$({
            blob: Je,
            name: `${az(Se, "stempel-sample")}.wav`
        });
    }, {isFrontV2Field: gt, runValidation: Ge, downloadValidationReport: Te, sendToMaterialspur: rt, downloadValidationBundle: lt} = EWe({
        spectralData: _,
        synthMode: j,
        waveformMix: N,
        sourceAsset: G,
        spectralEmbodimentSourceAsset: X,
        embodimentField: W,
        embodimentStatus: V,
        donorReady: ne,
        carrierIntegralSelection: Z,
        carrierIntegralSynthLab: te,
        materialExport: B,
        intendedLoopDuration: Ne,
        validationReport: A,
        setValidationBusy: w,
        setValidationReport: M,
        setMaterialSendBusy: k,
        setLastMaterialEntry: E,
        setEmbodimentStatus: K
    }), ut = Se => IWe({
        payload: Se,
        extractionGeneration: ue,
        stopDonorAudition: he,
        clearLocalValidationState: () => {
            M(null), E(null);
        },
        setForge3AudioMode: x,
        renderVersion: T,
        spectralData: _,
        materialExport: {
            bars: B.bars,
            bpm: B.bpm
        },
        transferProfile: J.transferProfile,
        intendedLoopDuration: Ne
    }), at = Se => {
        Y({
            [Se]: !H[Se]
        });
    }, qe = async () => {
        if (pe.getState().carrierDonorV2.donorUseMode === "timbre_projection") {
            await le();
            return;
        }
        if (!gt()) return;
        const Se = pe.getState().carrierDonorV2, be = pe.getState().spectralEmbodimentSourceAsset ?? G;
        !Se.skeleton || !Se.donorAtlas || Se.donorUseMode !== "timbre_projection" && !Se.bindingPreview.length || await xt.playCarrierDonorV2Preview(_, j, N, Se.skeleton, Se.bindingPreview, Se.donorAtlas, Se.materialField, Se.materialAllocationPreview, be, Se.transferProfile, Ne, Se.donorUseMode, 0);
    }, mt = ne || W?.builtFromSignature?.startsWith("carrier-donor-v2:") ? "carrier_donor_v2" : "legacy", It = J.donorUseMode === "timbre_projection" || Q.selected ? ne : mt === "carrier_donor_v2" && J.freshness.renderEligibility.canPreviewV2, Ct = It ? ne ? "Sound Material Ready" : "V2 Ready" : "missing", St = It ? "V2 Ready · " + B.bars + " bars · " + Ne.toFixed(2) + "s" : V === "ready" ? "ready" : V === "building" ? "building" : V === "error" ? "Error" : "missing", At = t === "forge3" ? u.jsxs("div", {
        className: "space-y-3 text-white select-none",
        children: [ u.jsxs("section", {
            id: "spectralforge-station-draw",
            "data-forge-station": "draw",
            className: "scroll-mt-4 overflow-hidden border border-neutral-800 border-t-2 border-t-violet-500/70 bg-gray-950",
            children: [ u.jsx("header", {
                className: "flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 bg-neutral-950 px-3 py-2",
                children: u.jsxs(u.Fragment, {
                    children: [ u.jsx("h2", {
                        className: "text-sm font-semibold text-neutral-100",
                        children: "Draw"
                    }), u.jsx(__ForgeF38History, {}) ]
                })
            }), u.jsxs("div", {
                className: "flex min-h-[560px] min-w-0 overflow-hidden",
                children: [ u.jsx(b4e, {}), u.jsxs("div", {
                    className: "flex min-w-0 flex-1 flex-col",
                    children: [ u.jsx("div", {
                        className: "flex min-h-[440px] shrink-0 flex-col md:min-h-[520px] lg:min-h-[600px]",
                        style: t === "forge3" && __forgeSidebarCollapsed ? {
                            minHeight: "min(88vh, 1000px)"
                        } : void 0,
                        children: u.jsx(r4e, {
                            variant: t,
                            forge3Lens: r,
                            showTraceLayer: g
                        })
                    }), u.jsx("div", {"data-forge-brush-row":true,children:u.jsx(C4e,{})}), u.jsx("section",{id:"spectralforge-station-output","data-forge-transport-under-canvas":true,className:"min-w-0 border-t border-emerald-900/60",children:u.jsx(C6e,{ref:Ie,variant:t,forge3AudioMode:y,onChangeForge3AudioMode:x})}) ]
                }) ]
            }) ]
        }), u.jsxs("section", {
            id: "spectralforge-station-material",
            "data-forge-station": "material",
            className: "scroll-mt-4 overflow-hidden border border-neutral-800 border-t-2 border-t-cyan-500/70 bg-gray-950",
            children: [ u.jsx("header", {
                className: "flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 bg-neutral-950 px-3 py-2",
                children: u.jsx("h2", {
                    className: "text-sm font-semibold text-neutral-100",
                    children: "Sound Material · Donor"
                })
            }), u.jsx(CGe, {
                sourceAdapters: [ rVe, aVe ],
                targetAdapter: oVe,
                rawTargetAdapter: iVe,
                rawRootFollowTargetAdapter: sVe,
                rawMelodicPinkLaneTargetAdapter: lVe,
                rawMelodicSampleTargetAdapter: tt,
                onMetaPatch: Se => O(Se),
                meter: {
                    bpm: B.bpm,
                    bars: B.bars,
                    guideSegments: B.guideSegments,
                    guideMarkers: B.guideMarkers
                },
                persistenceKey: `spectral-${t}`,
                externalLoadFile: o,
                externalLoadOrigin: i,
                entryScrollIntent: s,
                onExternalLoadConsumed: l,
                onEntryScrollIntentConsumed: c,
                loadButtonLabel: "Import Audio",
                onDonorInputChange: re,
                onEmbodyTimbre: ut,
                exportMeta: {
                    name: B.name,
                    role: B.role,
                    bpm: B.bpm,
                    bars: B.bars,
                    guideSegments: B.guideSegments,
                    rootHz: B.rootHz
                },
                timbreStatusLabel: Ct,
                embodimentStatusLabel: St
            }) ]
        }), null, null, t === "forge3" ? u.jsxs("details", {
            "data-forge-advanced": "v1",
            className: "mx-3 mb-3 rounded border border-neutral-800 bg-neutral-950/50 text-xs text-neutral-300",
            onToggle: Se => __setAdvancedOpen(Se.currentTarget.open),
            children: [ u.jsx("summary", {
                className: "cursor-pointer select-none px-3 py-2 text-neutral-400 hover:text-neutral-100",
                children: "Additional Sound Paths & Diagnostics"
            }), __advancedOpen && u.jsxs("div", {
                className: "space-y-3 border-t border-neutral-800 p-3",
                children: [ u.jsxs("label", {
                    className: "flex items-center gap-3 px-3 py-2 text-xs text-neutral-300",
                    children: [ "Sound Transfer", u.jsx("select", {
                        className: "rounded border border-neutral-700 bg-neutral-900 px-2 py-1",
                        value: J.donorUseMode,
                        disabled: J.busy !== "none",
                        onChange: Se => {
                            xt.stop(), pe.getState().setCarrierDonorV2DonorUseMode(Se.target.value), M(null), 
                            E(null);
                        },
                        children: Object.entries(XLe).map(([Se, be]) => u.jsx("option", {
                            value: Se,
                            children: be
                        }, Se))
                    }) ]
                }), u.jsx(YGe, {
                    embodimentField: W,
                    embodimentStatus: V,
                    embodimentMessage: U,
                    embodimentLayersVisibility: H,
                    v2ValidationReport: A,
                    fieldMode: mt,
                    previewAvailable: It,
                    previewPhase: ee,
                    previewError: ie,
                    validationBusy: v,
                    onToggleLayer: at,
                    onPlayPreview: qe,
                    onRunValidation: Ge,
                    onDownloadValidationReport: Te,
                    onDownloadValidationBundle: lt,
                    onSendToMaterialspur: rt,
                    materialspurSendBusy: R,
                    materialspurEntryLabel: I ? I.name + " · " + I.bars + " bars" : null
                }), a ]
            }) ]
        }) : u.jsxs(u.Fragment, {
            children: [ u.jsxs("label", {
                className: "flex items-center gap-3 px-3 py-2 text-xs text-neutral-300",
                children: [ "Sound Transfer", u.jsx("select", {
                    className: "rounded border border-neutral-700 bg-neutral-900 px-2 py-1",
                    value: J.donorUseMode,
                    disabled: J.busy !== "none",
                    onChange: Se => {
                        xt.stop(), pe.getState().setCarrierDonorV2DonorUseMode(Se.target.value), M(null), 
                        E(null);
                    },
                    children: Object.entries(XLe).map(([Se, be]) => u.jsx("option", {
                        value: Se,
                        children: be
                    }, Se))
                }) ]
            }), u.jsx(YGe, {
                embodimentField: W,
                embodimentStatus: V,
                embodimentMessage: U,
                embodimentLayersVisibility: H,
                v2ValidationReport: A,
                fieldMode: mt,
                previewAvailable: It,
                previewPhase: ee,
                previewError: ie,
                validationBusy: v,
                onToggleLayer: at,
                onPlayPreview: qe,
                onRunValidation: Ge,
                onDownloadValidationReport: Te,
                onDownloadValidationBundle: lt,
                onSendToMaterialspur: rt,
                materialspurSendBusy: R,
                materialspurEntryLabel: I ? I.name + " · " + I.bars + " bars" : null
            }) ]
        }) ]
    }) : u.jsx("div", {
        className: "space-y-3",
        children: u.jsxs("div", {
            className: "flex min-h-[720px] overflow-hidden border border-neutral-800 bg-gray-950 text-white select-none",
            children: [ u.jsx(b4e, {}), u.jsxs("div", {
                className: "flex min-h-0 min-w-0 flex-1 flex-col",
                style: {
                    overscrollBehavior: "auto"
                },
                children: [ u.jsx("div", {
                    className: "flex min-h-[440px] shrink-0 flex-col md:min-h-[520px] lg:min-h-[600px]",
                    children: u.jsx(r4e, {
                        variant: t,
                        forge3Lens: r,
                        showTraceLayer: g
                    })
                }), u.jsx(C6e, {
                    ref: Ie,
                    variant: t,
                    forge3AudioMode: y,
                    onChangeForge3AudioMode: x
                }), u.jsx(C4e, {}), u.jsx(CGe, {
                    sourceAdapters: [ rVe, aVe ],
                    targetAdapter: oVe,
                    rawTargetAdapter: iVe,
                    rawRootFollowTargetAdapter: sVe,
                    rawMelodicPinkLaneTargetAdapter: lVe,
                    rawMelodicSampleTargetAdapter: tt,
                    onMetaPatch: Se => O(Se),
                    meter: {
                        bpm: B.bpm,
                        bars: B.bars,
                        guideSegments: B.guideSegments,
                        guideMarkers: B.guideMarkers
                    },
                    persistenceKey: `spectral-${t}`,
                    externalLoadFile: o,
                    externalLoadOrigin: i,
                    entryScrollIntent: s,
                    onExternalLoadConsumed: l,
                    onEntryScrollIntentConsumed: c,
                    loadButtonLabel: "Import Audio",
                    onDonorInputChange: re,
                    onEmbodyTimbre: ut,
                    exportMeta: {
                        name: B.name,
                        role: B.role,
                        bpm: B.bpm,
                        bars: B.bars,
                        guideSegments: B.guideSegments
                    },
                    timbreStatusLabel: Ct,
                    embodimentStatusLabel: St
                }), t === "forge3" ? u.jsxs("details", {
                    "data-forge-advanced": "v1",
                    className: "mx-3 mb-3 rounded border border-neutral-800 bg-neutral-950/50 text-xs text-neutral-300",
                    onToggle: Se => __setAdvancedOpen(Se.currentTarget.open),
                    children: [ u.jsx("summary", {
                        className: "cursor-pointer select-none px-3 py-2 text-neutral-400 hover:text-neutral-100",
                        children: "Additional Sound Paths & Diagnostics"
                    }), __advancedOpen && u.jsxs("div", {
                        className: "space-y-3 border-t border-neutral-800 p-3",
                        children: [ u.jsxs("label", {
                            className: "flex items-center gap-3 px-3 py-2 text-xs text-neutral-300",
                            children: [ "Sound Transfer", u.jsx("select", {
                                className: "rounded border border-neutral-700 bg-neutral-900 px-2 py-1",
                                value: J.donorUseMode,
                                disabled: J.busy !== "none",
                                onChange: Se => {
                                    xt.stop(), pe.getState().setCarrierDonorV2DonorUseMode(Se.target.value), M(null), 
                                    E(null);
                                },
                                children: Object.entries(XLe).map(([Se, be]) => u.jsx("option", {
                                    value: Se,
                                    children: be
                                }, Se))
                            }) ]
                        }), u.jsx(YGe, {
                            embodimentField: W,
                            embodimentStatus: V,
                            embodimentMessage: U,
                            embodimentLayersVisibility: H,
                            v2ValidationReport: A,
                            fieldMode: mt,
                            previewAvailable: It,
                            previewPhase: ee,
                            previewError: ie,
                            validationBusy: v,
                            onToggleLayer: at,
                            onPlayPreview: qe,
                            onRunValidation: Ge,
                            onDownloadValidationReport: Te,
                            onDownloadValidationBundle: lt,
                            onSendToMaterialspur: rt,
                            materialspurSendBusy: R,
                            materialspurEntryLabel: I ? I.name + " · " + I.bars + " bars" : null
                        }), a ]
                    }) ]
                }) : u.jsxs(u.Fragment, {
                    children: [ u.jsxs("label", {
                        className: "flex items-center gap-3 px-3 py-2 text-xs text-neutral-300",
                        children: [ "Sound Transfer", u.jsx("select", {
                            className: "rounded border border-neutral-700 bg-neutral-900 px-2 py-1",
                            value: J.donorUseMode,
                            disabled: J.busy !== "none",
                            onChange: Se => {
                                xt.stop(), pe.getState().setCarrierDonorV2DonorUseMode(Se.target.value), M(null), 
                                E(null);
                            },
                            children: Object.entries(XLe).map(([Se, be]) => u.jsx("option", {
                                value: Se,
                                children: be
                            }, Se))
                        }) ]
                    }), u.jsx(YGe, {
                        embodimentField: W,
                        embodimentStatus: V,
                        embodimentMessage: U,
                        embodimentLayersVisibility: H,
                        v2ValidationReport: A,
                        fieldMode: mt,
                        previewAvailable: It,
                        previewPhase: ee,
                        previewError: ie,
                        validationBusy: v,
                        onToggleLayer: at,
                        onPlayPreview: qe,
                        onRunValidation: Ge,
                        onDownloadValidationReport: Te,
                        onDownloadValidationBundle: lt,
                        onSendToMaterialspur: rt,
                        materialspurSendBusy: R,
                        materialspurEntryLabel: I ? I.name + " · " + I.bars + " bars" : null
                    }) ]
                }) ]
            }), u.jsx(QGe, {
                donorReady: ne,
                donorProofReady: !!Q.model?.bodyV3?.frames.length,
                donorSelected: Q.selected,
                donorPhase: ee,
                donorError: ie,
                donorProgress: de,
                donorPrepared: oe,
                onDonorPreview: () => le(),
                onOtherHearing: ce,
                donorProofActive: fe,
                donorSimilarity: Q.model?.bodyV3?.reconstructionSimilarity,
                donorEventCount: Q.model?.bodyV3?.detectedEventCount,
                donorRegisterPolicy: ge,
                donorRegisterAvailable: Ce,
                onDonorRegisterPolicy: Re,
                donorRenderMethod: se,
                donorHybridAvailable: xe,
                onDonorRenderMethod: Be,
                onDonorProof: Se => Ae(Se)
            }) ]
        })
    });
    return u.jsxs("section", {
        ref: d,
        tabIndex: 0,
        onFocus: () => b(!0),
        onBlur: Se => {
            d.current?.contains(Se.relatedTarget) || b(!1);
        },
        onMouseDown: () => b(!0),
        "data-wheel-allow-scroll": "true",
        "data-xensonar-scroll-island": "spectralforge-page",
        className: "space-y-4 outline-none",
        children: [ t === "forge3" ? null : u.jsx(JGe, {
            bars: B.bars,
            guideSegments: B.guideSegments,
            backLabel: Ve,
            showImageImport: t === "forge3",
            onBarsChange: Se => O({
                bars: Se
            }),
            onGuideSegmentsChange: Se => O({
                guideSegments: Se
            }),
            onBack: e,
            onOpenImageImport: () => Ie.current?.openImageImportDialog(),
            showStationNav: t === "forge3"
        }), u.jsxs("div", {
            "data-forge-sidebar-grid": t === "forge3" ? "true" : "legacy",
            "data-forge-sidebar-collapsed": t === "forge3" && __forgeSidebarCollapsed ? "true" : "false",
            style: t === "forge3" && __forgeSidebarCollapsed ? {
                gridTemplateColumns: "minmax(0,1fr) 44px"
            } : void 0,
            className: "grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem]",
            children: [ u.jsxs("div", {
                className: "space-y-3",
                children: [ u.jsx("div", {
                    ref: p,
                    "data-xensonar-spectralforge-workmode-header": "true",
                    className: "h-0",
                    "aria-hidden": "true"
                }), u.jsx("div", {
                    className: "space-y-3",
                    children: At
                }), t === "forge3" ? null : a ]
            }), u.jsx(tVe, {
                variant: t,
                sidebarTop: n,
                collapsed: t === "forge3" && __forgeSidebarCollapsed,
                onToggle: () => __setForgeSidebarCollapsed(Se => !Se),
                onOpenGestureProjectsInSpectralForge: Qe,
                onSendStampAsMelodicSample: dt,
                donorSelected: Q.selected,
                hearingPanel: t === "forge3" ? u.jsx(QGe, {
                    layout: "picker",
                    donorReady: ne,
                    donorProofReady: !!Q.model?.bodyV3?.frames.length,
                    donorSelected: Q.selected,
                    donorPhase: ee,
                    donorError: ie,
                    donorProgress: de,
                    donorPrepared: oe,
                    onDonorPreview: () => le(),
                    onOtherHearing: ce,
                    donorProofActive: fe,
                    donorSimilarity: Q.model?.bodyV3?.reconstructionSimilarity,
                    donorEventCount: Q.model?.bodyV3?.detectedEventCount,
                    donorRegisterPolicy: ge,
                    donorRegisterAvailable: Ce,
                    onDonorRegisterPolicy: Re,
                    donorRenderMethod: se,
                    donorHybridAvailable: xe,
                    onDonorRenderMethod: Be,
                    onDonorProof: Se => Ae(Se)
                }) : null
            }) ]
        }) ]
    });
}
let aP=null;function Zl(){const e=AB();return CR({...e,brush:{...e.brush,brushSize:7,intensity:.42,hardness:.46,grainSize:.56},hardBrush:{...e.hardBrush,brushSize:4,intensity:.52,hardness:1,grainSize:.55},stamp:{...e.stamp,brushSize:22,intensity:.62,hardness:.52,grainSize:.58},morph:{...e.morph,brushSize:80,intensity:.8,hardness:.46,grainSize:.6,morphMode:"push"},smudge:{...e.smudge,brushSize:14,intensity:.31,hardness:.54,grainSize:.6},sourceTrace:{...e.sourceTrace,brushSize:18,intensity:.4,hardness:.62,grainSize:.62},threshold:{...e.threshold,brushSize:14,intensity:.34,hardness:.74,grainSize:.56}})}function DWe(){return{version:"spectral-forge-project-v1",activeTool:"brush",toolProfiles:Zl(),spectralSnapshot:pe.getState().spectralData.cloneData(),materialExport:{name:"forge3-workshop",role:"loop",bpm:108,bars:4,beatsPerBar:4,guideSegments:4,guideMarkers:[.25,.5,.75],beatGuideAudible:!1,beatGuideVolume:.35,loopPreview:!0},viewPort:{offsetX:0,offsetY:0,zoomX:1,zoomY:1},synthMode:"granular",waveformMix:{sine:1,sawtooth:0,square:0,triangle:0},colorMapName:"magma",showGrainLayer:!0,logScale:!0,stampTransform:{scaleX:1,scaleY:1,rotation:0,flipX:!1,flipY:!1},sourceMeta:null}}function oz(){const e=pe.getState();return{snapshot:e.createProjectSnapshot(),sourceAsset:e.sourceAsset,sourceAssetContext:e.sourceAssetContext,sourcePreviewMode:e.sourcePreviewMode,stampData:e.stampData,stampPhase:e.stampPhase,stampSelStart:e.stampSelStart,lineStart:e.lineStart}}function NWe(e){pe.getState().loadProjectSnapshot(e.snapshot),pe.setState(n=>({toolProfiles:Zl(),toolSettings:qr(e.snapshot.activeTool,Zl()[e.snapshot.activeTool]),sourceAsset:e.sourceAsset,sourceAssetContext:e.sourceAssetContext??"forge3_reference",sourcePreviewMode:e.sourcePreviewMode,stampData:e.stampData,stampPhase:e.stampPhase,stampSelStart:e.stampSelStart,lineStart:e.lineStart,renderVersion:n.renderVersion+1,audioBufferDirty:!0}))}function a0(e,t){pe.setState(n=>{const r=CR({...Zl(),...t??{}});return{activeTool:e,toolProfiles:r,toolSettings:qr(e,r[e]),showGrainLayer:!0,synthMode:"granular",renderVersion:n.renderVersion+1,audioBufferDirty:!0}})}function ey(e){if(e==="forge1"){a0("brush");return}if(e==="steinmetz"){a0("hardBrush",{hardBrush:{...Zl().hardBrush,eraseMode:!0,brushSize:5,intensity:.58}});return}if(e==="knetmasse"){a0("morph",{morph:{...Zl().morph,brushSize:30,intensity:.3,hardness:.5,morphMode:"push"},smudge:{...Zl().smudge,brushSize:12,intensity:.28,hardness:.56}});return}if(e==="transplant"){a0("stamp",{stamp:{...Zl().stamp,brushSize:26,intensity:.66,hardness:.56}});return}a0("sourceTrace")}function iz(){__f333Stop();ys().clear();const e=DWe();e.spectralSnapshot.fill(0),pe.getState().loadProjectSnapshot(e),pe.setState(n=>({undoStack:[],redoStack:[],sourceAsset:null,sourcePreviewMode:"forge",stampData:null,stampPhase:"idle",stampSelStart:null,lineStart:null,toolProfiles:Zl(),toolSettings:qr("brush",Zl().brush),renderVersion:n.renderVersion+1,audioBufferDirty:!0}))}function OWe({onBack:e,externalAudioUploadFile:t=null,externalAudioUploadOrigin:n=null,entryScrollIntent:r=null,onExternalAudioUploadConsumed:a,onEntryScrollIntentConsumed:o}){const i=P.useRef(null),[__carrierEntry,__setCarrierEntry]=P.useState(()=>__f334HasPendingCarrier()),__externalEntry=P.useRef({file:t,intent:r});
 P.useEffect(()=>{const previous=__externalEntry.current;__externalEntry.current={file:t,intent:r};if((t!==previous.file||r!==previous.intent)&&(t||r))__setCarrierEntry(false)},[t,r]);
 return P.useLayoutEffect(()=>{i.current=oz();aP?NWe(aP):__f333ReadCarrier(pe.getState().spectralData)||(iz(),a0("brush"));
 const receive=()=>{if(__f334ReceiveCarrier())__setCarrierEntry(true)};
 window.addEventListener(__f334TransferEvent,receive);receive();
 return()=>{window.removeEventListener(__f334TransferEvent,receive);aP=oz();const s=i.current;if(!s)return;pe.getState().loadProjectSnapshot(s.snapshot),pe.setState(c=>({sourceAsset:s.sourceAsset,sourceAssetContext:s.sourceAssetContext??"forge3_reference",sourcePreviewMode:s.sourcePreviewMode,stampData:s.stampData,stampPhase:s.stampPhase,stampSelStart:s.stampSelStart,lineStart:s.lineStart,renderVersion:c.renderVersion+1,audioBufferDirty:!0}))}},[]),u.jsx(BWe,{onBack:e,variant:"forge3",forge3Lens:"hear",externalAudioUploadFile:__carrierEntry?null:t,externalAudioUploadOrigin:__carrierEntry?null:n,entryScrollIntent:__carrierEntry?null:r,onExternalAudioUploadConsumed:a,onEntryScrollIntentConsumed:o,footerContent:u.jsxs("div",{className:"space-y-3 rounded border border-neutral-800 bg-neutral-950/70 p-3 text-xs text-neutral-300",children:[u.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[u.jsx("span",{className:"uppercase tracking-[0.22em] text-neutral-500",children:"Quick Profiles"}),u.jsx("button",{type:"button",onClick:()=>ey("forge1"),className:"rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-900",children:"Direct Default"}),u.jsx("button",{type:"button",onClick:()=>ey("steinmetz"),className:"rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-900",children:"Stonecutter"}),u.jsx("button",{type:"button",onClick:()=>ey("knetmasse"),className:"rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-900",children:"Clay"}),u.jsx("button",{type:"button",onClick:()=>ey("transplant"),className:"rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-900",children:"Transplantation"}),u.jsx("button",{type:"button",onClick:()=>ey("trace"),className:"rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-900",children:"Trace Reading"}),u.jsx("button",{type:"button",onClick:iz,className:"rounded border border-red-900/70 px-3 py-1.5 text-red-200 hover:bg-red-950/30",children:"Neutral-Reset"})]}),u.jsxs("div",{className:"grid gap-3 md:grid-cols-2",children:[u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-950/60 p-3 leading-relaxed text-neutral-400",children:["Audio is imported below, roughly selected, finely set below, and previewed. Only after",u.jsx("span",{className:"text-neutral-200",children:"Apply"})," does the loop land above as material in the spectral canvas. Images can be loaded directly into the workspace through the new Import Image button in SpectralForge."]}),u.jsx("div",{className:"rounded border border-neutral-800 bg-neutral-950/60 p-3 leading-relaxed text-neutral-400",children:"SpectralForge is the body workbench for material you have already selected: morph, stamp, cut and read traces. For anyone extending it, the rule is simple: make the controls readable first, then bring the theory along."})]})]})})}