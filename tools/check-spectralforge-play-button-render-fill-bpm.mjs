#!/usr/bin/env node
import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function fail(message) { console.error(`[xensonar][spectralforge-play-button-render-fill-bpm] FAIL: ${message}`); process.exit(1); }
function mustContain(source, needle, label) { if (!source.includes(needle)) fail(`${label}: missing ${needle}`); }
function mustNotContain(source, needle, label) { if (source.includes(needle)) fail(`${label}: forbidden ${needle}`); }
function mustMatch(source, pattern, label) { if (!pattern.test(source)) fail(`${label}: pattern ${pattern}`); }

const transport = read('src/features/l3lab/spectralForge/components/TransportBar.tsx');
const pkg = read('package.json');

mustContain(pkg, '3.2.91-7.5.160', 'package version');
mustContain(pkg, 'xensonar:check-spectralforge-play-button-render-fill-bpm', 'package script');

mustContain(transport, 'const renderFillRawActive = rendering || prewarmRendering;', 'button render fill uses foreground and after-paint render');
mustContain(transport, 'const renderFillRawProgress = Math.max(', 'button fill clamps raw render progress');
mustContain(transport, 'const renderFillPercent = Math.max(4, Math.min(100, Math.round(renderFillVisualProgress * 100)));', 'button fill has visual progress layer');
mustContain(transport, 'aria-busy={renderFillVisualActive}', 'play button exposes visual busy state');
mustContain(transport, 'const playButtonRenderStyle: React.CSSProperties = {', 'button uses explicit robust style object');
mustContain(transport, 'width: 42,', 'button has non-collapsing inline width');
mustContain(transport, 'minWidth: 42,', 'button cannot collapse to a vertical stripe');
mustContain(transport, 'height: 34,', 'button has non-collapsing inline height');
mustContain(transport, 'style={playButtonRenderStyle}', 'button applies robust render style');
mustContain(transport, 'data-xensonar-spectralforge-render-fill-button="true"', 'button has render-fill contract marker');
mustContain(transport, 'data-xensonar-spectralforge-render-fill-layered="true"', 'button marks layered render-fill contract');
mustContain(transport, 'renderFillVisualActive && (', 'fill layer appears only during render feedback');
mustContain(transport, 'style={{ height: `${renderFillPercent}%` }}', 'fill layer is percentage height driven');
mustContain(transport, 'pointer-events-none relative z-10 flex h-full w-full items-center justify-center', 'play/pause symbol remains centered above fill');
mustContain(transport, 'const playButtonSymbol = isPlaying && !rendering ? "⏸" : "▶";', 'rendering state keeps play symbol visible');
mustNotContain(transport, 'w-24 h-2 bg-gray-800 rounded overflow-hidden', 'detached render progress bar removed');
mustNotContain(transport, 'linear-gradient(to top, rgba(34,197,94,0.9)', 'stale all-or-nothing gradient fill removed');

mustContain(transport, '<span className="whitespace-nowrap">Loop vorhören mit</span>', 'BPM label states preview intent');
mustContain(transport, 'type="number"', 'BPM is editable');
mustContain(transport, 'value={previewBpmInputValue}', 'BPM input is tied to material export tempo');
mustContain(transport, 'updateMaterialExport({ bpm: Math.max(20, Math.min(320, Math.round(next))) });', 'BPM input updates preview tempo with guard');
mustContain(transport, '<span>BPM</span>', 'BPM unit remains explicit');
mustNotContain(transport, 'type="checkbox"\n              checked={materialExport.loopPreview}', 'redundant loop-preview checkbox removed');
mustNotContain(transport, 'Loop vorhören\n          </label>', 'old bare loop-preview label removed');
mustContain(transport, 'loopPreview: true,', 'preview playback remains looping without checkbox');
mustMatch(transport, /: `Vorschau \$\{previewDurationSec\.toFixed\(2\)\}s`/, 'duration copy no longer repeats @ BPM branch');

console.log('[xensonar][spectralforge-play-button-render-fill-bpm] OK');
