/* SONG-PART-TAGS-01: song part designation and colours that travel with sent audio.
 * Scheme (Wave Editor strip, titles, Quick Rack, Mixing Desk, Multitrack):
 *   letter      A, B, C …      the KIND of part (what returns); colour = the letter colour (top / body)
 *   number      A1, A2, A3 …   which repetition of that kind, only when the kind occurs more than once;
 *                              colour = the repetition colour (edge / border)
 *   small letter A1a, A1b …    a section (subdivision) inside that part; colour = the section shade (bottom)
 * A sent title ends with " · <tag>" ("My Song · A2b"). The colours of a sent title are remembered by name
 * (so per-song custom kind colours survive); without that, they are derived from the tag itself.
 * Main bundle: Quick Rack and Mixing Desk need it without the (lazy) Wave Editor room. The Wave Editor's
 * part factory (00_song_parts_edit.js) uses the same palettes through this object when it is present. */
const __XenSongPartTint = (() => {
  // same order as __xenSongPartsEditFactory COLORS (letter A = index 0)
  const LETTER_COLORS = ['#38bdf8', '#f472b6', '#a3e635', '#fbbf24', '#a78bfa', '#2dd4bf', '#fb923c', '#f87171', '#818cf8', '#e879f9', '#facc15', '#4ade80'];
  // repetition colours: 1, 2, 3 … (the edge of a card)
  const OCC_COLORS = ['#4ade80', '#f43f5e', '#facc15', '#22d3ee', '#c084fc', '#fb923c', '#e2e8f0', '#84cc16'];
  const HEX = /^#[0-9a-f]{6}$/i;
  const letterColor = l => LETTER_COLORS[Math.max(0, String(l || 'A').charCodeAt(0) - 65) % LETTER_COLORS.length];
  const occColor = occ => (occ > 0 ? OCC_COLORS[(occ - 1) % OCC_COLORS.length] : null);
  const subLetter = k => (k < 26 ? String.fromCharCode(97 + k) : 'z' + (k - 25));
  /* the same section shade as the Wave Editor (hue turned per section) */
  function shade(hex, k) {
    const n = parseInt(String(hex).slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0; const s0 = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    const turn = [-38, 38, -76, 76, -114, 114][k % 6] + (k >= 6 ? 18 : 0), H = ((h + turn) % 360 + 360) % 360;
    const L = Math.max(.28, Math.min(.62, l - .06 + (k % 2 ? .05 : 0))), S2 = Math.min(1, s0 + .1);
    const c = (1 - Math.abs(2 * L - 1)) * S2, x = c * (1 - Math.abs((H / 60) % 2 - 1)), m = L - c / 2;
    const [R, G, B] = H < 60 ? [c, x, 0] : H < 120 ? [x, c, 0] : H < 180 ? [0, c, x] : H < 240 ? [0, x, c] : H < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [R, G, B].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
  }
  /* "… · A2b" at the end of a title */
  const TAG_RE = /\s·\s([A-Z])(\d{1,2})?([a-z]|z\d{1,2})?$/;
  function parse(name) {
    const m = TAG_RE.exec(String(name || ''));
    if (!m) return null;
    const sub = m[3] ? (m[3].length === 1 ? m[3].charCodeAt(0) - 97 : 25 + Number(m[3].slice(1))) : -1;
    return { tag: m[1] + (m[2] || '') + (m[3] || ''), letter: m[1], occ: m[2] ? Number(m[2]) : 0, sub };
  }
  function withTag(base, tag) {
    const b = String(base || '').replace(TAG_RE, '').trim();
    return tag ? (b ? b + ' · ' + tag : tag) : b;
  }
  /* remembered colours of sent titles (custom kind colours of a song survive the trip) */
  const KEY = 'xensonar.songParts.materialTint.v1', MAX = 300;
  let reg = null;
  const load = () => {
    if (reg) return reg;
    try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); reg = v && typeof v === 'object' ? v : {}; } catch { reg = {}; }
    return reg;
  };
  function remember(name, t) {
    if (!name || !t || !HEX.test(t.top || '')) return;
    const r = load(), cur = r[name], next = { tag: t.tag, top: t.top, edge: HEX.test(t.edge || '') ? t.edge : t.top, bottom: HEX.test(t.bottom || '') ? t.bottom : t.top };
    if (cur && cur.tag === next.tag && cur.top === next.top && cur.edge === next.edge && cur.bottom === next.bottom) return;
    delete r[name]; r[name] = next;
    const keys = Object.keys(r); while (keys.length > MAX) delete r[keys.shift()];
    try { localStorage.setItem(KEY, JSON.stringify(r)); } catch {}
  }
  /* {tag, top, edge, bottom} of a title, or null when it carries no part tag */
  function tintFor(name) {
    const p = parse(name);
    if (!p) return null;
    const saved = load()[String(name)];
    if (saved && saved.tag === p.tag) return { ...saved };
    const top = letterColor(p.letter);
    return { tag: p.tag, top, edge: occColor(p.occ) || top, bottom: p.sub >= 0 ? shade(top, p.sub) : top };
  }
  /* darken a colour for a card background (text stays readable) */
  function dim(hex, a = .42) {
    const n = parseInt(String(hex).slice(1), 16), base = [6, 18, 26];
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(base[i] + (v - base[i]) * a));
    return 'rgb(' + c.join(',') + ')';
  }
  /* Quick Rack tile: body = letter colour (top) / section shade (bottom), border = repetition colour */
  function quickTint(name) {
    const t = tintFor(name);
    if (!t) return {};
    return { border: t.edge, background: 'linear-gradient(180deg,' + dim(t.top) + ' 0 55%,' + dim(t.bottom) + ' 55% 100%)' };
  }
  return Object.freeze({ LETTER_COLORS, OCC_COLORS, letterColor, occColor, subLetter, shade, parse, withTag, remember, tintFor, dim, quickTint });
})();
if (typeof window !== 'undefined') window.__XenSongPartTint = __XenSongPartTint;

/* A small two-tone chip (Mixing Desk): top = letter colour, bottom = section shade, ring = repetition colour */
function __XenSongPartChip({ name, small = false }) {
  const t = __XenSongPartTint.tintFor(name);
  if (!t) return null;
  return u.jsx('span', {
    className: 'xen-song-part-chip' + (small ? ' is-small' : ''),
    'data-xen-song-part-tag': t.tag,
    title: 'Song part ' + t.tag,
    style: { '--sp-top': t.top, '--sp-bottom': t.bottom, '--sp-edge': t.edge },
    children: t.tag
  });
}
