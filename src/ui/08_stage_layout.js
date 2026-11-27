/* UI-LIQUID-01: Liquid stage layout for the Live Room.
 * - __XenStageLayout: one small persisted store for the user's screen split
 *     dock     'top' | 'side'   where the play surface lives while the Mixing Desk is open
 *     deskFrac 0.28 … 0.80      share of the width the Mixing Desk takes in side mode
 *     playH    {top, side}      CSS height of the playfield canvas per dock (0 = natural 1100:580)
 *     spacing  'abs' | 'log' | 'fret'  vertical grid distribution: absolute Hz (as before), logarithmic
 *                                (equal octaves) or guitar frets (linear in period = the mirror of 'abs':
 *                                intervals get narrower towards the top, like frets towards the body)
 * - __XenStageSplit: wraps the play surface (Oce) and the Mixing Desk. Opening the desk docks the
 *   playfield beside it (UI-LIQUID-02); "↑" or the ghost bring it back up until the desk is opened again. The tree is ALWAYS the same
 *   (play, vgrip, ghost, handle, desk); only data-dock and CSS change, so the canvas is never remounted.
 * - __XenGridSpacingControl: the switch in Controls & Settings.
 * The canvas keeps its logical 1100 × 580 space; stretching is a non-uniform CSS scale. Pointer maths
 * (j4) and the backing store (__xenLiveCanvasFit) scale x and y separately, so input stays exact. */
const __XenStageLayout = (() => {
  const KEY = 'xensonar.stageLayout.v1';
  const DESK_DEFAULT = 0.62;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const listeners = new Set();
  let state = { dock: 'top', deskFrac: DESK_DEFAULT, playH: { top: 0, side: 0 }, spacing: 'abs', sideTop: false, instrDown: false };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') {
      state = {
        dock: raw.dock === 'side' ? 'side' : 'top',
        deskFrac: Number.isFinite(raw.deskFrac) ? clamp(raw.deskFrac, 0.28, 0.8) : DESK_DEFAULT,
        playH: {
          top: Number.isFinite(raw.playH?.top) && raw.playH.top >= 140 ? clamp(raw.playH.top, 140, 1600) : 0,
          side: Number.isFinite(raw.playH?.side) && raw.playH.side >= 140 ? clamp(raw.playH.side, 140, 1600) : 0
        },
        spacing: raw.spacing === 'log' || raw.spacing === 'fret' ? raw.spacing : 'abs',
        sideTop: raw.sideTop === true,
        instrDown: raw.instrDown === true
      };
    }
  } catch {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
  const set = (patch, save = true) => {
    state = { ...state, ...patch };
    if (save) persist();
    for (const fn of listeners) fn();
  };
  return Object.freeze({
    DESK_DEFAULT,
    snapshot: () => state,
    subscribe: fn => (listeners.add(fn), () => listeners.delete(fn)),
    setDock: d => set({ dock: d === 'side' ? 'side' : 'top' }),
    // UI-SWAP-01: side mode row (desk | playfield) on top between the side rails, or below them at full width
    setSideTop: v => set({ sideTop: !!v }),
    // ... and, by choice, the Instruments rail goes down with the Quick Rack (more room on top)
    setInstrDown: v => set({ instrDown: !!v }),
    setDeskFrac: (f, save = true) => set({ deskFrac: clamp(Number(f) || DESK_DEFAULT, 0.28, 0.8) }, save),
    setPlayHeight: (dock, px, save = true) => {
      const v = Number(px) > 0 ? clamp(Math.round(px), 140, 1600) : 0;
      set({ playH: { ...state.playH, [dock === 'side' ? 'side' : 'top']: v } }, save);
    },
    commit: persist,
    setSpacing: s => set({ spacing: s === 'log' || s === 'fret' ? s : 'abs' }),
    spacingMode: () => state.spacing,
    isLogSpacing: () => state.spacing === 'log'
  });
})();
/* Read by Qa / Zs (y ↔ Hz of the Live Room grid). Cheap: one property read per call. */
function __xenGridSpacingMode() { return __XenStageLayout.spacingMode(); }
/* r = 0 (bottom, min) … 1 (top, max) → Hz, and back. abs: linear Hz · log: equal octaves · fret: linear period */
function __xenGridSpacingHz(r, min, max) {
  const m = __xenGridSpacingMode();
  if (m === 'log') return min * Math.pow(max / min, r);
  if (m === 'fret') return 1 / (1 / min - r * (1 / min - 1 / max));
  return min + r * (max - min);
}
function __xenGridSpacingR(hz, min, max) {
  const m = __xenGridSpacingMode();
  if (m === 'log') return hz > 0 ? Math.log(hz / min) / Math.log(max / min) : 0;
  if (m === 'fret') return hz > 0 ? (1 / min - 1 / hz) / (1 / min - 1 / max) : 0;
  return (hz - min) / (max - min);
}
if (typeof window !== 'undefined') {
  window.__XenStageLayout = __XenStageLayout;
  // read-only probe for tests/diagnostics: the Live Room y (0…580) ↔ Hz mapping in the current spacing
  window.__XenGridMapProbe = Object.freeze({ yToHz: y => Qa(y), hzToY: f => Zs(f), toLogical: (canvas, cx, cy) => j4({ currentTarget: canvas, clientX: cx, clientY: cy }, vr, ir) });
}

function __xenDragPointer(ev, onMove, onEnd) {
  ev.preventDefault();
  const el = ev.currentTarget;
  try { el.setPointerCapture?.(ev.pointerId); } catch {}
  el.classList.add('is-dragging');
  document.documentElement.classList.add('xen-split-dragging');
  const move = e => onMove(e);
  const up = () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    el.classList.remove('is-dragging');
    document.documentElement.classList.remove('xen-split-dragging');
    onEnd?.();
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}

function __XenStageSplit({ stage, desk }) {
  const lay = P.useSyncExternalStore(__XenStageLayout.subscribe, __XenStageLayout.snapshot, __XenStageLayout.snapshot);
  const djApi = typeof window !== 'undefined' ? window.__XenDjStage : null;
  const deskOpen = P.useSyncExternalStore(
    fn => (djApi ? djApi.subscribe(fn) : () => {}),
    () => !!djApi?.isExpanded(),
    () => false
  );
  const open = deskOpen && !!desk;
  // UI-LIQUID-02: opening the Mixing Desk docks the playfield beside it right away (no extra click).
  // "↑" / the ghost still bring it back up for this session; the next opening docks it again.
  P.useLayoutEffect(() => {
    if (open && __XenStageLayout.snapshot().dock !== 'side') __XenStageLayout.setDock('side');
  }, [open]);
  const dock = open && lay.dock === 'side' ? 'side' : 'top';
  const rootRef = P.useRef(null);
  const ghostRef = P.useRef(null);
  const playH = lay.playH[dock] || 0;
  const sideTopRef = P.useRef(false);
  sideTopRef.current = dock === 'side' && !!lay.sideTop;
  const instrDownRef = P.useRef(false);
  instrDownRef.current = !!lay.instrDown;

  // Side mode: the inactive ghost keeps the area between the two (absolute) side rails, so the
  // full-width desk row starts below them. Measured, never per frame.
  P.useLayoutEffect(() => {
    if (dock !== 'side') return;
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const g = ghostRef.current;
      if (!g) return;
      const top = g.getBoundingClientRect().top;
      // UI-SWAP-01: swapped = the desk | playfield row on top, right of the Instruments rail (which stays), up to the right
      // edge; the Quick Rack moves below it, next to the placeholder (absolute instead of fixed).
      const html = document.documentElement, wide = window.innerWidth >= 1024, swapped = !!sideTopRef.current && wide;
      const instrDown = swapped && !!instrDownRef.current;
      const RAILS = '.xen-quick-dock,.xen-quick-collection.is-right-docked' + (instrDown ? ',.xen-performance' : '');
      html.classList.toggle('xen-split-swapped', swapped);
      html.classList.toggle('xen-split-instr-down', instrDown);
      if (!instrDown) for (const el of document.querySelectorAll('.xen-performance')) { el.style.removeProperty('--xen-rail-top'); el.style.removeProperty('--xen-rail-left'); }
      let railH = 0, bottom = 0;
      if (wide) {
        const vw = html.clientWidth || window.innerWidth;
        const inset = parseFloat(getComputedStyle(html).getPropertyValue('--xen-side-rail-inset')) || 12;
        const gTop = top + window.scrollY;
        for (const el of document.querySelectorAll(RAILS)) {
          if (swapped) {
            const op = el.offsetParent, or = op ? op.getBoundingClientRect() : { top: -window.scrollY, left: -window.scrollX };
            const w = el.getBoundingClientRect().width;
            el.style.setProperty('--xen-rail-top', Math.round(gTop - (or.top + window.scrollY) + 6) + 'px');
            el.style.setProperty('--xen-rail-left', Math.round((el.matches('.xen-performance') ? inset : vw - inset - w) - or.left) + 'px');
          } else { el.style.removeProperty('--xen-rail-top'); el.style.removeProperty('--xen-rail-left'); }
          const r = el.getBoundingClientRect();
          if (r.height > 0) { railH = Math.max(railH, r.height); bottom = Math.max(bottom, r.bottom); }
        }
      }
      if (!swapped) {
        for (const el of document.querySelectorAll('.xen-performance')) { const r = el.getBoundingClientRect(); if (r.height > 0) bottom = Math.max(bottom, r.bottom); }
        root.style.removeProperty('--xen-swap-ml'); root.style.removeProperty('--xen-swap-w');
      } else {
        const perf = document.querySelector('.xen-performance'), pr = perf?.getBoundingClientRect(), parent = root.parentElement;
        const vw = html.clientWidth || window.innerWidth;
        if (pr && pr.width > 0 && parent && !instrDown) {
          const pl = parent.getBoundingClientRect().left, left = pr.right + 10;
          root.style.setProperty('--xen-swap-ml', Math.round(left - pl) + 'px');
          root.style.setProperty('--xen-swap-w', Math.round(vw - 10 - left) + 'px');
        } else { root.style.removeProperty('--xen-swap-ml'); root.style.removeProperty('--xen-swap-w'); }
        // the Instruments button sits on its rail: under it (up) or above it (down)
        const rr = root.getBoundingClientRect(), p2 = perf?.getBoundingClientRect();
        if (p2 && p2.width > 0) {
          root.style.setProperty('--xen-instr-x', Math.round(p2.left - rr.left) + 'px');
          root.style.setProperty('--xen-instr-w', Math.round(p2.width) + 'px');
          root.style.setProperty('--xen-instr-y', Math.round((instrDown ? p2.top - 30 : p2.bottom + 36) - rr.top) + 'px');
        }
      }
      const h = Math.max(64, Math.min(900, Math.round(swapped ? railH + 18 : bottom - top + 12)));
      root.style.setProperty('--xen-ghost-h', h + 'px');
      const knob = root.querySelector('.xen-power-loop-dock .xen-qc-wrap') || root.querySelector('.xen-power-loop-dock');
      if (knob) {
        const kr = knob.getBoundingClientRect(), rr = root.getBoundingClientRect();
        root.style.setProperty('--xen-swap-x', Math.round(kr.left - rr.left - 44) + 'px');
        root.style.setProperty('--xen-swap-y', Math.round(kr.top - rr.top + 6) + 'px');
      }
      // full bleed: the desk/playfield row uses the whole window width, not the column of the blocks below
      const parent = root.parentElement;
      if (parent) {
        const vw = document.documentElement.clientWidth || window.innerWidth;
        const gutter = vw >= 1024 ? 10 : 6;
        const left = parent.getBoundingClientRect().left;
        root.style.setProperty('--xen-bleed-ml', Math.round(gutter - left) + 'px');
        root.style.setProperty('--xen-bleed-w', Math.max(320, vw - 2 * gutter) + 'px');
      }
      // default: head (power, Loop-Rec) + playfield as tall as the Mixing Desk (until the user drags its own height)
      const deskEl = root.querySelector('.xen-stage-split-desk');
      const headEl = root.querySelector('.xen-h1-tonal-stage > :first-child');
      const headH = headEl ? headEl.getBoundingClientRect().height : 0;
      const playEl = root.querySelector('.xen-h1-tonal-stage > :nth-child(2)'), cv = root.querySelector('canvas[data-xen-play-area]');
      const frame = playEl && cv ? Math.max(0, playEl.getBoundingClientRect().height - cv.getBoundingClientRect().height) : 2;
      if (deskEl) root.style.setProperty('--xen-play-auto-h', Math.max(140, Math.round(deskEl.getBoundingClientRect().height - headH - frame)) + 'px');
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    let ro = null;
    try {
      ro = new ResizeObserver(schedule);
      for (const el of document.querySelectorAll('.xen-performance,.xen-quick-dock')) ro.observe(el);
      const deskEl = root.querySelector('.xen-stage-split-desk');
      if (deskEl) ro.observe(deskEl);
      const headEl = root.querySelector('.xen-h1-tonal-stage > :first-child');
      if (headEl) ro.observe(headEl);
      if (root.parentElement) ro.observe(root.parentElement);
    } catch {}
    window.addEventListener('resize', schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', schedule);
      for (const k of ['--xen-bleed-ml', '--xen-bleed-w', '--xen-play-auto-h', '--xen-swap-x', '--xen-swap-y', '--xen-swap-ml', '--xen-swap-w', '--xen-instr-x', '--xen-instr-y', '--xen-instr-w']) root.style.removeProperty(k);
      document.documentElement.classList.remove('xen-split-swapped', 'xen-split-instr-down');
      for (const el of document.querySelectorAll('.xen-performance,.xen-quick-dock,.xen-quick-collection,.xen-quick-left-landing')) { el.style.removeProperty('--xen-rail-top'); el.style.removeProperty('--xen-rail-left'); }
    };
  }, [dock, lay.sideTop, lay.instrDown]);

  const goTop = () => __XenStageLayout.setDock('top');

  const onHandleDown = ev => {
    if (ev.button !== undefined && ev.button !== 0) return;
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    __xenDragPointer(ev,
      e => __XenStageLayout.setDeskFrac((e.clientX - rect.left) / Math.max(1, rect.width), false),
      () => __XenStageLayout.commit());
  };
  const onHandleKey = ev => {
    const step = ev.shiftKey ? 0.05 : 0.01;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); __XenStageLayout.setDeskFrac(lay.deskFrac - step); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); __XenStageLayout.setDeskFrac(lay.deskFrac + step); }
  };
  const onVgripDown = ev => {
    if (ev.button !== undefined && ev.button !== 0) return;
    const canvas = rootRef.current?.querySelector('canvas[data-xen-play-area]');
    if (!canvas) return;
    const startY = ev.clientY;
    const startH = canvas.getBoundingClientRect().height;
    __xenDragPointer(ev,
      e => __XenStageLayout.setPlayHeight(dock, startH + (e.clientY - startY), false),
      () => __XenStageLayout.commit());
  };
  const onVgripKey = ev => {
    const canvas = rootRef.current?.querySelector('canvas[data-xen-play-area]');
    if (!canvas) return;
    const step = ev.shiftKey ? 60 : 12;
    const h = canvas.getBoundingClientRect().height;
    if (ev.key === 'ArrowUp') { ev.preventDefault(); __XenStageLayout.setPlayHeight(dock, h - step); }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); __XenStageLayout.setPlayHeight(dock, h + step); }
  };

  const style = { '--xen-split-desk': (lay.deskFrac * 100).toFixed(2) + '%' };
  if (playH) style['--xen-play-h'] = playH + 'px';

  return u.jsxs('div', {
    ref: rootRef,
    className: 'xen-stage-split',
    'data-dock': dock,
    'data-desk-open': open ? 'true' : 'false',
    'data-play-h': playH ? 'custom' : 'natural',
    'data-grid-spacing': lay.spacing,
    'data-side-top': dock === 'side' && lay.sideTop ? 'true' : 'false',
    style,
    children: [
      u.jsx('div', { className: 'xen-stage-split-play', children: stage }),
      // UI-SWAP-01: two interlocked rings that swap places
      dock === 'side' ? u.jsx('button', {
        type: 'button',
        className: 'xen-stage-split-swap',
        'aria-pressed': !!lay.sideTop,
        'aria-label': lay.sideTop ? 'Move Mixing Desk and playfield back down' : 'Swap: Mixing Desk and playfield up, Quick Rack below',
        title: lay.sideTop ? 'Swap back: Quick Rack and the top area up again, Mixing Desk + playfield below' : 'Swap: Mixing Desk + playfield up next to the Instruments, the Quick Rack below',
        onClick: () => {
          __XenStageLayout.setSideTop(!lay.sideTop);
          requestAnimationFrame(() => rootRef.current?.querySelector('.xen-stage-split-desk')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
        },
        children: u.jsxs('svg', {
          viewBox: '0 0 28 20', width: 26, height: 19, 'aria-hidden': true, fill: 'none',
          children: [
            u.jsx('circle', { cx: 10, cy: 10, r: 6.2, stroke: 'currentColor', strokeWidth: 1.6 }),
            u.jsx('circle', { cx: 18, cy: 10, r: 6.2, stroke: 'currentColor', strokeWidth: 1.6, opacity: .85 }),
            u.jsx('path', { d: 'M7.5 2.4 L10.6 3.8 L8.2 6.1', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
            u.jsx('path', { d: 'M20.5 17.6 L17.4 16.2 L19.8 13.9', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' })
          ]
        })
      }) : null,
      u.jsx('div', {
        className: 'xen-stage-split-vgrip',
        role: 'separator',
        'aria-orientation': 'horizontal',
        'aria-label': dock === 'side' ? 'Drag the grid height (double-click: as tall as the Mixing Desk)' : 'Drag the grid height (double-click: original height)',
        title: dock === 'side' ? 'Drag the grid longer / shorter · double-click: as tall as the Mixing Desk' : 'Drag the grid taller / flatter · double-click: original ratio 1100:580',
        tabIndex: 0,
        onPointerDown: onVgripDown,
        onKeyDown: onVgripKey,
        onDoubleClick: () => __XenStageLayout.setPlayHeight(dock, 0),
        children: u.jsx('span', { className: 'xen-stage-split-grip-dots', 'aria-hidden': true })
      }),
      dock === 'side' && lay.sideTop ? u.jsx('button', {
        type: 'button',
        className: 'xen-stage-split-instr',
        'aria-pressed': !!lay.instrDown,
        title: lay.instrDown ? 'Instruments back up, beside the Mixing Desk' : 'Instruments down as well, next to the Quick Rack: more room for Mixing Desk and playfield',
        onClick: () => __XenStageLayout.setInstrDown(!lay.instrDown),
        children: lay.instrDown ? '▴ Instruments up' : '▾ Instruments below'
      }) : null,
      u.jsxs('div', {
        ref: ghostRef,
        className: 'xen-stage-split-ghost',
        role: 'button',
        tabIndex: dock === 'side' ? 0 : -1,
        'aria-hidden': dock === 'side' ? undefined : true,
        title: 'Bring the playfield back up',
        onClick: goTop,
        onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTop(); } },
        children: [
          u.jsx('span', { className: 'xen-stage-split-ghost-grid', 'aria-hidden': true }),
          u.jsxs('span', { className: 'xen-stage-split-ghost-label', children: [
            u.jsx('strong', { children: lay.sideTop ? 'The playfield is up beside the Mixing Desk' : 'The playfield is down beside the Mixing Desk' }),
            u.jsx('span', { children: 'Click to play it up here again' })
          ] })
        ]
      }),
      u.jsxs('div', {
        className: 'xen-stage-split-handle',
        role: 'separator',
        'aria-orientation': 'vertical',
        'aria-label': 'Move the border between Mixing Desk and playfield',
        'aria-valuemin': 28, 'aria-valuemax': 80, 'aria-valuenow': Math.round(lay.deskFrac * 100),
        title: 'Move the border · double-click: default',
        tabIndex: dock === 'side' ? 0 : -1,
        onPointerDown: onHandleDown,
        onKeyDown: onHandleKey,
        onDoubleClick: () => __XenStageLayout.setDeskFrac(__XenStageLayout.DESK_DEFAULT),
        children: [
          u.jsx('span', { className: 'xen-stage-split-grip-dots', 'aria-hidden': true }),
          u.jsx('button', {
            type: 'button',
            className: 'xen-stage-split-return',
            title: 'Playfield back up',
            'aria-label': 'Playfield back up',
            onPointerDown: e => e.stopPropagation(),
            onClick: goTop,
            children: '↑'
          })
        ]
      }),
      u.jsxs('div', {
        className: 'xen-stage-split-desk',
        children: desk
      })
    ]
  });
}

function __XenGridSpacingControl() {
  const lay = P.useSyncExternalStore(__XenStageLayout.subscribe, __XenStageLayout.snapshot, __XenStageLayout.snapshot);
  const opts = [
    ['abs', 'Absolute', 'Equal Hz per pixel (as before): higher intervals are wider.'],
    ['log', 'Logarithmic', 'Every octave is equally tall, like piano keys. Pitch follows the picture: the pointer plays what it points at.'],
    ['fret', 'Guitar', 'Like frets on a guitar neck: the higher you play, the narrower the intervals (the mirror of Absolute).']
  ];
  const custom = lay.playH.top || lay.playH.side;
  return u.jsxs('div', {
    role: 'radiogroup',
    'aria-label': 'Grid spacing',
    'data-xen-grid-spacing': lay.spacing,
    className: 'flex flex-col gap-1',
    children: [
      u.jsx('span', { className: 'text-xs text-neutral-400', children: 'Grid Spacing (vertical)' }),
      u.jsx('div', {
        className: 'flex gap-1',
        children: opts.map(([m, l, tt]) => u.jsx('button', {
          type: 'button', role: 'radio', 'aria-checked': lay.spacing === m, title: tt,
          'data-xen-grid-spacing-option': m,
          onClick: () => __XenStageLayout.setSpacing(m),
          className: 'flex-1 border px-2 py-1 text-xs ' + (lay.spacing === m
            ? 'border-sky-500/70 bg-sky-950/40 text-sky-200'
            : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-neutral-200'),
          children: l
        }, m))
      }),
      u.jsxs('p', {
        className: 'text-[10px] leading-snug text-neutral-500',
        children: [
          'Drag the bar under the playfield to make the grid taller or flatter (double-click: original). ',
          custom ? u.jsx('button', {
            type: 'button',
            className: 'underline text-neutral-400 hover:text-neutral-200',
            onClick: () => { __XenStageLayout.setPlayHeight('top', 0); __XenStageLayout.setPlayHeight('side', 0); },
            children: 'Reset height'
          }) : null
        ]
      })
    ]
  });
}
