#!/usr/bin/env node
import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function fail(message) { console.error(`[xensonar][spectralforge-play-button-render-fill-repair] FAIL: ${message}`); process.exit(1); }
function mustContain(source, needle, label) { if (!source.includes(needle)) fail(`${label}: missing ${needle}`); }
function mustNotContain(source, needle, label) { if (source.includes(needle)) fail(`${label}: forbidden ${needle}`); }

const transport = read('src/features/l3lab/spectralForge/components/TransportBar.tsx');
const pkg = read('package.json');

mustContain(pkg, '3.2.91-7.5.160', 'package version');
mustContain(pkg, 'xensonar:check-spectralforge-play-button-render-fill-repair', 'package script');

mustContain(transport, 'const playButtonRenderStyle: React.CSSProperties = {', 'button uses explicit render style object');
mustContain(transport, 'width: 42,', 'button has inline width contract');
mustContain(transport, 'minWidth: 42,', 'button cannot collapse horizontally');
mustContain(transport, 'height: 34,', 'button has inline height contract');
mustContain(transport, 'minHeight: 34,', 'button cannot collapse vertically');
mustContain(transport, 'data-xensonar-spectralforge-render-fill-button="true"', 'button has render-fill test marker');
mustContain(transport, 'data-xensonar-spectralforge-render-fill-layered="true"', 'button now uses a separate fill layer');
mustContain(transport, 'data-xensonar-spectralforge-render-fill-percent={renderFillVisualActive ? renderFillPercent : undefined}', 'button exposes fill percent marker');
mustContain(transport, 'style={playButtonRenderStyle}', 'button applies explicit dimensions/background style');
mustContain(transport, 'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded border', 'button layout is fixed inline-flex, not a loose inline span');
mustContain(transport, 'className="pointer-events-none absolute inset-x-0 bottom-0 z-0 bg-emerald-500/90 transition-[height]', 'fill layer is full-width bottom-up liquid layer');
mustContain(transport, 'className="pointer-events-none relative z-10 flex h-full w-full items-center justify-center text-[18px]', 'symbol layer fills button above background');
mustContain(transport, 'className="sr-only"', 'button keeps accessible text separate from visual icon');

mustNotContain(transport, 'linear-gradient(to top, rgba(34,197,94,0.9)', 'stale gradient-only button fill removed');
mustNotContain(transport, 'relative w-10 h-8 overflow-hidden rounded border', 'old Tailwind-only button dimensions removed');

mustContain(transport, '<span className="whitespace-nowrap">Loop vorhören mit</span>', 'BPM label stays explicit');
mustContain(transport, 'type="number"', 'BPM input stays editable');
mustContain(transport, '<span>BPM</span>', 'BPM unit remains explicit');

console.log('[xensonar][spectralforge-play-button-render-fill-repair] OK');
