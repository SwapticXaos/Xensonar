/* MIX-DESK-01: XenSonar Mixing Desk under the Play Area.
 * Grows inward by composing XenSonar's native subsystems:
 * - __XenLiveTempo & __XenMaterialLivePhase (true WebAudio loop phase & shared Room-Bar Time Truth)
 * - __XenRackLiveBarEdits (live session bar-length overrides)
 * - __XenMaterialLayers & __XenMaterialVoiceMix (up to 6 parallel tracks + Granular/Vinyl Soft/Hard phase nudge)
 * - __XenMaterialStandalonePreview (native Cue / Pre-Listen in Crate & Library)
 * - __XenEQ, __XenEQMorph & __XenEQPanel (paintable 24-band Worklet Morph-EQ + Auto-Carve, resizable inline)
 * - __XenPan, __XenBassPitch, __XenRootFollowPitch, __XenAttackLanes (Root · Bass · Drums Bus Mixer)
 * - Native Audio Upload & Takt-Cut handoff (wG / fG / RG) directly from the Crate
 */
const __XenDjStage = (() => {
  const MAX_VOICE_KEY = 'xensonar.material.maxVoices.v1';
  const OPEN_KEY = 'xensonar.djStage.expanded.v1';
  const EQ_HEIGHT_KEY = 'xensonar.mixingDesk.eqHeight.v1';
  const DECK_COLORS = ['#f2b866', '#4fe3d2', '#a78bfa', '#6ee7b7', '#fb7185', '#38bdf8'];
  /* SONG-PART-TAGS-01/02: "Song · A1b" → name "Song" + part chip A1b. The colour code of the entry is the one its Quick Rack card
     shows (__xenQuickTint: a session colour wins, else the song-part colours): border = sub rubric, body = main rubric.
     No colour code → plain look. */
  function songPartView(name, id = null) {
    const tint = typeof __XenSongPartTint !== 'undefined' ? __XenSongPartTint.tintFor(name) : null;
    const label = __XenDjMixMath.compactTrackLabel(tint ? __XenSongPartTint.withTag(name, null) || name : name);
    let card = {};
    try {
      card = typeof __xenQuickTint === 'function' ? __xenQuickTint({ kind: 'material', id: id ?? name, name }) : (tint ? __XenSongPartTint.cardColors(name) : {});
    } catch { card = tint ? __XenSongPartTint.cardColors(name) : {}; }
    const has = !!card?.border;
    return {
      tint,
      label,
      style: has ? { '--sp-main': tint ? tint.main : card.border, '--sp-sub': card.border, '--sp-card': card.background || card.border } : undefined,
      cls: has ? ' has-song-part' : ''
    };
  }
  const listeners = new Set();

  let savedEqHeight = 164;
  try {
    const h = Number(localStorage.getItem(EQ_HEIGHT_KEY));
    if (Number.isFinite(h) && h >= 100 && h <= 380) savedEqHeight = Math.round(h);
  } catch {}

  let state = {
    expanded: false,
    activeTab: 'decks', // 'decks' | 'buses'
    monitorMode: 'spectrum', // 'spectrum' | 'time'
    crateOpen: true,
    crateTab: 'rack', // 'rack' | 'library'
    crateQuery: '',
    libHydrated: false,
    crossfade: 0.5,
    curve: 'smooth', // 'smooth' | 'linear' | 'cut'
    fadeUnit: 'bars', // 'bars' | 'cycle' | 'sec'
    quantizeFade: false, // arm auto-fade to next Room-Bar boundary
    armedFadeDir: null,
    linkEqMorph: false,
    autoFadeDir: null,
    buses: {}, // id -> 'A' | 'B' | 'THRU'
    baseVolumes: {}, // id -> user fader level
    muted: {}, // id -> boolean
    soloId: null,
    scenes: [null, null, null, null],
    activeScene: -1,
    openEqKey: null,
    openEqOwner: '',
    eqExpanded: false,
    eqCanvasHeight: savedEqHeight,
    statusMsg: ''
  };

  try {
    if (localStorage.getItem(OPEN_KEY) === '1') state.expanded = true;
  } catch {}

  let fadeRaf = 0;
  let fadeArmTimer = 0;
  let sceneRaf = 0;
  let statusTimer = 0;
  let mixFlushRaf = 0;
  let pendingMixCtxGetter = null;
  let activeMorphKeys = [];
  // DJ-OWN-01: last level the desk wrote per track. A different live level means someone else
  // (Quick Rack, a song recall) moved it: the desk adopts that as the new fader position instead of fighting it.
  const lastWritten = new Map();

  const emit = () => {
    for (const fn of listeners) fn();
  };

  const setState = (patch) => {
    state = { ...state, ...patch };
    emit();
  };

  function flashStatus(msg) {
    clearTimeout(statusTimer);
    setState({ statusMsg: msg });
    statusTimer = setTimeout(() => setState({ statusMsg: '' }), 3200);
  }

  function deckMultiplier(id, st = state) {
    return __XenDjMixMath.effectiveDeckMultiplier({
      bus: st.buses[id] || 'THRU',
      muted: !!st.muted[id],
      soloId: st.soloId,
      id,
      crossfade: st.crossfade,
      curve: st.curve
    });
  }

  function readLiveVolume(id, primaryId, params) {
    if (id === primaryId) return Math.max(0, Number(params?.materialLoopVolume) || 0);
    return __XenMaterialVoiceMix.get(id).volume;
  }

  function ensureBaseVolumes(ids, primaryId, params) {
    let changed = false;
    const nextBase = { ...state.baseVolumes };
    for (const id of ids) {
      if (typeof nextBase[id] !== 'number') {
        nextBase[id] = readLiveVolume(id, primaryId, params);
        lastWritten.set(id, nextBase[id] * deckMultiplier(id));
        changed = true;
      }
    }
    if (changed) state = { ...state, baseVolumes: nextBase };
  }

  function beginLinkedMorphGestures(ids) {
    endLinkedMorphGestures();
    if (!state.linkEqMorph || !ids?.length) return;
    const keys = [];
    for (const id of ids) {
      const bus = state.buses[id] || 'THRU';
      if (bus === 'A' || bus === 'B') {
        const key = __XenEQ.keyFor('material', id);
        __XenEQ.startGesture(key, 'morph');
        keys.push(key);
      }
    }
    activeMorphKeys = keys;
  }

  function endLinkedMorphGestures() {
    if (!activeMorphKeys.length) return;
    const keys = activeMorphKeys;
    activeMorphKeys = [];
    for (const key of keys) {
      try { __XenEQ.endGesture(key); } catch {}
    }
  }

  function applyLiveMix(ids, primaryId, params, update) {
    if (!ids.length) return;
    ensureBaseVolumes(ids, primaryId, params);
    for (const id of ids) {
      const base = typeof state.baseVolumes[id] === 'number'
        ? state.baseVolumes[id]
        : readLiveVolume(id, primaryId, params);
      const mult = deckMultiplier(id, state);
      const maxVol = id === primaryId ? 1 : 1.5;
      const eff = __XenDjMixMath.clamp(base * mult, 0, maxVol);
      lastWritten.set(id, Number(eff.toFixed(3)));
      if (id === primaryId) {
        if (typeof update === 'function' && Math.abs((Number(params?.materialLoopVolume) || 0) - eff) > 0.002) {
          update({ materialLoopVolume: Number(eff.toFixed(3)) });
        }
      } else {
        const cur = __XenMaterialVoiceMix.get(id).volume;
        if (Math.abs(cur - eff) > 0.002) {
          __XenMaterialVoiceMix.set(id, 'volume', Number(eff.toFixed(3)));
        }
      }
      if (state.linkEqMorph) {
        const bus = state.buses[id] || 'THRU';
        if (bus === 'A' || bus === 'B') {
          const targetMorph = bus === 'A' ? state.crossfade : (1 - state.crossfade);
          const key = __XenEQ.keyFor('material', id);
          if (Math.abs((__XenEQ.get(key).morph || 0) - targetMorph) > 0.003) {
            __XenEQ.set(key, { morph: targetMorph });
          }
        }
      }
    }
  }

  // Hot-path protection: coalesce high-rate pointermove slider/crossfader updates to 1 audio/React commit per frame.
  function scheduleLiveMix(getCtx) {
    pendingMixCtxGetter = getCtx;
    if (mixFlushRaf) return;
    mixFlushRaf = requestAnimationFrame(() => {
      mixFlushRaf = 0;
      const getter = pendingMixCtxGetter;
      pendingMixCtxGetter = null;
      const ctx = getter?.();
      if (ctx) applyLiveMix(ctx.ids, ctx.primaryId, ctx.params, ctx.update);
    });
  }

  function flushScheduledMix() {
    if (mixFlushRaf) {
      cancelAnimationFrame(mixFlushRaf);
      mixFlushRaf = 0;
    }
    const getter = pendingMixCtxGetter;
    pendingMixCtxGetter = null;
    const ctx = getter?.();
    if (ctx) applyLiveMix(ctx.ids, ctx.primaryId, ctx.params, ctx.update);
  }

  function stopAutoFade() {
    if (fadeArmTimer) {
      clearTimeout(fadeArmTimer);
      fadeArmTimer = 0;
    }
    if (fadeRaf) {
      cancelAnimationFrame(fadeRaf);
      fadeRaf = 0;
    }
    endLinkedMorphGestures();
    if (state.autoFadeDir || state.armedFadeDir) {
      setState({ autoFadeDir: null, armedFadeDir: null });
    }
  }

  function stopSceneMorph() {
    if (sceneRaf) {
      cancelAnimationFrame(sceneRaf);
      sceneRaf = 0;
    }
    endLinkedMorphGestures();
  }

  function currentGlobalRoomBar(fallbackBpm) {
    try {
      if (typeof __XenLiveTempo !== 'undefined' && typeof __XenLiveTempo.audioNow === 'function') {
        const now = __XenLiveTempo.audioNow();
        if (Number.isFinite(now) && now > 0) {
          if (__XenLiveTempo.mapped?.() && typeof __XenLiveTempo.beatAt === 'function') {
            return __XenLiveTempo.beatAt(now) / 4;
          }
          const liveBpm = __XenLiveTempo.bpmNow?.(fallbackBpm) || fallbackBpm || 120;
          return (now * liveBpm) / 240;
        }
      }
    } catch {}
    const bpm = __XenDjMixMath.clamp(fallbackBpm || 120, 30, 300);
    return (performance.now() / 1000) * (bpm / 240);
  }

  function runFadeNow(targetPos, durationMs, dirLabel, getCtx) {
    const startPos = state.crossfade;
    const startTime = performance.now();
    const ctx0 = getCtx();
    if (ctx0) beginLinkedMorphGestures(ctx0.ids);
    setState({ autoFadeDir: dirLabel, armedFadeDir: null, activeScene: -1 });
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / Math.max(120, durationMs));
      const eased = __XenDjMixMath.easeInOutSine(t);
      const nextPos = __XenDjMixMath.lerp(startPos, targetPos, eased);
      state = { ...state, crossfade: nextPos };
      const ctx = getCtx();
      if (ctx) applyLiveMix(ctx.ids, ctx.primaryId, ctx.params, ctx.update);
      emit();
      if (t < 1) {
        fadeRaf = requestAnimationFrame(step);
      } else {
        fadeRaf = 0;
        endLinkedMorphGestures();
        setState({ autoFadeDir: null });
      }
    };
    fadeRaf = requestAnimationFrame(step);
  }

  function startAutoFade(targetPos, durationMs, dirLabel, getCtx, liveBpm) {
    stopAutoFade();
    if (state.quantizeFade) {
      const globalBar = currentGlobalRoomBar(liveBpm);
      const delayMs = __XenDjMixMath.nextRoomBarDelayMs(globalBar, liveBpm);
      setState({ armedFadeDir: dirLabel, activeScene: -1 });
      flashStatus('Übergang auf nächsten Taktstart synchronisiert …');
      fadeArmTimer = setTimeout(() => {
        fadeArmTimer = 0;
        runFadeNow(targetPos, durationMs, dirLabel, getCtx);
      }, Math.max(20, delayMs));
      return;
    }
    runFadeNow(targetPos, durationMs, dirLabel, getCtx);
  }

  // Mix Scenes snapshot real painted 24-band __XenEQ curves (A, B, morph, enabled) + volumes + crossfade + buses
  function captureScene(slotIdx, deckIds, primaryId, params) {
    ensureBaseVolumes(deckIds, primaryId, params);
    const eqSnapshots = {};
    for (const id of deckIds) {
      const cfg = __XenEQ.get(__XenEQ.keyFor('material', id));
      eqSnapshots[id] = {
        a: [...(cfg.a || [])],
        b: [...(cfg.b || [])],
        morph: Number(cfg.morph) || 0,
        enabled: cfg.enabled !== false
      };
    }
    const snap = {
      crossfade: state.crossfade,
      curve: state.curve,
      buses: { ...state.buses },
      baseVolumes: { ...state.baseVolumes },
      muted: { ...state.muted },
      soloId: state.soloId,
      eqSnapshots
    };
    const nextScenes = [...state.scenes];
    nextScenes[slotIdx] = snap;
    setState({ scenes: nextScenes, activeScene: slotIdx });
    flashStatus('Scene S' + (slotIdx + 1) + ' gespeichert (' + deckIds.length + ' Spuren + 24B-EQ)');
  }

  function recallScene(slotIdx, getCtx) {
    const target = state.scenes[slotIdx];
    if (!target) return;
    stopAutoFade();
    stopSceneMorph();
    const startX = state.crossfade;
    const startVols = { ...state.baseVolumes };
    const ctx0 = getCtx();
    const ids = ctx0?.ids || [];

    const startEq = {};
    const gestureKeys = [];
    for (const id of ids) {
      if (target.eqSnapshots?.[id]) {
        const key = __XenEQ.keyFor('material', id);
        const cur = __XenEQ.get(key);
        startEq[id] = {
          a: [...(cur.a || [])],
          b: [...(cur.b || [])],
          morph: Number(cur.morph) || 0
        };
        __XenEQ.startGesture(key, 'morph');
        gestureKeys.push(key);
      }
    }
    activeMorphKeys = gestureKeys;

    state = {
      ...state,
      curve: target.curve || state.curve,
      buses: { ...state.buses, ...target.buses },
      muted: { ...state.muted, ...target.muted },
      soloId: target.soloId ?? null,
      activeScene: slotIdx
    };
    emit();

    const durationMs = 1400;
    const startTime = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = __XenDjMixMath.easeInOutSine(t);
      const nextX = __XenDjMixMath.lerp(startX, target.crossfade, eased);
      const nextVols = { ...state.baseVolumes };
      for (const id of ids) {
        if (typeof target.baseVolumes?.[id] === 'number') {
          const fromV = typeof startVols[id] === 'number' ? startVols[id] : target.baseVolumes[id];
          nextVols[id] = __XenDjMixMath.lerp(fromV, target.baseVolumes[id], eased);
        }
        const eqTo = target.eqSnapshots?.[id];
        const eqFrom = startEq[id];
        if (eqTo && eqFrom) {
          const key = __XenEQ.keyFor('material', id);
          __XenEQ.set(key, {
            a: __XenDjMixMath.lerpEqCurves(eqFrom.a, eqTo.a, eased),
            b: __XenDjMixMath.lerpEqCurves(eqFrom.b, eqTo.b, eased),
            morph: __XenDjMixMath.lerp(eqFrom.morph, eqTo.morph, eased),
            enabled: eqTo.enabled
          });
        }
      }
      state = { ...state, crossfade: nextX, baseVolumes: nextVols };
      const ctx = getCtx();
      if (ctx) applyLiveMix(ctx.ids, ctx.primaryId, ctx.params, ctx.update);
      emit();
      if (t < 1) {
        sceneRaf = requestAnimationFrame(step);
      } else {
        sceneRaf = 0;
        endLinkedMorphGestures();
      }
    };
    sceneRaf = requestAnimationFrame(step);
    flashStatus('Scene S' + (slotIdx + 1) + ' aktiv');
  }

  function curveArrayToSvgPath(arr, width, height, closeArea = false) {
    const midY = height * 0.5;
    const amp = height * 0.43;
    const pts = [];
    const samples = 64;
    for (let s = 0; s <= samples; s++) {
      const ratio = s / samples;
      const idx = Math.round(ratio * 359);
      const v = arr?.[idx] ?? 0;
      const x = (ratio * width).toFixed(1);
      const y = (midY - __XenDjMixMath.clamp(v, -1, 1) * amp).toFixed(1);
      pts.push((s === 0 ? 'M' : 'L') + x + ',' + y);
    }
    if (closeArea) {
      pts.push('L' + width.toFixed(1) + ',' + midY.toFixed(1));
      pts.push('L0,' + midY.toFixed(1) + ' Z');
    }
    return pts.join(' ');
  }

  function curveToSvgPath(cfg, width, height, closeArea = false) {
    const midY = height * 0.5;
    const amp = height * 0.43;
    const pts = [];
    const samples = 64;
    const morph = cfg.morph || 0;
    for (let s = 0; s <= samples; s++) {
      const ratio = s / samples;
      const idx = Math.round(ratio * 359);
      const a = cfg.a?.[idx] ?? 0;
      const b = cfg.b?.[idx] ?? 0;
      const v = cfg.enabled ? (a * (1 - morph) + b * morph) : 0;
      const x = (ratio * width).toFixed(1);
      const y = (midY - __XenDjMixMath.clamp(v, -1, 1) * amp).toFixed(1);
      pts.push((s === 0 ? 'M' : 'L') + x + ',' + y);
    }
    if (closeArea) {
      pts.push('L' + width.toFixed(1) + ',' + midY.toFixed(1));
      pts.push('L0,' + midY.toFixed(1) + ' Z');
    }
    return pts.join(' ');
  }

  // Adopt volume changes made outside the desk (see lastWritten). Returns a baseVolumes patch or null.
  function adoptExternalVolumes(ids, primaryId, params) {
    let patch = null;
    for (const id of ids) {
      const base = state.baseVolumes[id];
      const wrote = lastWritten.get(id);
      if (typeof base !== 'number' || wrote === undefined) continue;
      const live = readLiveVolume(id, primaryId, params);
      if (Math.abs(live - wrote) <= 0.004) continue;
      lastWritten.set(id, live);
      const mult = deckMultiplier(id);
      if (mult < 0.05) continue; // crossfader fully away: the fader position is not observable, keep it
      const next = __XenDjMixMath.clamp(live / mult, 0, id === primaryId ? 1 : 1.5);
      if (Math.abs(next - base) > 0.004) (patch ||= { ...state.baseVolumes })[id] = Number(next.toFixed(3));
    }
    return patch;
  }

  function setExpanded(next) {
    const val = !!next;
    if (val === state.expanded) return;
    try { localStorage.setItem(OPEN_KEY, val ? '1' : '0'); } catch {}
    if (val) {
      try {
        if (!localStorage.getItem(MAX_VOICE_KEY) && __XenMaterialLayers.maxVoices?.() < 6) {
          __XenMaterialLayers.setMaxVoices?.(6);
        }
      } catch {}
    } else {
      stopAutoFade();
      stopSceneMorph();
      flushScheduledMix();
    }
    setState({ expanded: val, openEqKey: val ? state.openEqKey : null });
    if (val && typeof document !== 'undefined') {
      requestAnimationFrame(() => {
        document.querySelector('.xen-dj-stage')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }

  function toggleExpanded() {
    setExpanded(!state.expanded);
  }

  function setDeckCap(n) {
    const clamped = Math.max(3, Math.min(6, Number(n) || 3));
    try { localStorage.setItem(MAX_VOICE_KEY, String(clamped)); } catch {}
    __XenMaterialLayers.setMaxVoices?.(clamped);
    flashStatus('Max. parallele Material-Spuren: ' + clamped);
  }

  function setEqCanvasHeight(px) {
    const clamped = Math.round(__XenDjMixMath.clamp(Number(px) || 164, 100, 380));
    try { localStorage.setItem(EQ_HEIGHT_KEY, String(clamped)); } catch {}
    setState({ eqCanvasHeight: clamped });
  }

  function formatCents(c) {
    const n = Number(c) || 0;
    if (Math.abs(n) < 0.5) return '0c';
    return (n > 0 ? '+' : '') + Math.round(n) + 'c';
  }

  function formatPan(p) {
    const n = Number(p) || 0;
    if (Math.abs(n) < 0.03) return 'C';
    return (n < 0 ? 'L' : 'R') + Math.round(Math.abs(n) * 100);
  }

  function formatPct(v) {
    return Math.round(Math.max(0, Number(v) || 0) * 100) + '%';
  }

  /* ── Custom Tactile SVG Rotary Knob (for PAN & PITCH) ── */
  function RotaryKnob({ value, min, max, defaultValue = 0, color = '#5ce0d2', small = false, ariaLabel, onChange, onDragStart, onDragEnd }) {
    const dragRef = P.useRef(null);
    const norm = __XenDjMixMath.clamp((value - min) / Math.max(1e-6, max - min), 0, 1);
    const zeroNorm = __XenDjMixMath.clamp((defaultValue - min) / Math.max(1e-6, max - min), 0, 1);
    const startAngle = -135;
    const endAngle = 135;
    const angle = startAngle + norm * (endAngle - startAngle);
    const zeroAngle = startAngle + zeroNorm * (endAngle - startAngle);

    const polar = (deg, r) => {
      const rad = ((deg - 90) * Math.PI) / 180;
      return [18 + r * Math.cos(rad), 18 + r * Math.sin(rad)];
    };

    const arcPath = (a0, a1, r) => {
      if (Math.abs(a1 - a0) < 0.5) return '';
      const lo = Math.min(a0, a1);
      const hi = Math.max(a0, a1);
      const [x0, y0] = polar(lo, r);
      const [x1, y1] = polar(hi, r);
      const large = hi - lo > 180 ? 1 : 0;
      return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
    };

    const [px, py] = polar(angle, 10.2);

    return u.jsx('button', {
      type: 'button',
      className: 'xen-dj-knob' + (small ? ' is-small' : ''),
      'aria-label': ariaLabel,
      title: ariaLabel + ' · Ziehen hoch/runter · Doppelklick Reset',
      onPointerDown: (e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        dragRef.current = { y: e.clientY, startVal: value };
        onDragStart?.();
      },
      onPointerMove: (e) => {
        if (!dragRef.current) return;
        const dy = dragRef.current.y - e.clientY;
        const sens = (max - min) / 120;
        const next = __XenDjMixMath.clamp(dragRef.current.startVal + dy * sens, min, max);
        onChange(next);
      },
      onPointerUp: (e) => {
        if (dragRef.current) {
          dragRef.current = null;
          e.currentTarget.releasePointerCapture?.(e.pointerId);
          onDragEnd?.();
        }
      },
      onPointerCancel: () => {
        if (dragRef.current) {
          dragRef.current = null;
          onDragEnd?.();
        }
      },
      onDoubleClick: () => onChange(defaultValue),
      children: u.jsxs('svg', {
        viewBox: '0 0 36 36',
        width: small ? 28 : 34,
        height: small ? 28 : 34,
        'aria-hidden': true,
        children: [
          u.jsx('path', { d: arcPath(-135, 135, 14.2), fill: 'none', stroke: 'rgba(130, 178, 186, 0.24)', strokeWidth: 2.3, strokeLinecap: 'round' }),
          arcPath(zeroAngle, angle, 14.2) && u.jsx('path', { d: arcPath(zeroAngle, angle, 14.2), fill: 'none', stroke: color, strokeWidth: 2.6, strokeLinecap: 'round' }),
          u.jsx('circle', { cx: 18, cy: 18, r: 10.6, fill: '#0b1620', stroke: 'rgba(204, 166, 114, 0.36)', strokeWidth: 1 }),
          u.jsx('circle', { cx: 18, cy: 18, r: 8.6, fill: '#12222f' }),
          u.jsx('line', { x1: 18, y1: 18, x2: px.toFixed(2), y2: py.toFixed(2), stroke: '#f5f0e2', strokeWidth: 2, strokeLinecap: 'round' }),
          u.jsx('circle', { cx: 18, cy: 18, r: 2, fill: color })
        ]
      })
    });
  }

  /* ── Custom Tactile Vertical Channel Fader ── */
  function VerticalFader({ value, effectiveValue, max = 1, ariaLabel, onChange, onReset }) {
    const trackRef = P.useRef(null);
    const dragging = P.useRef(false);

    const updateFromClientY = (clientY) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const ratio = 1 - __XenDjMixMath.clamp((clientY - rect.top) / Math.max(1, rect.height), 0, 1);
      onChange(Number((ratio * max).toFixed(3)));
    };

    const pct = __XenDjMixMath.clamp(value / max, 0, 1) * 100;
    const effPct = __XenDjMixMath.clamp(effectiveValue / max, 0, 1) * 100;

    return u.jsxs('div', {
      ref: trackRef,
      role: 'slider',
      tabIndex: 0,
      className: 'xen-dj-vfader',
      'aria-label': ariaLabel,
      'aria-valuemin': 0,
      'aria-valuemax': Math.round(max * 100),
      'aria-valuenow': Math.round(value * 100),
      title: ariaLabel + ' · Ziehen · Doppelklick Reset',
      onPointerDown: (e) => {
        e.preventDefault();
        dragging.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        updateFromClientY(e.clientY);
      },
      onPointerMove: (e) => {
        if (!dragging.current) return;
        updateFromClientY(e.clientY);
      },
      onPointerUp: (e) => {
        dragging.current = false;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        flushScheduledMix();
      },
      onPointerCancel: () => {
        dragging.current = false;
        flushScheduledMix();
      },
      onDoubleClick: () => onReset?.(),
      onKeyDown: (e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); onChange(__XenDjMixMath.clamp(value + 0.05, 0, max)); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); onChange(__XenDjMixMath.clamp(value - 0.05, 0, max)); }
      },
      children: [
        u.jsx('div', {
          className: 'xen-dj-vfader-ticks',
          'aria-hidden': true,
          children: [0, 1, 2, 3, 4, 5, 6].map(n => u.jsx('i', {}, 't' + n))
        }),
        u.jsx('div', {
          className: 'xen-dj-vfader-slot',
          'aria-hidden': true,
          children: u.jsx('div', {
            className: 'xen-dj-vfader-glow',
            style: { height: effPct.toFixed(1) + '%' }
          })
        }),
        u.jsx('div', {
          className: 'xen-dj-vfader-cap',
          'aria-hidden': true,
          style: { bottom: (8 + pct * 0.84).toFixed(1) + '%' }
        })
      ]
    });
  }

  /* ── Custom Machined Hardware Crossfader Plate ── */
  function MachinedCrossfader({ value, gains, onChange, onDragStart, onDragEnd }) {
    const plateRef = P.useRef(null);
    const dragging = P.useRef(false);

    const updateFromClientX = (clientX) => {
      const rect = plateRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pad = 18;
      const usable = Math.max(1, rect.width - pad * 2);
      const pos = __XenDjMixMath.clamp((clientX - (rect.left + pad)) / usable, 0, 1);
      onChange(pos);
    };

    const pct = __XenDjMixMath.clamp(value, 0, 1) * 100;

    return u.jsxs('div', {
      ref: plateRef,
      role: 'slider',
      tabIndex: 0,
      className: 'xen-dj-xfade-plate',
      'aria-label': 'Crossfader Bus A zu Bus B',
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': Math.round(pct),
      title: 'Crossfader A ↔ B · Ziehen · Doppelklick Mitte',
      onPointerDown: (e) => {
        e.preventDefault();
        dragging.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        onDragStart?.();
        updateFromClientX(e.clientX);
      },
      onPointerMove: (e) => {
        if (!dragging.current) return;
        updateFromClientX(e.clientX);
      },
      onPointerUp: (e) => {
        if (dragging.current) {
          dragging.current = false;
          e.currentTarget.releasePointerCapture?.(e.pointerId);
          onDragEnd?.();
        }
      },
      onPointerCancel: () => {
        if (dragging.current) {
          dragging.current = false;
          onDragEnd?.();
        }
      },
      onDoubleClick: () => onChange(0.5),
      onKeyDown: (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); onChange(__XenDjMixMath.clamp(value + 0.04, 0, 1)); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); onChange(__XenDjMixMath.clamp(value - 0.04, 0, 1)); }
      },
      children: [
        u.jsx('div', {
          className: 'xen-dj-xfade-scale',
          'aria-hidden': true,
          children: Array.from({ length: 11 }, (_, i) => u.jsx('i', { className: i === 5 ? 'is-center' : '' }, 's' + i))
        }),
        u.jsxs('div', {
          className: 'xen-dj-xfade-rail',
          'aria-hidden': true,
          children: [
            u.jsx('div', { className: 'xen-dj-xfade-energy-a', style: { width: Math.round(gains.A * 50) + '%' } }),
            u.jsx('div', { className: 'xen-dj-xfade-energy-b', style: { width: Math.round(gains.B * 50) + '%' } })
          ]
        }),
        u.jsx('div', {
          className: 'xen-dj-xfade-cap',
          'aria-hidden': true,
          style: { left: `calc(18px + (100% - 36px) * ${value.toFixed(4)})` }
        })
      ]
    });
  }

  /* ── Mini Crossfader Response Curve SVG ── */
  function CurveMiniSvg({ curve, pos }) {
    const ptsA = [];
    const ptsB = [];
    for (let i = 0; i <= 20; i++) {
      const x = i / 20;
      const g = __XenDjMixMath.crossfadeGains(x, curve);
      const px = (x * 46).toFixed(1);
      ptsA.push((i === 0 ? 'M' : 'L') + px + ',' + (14 - g.A * 12).toFixed(1));
      ptsB.push((i === 0 ? 'M' : 'L') + px + ',' + (14 - g.B * 12).toFixed(1));
    }
    const cx = (pos * 46).toFixed(1);
    return u.jsxs('svg', {
      width: 46,
      height: 15,
      viewBox: '0 0 46 15',
      'aria-hidden': true,
      children: [
        u.jsx('path', { d: ptsA.join(' '), fill: 'none', stroke: '#f2b866', strokeWidth: 1.3 }),
        u.jsx('path', { d: ptsB.join(' '), fill: 'none', stroke: '#4fe3d2', strokeWidth: 1.3 }),
        u.jsx('line', { x1: cx, y1: 0, x2: cx, y2: 15, stroke: '#ffffff', strokeWidth: 1.1, strokeOpacity: 0.8 })
      ]
    });
  }

  /* ── DJ-SEEK-01: Takte spulen (Loop-Balken & Takt-Schienen) · Segment-Sprung und Schubsen/Bremsen (Nudge) ──
   * Phase model: att = per-voice cyclic onset shift in beats (playhead = elapsed − att·beat); "ahead" = −att.
   * - Bar jump: lands in the clicked bar and KEEPS the position inside the bar → the loop stays on the room grid.
   * - Segment step («/»): exactly one segment of the loop's own subdivision, also a discrete jump.
   * - Jog (middle): continuous push / brake through the voice's own nudge physics (Granular/Vinyl · Soft/Hard),
   *   exactly like the Quick Rack nudge; the thumb springs back, the reached offset stays.
   * Jumps use the worklet's 'jump' interaction: one PCM move with a 12 ms de-click, no tempo/pitch excursion. */
  const NUDGE_MAX_BEATS = 64;

  // What the listener hears right now: while a soft nudge glides, the audio-owned motion lags the target.
  function nudgeView(id) {
    const att = __XenMaterialVoiceMix.get(id).att || 0;
    try {
      if (typeof __XenNudgeFeedback === 'undefined') return { att, motion: 'rest' };
      const m = __XenNudgeFeedback.get(id);
      if (!m?.live) return { att, motion: 'rest' };
      const clock = __XenNudgeFeedback.context(id);
      const s = typeof __xenNudgeSample === 'function' ? __xenNudgeSample(m, clock?.currentTime ?? m.audioTime) : m;
      const heard = Number.isFinite(s.phase) ? -s.phase : att;
      const motion = !m.active ? 'rest' : s.rate > 1.0005 ? 'push' : s.rate < 0.9995 ? 'brake' : 'rest';
      return { att: heard, motion };
    } catch {
      return { att, motion: 'rest' };
    }
  }

  function liveGrid(id, metric, att = 0) {
    const snap = typeof __XenMaterialLivePhase !== 'undefined'
      ? __XenMaterialLivePhase.read(id, att, false)
      : { state: 'idle', progress01: 0 };
    const grid = __XenDjMixMath.loopGrid({ loopBeats: snap.loopBeats, effectiveBars: metric.effectiveBars, segmentsPerBar: metric.segmentsPerBar });
    return { snap, grid };
  }

  const setPhase = (id, att, how) => __XenMaterialVoiceMix.set(id, 'att', __XenDjMixMath.clamp(att, -NUDGE_MAX_BEATS, NUDGE_MAX_BEATS), how);

  // targetBar: absolute bar index, or with { relative: true } a step of ±n bars from the current one.
  function jumpToBar(id, metric, targetBar, { relative = false } = {}) {
    const att = nudgeView(id).att;
    const { snap, grid } = liveGrid(id, metric, att);
    const playing = snap.state === 'playing';
    // Not playing: the next start begins in that bar (the start position follows the same offset).
    const progress01 = playing ? snap.progress01 : (((-att % grid.L) + grid.L) % grid.L) / grid.L;
    const fromBar = Math.min(grid.barCount - 1, Math.floor(progress01 * grid.eff + 1e-9));
    const toBar = relative ? (((fromBar + targetBar) % grid.barCount) + grid.barCount) % grid.barCount : targetBar;
    const plan = __XenDjMixMath.planBarJump({
      att, progress01, targetBar: toBar, loopBeats: grid.L, effectiveBars: grid.eff, segmentsPerBar: grid.segsPerBar
    });
    if (Math.abs(plan.deltaBeats) > 1e-9) setPhase(id, plan.att, 'jump');
    if (!playing) flashStatus('Spur startet in Takt ' + (plan.toBar + 1));
    return plan;
  }

  function stepSegment(id, metric, direction) {
    const att = nudgeView(id).att;
    const { grid } = liveGrid(id, metric, att);
    const plan = __XenDjMixMath.planSegmentStep({ att, direction, loopBeats: grid.L, effectiveBars: grid.eff, segmentsPerBar: grid.segsPerBar });
    setPhase(id, plan.att, 'jump');
  }

  // Pointer & keyboard handlers shared by the per-strip loop ruler and the "Takt & Phase" rails.
  function barSeekProps(id, metric, ownerName) {
    const eff = metric.effectiveBars;
    const ratioOf = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      return r.width > 0 ? (e.clientX - r.left) / r.width : 0;
    };
    const showGhost = (el, k) => {
      const g = el.querySelector('.xen-dj-bar-ghost');
      if (!g) return;
      if (k == null) { g.style.opacity = '0'; return; }
      g.style.left = ((k / eff) * 100).toFixed(3) + '%';
      g.style.width = ((Math.min(1, eff - k) / eff) * 100).toFixed(3) + '%';
      g.style.opacity = '1';
    };
    return {
      tabIndex: 0,
      'data-xen-bar-seek': id,
      'aria-label': ownerName + ': Takt spulen (Klick in einen Takt, ←/→ einen Takt)',
      onPointerMove: (e) => showGhost(e.currentTarget, __XenDjMixMath.barAtRatio(ratioOf(e), eff)),
      onPointerLeave: (e) => showGhost(e.currentTarget, null),
      onPointerDown: (e) => {
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();
        jumpToBar(id, metric, __XenDjMixMath.barAtRatio(ratioOf(e), eff));
      },
      onKeyDown: (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        jumpToBar(id, metric, e.key === 'ArrowRight' ? 1 : -1, { relative: true });
      }
    };
  }

  /* ── Bar & Segment Loop-Progress Ruler (true WebAudio phase) – click a bar to spool there ── */
  function LoopProgressRuler({ id, metric, accent, ownerName }) {
    const geom = __XenDjMixMath.buildBarRulerGeometry({
      effectiveBars: metric.effectiveBars,
      segmentsPerBar: metric.segmentsPerBar
    });
    return u.jsxs('div', {
      className: 'xen-dj-loop-ruler is-idle',
      'data-xen-loop-ruler': id,
      title: 'Loop ' + metric.label + (metric.hasLiveBarEdit ? ' (Bar-Edit aktiv)' : '') + ' · Klick in einen Takt: dorthin spulen, im Raster und im Tempo (←/→: ein Takt)',
      ...barSeekProps(id, metric, ownerName),
      children: [
        u.jsx('span', { className: 'xen-dj-bar-ghost', 'aria-hidden': true }),
        // Live filling progress wash (width driven purely by __XenMaterialLivePhase in rAF)
        u.jsx('div', {
          className: 'xen-dj-loop-fill',
          'data-xen-loop-fill': id,
          style: { background: accent }
        }),
        // Whole bar cells + delicate segment ticks
        geom.displayBars > 0 && u.jsx('div', {
          className: 'xen-dj-loop-bars',
          style: { width: (geom.wholeRatio * 100).toFixed(2) + '%' },
          'aria-hidden': true,
          children: Array.from({ length: geom.displayBars }, (_, bi) => u.jsx('div', {
            className: 'xen-dj-loop-bar',
            children: geom.showWholeSegTicks
              ? Array.from({ length: geom.segmentsPerBar - 1 }, (_, si) => u.jsx('i', {
                className: 'xen-dj-loop-seg',
                style: { left: (((si + 1) / geom.segmentsPerBar) * 100).toFixed(2) + '%' }
              }, 's' + si))
              : null
          }, 'b' + bi))
        }),
        // Fractional overhang tail (e.g. +2/4 or +2/7 or sub-bar 1/2B) with delicate segment ticks
        geom.fracRatio > 0 && u.jsx('div', {
          className: 'xen-dj-loop-frac',
          style: { width: (geom.fracRatio * 100).toFixed(2) + '%', borderColor: accent },
          'aria-hidden': true,
          children: geom.fracSegTicks > 1
            ? Array.from({ length: geom.fracSegTicks - 1 }, (_, si) => u.jsx('i', {
              className: 'xen-dj-loop-seg',
              style: { left: (((si + 1) / geom.fracSegTicks) * 100).toFixed(2) + '%' }
            }, 'fs' + si))
            : null
        }),
        // Bright playhead needle (visible only while actively playing)
        u.jsx('span', {
          className: 'xen-dj-loop-needle',
          'data-xen-loop-needle': id,
          style: { background: accent },
          'aria-hidden': true
        })
      ]
    });
  }

  /* ── Nudge: « / » ein Segment springen · Mitte ziehen = schubsen (→) / bremsen (←), federt zurück ── */
  function NudgeDeck({ id, att, metric, fullName }) {
    const dragRef = P.useRef(null);
    const { grid } = liveGrid(id, metric, 0);
    const FINE_SEGMENTS = 0.5; // a full throw of the jog = ± ½ segment
    const moveKnob = (el, v) => {
      const k = el && el.querySelector('b');
      if (k) k.style.left = (50 + v * 50).toFixed(1) + '%';
    };
    const finish = (e) => {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      dragRef.current = null;
      __XenMaterialVoiceMix.endGesture(id, 'drag');
      e.currentTarget.classList.remove('is-dragging');
      moveKnob(e.currentTarget, 0); // spring: the thumb returns, the reached phase offset stays
    };
    const offsetLabel = __XenDjMixMath.formatPhaseOffset(att, { loopBeats: grid.L, effectiveBars: grid.eff, segmentsPerBar: grid.segsPerBar });
    return u.jsxs('div', {
      className: 'xen-dj-nudge-box',
      children: [
        u.jsx('button', {
          type: 'button',
          'aria-label': fullName + ' ein Segment zurück',
          title: 'Ein Segment zurückspringen (1/' + grid.segsPerBar + ' Takt)',
          onClick: () => stepSegment(id, metric, -1),
          children: '«'
        }),
        u.jsxs('div', {
          className: 'xen-dj-nudge-jog',
          'data-xen-nudge-jog': id,
          'data-motion': 'rest',
          tabIndex: 0,
          'aria-label': fullName + ' schubsen / bremsen',
          'aria-valuetext': 'Versatz ' + offsetLabel,
          title: 'Φ ' + offsetLabel + ' = Versatz zum Raum-Raster (T Takt, S Segment)\nZiehen: → schubsen (vor), ← bremsen (zurück) · federt zurück, der Versatz bleibt\n←/→: fein · Doppelklick: zurück aufs Raster',
          onDoubleClick: () => setPhase(id, 0, 'jump'),
          onPointerDown: (e) => {
            if (e.button != null && e.button !== 0) return;
            const el = e.currentTarget;
            const r = el.getBoundingClientRect();
            el.setPointerCapture?.(e.pointerId);
            dragRef.current = {
              pointerId: e.pointerId,
              x0: e.clientX,
              half: Math.max(8, r.width / 2),
              base: __XenMaterialVoiceMix.get(id).att || 0,
              range: FINE_SEGMENTS * liveGrid(id, metric, 0).grid.segBeats
            };
            el.classList.add('is-dragging');
            __XenMaterialVoiceMix.beginGesture(id, 'drag');
          },
          onPointerMove: (e) => {
            const d = dragRef.current;
            if (!d || d.pointerId !== e.pointerId) return;
            const v = __XenDjMixMath.clamp((e.clientX - d.x0) / d.half, -1, 1);
            moveKnob(e.currentTarget, v);
            setPhase(id, d.base - v * d.range, 'drag'); // right = ahead = smaller att
          },
          onPointerUp: finish,
          onPointerCancel: finish,
          onLostPointerCapture: finish,
          onKeyDown: (e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            const step = grid.segBeats / 8;
            setPhase(id, (__XenMaterialVoiceMix.get(id).att || 0) + (e.key === 'ArrowRight' ? -step : step), 'click');
          },
          children: [
            u.jsx('i', { className: 'xen-dj-nudge-center', 'aria-hidden': true }),
            u.jsx('b', { 'aria-hidden': true }),
            u.jsx('span', { className: 'xen-dj-nudge-val', 'aria-hidden': true, children: 'Φ ' + offsetLabel })
          ]
        }),
        u.jsx('button', {
          type: 'button',
          'aria-label': fullName + ' ein Segment vor',
          title: 'Ein Segment vorspringen (1/' + grid.segsPerBar + ' Takt)',
          onClick: () => stepSegment(id, metric, 1),
          children: '»'
        })
      ]
    });
  }

  /* ── Main XenSonar Mixing Desk Component ── */
  function Stage({ params = {}, update = () => {}, bpm = 120 } = {}) {
    const dj = P.useSyncExternalStore(
      fn => (listeners.add(fn), () => listeners.delete(fn)),
      () => state,
      () => state
    );
    const layerIds = P.useSyncExternalStore(__XenMaterialLayers.subscribe, __XenMaterialLayers.snapshot, __XenMaterialLayers.snapshot);
    const primaryMuted = P.useSyncExternalStore(__XenMaterialPrimarySwitch.subscribe, __XenMaterialPrimarySwitch.snapshot, __XenMaterialPrimarySwitch.snapshot);
    const maxVoices = P.useSyncExternalStore(__XenMaterialLayers.subscribe, () => __XenMaterialLayers.maxVoices?.() ?? 3, () => 3);
    const quickState = P.useSyncExternalStore(__XenQuick.subscribe, __XenQuick.snapshot, __XenQuick.snapshot);
    const voiceState = P.useSyncExternalStore(__XenMaterialVoiceMix.subscribeUi, __XenMaterialVoiceMix.snapshot, __XenMaterialVoiceMix.snapshot);
    const panState = P.useSyncExternalStore(__XenPan.subscribe, __XenPan.snapshot, __XenPan.snapshot);
    const bassPitch = P.useSyncExternalStore(__XenBassPitch.subscribe, __XenBassPitch.snapshot, __XenBassPitch.snapshot);
    const rootPitch = P.useSyncExternalStore(__XenRootFollowPitch.subscribe, __XenRootFollowPitch.snapshot, __XenRootFollowPitch.snapshot);
    const attackState = P.useSyncExternalStore(__XenAttackLanes.subscribe, __XenAttackLanes.snapshot, __XenAttackLanes.snapshot);
    const eqRev = P.useSyncExternalStore(__XenEQ.subscribe, __XenEQ.revision, __XenEQ.revision);
    const barEditRev = P.useSyncExternalStore(
      fn => (typeof __XenRackLiveBarEdits !== 'undefined' ? __XenRackLiveBarEdits.subscribe(fn) : () => {}),
      () => (typeof __XenRackLiveBarEdits !== 'undefined' ? __XenRackLiveBarEdits.revision() : 0),
      () => 0
    );
    const previewId = P.useSyncExternalStore(
      fn => (typeof __XenMaterialStandalonePreview !== 'undefined' ? __XenMaterialStandalonePreview.subscribe(fn) : () => {}),
      () => (typeof __XenMaterialStandalonePreview !== 'undefined' ? __XenMaterialStandalonePreview.activeId() : null),
      () => null
    );
    const starterPhase = P.useSyncExternalStore(
      fn => (typeof __XenStarterMaterial !== 'undefined' ? __XenStarterMaterial.subscribe(fn) : () => {}),
      () => (typeof __XenStarterMaterial !== 'undefined' ? __XenStarterMaterial.snapshot().phase : 'ready'),
      () => 'ready'
    );
    void eqRev;
    void barEditRev;
    void starterPhase;

    const [libTick, setLibTick] = P.useState(0);
    const [crateDropActive, setCrateDropActive] = P.useState(false);
    const rootRef = P.useRef(null);
    const fileInputRef = P.useRef(null);
    const eqDrawerRef = P.useRef(null);
    const eqResizeRef = P.useRef(null);
    const launchQueueRef = P.useRef(Promise.resolve());

    // Auto-hydrate Material Library & Starter Materials immediately when Mixing Desk opens
    P.useEffect(() => {
      if (!dj.expanded) return;
      let alive = true;
      const tasks = [];
      if (typeof __ensureMaterialLibraryHydrated === 'function') {
        tasks.push(__ensureMaterialLibraryHydrated().catch(() => {}));
      }
      if (typeof __XenStarterMaterial !== 'undefined' && __XenStarterMaterial.ensure) {
        tasks.push(__XenStarterMaterial.ensure('material').catch(() => {}));
      }
      if (tasks.length) {
        Promise.allSettled(tasks).then(() => {
          if (alive) {
            state = { ...state, libHydrated: true };
            setLibTick(t => t + 1);
            emit();
          }
        });
      }
      return () => { alive = false; };
    }, [dj.expanded]);

    const latestCtx = P.useRef(null);
    const primaryId = __XenQuick.adapters.get('material')?.selected ?? params?.materialLoopId ?? null;
    const rawActive = [...new Set([primaryId, ...layerIds].filter(Boolean))].slice(0, maxVoices);
    const chrono = __XenMaterialLayers.oldestFirst(primaryId);
    const deckIds = [...chrono.filter(id => rawActive.includes(id)), ...rawActive.filter(id => !chrono.includes(id))].slice(0, maxVoices);

    latestCtx.current = { ids: deckIds, primaryId, params, update };

    P.useEffect(() => {
      if (!dj.expanded || !deckIds.length) return;
      const patch = adoptExternalVolumes(deckIds, primaryId, params);
      if (patch) setState({ baseVolumes: patch });
    }, [dj.expanded, voiceState, params?.materialLoopVolume, deckIds.join('|')]);

    P.useEffect(() => {
      if (!dj.expanded || !deckIds.length) return;
      ensureBaseVolumes(deckIds, primaryId, params);
      const anyAssigned = deckIds.some(id => dj.buses[id] === 'A' || dj.buses[id] === 'B');
      if (!anyAssigned && deckIds.length >= 2) {
        setState({ buses: { ...state.buses, [deckIds[0]]: 'A', [deckIds[1]]: 'B' } });
      }
    }, [dj.expanded, deckIds.join('|')]);

    const liveBpm = Math.round(__XenDjMixMath.clamp(
      (typeof __XenLiveTempo !== 'undefined' && __XenLiveTempo.bpmNow ? __XenLiveTempo.bpmNow(bpm || params?.gridTempoBpm || 120) : (bpm || params?.gridTempoBpm || 120)),
      30,
      300
    ));
    const timeMode = params?.materialLoopTimeMode || params?.materialTimeMode || 'normal';

    const adapterEntries = __XenQuick.adapters.get('material')?.entries ?? [];
    const libEntries = typeof bs === 'function' ? (bs()?.entries ?? []) : [];
    const rackItems = quickState.items.filter(row => row.kind === 'material');
    const rackIdSet = new Set(rackItems.map(r => r.id));

    void libTick;
    const libMap = new Map();
    for (const e of libEntries) if (e?.id) libMap.set(e.id, e);
    for (const e of adapterEntries) if (e?.id && !libMap.has(e.id)) libMap.set(e.id, e);
    for (const r of rackItems) if (r?.id && !libMap.has(r.id)) libMap.set(r.id, r);
    const allLibraryMaterials = [...libMap.values()];

    // Resolve XenSonar Time Truth for any material ID (combining library entry + live session bar edit + timeMode)
    const metricFor = (id) => {
      const row = libMap.get(id);
      const liveEdit = typeof __XenRackLiveBarEdits !== 'undefined' ? __XenRackLiveBarEdits.get(id) : null;
      const rawBars = liveEdit?.bars ?? row?.bars ?? 1;
      const segs = row?.guideSegments > 1 ? row.guideSegments : (row?.beatsPerBar || 4);
      const spec = __XenDjMixMath.formatMetricSpec({ bars: rawBars, segmentsPerBar: segs, timeMode });
      return { ...spec, bpm: row?.bpm ? Math.round(Number(row.bpm)) : null, hasLiveBarEdit: !!liveEdit };
    };

    const deckMetrics = deckIds.map(id => ({ id, ...metricFor(id) }));
    const polySummary = __XenDjMixMath.computePolymetricCycle(deckMetrics.map(d => d.effectiveBars));

    // Zero-React-re-render WebAudio phase loop: reads ONLY true __XenMaterialLivePhase!
    // Never moves when Live Room audio is OFF, AudioContext is suspended, or voice is muted.
    const phaseMetaRef = P.useRef({ deckIds: [], primaryId: null, primaryMuted: false, active: false });
    phaseMetaRef.current = {
      deckIds,
      primaryId,
      primaryMuted,
      active: dj.expanded && !!params?.materialLoopActive && deckIds.length > 0
    };

    P.useEffect(() => {
      if (!dj.expanded || !deckIds.length) return;
      let raf = 0;
      const applyPhaseDom = () => {
        const root = rootRef.current;
        const meta = phaseMetaRef.current;
        if (root) {
          for (const id of meta.deckIds) {
            const esc = CSS.escape(id);
            const isMutedVoice = !meta.active || (id === meta.primaryId && meta.primaryMuted);
            const view = nudgeView(id);
            const snap = (typeof __XenMaterialLivePhase !== 'undefined' && !isMutedVoice)
              ? __XenMaterialLivePhase.read(id, view.att, false)
              : { state: 'idle', progress01: 0 };
            const jog = root.querySelector('[data-xen-nudge-jog="' + esc + '"]');
            if (jog && jog.dataset.motion !== view.motion) jog.dataset.motion = view.motion;

            const ruler = root.querySelector('[data-xen-loop-ruler="' + esc + '"]');
            const fill = root.querySelector('[data-xen-loop-fill="' + esc + '"]');
            const needle = root.querySelector('[data-xen-loop-needle="' + esc + '"]');
            const railCursor = root.querySelector('[data-xen-rail-cursor="' + esc + '"]');
            const railFill = root.querySelector('[data-xen-rail-fill="' + esc + '"]');

            const pct = (snap.progress01 * 100).toFixed(2) + '%';
            if (ruler) {
              ruler.classList.toggle('is-playing', snap.state === 'playing');
              ruler.classList.toggle('is-armed', snap.state === 'armed');
              ruler.classList.toggle('is-idle', snap.state === 'idle');
            }
            if (fill) fill.style.width = snap.state === 'playing' ? pct : '0%';
            if (needle) needle.style.left = snap.state === 'playing' ? pct : '0%';
            if (railFill) railFill.style.width = snap.state === 'playing' ? pct : '0%';
            if (railCursor) {
              railCursor.style.left = snap.state === 'playing' ? pct : '0%';
              railCursor.style.opacity = snap.state === 'playing' ? '1' : '0';
            }
          }
        }
        raf = requestAnimationFrame(applyPhaseDom);
      };
      raf = requestAnimationFrame(applyPhaseDom);
      return () => cancelAnimationFrame(raf);
    }, [dj.expanded, deckIds.join('|'), dj.monitorMode]);

    if (!dj.expanded) return null;

    const labelFor = (id) => {
      const fromAdapter = adapterEntries.find(r => r.id === id);
      if (fromAdapter?.name) return fromAdapter.name;
      const fromRack = rackItems.find(r => r.id === id);
      if (fromRack) return typeof __xenMaterialDisplayName === 'function' ? __xenMaterialDisplayName(fromRack) : fromRack.name;
      return libMap.get(id)?.name ?? id;
    };

    const slotNumber = (id) => {
      const idx = rackItems.findIndex(r => r.id === id);
      return idx >= 0 ? idx + 1 : null;
    };

    const assignBus = (id, bus) => {
      state = { ...state, buses: { ...state.buses, [id]: bus }, activeScene: -1 };
      applyLiveMix(deckIds, primaryId, params, update);
      emit();
    };

    const handleDeckVolume = (id, val) => {
      const maxVol = id === primaryId ? 1 : 1.5;
      const v = __XenDjMixMath.clamp(val, 0, maxVol);
      state = { ...state, baseVolumes: { ...state.baseVolumes, [id]: v }, activeScene: -1 };
      emit();
      scheduleLiveMix(() => latestCtx.current);
    };

    const toggleMute = (id) => {
      state = { ...state, muted: { ...state.muted, [id]: !state.muted[id] }, activeScene: -1 };
      applyLiveMix(deckIds, primaryId, params, update);
      emit();
    };

    const toggleSolo = (id) => {
      state = { ...state, soloId: state.soloId === id ? null : id, activeScene: -1 };
      applyLiveMix(deckIds, primaryId, params, update);
      emit();
    };

    const applyBandPreset = (id, preset) => {
      const next = __XenDjMixMath.bandPresetValues(preset);
      const key = __XenEQ.keyFor('material', id);
      __XenEQ.set(key, { a: __XenDjMixMath.synthesize3BandCurve(next), morph: 0, enabled: true });
      setState({ activeScene: -1 });
    };

    const handleAutoCarve = () => {
      if (!deckIds.length) return;
      const plan = __XenDjMixMath.autoCarvePockets(deckIds);
      for (const id of deckIds) {
        const key = __XenEQ.keyFor('material', id);
        __XenEQ.set(key, { a: __XenDjMixMath.synthesize3BandCurve(plan[id]), morph: 0, enabled: true });
      }
      setState({ activeScene: -1 });
      flashStatus('Spektral-Taschen auf ' + deckIds.length + ' Spuren gemalt');
    };

    const handleFlattenAll = () => {
      if (!deckIds.length) return;
      const flat = __XenDjMixMath.synthesize3BandCurve({ low: 0, mid: 0, high: 0 });
      for (const id of deckIds) {
        const key = __XenEQ.keyFor('material', id);
        __XenEQ.set(key, { a: [...flat], b: [...flat], morph: 0, enabled: true });
      }
      setState({ activeScene: -1 });
      flashStatus('Alle 24-Band-EQs linear (0 dB)');
    };

    const ejectDeck = (id) => {
      const entry = rackItems.find(r => r.id === id) || { kind: 'material', id, name: labelFor(id) };
      if (id === primaryId) {
        __XenMaterialPrimarySwitch.setMuted(true);
        if (deckIds.length <= 1) update({ materialLoopActive: false });
      } else {
        void __xenQuickTileAction(entry, { shift: true, params, update });
      }
      if (state.openEqKey === __XenEQ.keyFor('material', id)) {
        setState({ openEqKey: null });
      }
    };

    const handleCrossfadeChange = (nextPos) => {
      stopAutoFade();
      stopSceneMorph();
      state = { ...state, crossfade: __XenDjMixMath.clamp(nextPos, 0, 1), activeScene: -1 };
      emit();
      scheduleLiveMix(() => latestCtx.current);
    };

    const handleSwapAB = () => {
      const nextBuses = { ...state.buses };
      for (const id of deckIds) {
        if (nextBuses[id] === 'A') nextBuses[id] = 'B';
        else if (nextBuses[id] === 'B') nextBuses[id] = 'A';
      }
      state = { ...state, buses: nextBuses, activeScene: -1 };
      applyLiveMix(deckIds, primaryId, params, update);
      emit();
      flashStatus('Bus A ↔ Bus B getauscht');
    };

    const handleAutoAssignAB = () => {
      const nextBuses = { ...state.buses };
      deckIds.forEach((id, idx) => { nextBuses[id] = idx % 2 === 0 ? 'A' : 'B'; });
      state = { ...state, buses: nextBuses, activeScene: -1 };
      applyLiveMix(deckIds, primaryId, params, update);
      emit();
      flashStatus('Spuren abwechselnd auf Bus A / B verteilt');
    };

    const openAudioCutForFile = (file) => {
      if (!file) return;
      try {
        if (typeof wG === 'function' && typeof fG === 'function' && typeof RG === 'function') {
          const req = wG(file, 'material-track-manager');
          fG();
          window.requestAnimationFrame(() => RG(req));
          flashStatus('„' + file.name + '“ an Takt- & Audio-Analyse übergeben');
          return;
        }
      } catch {}
      try {
        if (typeof iI === 'string') window.dispatchEvent(new Event(iI));
      } catch {}
    };

    const waitForAdapterEntry = async (id, timeoutMs = 4500) => {
      const hasEntry = () => !!(__XenQuick.adapters.get('material')?.entries || []).some(e => e.id === id);
      if (hasEntry()) return true;
      try {
        if (typeof __ensureMaterialLibraryHydrated === 'function') {
          await __ensureMaterialLibraryHydrated().catch(() => {});
        }
        if (typeof __XenStarterMaterial !== 'undefined' && __XenStarterMaterial.ensure) {
          await __XenStarterMaterial.ensure({ kind: 'material', id }).catch(() => {});
        }
      } catch {}
      if (hasEntry()) return true;
      return new Promise((resolve) => {
        const start = performance.now();
        const step = () => {
          if (hasEntry()) {
            resolve(true);
            return;
          }
          if (performance.now() - start >= timeoutMs) {
            resolve(false);
            return;
          }
          requestAnimationFrame(step);
        };
        step();
      });
    };

    const waitForPrimaryReady = (expectedId, timeoutMs = 1500) => new Promise((resolve) => {
      const start = performance.now();
      const step = () => {
        const ctx = latestCtx.current;
        const adapter = __XenQuick.adapters.get('material');
        if (ctx?.params?.materialLoopActive && adapter?.selected === expectedId) {
          resolve(ctx);
          return;
        }
        if (performance.now() - start >= timeoutMs) {
          resolve(latestCtx.current);
          return;
        }
        requestAnimationFrame(step);
      };
      step();
    });

    const launchMaterialNow = async (item, targetBus, { forceLayer = false, replacePrimary = false } = {}) => {
      const entry = { kind: 'material', id: item.id, name: item.name || item.id };
      const ready = await waitForAdapterEntry(item.id, 4500);
      if (!ready) {
        flashStatus('„' + __XenDjMixMath.compactTrackLabel(entry.name).primary + '“ wird noch vorbereitet …');
        return false;
      }
      const ctx = latestCtx.current || { ids: deckIds, primaryId, params, update };
      const liveParams = ctx.params || params;
      const liveUpdate = ctx.update || update;
      const adapter = __XenQuick.adapters.get('material');
      const livePrimary = adapter?.selected ?? ctx.primaryId ?? primaryId;
      const liveLayers = __XenMaterialLayers.snapshot();
      const liveIds = [...new Set([livePrimary, ...liveLayers].filter(Boolean))];
      const curRackIds = new Set(__XenQuick.snapshot().items.filter(r => r.kind === 'material').map(r => r.id));
      if (!curRackIds.has(item.id)) __XenQuick.add(entry);
      const busActive = !!liveParams?.materialLoopActive;
      const alreadyLive = liveIds.includes(item.id) && busActive;
      if (!alreadyLive || replacePrimary) {
        const useShift = !replacePrimary && (forceLayer || (busActive && liveIds.length > 0));
        const effParams = useShift ? { ...liveParams, materialLoopActive: true } : liveParams;
        const err = await __xenQuickTileAction(entry, { shift: useShift, params: effParams, update: liveUpdate });
        if (err && typeof err === 'string') {
          flashStatus(err);
          return false;
        }
        if (!useShift) {
          await waitForPrimaryReady(item.id, 1500);
        } else {
          await new Promise(r => requestAnimationFrame(r));
        }
      }
      if (targetBus === 'A' || targetBus === 'B') {
        state = { ...state, buses: { ...state.buses, [item.id]: targetBus } };
        emit();
        requestAnimationFrame(() => {
          const after = latestCtx.current;
          if (after) applyLiveMix(after.ids, after.primaryId, after.params, after.update);
        });
        flashStatus('„' + __XenDjMixMath.compactTrackLabel(entry.name).primary + '“ → Bus ' + targetBus);
      } else {
        flashStatus('„' + __XenDjMixMath.compactTrackLabel(entry.name).primary + '“ als Live-Spur geladen');
      }
      return true;
    };

    const launchMaterialToDeck = (item, targetBus, opts = {}) => {
      const next = launchQueueRef.current
        .catch(() => {})
        .then(() => launchMaterialNow(item, targetBus, opts));
      launchQueueRef.current = next;
      return next;
    };

    const handleQuickMixAB = async () => {
      const source = rackItems.length ? rackItems : allLibraryMaterials;
      const picked = source.slice(0, Math.min(2, maxVoices));
      if (!picked.length) {
        flashStatus('Keine Material-Tracks verfügbar');
        return;
      }
      const okA = await launchMaterialToDeck(picked[0], 'A', { replacePrimary: true });
      if (okA && picked[1]) {
        const okB = await launchMaterialToDeck(picked[1], 'B', { forceLayer: true });
        if (okB) flashStatus('Bus A + Bus B bereit');
      }
    };

    const addToQuickRackOnly = (item) => {
      const entry = { kind: 'material', id: item.id, name: item.name || item.id };
      __XenQuick.add(entry);
      flashStatus('„' + __XenDjMixMath.compactTrackLabel(entry.name).primary + '“ ins Quick Rack übernommen');
    };

    const toggleCuePreview = (item) => {
      if (typeof __XenMaterialStandalonePreview === 'undefined') return;
      void __XenMaterialStandalonePreview.toggleById(item.id).catch(() => {
        flashStatus('Vorhören für „' + __XenDjMixMath.compactTrackLabel(item.name).primary + '“ nicht verfügbar');
      });
    };

    const gains = __XenDjMixMath.crossfadeGains(dj.crossfade, dj.curve);
    const busACount = deckIds.filter(id => dj.buses[id] === 'A').length;
    const busBCount = deckIds.filter(id => dj.buses[id] === 'B').length;

    const busADeck = deckMetrics.find(d => dj.buses[d.id] === 'A') || deckMetrics[0];
    const busBDeck = deckMetrics.find(d => dj.buses[d.id] === 'B') || deckMetrics[1] || deckMetrics[0];
    const cycleA = busADeck?.effectiveBars || 4;
    const cycleB = busBDeck?.effectiveBars || 4;

    const fadeSpec = (targetBus, idx) => {
      if (dj.fadeUnit === 'sec') {
        const secs = [2, 4, 8][idx];
        return { ms: secs * 1000, label: secs + 's', tip: secs + ' Sekunden' };
      }
      if (dj.fadeUnit === 'cycle') {
        const mults = [0.5, 1, 2];
        const tags = ['½×', '1×', '2×'];
        const base = targetBus === 'A' ? cycleA : cycleB;
        const span = base * mults[idx];
        const rat = __XenDjMixMath.formatMetricSpec({ bars: span, segmentsPerBar: (targetBus === 'A' ? busADeck : busBDeck)?.segmentsPerBar || 4 });
        return { ms: __XenDjMixMath.barsToMs(span, liveBpm), label: tags[idx], tip: tags[idx] + ' Zyklus (' + rat.barText + ')' };
      }
      const bars = [2, 4, 8][idx];
      return { ms: __XenDjMixMath.barsToMs(bars, liveBpm), label: bars + 'B', tip: bars + ' Raumtakte' };
    };

    const q = dj.crateQuery.trim().toLowerCase();
    const crateSource = dj.crateTab === 'rack'
      ? rackItems.map(r => ({ id: r.id, name: typeof __xenMaterialDisplayName === 'function' ? __xenMaterialDisplayName(r) : r.name }))
      : allLibraryMaterials.map(r => ({ id: r.id, name: r.name || r.id }));
    const filteredCrate = q
      ? crateSource.filter(r => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q))
      : crateSource;

    const busSelectedTitle = (kind) => {
      const adapter = __XenQuick.adapters.get(kind);
      const id = adapter?.selected ?? quickState.selectedByKind?.[kind];
      return adapter?.entries?.find(e => e.id === id)?.name
        ?? quickState.items.find(row => row.kind === kind && row.id === id)?.name
        ?? (kind === 'bass' ? 'Bass' : kind === 'drum' ? 'Drums' : 'Root Follow Loop');
    };

    // Vertical bottom resize handle for the Paintable 24-Band Morph-EQ Drawer
    const startEqDrawerResize = (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      eqResizeRef.current = { startY: e.clientY, startHeight: dj.eqCanvasHeight, lastHeight: dj.eqCanvasHeight };
    };
    const moveEqDrawerResize = (e) => {
      const drag = eqResizeRef.current;
      if (!drag) return;
      // Moving down expands both A & B stacked canvases symmetrically (dy / 1.6 feels 1:1 natural)
      const next = Math.round(__XenDjMixMath.clamp(drag.startHeight + (e.clientY - drag.startY) * 0.65, 100, 380));
      drag.lastHeight = next;
      if (eqDrawerRef.current) {
        eqDrawerRef.current.style.setProperty('--xen-eq-canvas-height', next + 'px');
      }
    };
    const endEqDrawerResize = (e) => {
      const drag = eqResizeRef.current;
      if (!drag) return;
      eqResizeRef.current = null;
      try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch {}
      setEqCanvasHeight(drag.lastHeight);
    };

    /* ── Vertical Studio Channel Strip Renderer (Paintable Morph-EQ First, Zero 3-Band Knobs) ── */
    const renderStrip = (id, idx) => {
      const isPrimary = id === primaryId;
      const data = __XenMaterialVoiceMix.get(id, voiceState);
      const fullName = labelFor(id);
      const partView = songPartView(fullName, id);
      const parsedName = partView.label;
      const metric = deckMetrics[idx] || metricFor(id);
      const bus = dj.buses[id] || 'THRU';
      const baseVol = typeof dj.baseVolumes[id] === 'number' ? dj.baseVolumes[id] : readLiveVolume(id, primaryId, params);
      const mult = deckMultiplier(id, dj);
      const effVol = baseVol * mult;
      const maxVol = isPrimary ? 1 : 1.5;
      const eqKey = __XenEQ.keyFor('material', id);
      const eqCfg = __XenEQ.get(eqKey);
      const isMuted = !!dj.muted[id];
      const isSolo = dj.soloId === id;
      const accent = bus === 'A' ? '#f2b866' : bus === 'B' ? '#4fe3d2' : DECK_COLORS[idx % DECK_COLORS.length];
      const slot = slotNumber(id);
      const eqOpenHere = dj.openEqKey === eqKey;
      const curPan = isPrimary ? (panState.material ?? 0) : data.pan;

      return u.jsxs('article', {
        className: 'xen-dj-strip' + (bus === 'A' ? ' is-bus-a' : bus === 'B' ? ' is-bus-b' : '') + (isMuted || (dj.soloId && !isSolo) ? ' is-muted' : '') + partView.cls,
        'data-xen-dj-deck': id,
        style: partView.style,
        children: [
          // 1. Strip Header with XenSonar Time-Truth Metric Tag
          u.jsxs('div', {
            className: 'xen-dj-strip-head',
            children: [
              u.jsxs('div', {
                className: 'xen-dj-strip-ident',
                children: [
                  u.jsx('span', { className: 'xen-dj-strip-badge', children: slot != null ? '#' + slot : 'S' + (idx + 1) }),
                  u.jsxs('div', {
                    className: 'xen-dj-strip-name',
                    children: [
                      u.jsxs('strong', { title: fullName, children: [partView.tint ? u.jsx(__XenSongPartChip, { name: fullName, small: true }) : null, parsedName.primary] }),
                      u.jsx('span', {
                        className: metric.isFractional ? 'is-poly' : '',
                        title: 'Taktwahrheit: ' + metric.label + (metric.hasLiveBarEdit ? ' (Bar-Edit aktiv)' : ''),
                        children: metric.label + (metric.bpm ? ' · ' + metric.bpm + 'bpm' : '')
                      })
                    ]
                  })
                ]
              }),
              u.jsx('button', {
                type: 'button',
                className: 'xen-dj-eject-btn',
                title: 'Spur aus Live-Mix entfernen',
                'aria-label': fullName + ' aus Mix entfernen',
                onClick: () => ejectDeck(id),
                children: '×'
              })
            ]
          }),

          // 2. Dedicated Bar & Segment Loop-Progress Ruler (100% WebAudio Phase, never moves when audio is off!)
          u.jsx(LoopProgressRuler, { id, metric, accent, ownerName: fullName }),

          // 3. Bus Assign (A | THRU | B)
          u.jsxs('div', {
            className: 'xen-dj-bus-switch',
            role: 'group',
            'aria-label': fullName + ' Bus-Zuweisung',
            children: [
              u.jsx('button', { type: 'button', className: 'is-a' + (bus === 'A' ? ' is-active' : ''), onClick: () => assignBus(id, 'A'), children: 'A' }),
              u.jsx('button', { type: 'button', className: 'is-thru' + (bus === 'THRU' ? ' is-active' : ''), title: 'Direkt (unabhängig vom Crossfader)', onClick: () => assignBus(id, 'THRU'), children: 'THRU' }),
              u.jsx('button', { type: 'button', className: 'is-b' + (bus === 'B' ? ' is-active' : ''), onClick: () => assignBus(id, 'B'), children: 'B' })
            ]
          }),

          // 4. Paintable 24-Band Morph-EQ Card (Pure frequency-domain display: Curve A + B + Morphed Response)
          u.jsxs('div', {
            className: 'xen-dj-eq-card' + (eqOpenHere ? ' is-open' : ''),
            children: [
              u.jsxs('button', {
                type: 'button',
                className: 'xen-dj-eq-screen' + (eqOpenHere ? ' is-open' : ''),
                title: 'Malbaren 24-Band Morph-EQ für „' + fullName + '“ öffnen / schließen',
                onClick: () => setState({ openEqKey: eqOpenHere ? null : eqKey, openEqOwner: fullName }),
                children: [
                  u.jsxs('svg', {
                    viewBox: '0 0 180 54',
                    preserveAspectRatio: 'none',
                    'aria-hidden': true,
                    children: [
                      u.jsx('line', { x1: 0, y1: 27, x2: 180, y2: 27, stroke: 'rgba(182,226,184,0.22)', strokeDasharray: '2 3', strokeWidth: 1 }),
                      // Curve A (cyan dashed) & Curve B (violet dashed)
                      eqCfg.enabled && u.jsx('path', { d: curveArrayToSvgPath(eqCfg.a, 180, 54, false), fill: 'none', stroke: '#63ded9', strokeOpacity: 0.45, strokeDasharray: '3 3', strokeWidth: 1.1 }),
                      eqCfg.enabled && u.jsx('path', { d: curveArrayToSvgPath(eqCfg.b, 180, 54, false), fill: 'none', stroke: '#c5a2f2', strokeOpacity: 0.45, strokeDasharray: '3 3', strokeWidth: 1.1 }),
                      // Active Morphed Response
                      u.jsx('path', { d: curveToSvgPath(eqCfg, 180, 54, true), fill: accent, fillOpacity: 0.16 }),
                      u.jsx('path', { d: curveToSvgPath(eqCfg, 180, 54, false), fill: 'none', stroke: accent, strokeWidth: 2 })
                    ]
                  }),
                  u.jsx('span', { className: 'xen-dj-eq-screen-tag', children: eqOpenHere ? 'EQ aktiv ▲' : '24B Mal-EQ ▾' })
                ]
              }),
              // Direct Native __XenEQMorph Slider with clickable A / B snap endpoints
              u.jsxs('div', {
                className: 'xen-dj-morph-mini',
                children: [
                  u.jsxs('div', {
                    className: 'xen-dj-morph-mini-head',
                    children: [
                      u.jsx('button', { type: 'button', className: 'xen-dj-morph-end is-a', title: 'Auf EQ-Kurve A springen (0%)', onClick: () => __XenEQ.set(eqKey, { morph: 0 }), children: 'A' }),
                      u.jsx('span', { children: 'EQ Morph · ' + formatPct(eqCfg.morph || 0) }),
                      u.jsx('button', { type: 'button', className: 'xen-dj-morph-end is-b', title: 'Auf EQ-Kurve B springen (100%)', onClick: () => __XenEQ.set(eqKey, { morph: 1 }), children: 'B' })
                    ]
                  }),
                  u.jsx(__XenEQMorph, { sourceKey: eqKey, value: eqCfg.morph || 0 })
                ]
              }),
              // Instant Spectral Pocket Shortcuts (writes clean curves into __XenEQ A for fast carving)
              u.jsx('div', {
                className: 'xen-dj-band-presets',
                children: [
                  ['full', 'Flat', 'Linear 0 dB'],
                  ['low', 'Lo', 'Sub/Bass Pocket (20–250 Hz)'],
                  ['mid', 'Mid', 'Mitten Pocket (250 Hz–2.8 kHz)'],
                  ['air', 'Air', 'Höhen/Air Pocket (2.8–20 kHz)'],
                  ['scoop', 'Scp', 'Mitten-Tasche für Spielfläche']
                ].map(([key, txt, tip]) => u.jsx('button', {
                  type: 'button',
                  title: tip,
                  onClick: () => applyBandPreset(id, key),
                  children: txt
                }, key))
              })
            ]
          }),

          // 5. Vertical Channel Fader + Mute/Solo + Pan/Pitch + Native Granular/Vinyl Nudge
          u.jsxs('div', {
            className: 'xen-dj-fader-bay',
            children: [
              u.jsxs('div', {
                className: 'xen-dj-vfader-col',
                children: [
                  u.jsx(VerticalFader, {
                    value: baseVol,
                    effectiveValue: effVol,
                    max: maxVol,
                    ariaLabel: fullName + ' Channel Fader',
                    onChange: v => handleDeckVolume(id, v),
                    onReset: () => handleDeckVolume(id, isPrimary ? 0.8 : 1)
                  }),
                  u.jsx('span', { className: 'xen-dj-vfader-readout', title: 'Effektiver Pegel', children: formatPct(effVol) })
                ]
              }),
              u.jsxs('div', {
                className: 'xen-dj-side-bay',
                children: [
                  u.jsxs('div', {
                    className: 'xen-dj-ms-grid',
                    children: [
                      u.jsx('button', { type: 'button', className: 'xen-dj-pad-btn is-mute' + (isMuted ? ' is-active' : ''), 'aria-pressed': isMuted, title: 'Mute Spur', onClick: () => toggleMute(id), children: 'M' }),
                      u.jsx('button', { type: 'button', className: 'xen-dj-pad-btn is-solo' + (isSolo ? ' is-active' : ''), 'aria-pressed': isSolo, title: 'Solo Spur', onClick: () => toggleSolo(id), children: 'S' })
                    ]
                  }),
                  u.jsxs('div', {
                    className: 'xen-dj-rotary-pair',
                    children: [
                      u.jsxs('div', {
                        className: 'xen-dj-knob-col',
                        children: [
                          u.jsx('span', { className: 'xen-dj-knob-label', children: 'PAN' }),
                          u.jsx(RotaryKnob, {
                            value: curPan,
                            min: -1,
                            max: 1,
                            defaultValue: 0,
                            small: true,
                            color: accent,
                            ariaLabel: fullName + ' Pan',
                            onChange: v => {
                              if (isPrimary) __XenPan.set('material', v);
                              else __XenMaterialVoiceMix.set(id, 'pan', v);
                            }
                          }),
                          u.jsx('span', { className: 'xen-dj-knob-val', children: formatPan(curPan) })
                        ]
                      }),
                      u.jsxs('div', {
                        className: 'xen-dj-knob-col',
                        children: [
                          u.jsx('span', { className: 'xen-dj-knob-label', children: 'PITCH' }),
                          u.jsx(RotaryKnob, {
                            value: data.pitch,
                            min: -1200,
                            max: 1200,
                            defaultValue: 0,
                            small: true,
                            color: accent,
                            ariaLabel: fullName + ' Pitch',
                            onChange: v => __XenMaterialVoiceMix.set(id, 'pitch', Math.round(v))
                          }),
                          u.jsx('span', { className: 'xen-dj-knob-val', children: formatCents(data.pitch) })
                        ]
                      })
                    ]
                  }),
                  // Native XenSonar Worklet Phase Nudge + Granular/Vinyl & Soft/Hard physics toggles
                  u.jsxs('div', {
                    className: 'xen-dj-nudge-stack',
                    children: [
                      u.jsx(NudgeDeck, { id, att: data.att || 0, metric, fullName }),
                      u.jsxs('div', {
                        className: 'xen-dj-nudge-modes',
                        children: [
                          u.jsx('button', {
                            type: 'button',
                            className: data.nudgeMode === 'vinyl' ? 'is-vinyl' : '',
                            'aria-label': fullName + ' Nudge Modus',
                            title: 'Nudge-Physik umschalten: Granular (tonhöhenstabil) / Vinyl (Plattenteller)',
                            onClick: () => __XenMaterialVoiceMix.setMode(id, data.nudgeMode === 'vinyl' ? 'granular' : 'vinyl'),
                            children: data.nudgeMode === 'vinyl' ? 'Vinyl' : 'Granular'
                          }),
                          u.jsx('button', {
                            type: 'button',
                            className: data.nudgeFeel === 'hard' ? 'is-hard' : '',
                            'aria-label': fullName + ' Nudge Feel',
                            title: 'Nudge-Ansprache: Soft (sanftes C2-Gleiten) / Hard (direkt)',
                            onClick: () => __XenMaterialVoiceMix.setFeel(id, data.nudgeFeel === 'hard' ? 'soft' : 'hard'),
                            children: data.nudgeFeel === 'hard' ? 'Hard' : 'Soft'
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }, id);
    };

    /* ── Bus Mixer Strip Renderer (Root Follow, Bass, Drums) ── */
    const renderBusStrip = (kind, icon, title) => {
      const eqKey = __XenEQ.keyFor(kind, null);
      const eqCfg = __XenEQ.get(eqKey);
      const eqOpenHere = dj.openEqKey === eqKey;
      const vol = kind === 'bass'
        ? Math.max(0, Number(params?.bassVolume) || 0)
        : kind === 'drum'
          ? (Number.isFinite(Number(params?.drumVolume)) ? Math.max(0, Number(params.drumVolume)) : 0.5)
          : Math.max(0, Number(params?.rootFollowLoopVolume) || 0);
      const pan = kind === 'drum' ? (params?.drumPan ?? 0) : (panState[kind] ?? 0);
      const pitch = kind === 'bass' ? bassPitch : kind === 'rootFollow' ? rootPitch : null;
      const att = kind === 'bass' ? attackState.bass : kind === 'rootFollow' ? attackState.rootFollow : null;

      return u.jsxs('article', {
        className: 'xen-dj-strip',
        children: [
          u.jsxs('div', {
            className: 'xen-dj-strip-head',
            children: [
              u.jsxs('div', {
                className: 'xen-dj-strip-ident',
                children: [
                  u.jsx('span', { className: 'xen-dj-strip-badge', children: icon }),
                  u.jsxs('div', {
                    className: 'xen-dj-strip-name',
                    children: [
                      u.jsx('strong', { children: title }),
                      u.jsx('span', { children: busSelectedTitle(kind) })
                    ]
                  })
                ]
              })
            ]
          }),
          u.jsxs('div', {
            className: 'xen-dj-eq-card' + (eqOpenHere ? ' is-open' : ''),
            children: [
              u.jsxs('button', {
                type: 'button',
                className: 'xen-dj-eq-screen' + (eqOpenHere ? ' is-open' : ''),
                onClick: () => setState({ openEqKey: eqOpenHere ? null : eqKey, openEqOwner: title }),
                children: [
                  u.jsxs('svg', {
                    viewBox: '0 0 180 54',
                    preserveAspectRatio: 'none',
                    'aria-hidden': true,
                    children: [
                      u.jsx('line', { x1: 0, y1: 27, x2: 180, y2: 27, stroke: 'rgba(182,226,184,0.22)', strokeDasharray: '2 3', strokeWidth: 1 }),
                      eqCfg.enabled && u.jsx('path', { d: curveArrayToSvgPath(eqCfg.a, 180, 54, false), fill: 'none', stroke: '#63ded9', strokeOpacity: 0.45, strokeDasharray: '3 3', strokeWidth: 1.1 }),
                      eqCfg.enabled && u.jsx('path', { d: curveArrayToSvgPath(eqCfg.b, 180, 54, false), fill: 'none', stroke: '#c5a2f2', strokeOpacity: 0.45, strokeDasharray: '3 3', strokeWidth: 1.1 }),
                      u.jsx('path', { d: curveToSvgPath(eqCfg, 180, 54, true), fill: '#4fe3d2', fillOpacity: 0.16 }),
                      u.jsx('path', { d: curveToSvgPath(eqCfg, 180, 54, false), fill: 'none', stroke: '#4fe3d2', strokeWidth: 2 })
                    ]
                  }),
                  u.jsx('span', { className: 'xen-dj-eq-screen-tag', children: eqOpenHere ? 'EQ aktiv ▲' : '24B Mal-EQ ▾' })
                ]
              }),
              u.jsxs('div', {
                className: 'xen-dj-morph-mini',
                children: [
                  u.jsxs('div', {
                    className: 'xen-dj-morph-mini-head',
                    children: [
                      u.jsx('button', { type: 'button', className: 'xen-dj-morph-end is-a', onClick: () => __XenEQ.set(eqKey, { morph: 0 }), children: 'A' }),
                      u.jsx('span', { children: 'EQ Morph · ' + formatPct(eqCfg.morph || 0) }),
                      u.jsx('button', { type: 'button', className: 'xen-dj-morph-end is-b', onClick: () => __XenEQ.set(eqKey, { morph: 1 }), children: 'B' })
                    ]
                  }),
                  u.jsx(__XenEQMorph, { sourceKey: eqKey, value: eqCfg.morph || 0 })
                ]
              })
            ]
          }),
          u.jsxs('div', {
            className: 'xen-dj-fader-bay',
            children: [
              u.jsxs('div', {
                className: 'xen-dj-vfader-col',
                children: [
                  u.jsx(VerticalFader, {
                    value: vol,
                    effectiveValue: vol,
                    max: 1,
                    ariaLabel: title + ' Level',
                    onChange: v => update(kind === 'bass' ? { bassVolume: v } : kind === 'drum' ? { drumVolume: v } : { rootFollowLoopVolume: v }),
                    onReset: () => update(kind === 'bass' ? { bassVolume: 0.25 } : kind === 'drum' ? { drumVolume: 0.5 } : { rootFollowLoopVolume: 0.25 })
                  }),
                  u.jsx('span', { className: 'xen-dj-vfader-readout', children: formatPct(vol) })
                ]
              }),
              u.jsxs('div', {
                className: 'xen-dj-side-bay',
                children: [
                  u.jsxs('div', {
                    className: 'xen-dj-rotary-pair',
                    children: [
                      u.jsxs('div', {
                        className: 'xen-dj-knob-col',
                        children: [
                          u.jsx('span', { className: 'xen-dj-knob-label', children: 'PAN' }),
                          u.jsx(RotaryKnob, {
                            value: pan,
                            min: -1,
                            max: 1,
                            defaultValue: 0,
                            small: true,
                            ariaLabel: title + ' Pan',
                            onChange: v => {
                              if (kind === 'drum') update({ drumPan: v });
                              else __XenPan.set(kind, v);
                            }
                          }),
                          u.jsx('span', { className: 'xen-dj-knob-val', children: formatPan(pan) })
                        ]
                      }),
                      pitch !== null && u.jsxs('div', {
                        className: 'xen-dj-knob-col',
                        children: [
                          u.jsx('span', { className: 'xen-dj-knob-label', children: 'PITCH' }),
                          u.jsx(RotaryKnob, {
                            value: pitch,
                            min: -1200,
                            max: 1200,
                            defaultValue: 0,
                            small: true,
                            ariaLabel: title + ' Pitch',
                            onChange: v => {
                              if (kind === 'bass') __XenBassPitch.set(Math.round(v));
                              else __XenRootFollowPitch.set(Math.round(v));
                            }
                          }),
                          u.jsx('span', { className: 'xen-dj-knob-val', children: formatCents(pitch) })
                        ]
                      })
                    ]
                  }),
                  att !== null && u.jsxs('div', {
                    className: 'xen-dj-nudge-box',
                    children: [
                      u.jsx('button', { type: 'button', onClick: () => __XenAttackLanes.set(kind, __XenDjMixMath.clamp(att - 0.1, -2, 2)), children: '−' }),
                      u.jsx('span', { onClick: () => __XenAttackLanes.set(kind, 0), children: 'Att ' + Number(att || 0).toFixed(2) }),
                      u.jsx('button', { type: 'button', onClick: () => __XenAttackLanes.set(kind, __XenDjMixMath.clamp(att + 0.1, -2, 2)), children: '+' })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }, 'bus-' + kind);
    };

    const timeTruthSubtitle = polySummary.isPolymetric
      ? ('Polyrhythmus · Konvergenz ' + polySummary.convergenceText)
      : (deckIds.length > 0 ? ('Takt-Sync · ' + polySummary.convergenceText) : 'Taktwahrheit aktiv');

    // Quick-switcher list for the open Paintable 24-Band EQ Drawer
    const drawerSources = dj.activeTab === 'decks'
      ? deckIds.map((id, idx) => ({
        key: __XenEQ.keyFor('material', id),
        owner: labelFor(id),
        short: __XenDjMixMath.compactTrackLabel(labelFor(id)).primary,
        color: dj.buses[id] === 'A' ? '#f2b866' : dj.buses[id] === 'B' ? '#4fe3d2' : DECK_COLORS[idx % DECK_COLORS.length]
      }))
      : [
        { key: __XenEQ.keyFor('rootFollow', null), owner: 'Root Follow', short: 'Root Follow', color: '#a78bfa' },
        { key: __XenEQ.keyFor('bass', null), owner: 'Bass', short: 'Bass', color: '#f2b866' },
        { key: __XenEQ.keyFor('drum', null), owner: 'Drums', short: 'Drums', color: '#4fe3d2' }
      ];

    return u.jsxs('section', {
      ref: rootRef,
      className: 'xen-dj-stage',
      'aria-label': 'Mixing Desk',
      children: [
        // Hidden audio file picker wired straight into XenSonar's native Audio-Cut & Takt-Analyzer
        u.jsx('input', {
          ref: fileInputRef,
          type: 'file',
          accept: 'audio/*,.wav,.mp3,.flac,.ogg,.m4a,.aiff',
          style: { display: 'none' },
          onChange: (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) openAudioCutForFile(f);
          }
        }),

        // 1. Mahogany Burl-Wood Console Header
        u.jsxs('header', {
          className: 'xen-dj-header',
          children: [
            u.jsxs('div', {
              className: 'xen-dj-title-group',
              children: [
                u.jsx('span', {
                  className: 'xen-dj-badge-mark',
                  'aria-hidden': true,
                  children: u.jsxs('svg', {
                    width: 15,
                    height: 15,
                    viewBox: '0 0 16 16',
                    fill: 'none',
                    children: [
                      u.jsx('circle', { cx: 8, cy: 8, r: 6.1, stroke: 'currentColor', strokeWidth: 1.3 }),
                      u.jsx('circle', { cx: 8, cy: 8, r: 2, fill: 'currentColor' }),
                      u.jsx('path', { d: 'M8 1.5V4M8 12V14.5M1.5 8H4M12 8H14.5', stroke: 'currentColor', strokeWidth: 1.15, strokeLinecap: 'round' })
                    ]
                  })
                }),
                u.jsxs('div', {
                  className: 'xen-dj-title-text',
                  children: [
                    u.jsxs('div', {
                      className: 'xen-dj-title-row',
                      children: [
                        u.jsx('h3', { children: 'Mixing Desk' }),
                        u.jsx('span', { className: 'xen-dj-bpm-readout', children: liveBpm + ' BPM' }),
                        u.jsx('span', {
                          className: 'xen-dj-truth-pill' + (polySummary.isPolymetric ? ' is-poly' : ''),
                          title: 'Gemeinsame Raum-Taktwahrheit über alle parallelen Material-Spuren',
                          children: timeTruthSubtitle
                        })
                      ]
                    }),
                    u.jsx('span', {
                      children: dj.statusMsg || (deckIds.length + ' / ' + maxVoices + ' Spuren aktiv · Bus A (' + busACount + ') ↔ Bus B (' + busBCount + ')')
                    })
                  ]
                })
              ]
            }),
            u.jsxs('div', {
              className: 'xen-dj-header-controls',
              children: [
                u.jsxs('div', {
                  className: 'xen-dj-segmented',
                  role: 'tablist',
                  'aria-label': 'Mixing Desk Ansicht',
                  children: [
                    u.jsx('button', { type: 'button', role: 'tab', 'aria-selected': dj.activeTab === 'decks', className: dj.activeTab === 'decks' ? 'is-active' : '', onClick: () => setState({ activeTab: 'decks' }), children: 'Spuren (' + deckIds.length + ')' }),
                    u.jsx('button', { type: 'button', role: 'tab', 'aria-selected': dj.activeTab === 'buses', className: dj.activeTab === 'buses' ? 'is-active' : '', onClick: () => setState({ activeTab: 'buses' }), children: 'Root · Bass · Drums' })
                  ]
                }),
                u.jsxs('div', {
                  className: 'xen-dj-cap-group',
                  title: 'Maximale parallele Material-Spuren (Worklet-EQs nutzen Auto-Bypass & Sleep)',
                  children: [
                    u.jsx('span', { children: 'Spuren' }),
                    ...[3, 4, 6].map(cap => u.jsx('button', {
                      type: 'button',
                      className: maxVoices === cap ? 'is-active' : '',
                      onClick: () => setDeckCap(cap),
                      children: String(cap)
                    }, 'cap-' + cap))
                  ]
                }),
                u.jsx('button', {
                  type: 'button',
                  className: 'xen-dj-action-btn' + (dj.crateOpen ? ' is-active' : ''),
                  onClick: () => setState({ crateOpen: !dj.crateOpen }),
                  children: dj.crateOpen ? 'Crate & Lib ▴' : 'Crate & Lib ▾'
                }),
                u.jsxs('button', {
                  type: 'button',
                  className: 'xen-dj-action-btn is-gold',
                  title: 'Zurück ins rechte Quick Rack einklappen',
                  onClick: () => setExpanded(false),
                  children: [
                    u.jsx('svg', {
                      width: 10,
                      height: 10,
                      viewBox: '0 0 12 12',
                      fill: 'none',
                      'aria-hidden': true,
                      children: u.jsx('path', { d: 'M3 9L9 3M9 3H4.5M9 3V7.5', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' })
                    }),
                    u.jsx('span', { children: 'Rack' })
                  ]
                })
              ]
            })
          ]
        }),

        // 2. Unified Monitor Bay: Switch between Spektrum (24B EQ Overlay) and Takt & Phase (True WebAudio Phase Rails)
        dj.activeTab === 'decks' && deckIds.length > 0 && u.jsxs('div', {
          className: 'xen-dj-spectrum-bar',
          children: [
            u.jsxs('div', {
              className: 'xen-dj-spectrum-meta',
              children: [
                u.jsxs('div', {
                  className: 'xen-dj-segmented xen-dj-monitor-switch',
                  role: 'tablist',
                  'aria-label': 'Monitor Modus',
                  children: [
                    u.jsx('button', { type: 'button', role: 'tab', 'aria-selected': dj.monitorMode === 'spectrum', className: dj.monitorMode === 'spectrum' ? 'is-active' : '', onClick: () => setState({ monitorMode: 'spectrum' }), children: 'Spektrum' }),
                    u.jsx('button', { type: 'button', role: 'tab', 'aria-selected': dj.monitorMode === 'time', className: dj.monitorMode === 'time' ? 'is-active' : '', onClick: () => setState({ monitorMode: 'time' }), children: 'Takt & Phase' })
                  ]
                }),
                dj.monitorMode === 'spectrum'
                  ? u.jsxs('div', {
                    className: 'xen-dj-spectrum-tools',
                    children: [
                      u.jsx('button', { type: 'button', className: 'xen-dj-tool-chip is-gold', title: 'Weist allen aktiven Spuren automatisch getrennte Frequenzbereiche im 24B-EQ zu', onClick: handleAutoCarve, children: 'Auto-Carve' }),
                      u.jsx('button', { type: 'button', className: 'xen-dj-tool-chip', title: 'Alle aktiven 24B-EQs auf 0 dB zurücksetzen', onClick: handleFlattenAll, children: 'Flat All' })
                    ]
                  })
                  : u.jsx('span', {
                    className: 'xen-dj-time-conv-note',
                    children: polySummary.isPolymetric
                      ? 'Gemeinsame 1: alle ' + polySummary.convergenceText
                      : 'Takt-gleich · ' + polySummary.convergenceText
                  })
              ]
            }),

            // Center scope content
            dj.monitorMode === 'spectrum'
              ? u.jsxs('div', {
                className: 'xen-dj-spectrum-svg-wrap',
                children: [
                  u.jsxs('svg', {
                    viewBox: '0 0 600 50',
                    preserveAspectRatio: 'none',
                    'aria-hidden': true,
                    children: [
                      u.jsx('line', { x1: 0, y1: 25, x2: 600, y2: 25, stroke: 'rgba(182,226,184,0.2)', strokeDasharray: '3 4', strokeWidth: 1 }),
                      ...deckIds.map((id, idx) => {
                        const key = __XenEQ.keyFor('material', id);
                        const cfg = __XenEQ.get(key);
                        const bus = dj.buses[id] || 'THRU';
                        const stroke = bus === 'A' ? '#f2b866' : bus === 'B' ? '#4fe3d2' : DECK_COLORS[idx % DECK_COLORS.length];
                        const mult = deckMultiplier(id, dj);
                        return u.jsxs(P.Fragment, {
                          children: [
                            u.jsx('path', { d: curveToSvgPath(cfg, 600, 50, true), fill: stroke, fillOpacity: Math.max(0.04, mult * 0.13) }),
                            u.jsx('path', { d: curveToSvgPath(cfg, 600, 50, false), fill: 'none', stroke, strokeWidth: 1.8, strokeOpacity: Math.max(0.24, mult) })
                          ]
                        }, 'spec-' + id);
                      })
                    ]
                  }),
                  u.jsxs('div', {
                    className: 'xen-dj-spectrum-axis',
                    'aria-hidden': true,
                    children: [
                      u.jsx('span', { children: '20 Hz' }),
                      u.jsx('span', { children: '630 Hz' }),
                      u.jsx('span', { children: '20 kHz' })
                    ]
                  })
                ]
              })
              : u.jsx('div', {
                className: 'xen-dj-time-rails',
                'aria-label': 'Taktwahrheit und echte Audio-Zyklusphasen',
                children: deckMetrics.map((d, idx) => {
                  const bus = dj.buses[d.id] || 'THRU';
                  const color = bus === 'A' ? '#f2b866' : bus === 'B' ? '#4fe3d2' : DECK_COLORS[idx % DECK_COLORS.length];
                  const geom = __XenDjMixMath.buildBarRulerGeometry({ effectiveBars: d.effectiveBars, segmentsPerBar: d.segmentsPerBar });
                  const cycles = polySummary.cyclesPerDeck[idx] || 1;
                  return u.jsxs('div', {
                    className: 'xen-dj-time-rail-row',
                    children: [
                      u.jsx('span', { className: 'xen-dj-time-rail-name', style: { color }, children: __XenDjMixMath.compactTrackLabel(labelFor(d.id)).primary }),
                      u.jsxs('div', {
                        className: 'xen-dj-time-rail-track',
                        title: 'Zyklus: ' + d.label + ' · ' + cycles + '× bis Konvergenz (' + polySummary.convergenceText + ') · Klick in einen Takt: dorthin spulen',
                        ...barSeekProps(d.id, d, labelFor(d.id)),
                        children: [
                          u.jsx('span', { className: 'xen-dj-bar-ghost', 'aria-hidden': true }),
                          u.jsx('div', {
                            className: 'xen-dj-time-rail-fill',
                            'data-xen-rail-fill': d.id,
                            style: { background: color }
                          }),
                          geom.displayBars > 0 && u.jsx('div', {
                            className: 'xen-dj-time-rail-bars',
                            style: { width: (geom.wholeRatio * 100).toFixed(2) + '%' },
                            children: Array.from({ length: geom.displayBars }, (_, bi) => u.jsx('i', { className: 'xen-dj-time-bar-cell' }, 'b' + bi))
                          }),
                          geom.fracRatio > 0 && u.jsx('div', {
                            className: 'xen-dj-time-rail-frac',
                            style: { width: (geom.fracRatio * 100).toFixed(2) + '%', borderColor: color }
                          }),
                          u.jsx('span', {
                            className: 'xen-dj-time-rail-cursor',
                            'data-xen-rail-cursor': d.id,
                            style: { background: color, opacity: 0 }
                          })
                        ]
                      }),
                      u.jsx('span', { className: 'xen-dj-time-rail-spec', children: d.label + (polySummary.isPolymetric ? ' · ' + cycles + '×' : '') })
                    ]
                  }, 'tr-' + d.id);
                })
              }),

            // Right legend chips (click to open big Paintable 24-Band EQ for that track)
            u.jsx('div', {
              className: 'xen-dj-spectrum-legend',
              children: deckIds.map((id, idx) => {
                const bus = dj.buses[id] || 'THRU';
                const color = bus === 'A' ? '#f2b866' : bus === 'B' ? '#4fe3d2' : DECK_COLORS[idx % DECK_COLORS.length];
                const fullName = labelFor(id);
                const eqKey = __XenEQ.keyFor('material', id);
                return u.jsxs('button', {
                  type: 'button',
                  className: 'xen-dj-spectrum-chip' + (dj.openEqKey === eqKey ? ' is-open' : ''),
                  title: 'Malbaren 24-Band EQ für „' + fullName + '“ öffnen',
                  onClick: () => setState({ openEqKey: dj.openEqKey === eqKey ? null : eqKey, openEqOwner: fullName }),
                  children: [
                    u.jsx('i', { className: 'xen-dj-spectrum-dot', style: { background: color } }),
                    u.jsxs('span', { children: [songPartView(fullName, id).tint ? u.jsx(__XenSongPartChip, { name: fullName, small: true }) : null, songPartView(fullName, id).label.primary] })
                  ]
                }, 'leg-' + id);
              })
            })
          ]
        }),

        // 3. Smart Material Crate & Library Strip (with Drag & Drop Audio Import + Native Cueing!)
        dj.crateOpen && u.jsxs('div', {
          className: 'xen-dj-crate' + (crateDropActive ? ' is-drop-target' : ''),
          onDragOver: (e) => {
            if (e.dataTransfer?.types?.includes('Files')) {
              e.preventDefault();
              if (!crateDropActive) setCrateDropActive(true);
            }
          },
          onDragLeave: (e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setCrateDropActive(false);
          },
          onDrop: (e) => {
            const file = e.dataTransfer?.files?.[0];
            setCrateDropActive(false);
            if (file && (/^audio\//i.test(file.type) || /\.(wav|mp3|flac|ogg|m4a|aiff)$/i.test(file.name))) {
              e.preventDefault();
              openAudioCutForFile(file);
            }
          },
          children: [
            u.jsxs('div', {
              className: 'xen-dj-crate-bar',
              children: [
                u.jsxs('div', {
                  className: 'xen-dj-crate-left',
                  children: [
                    u.jsxs('div', {
                      className: 'xen-dj-segmented',
                      children: [
                        u.jsx('button', { type: 'button', className: dj.crateTab === 'rack' ? 'is-active' : '', onClick: () => setState({ crateTab: 'rack' }), children: 'Quick Rack (' + rackItems.length + ')' }),
                        u.jsx('button', { type: 'button', className: dj.crateTab === 'library' ? 'is-active' : '', onClick: () => setState({ crateTab: 'library' }), children: 'Material Library (' + allLibraryMaterials.length + ')' })
                      ]
                    }),
                    u.jsx('input', {
                      type: 'search',
                      className: 'xen-dj-crate-search',
                      placeholder: 'Tracks filtern oder Audio reinziehen …',
                      value: dj.crateQuery,
                      onChange: e => setState({ crateQuery: e.target.value })
                    })
                  ]
                }),
                u.jsxs('div', {
                  className: 'xen-dj-crate-left',
                  children: [
                    u.jsx('button', {
                      type: 'button',
                      className: 'xen-dj-tool-chip',
                      title: 'Eigene Audio-Datei laden & in XenSonars Takt-/Cut-Werkzeug analysieren (auch per Drag & Drop ins Crate)',
                      onClick: () => fileInputRef.current?.click(),
                      children: '+ Audio & Takt'
                    }),
                    u.jsx('button', {
                      type: 'button',
                      className: 'xen-dj-tool-chip',
                      title: 'XenSonars Material Track Manager öffnen (Umbenennen, Taktlänge, Sortieren)',
                      onClick: () => { try { if (typeof iI === 'string') window.dispatchEvent(new Event(iI)); } catch {} },
                      children: '⚙ Manager'
                    }),
                    (rackItems.length >= 1 || allLibraryMaterials.length >= 1) && u.jsx('button', {
                      type: 'button',
                      className: 'xen-dj-tool-chip is-gold',
                      title: 'Erste zwei Tracks direkt auf Bus A und Bus B laden',
                      onClick: () => void handleQuickMixAB(),
                      children: '⚡ Quick Mix A+B'
                    })
                  ]
                })
              ]
            }),
            filteredCrate.length === 0
              ? u.jsx('div', { className: 'xen-dj-crate-hint', children: 'Keine passenden Material-Tracks gefunden – ziehe eine Audio-Datei hierher oder klicke „+ Audio & Takt“.' })
              : u.jsx('div', {
                className: 'xen-dj-crate-grid',
                children: filteredCrate.map((item, idx) => {
                  const isLive = deckIds.includes(item.id) && !!params?.materialLoopActive;
                  const inRack = rackIdSet.has(item.id);
                  const slot = slotNumber(item.id);
                  const m = metricFor(item.id);
                  const partView = songPartView(item.name, item.id);
                  const parsed = partView.label;
                  const isCueing = previewId === item.id;
                  const canCue = typeof __XenMaterialStandalonePreview !== 'undefined' && __XenMaterialStandalonePreview.canPreview(item.id);
                  return u.jsxs('div', {
                    className: 'xen-dj-crate-item' + (isLive ? ' is-live' : '') + partView.cls,
                    style: partView.style,
                    children: [
                      u.jsx('span', { className: 'xen-dj-crate-slot', children: slot != null ? '#' + slot : 'L' + (idx + 1) }),
                      u.jsxs('div', {
                        className: 'xen-dj-crate-meta',
                        children: [
                          u.jsxs('span', { className: 'xen-dj-crate-name', title: item.name, children: [partView.tint ? u.jsx(__XenSongPartChip, { name: item.name, small: true }) : null, parsed.primary] }),
                          u.jsx('span', { className: 'xen-dj-crate-sub', children: (isLive ? '● LIVE' : (parsed.group || (inRack ? 'Quick Rack' : 'Library'))) + ' · ' + m.label + (m.bpm ? ' · ' + m.bpm + 'bpm' : '') })
                        ]
                      }),
                      u.jsxs('div', {
                        className: 'xen-dj-crate-actions',
                        children: [
                          canCue && u.jsx('button', {
                            type: 'button',
                            className: 'xen-dj-mini-btn is-cue' + (isCueing ? ' is-active' : ''),
                            'aria-pressed': isCueing,
                            'aria-label': item.name + ' vorhören',
                            title: isCueing ? 'Vorhören stoppen' : 'Vorhören (Standalone Cue)',
                            onClick: () => toggleCuePreview(item),
                            children: isCueing ? '■' : '🎧'
                          }),
                          dj.crateTab === 'library' && u.jsx('button', {
                            type: 'button',
                            className: 'xen-dj-mini-btn' + (inRack ? ' is-rack-added' : ''),
                            title: inRack ? 'Bereits im Quick Rack' : 'Ins Quick Rack übernehmen',
                            onClick: () => addToQuickRackOnly(item),
                            children: inRack ? '✓' : '+Rack'
                          }),
                          u.jsx('button', { type: 'button', className: 'xen-dj-mini-btn is-bus-a', title: 'Auf Bus A laden & starten', onClick: () => void launchMaterialToDeck(item, 'A'), children: '▶A' }),
                          u.jsx('button', { type: 'button', className: 'xen-dj-mini-btn is-bus-b', title: 'Auf Bus B laden & starten', onClick: () => void launchMaterialToDeck(item, 'B'), children: '▶B' }),
                          u.jsx('button', { type: 'button', className: 'xen-dj-mini-btn', title: 'Als parallele Spur layern', onClick: () => void launchMaterialToDeck(item, null, { forceLayer: !!params?.materialLoopActive }), children: '+' })
                        ]
                      })
                    ]
                  }, item.id);
                })
              })
          ]
        }),

        // 4. Main Pro-Mixer Channel Strips Surface + Bigger Resizable Paintable 24-Band EQ Drawer
        u.jsxs('div', {
          className: 'xen-dj-body',
          children: [
            dj.activeTab === 'decks'
              ? (deckIds.length === 0
                ? u.jsxs('div', {
                  className: 'xen-dj-empty-stage',
                  children: [
                    u.jsxs('div', {
                      className: 'xen-dj-empty-copy',
                      children: [
                        u.jsx('strong', { children: 'Mixing Desk bereit (bis zu ' + maxVoices + ' parallele Spuren auf gemeinsamer Taktwahrheit)' }),
                        u.jsx('span', { children: 'Lade Tracks aus Quick Rack oder Library auf Bus A / Bus B – oder ziehe eigene Audio-Dateien direkt ins Crate zur Takt-Analyse.' })
                      ]
                    }),
                    u.jsxs('div', {
                      className: 'xen-dj-empty-actions',
                      children: [
                        u.jsx('button', { type: 'button', className: 'xen-dj-action-btn is-gold', onClick: () => void handleQuickMixAB(), children: '⚡ Quick Mix A+B laden' }),
                        u.jsx('button', { type: 'button', className: 'xen-dj-action-btn', onClick: () => fileInputRef.current?.click(), children: '+ Audio & Takt' })
                      ]
                    })
                  ]
                })
                : (() => {
                  const nextCandidate = crateSource.find(c => !deckIds.includes(c.id)) || allLibraryMaterials.find(c => !deckIds.includes(c.id));
                  const showAddSlot = deckIds.length < maxVoices && !!nextCandidate;
                  return u.jsxs('div', {
                    className: 'xen-dj-strips-row' + (deckIds.length >= 5 ? ' is-dense' : ''),
                    children: [
                      ...deckIds.map(renderStrip),
                      showAddSlot && u.jsxs('div', {
                        className: 'xen-dj-add-slot',
                        children: [
                          u.jsx('span', { className: 'xen-dj-add-slot-cap', children: 'Spur ' + (deckIds.length + 1) + ' / ' + maxVoices }),
                          u.jsx('strong', { className: 'xen-dj-add-slot-name', title: nextCandidate.name, children: __XenDjMixMath.compactTrackLabel(nextCandidate.name).primary }),
                          u.jsx('span', { className: 'xen-dj-add-slot-sub', children: metricFor(nextCandidate.id).label }),
                          u.jsxs('div', {
                            className: 'xen-dj-add-slot-btns',
                            children: [
                              u.jsx('button', { type: 'button', className: 'xen-dj-mini-btn is-bus-a', onClick: () => void launchMaterialToDeck(nextCandidate, 'A', { forceLayer: !!params?.materialLoopActive }), children: '▶ Bus A' }),
                              u.jsx('button', { type: 'button', className: 'xen-dj-mini-btn is-bus-b', onClick: () => void launchMaterialToDeck(nextCandidate, 'B', { forceLayer: !!params?.materialLoopActive }), children: '▶ Bus B' }),
                              u.jsx('button', { type: 'button', className: 'xen-dj-mini-btn', onClick: () => void launchMaterialToDeck(nextCandidate, null, { forceLayer: !!params?.materialLoopActive }), children: '+ Thru' })
                            ]
                          })
                        ]
                      }, 'add-slot')
                    ]
                  });
                })())
              : u.jsx('div', {
                className: 'xen-dj-strips-row',
                children: [
                  renderBusStrip('rootFollow', '🎼', 'Root Follow'),
                  renderBusStrip('bass', '🎸', 'Bass'),
                  renderBusStrip('drum', '🥁', 'Drums')
                ]
              }),

            // Bigger, Vertically Resizable Native Paintable 24-Band Morph-EQ Drawer
            dj.openEqKey && u.jsxs('div', {
              ref: eqDrawerRef,
              className: 'xen-dj-eq-drawer',
              style: { '--xen-eq-canvas-height': dj.eqCanvasHeight + 'px' },
              children: [
                drawerSources.length > 1 && u.jsxs('div', {
                  className: 'xen-dj-eq-drawer-tabs',
                  role: 'tablist',
                  'aria-label': '24-Band EQ Spur wechseln',
                  children: [
                    u.jsx('span', { className: 'xen-dj-eq-drawer-label', children: '24B Mal-EQ Spur:' }),
                    ...drawerSources.map(src => u.jsxs('button', {
                      type: 'button',
                      role: 'tab',
                      'aria-selected': dj.openEqKey === src.key,
                      className: 'xen-dj-eq-drawer-tab' + (dj.openEqKey === src.key ? ' is-active' : ''),
                      onClick: () => setState({ openEqKey: src.key, openEqOwner: src.owner }),
                      children: [
                        u.jsx('i', { className: 'xen-dj-spectrum-dot', style: { background: src.color } }),
                        u.jsx('span', { children: src.short })
                      ]
                    }, src.key))
                  ]
                }),
                u.jsx(__XenEQPanel, {
                  sourceKey: dj.openEqKey,
                  owner: dj.openEqOwner || dj.openEqKey,
                  onClose: () => setState({ openEqKey: null }),
                  expanded: dj.eqExpanded,
                  setExpanded: v => setState({ eqExpanded: !!v })
                }, dj.openEqKey),
                u.jsxs('div', {
                  className: 'xen-dj-eq-resize-handle',
                  role: 'separator',
                  'aria-orientation': 'horizontal',
                  'aria-label': 'EQ-Fläche nach unten größer oder kleiner ziehen',
                  title: 'Greifen & nach unten ziehen für feineres EQ-Malen · Doppelklick Reset',
                  onPointerDown: startEqDrawerResize,
                  onPointerMove: moveEqDrawerResize,
                  onPointerUp: endEqDrawerResize,
                  onPointerCancel: endEqDrawerResize,
                  onDoubleClick: () => setEqCanvasHeight(164),
                  children: [
                    u.jsx('span', { className: 'xen-dj-eq-resize-grip', 'aria-hidden': true }),
                    u.jsx('span', { className: 'xen-dj-eq-resize-hint', children: '↕ Größe ziehen (' + dj.eqCanvasHeight + ' px)' })
                  ]
                })
              ]
            })
          ]
        }),

        // 5. Console Footer: Mix Scene Snapshots + Bar-Truth & Cycle-Aware Crossfader
        dj.activeTab === 'decks' && u.jsxs('footer', {
          className: 'xen-dj-console-footer',
          children: [
            u.jsxs('div', {
              className: 'xen-dj-scenes-row',
              children: [
                u.jsxs('div', {
                  className: 'xen-dj-scenes-group',
                  children: [
                    u.jsx('span', { className: 'xen-dj-scenes-label', children: 'Mix Scenes' }),
                    ...[0, 1, 2, 3].map(idx => {
                      const stored = !!dj.scenes[idx];
                      const active = dj.activeScene === idx;
                      return u.jsx('button', {
                        type: 'button',
                        className: 'xen-dj-scene-btn' + (stored ? ' is-stored' : '') + (active ? ' is-active' : ''),
                        title: stored ? 'Klick: sanft zu S' + (idx + 1) + ' morphen (inkl. 24B-EQ) · Shift-Klick: überschreiben' : 'Klick: aktuellen Mix inkl. 24B-EQ in Scene S' + (idx + 1) + ' speichern',
                        onClick: (e) => {
                          if (!stored || e.shiftKey) captureScene(idx, deckIds, primaryId, params);
                          else recallScene(idx, () => latestCtx.current);
                        },
                        children: stored ? ('● S' + (idx + 1)) : ('+ S' + (idx + 1))
                      }, 'sc-' + idx);
                    })
                  ]
                }),
                u.jsxs('div', {
                  className: 'xen-dj-scenes-group',
                  children: [
                    u.jsx('button', {
                      type: 'button',
                      className: 'xen-dj-tool-chip' + (dj.quantizeFade ? ' is-gold' : ''),
                      'aria-pressed': dj.quantizeFade,
                      title: 'Auto-Übergang erst exakt auf dem nächsten Raum-Taktstart beginnen',
                      onClick: () => setState({ quantizeFade: !dj.quantizeFade }),
                      children: dj.quantizeFade ? '⏱ Takt-Start: AN' : '⏱ Takt-Start'
                    }),
                    u.jsxs('div', {
                      className: 'xen-dj-segmented',
                      children: [
                        u.jsx('button', { type: 'button', className: dj.fadeUnit === 'bars' ? 'is-active' : '', onClick: () => setState({ fadeUnit: 'bars' }), children: 'Takte' }),
                        u.jsx('button', { type: 'button', className: dj.fadeUnit === 'cycle' ? 'is-active' : '', title: 'Übergangslänge relativ zum aktiven Loop-Zyklus (auch bei gebrochenen/polyrhythmischen Takten)', onClick: () => setState({ fadeUnit: 'cycle' }), children: 'Zyklus' }),
                        u.jsx('button', { type: 'button', className: dj.fadeUnit === 'sec' ? 'is-active' : '', onClick: () => setState({ fadeUnit: 'sec' }), children: 'Sek.' })
                      ]
                    })
                  ]
                })
              ]
            }),

            // Machined Hardware Crossfader Console
            u.jsxs('div', {
              className: 'xen-dj-crossfader-bar',
              children: [
                u.jsx('div', {
                  className: 'xen-dj-xfade-side',
                  children: [0, 1, 2].map(i => {
                    const spec = fadeSpec('A', i);
                    const dirKey = 'A' + i;
                    const active = dj.autoFadeDir === dirKey || dj.armedFadeDir === dirKey;
                    return u.jsx('button', {
                      type: 'button',
                      className: 'xen-dj-xfade-btn' + (active ? ' is-active' : ''),
                      title: 'Auf Bus A blenden (' + spec.tip + ')',
                      onClick: () => startAutoFade(0, spec.ms, dirKey, () => latestCtx.current, liveBpm),
                      children: '◀ ' + spec.label + (i === 0 ? ' A' : '')
                    }, dirKey);
                  })
                }),
                u.jsxs('div', {
                  className: 'xen-dj-xfade-center',
                  children: [
                    u.jsxs('div', {
                      className: 'xen-dj-xfade-header',
                      children: [
                        u.jsx('span', { className: 'is-a', children: 'BUS A · ' + Math.round(gains.A * 100) + '%' }),
                        u.jsxs('span', {
                          className: 'xen-dj-xfade-curve-pill',
                          children: [
                            u.jsx(CurveMiniSvg, { curve: dj.curve, pos: dj.crossfade }),
                            u.jsx('span', { children: dj.curve.toUpperCase() })
                          ]
                        }),
                        u.jsx('span', { className: 'is-b', children: Math.round(gains.B * 100) + '% · BUS B' })
                      ]
                    }),
                    u.jsx(MachinedCrossfader, {
                      value: dj.crossfade,
                      gains,
                      onDragStart: () => beginLinkedMorphGestures(deckIds),
                      onDragEnd: () => {
                        flushScheduledMix();
                        endLinkedMorphGestures();
                      },
                      onChange: handleCrossfadeChange
                    }),
                    u.jsxs('div', {
                      className: 'xen-dj-xfade-tools',
                      children: [
                        u.jsx('button', { type: 'button', className: 'xen-dj-xfade-btn', onClick: () => handleCrossfadeChange(0.5), children: 'Center' }),
                        u.jsx('button', { type: 'button', className: 'xen-dj-xfade-btn' + (dj.curve === 'smooth' ? ' is-active' : ''), onClick: () => { state = { ...state, curve: 'smooth' }; applyLiveMix(deckIds, primaryId, params, update); emit(); }, children: 'Smooth' }),
                        u.jsx('button', { type: 'button', className: 'xen-dj-xfade-btn' + (dj.curve === 'linear' ? ' is-active' : ''), onClick: () => { state = { ...state, curve: 'linear' }; applyLiveMix(deckIds, primaryId, params, update); emit(); }, children: 'Linear' }),
                        u.jsx('button', { type: 'button', className: 'xen-dj-xfade-btn' + (dj.curve === 'cut' ? ' is-active' : ''), onClick: () => { state = { ...state, curve: 'cut' }; applyLiveMix(deckIds, primaryId, params, update); emit(); }, children: 'Cut' }),
                        u.jsx('button', { type: 'button', className: 'xen-dj-xfade-btn', title: 'Spuren automatisch abwechselnd Bus A / B zuweisen', onClick: handleAutoAssignAB, children: 'Auto A/B' }),
                        u.jsx('button', { type: 'button', className: 'xen-dj-xfade-btn', title: 'Bus A und Bus B tauschen', onClick: handleSwapAB, children: 'Swap A↔B' }),
                        u.jsx('button', { type: 'button', className: 'xen-dj-xfade-btn' + (dj.linkEqMorph ? ' is-active' : ''), title: 'Crossfader steuert zusätzlich das EQ A↔B Morphing der Busse A und B', onClick: () => setState({ linkEqMorph: !dj.linkEqMorph }), children: 'Sync EQ Morph' })
                      ]
                    })
                  ]
                }),
                u.jsx('div', {
                  className: 'xen-dj-xfade-side is-right',
                  children: [0, 1, 2].map(i => {
                    const spec = fadeSpec('B', i);
                    const dirKey = 'B' + i;
                    const active = dj.autoFadeDir === dirKey || dj.armedFadeDir === dirKey;
                    return u.jsx('button', {
                      type: 'button',
                      className: 'xen-dj-xfade-btn' + (active ? ' is-active' : ''),
                      title: 'Auf Bus B blenden (' + spec.tip + ')',
                      onClick: () => startAutoFade(1, spec.ms, dirKey, () => latestCtx.current, liveBpm),
                      children: (i === 0 ? 'B ' : '') + spec.label + ' ▶'
                    }, dirKey);
                  })
                })
              ]
            })
          ]
        })
      ]
    });
  }

  const api = Object.freeze({
    snapshot: () => state,
    subscribe: fn => (listeners.add(fn), () => listeners.delete(fn)),
    isExpanded: () => state.expanded,
    setExpanded,
    toggleExpanded,
    setDeckCap,
    setEqCanvasHeight,
    Stage
  });

  if (typeof window !== 'undefined') {
    window.__XenDjStage = api;
    window.__XenMixingDesk = api;
  }
  return api;
})();
