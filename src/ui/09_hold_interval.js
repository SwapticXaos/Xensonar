/* UI-HOLD-INTERVAL-01: the Backspace "octave hold" becomes a tunable interval with two cards.
 * - card 0 (default +1200 cents = one octave up, exactly as before) and card 1 (default -1200)
 * - Backspace held = glide to the ACTIVE card's interval (released = back)
 * - Controls & Settings → Right-click = "Interval": a right-click in the playfield toggles the active card 0 ↔ 1
 *   (with another right-click function only card 0 exists and is always active)
 * Both are tuned with the Thunder Mode slot cards (iT): right-click a card opens its fretless ±1 octave ruler
 * with the JI marks, right-click again resets it to 0.
 * The hold itself stays the one boolean of the Live Room (waveStartOctaveHoldRef); only its FACTOR comes from
 * here (zhe, Psy Lab glide). */
const __XenHoldInterval = (() => {
  const KEY = 'xensonar.holdInterval.v1';
  const DEFAULT = Object.freeze([1200, -1200]);
  const clampC = c => Math.max(-1200, Math.min(1200, Math.round(Number(c) || 0)));
  let cents = [...DEFAULT];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(raw?.cents) && raw.cents.length === 2) cents = raw.cents.map(clampC);
  } catch {}
  let active = 0;
  let held = false;
  const listeners = new Set();
  let setter = null;
  let snap = { cents, active, held };
  const emit = () => {
    snap = { cents, active, held };
    for (const fn of listeners) fn();
  };
  const ratio = c => Math.pow(2, c / 1200);
  return Object.freeze({
    DEFAULT,
    snapshot: () => snap,
    subscribe: fn => (listeners.add(fn), () => listeners.delete(fn)),
    /* the Live Room hook hands over its raw hold setter (octave ref + badge) */
    bind: fn => { setter = typeof fn === 'function' ? fn : null; return () => { if (setter === fn) setter = null; }; },
    /* Backspace */
    press: on => { held = !!on; setter?.(held); emit(); return held; },
    /* KEY-PANIC / reset: the caller resets its own boolean */
    clear: () => { held = false; emit(); },
    /* right-click (Interval mode): card 0 ↔ 1 */
    toggle: () => { active = active ? 0 : 1; emit(); return active; },
    setActive: i => { const v = i === 1 ? 1 : 0; if (v !== active) { active = v; emit(); } },
    active: () => active,
    /* factor while the hold is on */
    factor: () => ratio(cents[active]),
    /* every factor a hold can produce (Nodal surface preparation) */
    variants: () => [...new Set([ratio(cents[0]), ratio(cents[1])])],
    cents: () => cents.slice(),
    setCents: next => {
      if (!Array.isArray(next)) return;
      cents = [clampC(next[0] ?? cents[0]), clampC(next[1] ?? cents[1])];
      try { localStorage.setItem(KEY, JSON.stringify({ cents })); } catch {}
      emit();
    }
  });
})();
if (typeof window !== 'undefined') window.__XenHoldInterval = __XenHoldInterval;

/* What the playfield right-click does (nParams.rightClickAction): 'root' (default) | 'echo' | 'interval' */
function __xenRightClickAction(params) {
  const a = params?.rightClickAction;
  return a === 'echo' || a === 'interval' ? a : 'root';
}

function __xenCentsLabel(c) {
  if (!c) return 'unison';
  const abs = Math.abs(c);
  const names = { 1200: 'octave', 700: 'fifth', 702: 'fifth (3/2)', 500: 'fourth', 498: 'fourth (4/3)', 400: 'major third', 386: 'major third (5/4)', 300: 'minor third', 316: 'minor third (6/5)' };
  return (c > 0 ? '+' : '−') + (names[abs] ? names[abs] : abs + ' ct');
}

function __XenHoldIntervalCards({ interval }) {
  const st = P.useSyncExternalStore(__XenHoldInterval.subscribe, __XenHoldInterval.snapshot, __XenHoldInterval.snapshot);
  const n = interval ? 2 : 1;
  const pitches = st.cents.slice(0, n);
  const act = interval ? st.active : 0;
  return u.jsxs('div', {
    className: 'xen-hold-interval-cards flex flex-col gap-1',
    'data-xen-hold-interval-cards': n,
    children: [
      u.jsx('span', { className: 'text-xs text-neutral-400', children: interval ? 'Backspace intervals (right-click in playfield switches)' : 'Backspace hold interval' }),
      u.jsx('div', {
        className: 'xen-hold-interval-row',
        'data-xen-hold-interval-active': act,
        style: { maxWidth: n * 46 + 'px' },
        children: u.jsx(iT, {
          label: 'Hold interval',
          steps: Array.from({ length: n }, () => 1),
          tone: 'neutral',
          maxColumns: n,
          pitches,
          onChange: () => {},
          onPitchChange: next => __XenHoldInterval.setCents(interval ? next : [next[0], st.cents[1]])
        })
      }),
      u.jsx('div', {
        className: 'flex gap-2 text-[10px] leading-snug text-neutral-500',
        children: pitches.map((c, i) => u.jsxs('span', {
          className: i === act ? (st.held ? 'text-emerald-300' : 'text-amber-200') : '',
          'data-xen-hold-interval-label': i,
          'data-active': i === act ? 'true' : 'false',
          children: [(n > 1 ? (i === act ? '▶ ' : '  ') + (i + 1) + ': ' : '⌫ '), __xenCentsLabel(c)]
        }, i))
      }),
      u.jsx('p', {
        className: 'text-[10px] leading-snug text-neutral-500',
        children: 'Right-click a card: fretless ±1 octave ruler with JI marks (right-click again = unison). Backspace held: the tone glides to the active interval.'
      })
    ]
  });
}

function __XenRightClickActionControl({ params, update }) {
  const act = __xenRightClickAction(params);
  const opts = [
    ['root', 'Grid Root', 'Right-click in the playfield sets the grid root (tunes the whole grid), as now.'],
    ['echo', 'Echo', 'Right-click toggles the particle echo on/off (the earlier function).'],
    ['interval', 'Interval', 'Right-click switches Backspace between two tunable intervals (e.g. octave ↔ minor third).']
  ];
  return u.jsxs('div', {
    role: 'radiogroup',
    'aria-label': 'Right-click action',
    'data-xen-rclick-action': act,
    className: 'flex flex-col gap-1',
    children: [
      u.jsx('span', { className: 'text-xs text-neutral-400', children: 'Right-click in Playfield' }),
      u.jsx('div', {
        className: 'flex gap-1',
        children: opts.map(([m, l, tt]) => u.jsx('button', {
          type: 'button', role: 'radio', 'aria-checked': act === m, title: tt,
          'data-xen-rclick-action-option': m,
          onClick: () => { update({ rightClickAction: m }); if (m !== 'interval') __XenHoldInterval.setActive(0); },
          className: 'flex-1 border px-2 py-1 text-xs ' + (act === m
            ? 'border-amber-500/80 bg-amber-950/40 text-amber-100'
            : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-neutral-200'),
          children: l
        }, m))
      }),
      act === 'echo' ? u.jsxs('p', {
        className: 'text-[10px] leading-snug text-neutral-500',
        children: ['Right-click toggles the particle echo. Now: ', u.jsx('span', { className: params?.echoOn ? 'text-emerald-300' : 'text-neutral-400', children: params?.echoOn ? 'on' : 'off' })]
      }) : null
    ]
  });
}
