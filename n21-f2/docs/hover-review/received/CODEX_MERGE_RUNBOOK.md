# XenSonar – Codex Merge Runbook | aktualisiert 22.10.2026

**Archivierte Codex-Basis:** P7.24, Commit `e3568a8` (aktueller tatsächlicher Codex-HEAD unbekannt).  
**Letzter modular integrierter Zielstand:** P7.37 Rhythm.  
**Letzte Demo:** `XenSonar_P7_37_GridProfiles_Hover_BootGuard_Test.html`, SHA256 `35406409a61e3cbe8d989490b2f8dedd95ac2934205248f1873f643a1219d9bb`.  
**Freigabe:** Dokumentiertes **Engineering-Handoff zur Source-Portierung**, *noch keine vollständig integrierte P7.24→LATEST-Source-Diff*.

## 1. Sichere Anwendung – Quellen

Die Patchdatei `patches/P7_24_to_P7_37_Rhythm_SOURCE_CUMULATIVE.patch` ist ein **Netto-Quellpatch**, keine Kette. Ausschließlich auf einer unveränderten Kopie des archivierten P7.24-Quellbaums im Verzeichnis `n21-f2/`:

```bash
git apply --check /PFAD/P7_24_to_P7_37_Rhythm_SOURCE_CUMULATIVE.patch
git apply /PFAD/P7_24_to_P7_37_Rhythm_SOURCE_CUMULATIVE.patch
node build.cjs
node build.cjs --verify
node tests/p737-grid-buffered-audio.cjs
```

**Erwartet:** Build `XenSonar_P7_37_Grid_SingleBuffer_Rhythm_Test.html`, SHA `18445166e19116b2267cbdaf42ab2e0a0478bed951838e37d9cc87f1338cfc86`. Dieser Clean-Apply und Byte-Rebuild wurden in diesem Handoff tatsächlich reproduziert.

**Wichtig:** Source-Patch enthält **noch nicht** die späteren Grid-Profile, Native-Workbench-, Hover- oder Boot-Guard-Funktionen; diese sind bislang im gebauten HTML.

## 2. Kumulative Änderungen P7.37 Rhythm → neueste HTML

`patches/P7_37_Rhythm_to_GridProfiles_Hover_BootGuard_HTML_CUMULATIVE.patch` enthält **alle Netto-Unterschiede** inklusive ursprünglicher Grid-Profile, Native Period Workbench Fix und Hover/Boot Guard. Nur auf Kopie der entsprechenden P7.37-Rhythmus-HTML:

```bash
mkdir -p /tmp/xen-p737-net && cd /tmp/xen-p737-net
cp /PFAD/XenSonar_P7_37_Grid_SingleBuffer_Rhythm_Test.html .
patch --batch --fuzz=0 -p1 -i /PFAD/patches/P7_37_Rhythm_to_GridProfiles_Hover_BootGuard_HTML_CUMULATIVE.patch
sha256sum XenSonar_P7_37_Grid_SingleBuffer_Rhythm_Test.html
# 35406409a61e3cbe8d989490b2f8dedd95ac2934205248f1873f643a1219d9bb
```

Die gepatchte Testdatei behält hier **den Basiskonventionsnamen**, hat aber exakt die neuen Ziel-Bytes; gegebenenfalls in den Zielnamen umbenennen.

## 3. Alternativ: Direkte HTML-Netto-Diff von P7.24 bis zum aktuellen Ziel

`patches/P7_24_to_Hover_BootGuard_HTML_NET_REFERENCE.patch` ist eine **alternative, ebenfalls bytegeprüfte** direkte Diff gegen die ursprüngliche **P7.24-HTML**. **Nicht** zusammen mit der Diff aus Abschnitt 2 auf dieselbe Datei anwenden.

```bash
mkdir -p /tmp/xen-p724-net && cd /tmp/xen-p724-net
cp /PFAD/Xensonar_P7_24_Song_Projects_Test.html .
patch --batch --fuzz=0 -p1 -i /PFAD/patches/P7_24_to_Hover_BootGuard_HTML_NET_REFERENCE.patch
sha256sum Xensonar_P7_24_Song_Projects_Test.html
# 35406409a61e3cbe8d989490b2f8dedd95ac2934205248f1873f643a1219d9bb
```

**Diese HTML-Diff ist kein Quellcode-Patch.** Ihr Vorteil: Codex kann alle Änderungen seit seinem archivierten Build gebündelt sehen und die funktionsfähige letzte Demo reproduzieren. Die nachhaltige Implementation erfolgt weiterhin im Quellbaum.

## 4. Codex HEAD und Integration

1. Vor dem Merge: `git status --short`, `git rev-parse HEAD`, Branch und uncommittete Änderungen feststellen, erhalten und archivierte P7.24-Basis gegen HEAD vergleichen. `e3568a8` ist nur die *gesicherte Referenz*, nicht zwingend der aktuelle Codex-HEAD.
2. Bei divergenter Entwicklung: auf Review-Branch echten **Drei-Wege-Merge** der P7.24→P7.37-Quelländerungen gegen den aktuellen Codex-HEAD; insbesondere neue Worklet-/Entrophon-/Audio-Optimierungen niemals durch blindes Überschreiben verlieren.
3. **Source-Port der HTML-only-Features:** Session-/Quick-Store und Clone-Identität in `src/mix/03_meta_menu.js`, `src/mix/03_quick_menu.js`; Grid-/Bassprofile mit vorhandenen Ownern; geteilte Native Period Workbench und Tuningpolicy, modale Dialoge, Bars-Hover aus echten Bibliotheksadaptern, Dock-Stabilität/Boot-Diagnostik aus der jüngsten HTML-Version. Kein Fake-Owner und keine zweite Bassgrid-Library. Eigentümerpfade vor Änderung per Suche verifizieren.
4. Nach Portierung: **einen neuen Netto-Quellpatch P7.24→LATEST** (oder gegen den nachgewiesenen gemeinsamen Vorfahren) erzeugen. Frischer `node build.cjs && node build.cjs --verify`; Byte-/Funktionstest gegen die mitgelieferte Ziel-HTML; bei bewussten Abweichungen eine **neue** HTML samt SHA und Änderungsbegründung bauen.
5. Testgates RED→GREEN→Regression: `Same Tuning A→B→A` bei 19 EDO mit verschiedenen Mode/Main-/Bass-Mutes; Native Bassgrid-Invarianten, BP-Lambda nur bei BP, Custom-Tuning-Klon ohne Quell-Tuning-Mutation, v1/v2-Persistenz nach Origin-Reload, Session-Save/Undo/Quick/Engage. Grid-Vorschau 155ms samplegenau inkl. Non-12/Tritave, Bowed Glass, Stop während Rendern. Hover zeigt echte Bars ohne Defaults. Dock ab erstem sichtbaren Frame korrekt positioniert.
6. Nutzer-/Hardware-Abnahme ausdrücklich offen: Opera/Firefox unter Linux/PipeWire, Start bei vielen Tabs, Fullscreen-Überbreite, Sound/Burst-Last, Long-Task/Memory/OOM-Profiling. Keine „absturzfrei“-/„schneller“-Behauptung aus einzelnen Headless-Stichproben.

## 5. Bewahrte Systemverträge

- P7.37 Rhythm ist *eine* vorgerechnete PCM-BufferSource, kein regressiver `setTimeout`- oder 340-ms-Lookahead-Notenscheduler. Auf gleicher Audiouhr alle Grid-Stufen inkl. Octave/Tritave, keine verlorenen Preview-Töne. Keine Vorhör-Änderung an Live Keyboard/RFL/Drums/Bass-Worklet.
- `instanceId` kennzeichnet Session-Kachel/Quick-Auswahl; `id` bleibt Tuning-Library-Key. Session-Profile dürfen nicht globale `__XenBassGrid`-Persistenz überschreiben. V1/V2-Migration ist datenschonend; Bearbeiten ≠ Engage/Live.
- Nicht-12-EDO und nichtoktavierende Tunings unterstützen; BP-Modusfilter, gemeinsame Markerkomponente, unabhängige Bassgrid-Variationen. Keine orange Play-Dreiecke als Cent-/Noten-Marker.
- Hover-Bars immer aus Original-Owner; keine heimlichen 1/2/4-Takt-Fallbacks. Grid-Hover unverändert.
- Boot Guard ist **nur eine erste Geometrie-/Diagnosemaßnahme**, kein vollständiger Lazy-Loading-/Startup-Umbau. Keine teure nachträgliche Arbeit auf Audio-Hotpath verschieben.
- Beat, Bass und Materialspur haben Vorfahrt; Apostroph-Notenlänge, gespeicherte Entrophon-Stimmen und die fehlenden authentischen RFL-/Drum-/Bass-Previews nicht zufällig mitbearbeiten.

## 6. Nachweise dieser Sitzung

- Unverändertes Quellarchiv P7.24 + `git apply --check`/`git apply` → `node build.cjs`/`--verify` → SHA-identischer P7.37-Rhythmus-Build, gezielter Node-Rhythmustest bestanden.
- HTML-Netto-Diff P7.37→LATEST mit `patch --fuzz=0`, byteidentisch.
- HTML-Netto-Diff P7.24→LATEST mit `patch --fuzz=0`, byteidentisch.
- Beide Inline-Scripts von LATEST mit `node --check` erfolgreich.
- **Nicht** aktuell nachgewiesen: vollständiger modularer FINAL-Port, Opera-/PipeWire-Hörtest, Live-Burstfreiheit, Multi-Tab-Absturzfreiheit oder echter Origin-Speicher-Reload.

**Es ist absichtlich kein redundantes Source-ZIP und keine `node_modules`-Kopie im Handoff.** Die geprüfte Archivbasis ist per SHA im `manifest.json` referenziert.
