# Live-Pfad-Audit, 09.11.2026

**Basis:** `index.html` auf `main` (DUB-ECHO-04, SHA-256 siehe Git). **Status:** reine Messung, keine Codeänderung.
**Umgebung:** Headless Chromium (Playwright), 1440×900, Software-Rendering, kein echtes Audiogerät. Messcode lag nur in Probe-Skripten (`addInitScript`), nicht in der App.

## Szenarien

| Szenario | Hauptthread belegt | davon JavaScript | Heap | DOM-Knoten | Audio-Kontexte live | Worklet-Knoten |
|---|---|---|---|---|---|---|
| S0 Live Room, Power aus | 11 % | 1,6 % | 16 MB | 3 566 | 0 | 0 |
| S1 Live Room spielt | 29 % | 5,9 % | 27 MB | 3 567 | 1 | 10 |
| S2 Material Forge offen | 4 % | 2,7 % | 23 MB | 3 558 | 1 | 10 |
| S3 Nodal Center offen | 5 % | 3,3 % | 27 MB | 5 139 | 1 | 10 |
| S4 zurück im Live Room, spielt | 27 % | 5,2 % | 25 MB | 6 496 | 1 | 10 |

Der nicht-JavaScript-Anteil (~22 %) ist überwiegend Zeichnen/Compositing (Layout ≈ 0 %, Style ≈ 0,8 %). Im Headless-Modus wird per Software gerastert; auf echter Hardware mit GPU ist dieser Anteil vermutlich deutlich kleiner. **Nicht als Absolutwert übertragen.**

## Was gut ist (bestätigt)

- **Genau ein laufender AudioContext** im Spiel, auch nach Besuch von Forge und Nodal. Offline-Kontexte nur für Renderings (6 insgesamt).
- **Worklets sind sauber gebaut:** statische Prüfung der 12 Prozessoren, keine Allokation pro Block (bis auf einen Spread in `xen-material-phase-v1`), EQ-Worklet schläft bei Stille, C11-Host mit WASM und SharedArrayBuffer-Fastpath. Laufzeit im Audio-Thread ist headless nicht messbar.
- **Drum-Scheduler** ca. 0,2 % CPU, ≥ 0,32 s Vorausplanung.
- **Spectral Forge schläft** im Hauptraum (kein Mehrverbrauch in S4 gegenüber S1).
- Audio-Knoten-Erzeugung ~30/s (pro Anschlag, normal für Web Audio). Heap moderat (~25 MB).

## Befunde: Heiß-Kalt-Verwechslungen

### H1 · Session-Sicherung läuft im Spiel ständig mit (stärkster Befund)
- Messung, 20 s reines Spielen ohne Eingabe: **132 große `JSON.stringify` (5,6 MB)**, **44 Session-Sicherungen (~2/s)**. Geschrieben wird dabei **nichts**, weil sich nichts geändert hat (`writeWorking` vergleicht den Text).
- Kette: App rendert ~3,4×/s (u. a. Metronom-Puls pro Schlag) → `__useQuickAdapter` (Zeile ~5419) hat `[kind,entries]` als Abhängigkeit, `entries` ist bei jedem Render ein neues Array → 5 Adapter × `__XenQuick.refreshLibraries()` = ~17 `emit()`/s → `scheduleWorkingCopy` → `captureWorking()` mit Deep-Clone (`JSON.parse(JSON.stringify())`) + `JSON.stringify` der ganzen Session.
- Zone: KALT (Persistenz), ausgelöst aus WARM (Render) im Takt des HEISSEN Beats.

### H2 · Statusanzeigen lesen pro Render den Browserspeicher
- Pro App-Render synchrone `localStorage`-Lesezugriffe (+ `JSON.parse`): `root-follow-loop-bank-v1`, `last-workspace-package-import-ledger-v1` (je ~6/s), `native-audio-enabled-v1`, `root-follow-loop-ui-v1`, `bass-preset-order-v1` (je ~3/s).
- Ursache: Statustexte (`xbe`, `obe`, `Cbe` um Zeile 36506/36641) werden im Render berechnet.

### H3 · App-Neuaufbau pro Schlag
- `tEe()` (Zeile ~44625) erhöht `metronomePulse` per `setState` bei jedem Viertel. Liegt der State im App-Wurzelbaum, rendert die ganze App pro Schlag; ~6–7 React-Commits/s im Leerlauf-Spiel. Verstärkt H1 und H2.

### H4 · Drone-Lautstärke wird jedes Bild neu automatisiert
- Zeile ~41886: `droneVolumeBus.gain.setTargetAtTime(...)` 60×/s **mit identischem Wert** (gemessen: 60/60 identisch). Fügt der AudioParam-Zeitleiste laufend Ereignisse hinzu; relevant für die bekannte Firefox-Automationsproblematik (AF01).

### H5 · Native-Companion-WebSocket verbindet sich dauernd neu
- `ws://<host>:47812` (XNC, PipeWire/Sidecar-Diagnose) wird alle ~2 s neu versucht: 16 Versuche in 10 s, auf Netlify gegen `xensonar.netlify.app:47812`; schlägt bei jedem Besucher fehl und erzeugt Konsolenfehler.

### H6 · Kleinere Punkte
- 6 parallele `requestAnimationFrame`-Schleifen à 60 Hz (Partikel, Hauptcanvas, App-Clock, 2× Drone, Resonance-Input). Zusammenlegen spart wenig; die Drone-Schleifen sollten nur bei aktivem Drone laufen.
- Telemetrie-Intervall alle 900 ms (`attack-telemetry-flush`, Zeile ~41665) im Spielbetrieb.
- 60 Style-Recalcs/s im Spiel (etwas ändert pro Bild Styles).
- DOM wächst nach Besuch des Nodal Center von 3,6k auf 6,5k Knoten und bleibt im Live Room erhalten (Kaltraum-DOM bleibt gemountet?).
- Root-Follow- und andere Zahlenfelder: ein Tastaturschutz stoppt Tasten auf Fensterebene, bevor sie Eingabefelder erreichen (Enter kommt nicht an).

## Vorgeschlagene Patches (Reihenfolge nach Nutzen/Risiko)

| # | Patch | Zone | Erwartung | Risiko |
|---|---|---|---|---|
| P1 | `__useQuickAdapter`: nur bei inhaltlich geänderten `entries` (Elementvergleich) neu melden | WARM→KALT | H1 entfällt weitgehend | gering |
| P2 | Drone-Lautstärke nur bei Wertänderung automatisieren | HEISS | −60 AudioParam-Ereignisse/s | gering |
| P3 | XNC-WebSocket nur auf Wunsch (URL-Parameter/Schalter) | KALT | keine Fehlversuche | gering, Nutzerentscheidung |
| P4 | Statustexte cachen, nur bei Speicheränderung neu lesen | WARM | H2 entfällt | mittel |
| P5 | Metronom-Puls in eigene kleine Komponente verlagern | WARM | ~2 App-Renders/s weniger | mittel |
| P6 | Telemetrie-Intervall und Diagnose hinter Schalter | KALT | kleiner | gering |

Jeder Patch einzeln, mit Vorher/Nachher-Messung derselben Skripte.

## Umgesetzt: LIVEPATH-01 (09.11.2026)

| Messung (20 s Spiel, Headless) | vorher | nachher |
|---|---|---|
| große JSON-Serialisierungen | 132 · 5,57 MB | 39 · 1,64 MB |
| AudioParam-Befehle/s | 154 | 94 |
| davon unveränderte Drone-Lautstärke/s | 60 | 0 |
| WebSocket-Versuche (10 s) / Konsolenfehler | 16 / 5 | 0 / 0 |
| JavaScript-Anteil Hauptthread im Spiel | 5,9 % | 4,5 % |

- P1 `__useQuickAdapter`: meldet Bibliotheken nur bei feldweise geänderten Einträgen neu (17 → 0 Meldungen/s).
- P2 Drone-Lautstärke: neue Automation nur bei neuem Ziel oder wenn ein anderer Schreiber den Wert verändert hat.
- P3 XNC (nativer Begleiter, Port 47812) nur mit `?xnc=1`. Vollständiges Entfernen (XNC, Native Audio 32185, Owner-Auswahl) vorgemerkt für den Quellbaum-Umbau.
- P4 Session-Arbeitskopie: höchstens alle 1,5 s serialisieren, letzter Stand garantiert, `pagehide` sichert sofort. Neuladen 0,3 s und 2,5 s nach einer Änderung getestet: Wert bleibt erhalten (wie Parent).
- Offen: Root-Follow-Statustexte lesen weiter pro Render den Speicher; App-Neuaufbau pro Metronom-Schlag; Bridge-`attach` bei jedem Render.

## Umgesetzt: LIVEPATH-02 (09.11.2026)

`tEe()` setzte pro Viertel per `setState` einen `metronomePulse`, der zwar in Props weitergereicht, aber von **keiner Komponente gelesen** wird. Folge: ein kompletter App-Neuaufbau pro Schlag. Ein DOM-Mutations-Vergleich (8 s Spiel) zeigte, dass dabei nichts Sichtbares passiert: nur React setzt `name`/`type` an ~100 Eingabefeldern neu. Der Puls ist jetzt ein No-op; die Schnittstelle bleibt.

| Messung (Live Room spielt, Headless) | Original | LIVEPATH-01 | LIVEPATH-02 |
|---|---|---|---|
| React-Commits in 8 s | 15 | 15 | **0** |
| JSON-Serialisierung in 20 s | 5,57 MB | 1,64 MB | **0** |
| Storage-Lesezugriffe in 20 s | 476 | 288 | **0** |
| JavaScript-Anteil Hauptthread | 5,9 % | 4,5 % | **3,4 %** |
| Heap im Spiel | 27 MB | 23 MB | **19 MB** |
| Konsolenfehler beim Start | 5 | 0 | 0 |

Damit entfällt auch H2 (Root-Follow-Statustexte lesen den Speicher nur noch bei echten Änderungen). Übrig im Spieltakt: Drum-Scheduler (25-ms-Tick, gewollt), Canvas-Visuals, rAF-Schleifen.
Reload-Persistenz (0,3 s / 2,5 s nach Änderung), Echo-, Rack- und Slider-Regressionen: unverändert.

## Grafik des Hauptraums (Analyse 09.11.2026, keine Codeänderung)

- Eine sichtbare Leinwand, intern 1100×580, angezeigt 908×479 (bei DPR 1 ca. 46 % mehr Pixel als nötig, bei DPR 2 unscharf).
- JavaScript für das Zeichnen: **0,66 ms pro Bild** (~4 % des Bildbudgets).
- Pro Bild: ~600 Liniensegmente, 66 `stroke`, 59 `fill`, 49 `fillText`, wenige Verläufe. **Keine** teuren Operationen (kein `getImageData`, kein `shadowBlur`, kein `filter`).
- Ausschlussversuche (Headless, Software-Raster): Leinwand ausgeblendet 27 % → 7 % Hauptthread; ohne `stroke` 28 → 18 %; ohne Text 28 → 26 %; ohne `fill` 28 → 24 %; CSS-Animationen pausiert 27 → 25 %.
- Größter Posten: die **37 Rasterlinien** (Tonhöhen-Gitter, je 1100 px, 3 px, teils Verlauf), danach 8 Drone-Wellen. Das ist das sichtbare Instrument, keine Leerarbeit.
- Zwischenspeichern als Bitmap lohnt nicht: ein vollflächiges `drawImage` pro Bild kostet mehr Pixel als die Linien.
- Auf Rechnern mit GPU-beschleunigtem Canvas ist der Rasteranteil klein; relevant ist er auf Rechnern ohne Beschleunigung (Software-Canvas).

**Mögliche Schritte, alle mit sichtbarer Wirkung, daher Nutzerentscheidung:**
1. Leinwand-Auflösung an tatsächliche Größe × Pixeldichte koppeln (schärfer auf Retina, ~30 % weniger Pixel bei DPR 1).
2. „Sparmodus" für schwache Rechner: Rasterlinien dünner/ohne Verlauf, Bildrate der Grafik halbieren (Audio unberührt).
3. Filter-Animationen der Header-Knöpfe (7 Stück) durch reine Opacity-Animationen ersetzen (~2 Prozentpunkte).
