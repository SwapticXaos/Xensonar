# Patch-Reihe: UI-Modernisierung (2026-11-26) — Isolierte Cherry-Pick-Übersicht

## 1. Eindeutige Basis-Identifikation

- **Basis-Branch (GitHub):** `claude/stoic-knuth-a6nx6f`
- **Basis-Stand / Commit:** `5ee1c4b` + Nachtrag `ARCH-WING-01` (Stand gemäß `docs/STATUS_2026-11-23.md`, Ausgangs-`index.html`: `8 594 069 B`, `5ee1c4b` SHA-256: `04bfa630…`)
- **Ziel-Branch für Übertragung:** `claude/charming-franklin-wouegz` (oder jeder neuere Stand)
- **Ausgeschlossen (NICHT übernehmen):**
  - `server.js` und `package.json` (reine lokale Preview-Hilfsdateien für Port 3000)
  - Audio-/DSP-Dateien (`src/audio/*`, `src/nodal/13_installation_ball_grid.js`) — wurden **nicht** verändert
  - Room III `Art Installation` (`mode === 'installation'`) — bewusst unverändert belassen für konfliktfreies Merging

---

## 2. Isolierte Patches (einzeln übertragbar)

Jeder der 5 Patches ist fachlich isoliert, 100 % offline-fähig (keine externen Fonts, Bilder oder CDNs) und kann unabhängig oder in Reihenfolge 1 → 5 auf `claude/charming-franklin-wouegz` angewendet werden. Nach der Übertragung im Ziel-Repo jeweils `python3 tools/build.py` (und `python3 tools/build.py --check`) ausführen.

---

### Patch 1 — `UI-TITLE-ART-01`: Vektor-Überschriften (Variante 2 „Sculpt“, ohne Mittelpunkt)
- **Ziel:** Künstlerische, kontrastreiche Art-Deco/Secession-SVG-Schriftzüge (`window.__XenTitleArt.Title`) mit durchgezogener Unterstreichung (ohne zentralen Punkt/Diamant) für **Live Room**, **Sound Design**, **Psychedelic Lab** und **Multitrack**. `Art Installation` bleibt unangetastet.
- **Neue Datei:**
  - `src/ui/06_room_title_art.js`
- **Build-Einbindung im Ziel-Repo:**
  - `src/index.template.html`: `<script id="xen-room-title-art">...</script>` vor den Room-Chunks einfügen
  - `source-manifest.json`: neuen Eintrag für `src/ui/06_room_title_art.js` ergänzen
- **Aufrufstellen (minimal, je 1–3 Zeilen):**
  - `src/rhythm/02_bass_and_rack.js` — Live-Room-Titel (`room: 'live'`, Eyebrow `ROOM I / PERFORMANCE`)
  - `src/rooms/nodal.js` — `NodalRoomHeader` (`mode === 'sounddesign' && window.__XenTitleArt ? ... : current[0]`)
  - `src/post-oct/034-xen-room-psylab.js` — `<h2>` in `.xpl-title-row` (`room: 'psylab'`)
  - `src/post-oct/032-xen-room-multitrack.js` — `<h2>` in `.xmt-title-row` (`room: 'multitrack'`)

---

### Patch 2 — `UI-SOUND-DESIGN-HDR-01`: Vertikal gestapelte Kopfzeile in Room III „Sound Design“
- **Ziel:** In `Sound Design` (`data-nodal-mode="sounddesign"`) steht `ROOM III / NODAL CENTER` wieder über `Sound Design` und der Untertitel `Material · Resonance · Constellation` direkt darunter statt daneben. `Art Installation` bleibt unverändert.
- **Geänderte Datei:**
  - `styles/areas/026_nodal-sound-designer-style.css`
    - `.nd-room[data-nodal-mode="sounddesign"]>.nd-shared-heading .nd-heading-copy` auf `display:flex;flex-direction:column;align-items:flex-start;gap:4px`
    - `.nd-room[data-nodal-mode="sounddesign"] .nd-eyebrow { font-size:10px; margin-bottom:0 }`
    - `.nd-room[data-nodal-mode="sounddesign"] .nd-heading-copy p { margin:2px 0 0; font-size:11px }`
- **Abhängigkeit:** Keine (funktioniert mit und ohne Patch 1).

---

### Patch 3 — `UI-PSYLAB-MODAL-01`: Interner XenSonar-Dialog statt Browser-`prompt()`/`confirm()` im Psychedelic Lab
- **Ziel:** Ersetzt alle nativen Browser-Popups (`window.prompt` / `window.confirm` inkl. Browser-URL-Zeile) beim Speichern von Sounds („Save Sound …“), Löschen und exakter Regler-Eingabe durch ein internes XenSonar-Modal via `ao.createPortal(..., document.body)`.
- **Geänderte Datei:**
  - `src/post-oct/034-xen-room-psylab.js`
    - Neuer `dialog`-State + `openPrompt` / `openConfirm` statt `prompt()` / `confirm()`
    - Portal-Modal (`.xpl-modal-back`, `data-psy-modal`) + zugehörige `.xpl-modal-*` CSS-Regeln im `CSS`-Template
- **Abhängigkeit:** Vollständig eigenständig.

---

### Patch 4 — `UI-EMBLEM-STARS-01`: Psychedelic Lab & Multitrack Embleme auf Titelhöhe + 8 XenSonar-Dreiecke
- **Ziel:** Hebt die runden Embleme in **Psychedelic Lab** und **Multitrack** jeweils direkt auf die horizontale Zeilenhöhe des Schriftzugs und umgibt beide Kreise mit den 8 sternförmig nach außen zeigenden XenSonar-Dreiecken (`viewBox="0 0 64 64"`, 4 kardinal + 4 diagonal um 45° gedreht).
- **Geänderte Dateien:**
  - `src/post-oct/034-xen-room-psylab.js` — `.xpl-title-row` (`display:flex;align-items:center;gap:11px`), `.xpl-emblem` (`38×38`, mobil `32×32`), 8 Dreiecke in Orchidee (`#f0abfc`)
  - `src/post-oct/032-xen-room-multitrack.js` — `.xmt-title-row` (`display:flex;align-items:center;gap:11px`), `.xmt-emblem` (`38×38`, mobil `32×32`), 8 Dreiecke in Champagnergold (`#fde68a`)
- **Abhängigkeit:** Eigenständig (optisch auf Patch 1 abgestimmt, funktioniert auch ohne Patch 1).

---

### Patch 5 — `UI-LIVE-CONSOLE-BURL-01`: Live-Raum Wurzelholz-Armatur, Echo-Druckknopf & Entfernung Mycelium-Drive-Relikt
- **Ziel:**
  1. Verkleidet die Live-Raum-Menüzeile (`[data-xensonar-performance-strip]`) als dunkle, leicht rötliche **Wurzelholz-Armatur** (offline Inline-SVG-Wurzelmaserung + Klarlack-Glanz + Messingkanten + eingefasste Hardware-Tasten) zur klaren Abgrenzung von der oberen Raum-Navigationsleiste. Alle bestehenden runden H4-Symbole (`.xen-header-unicode-icon`) bleiben unberührt.
  2. Entfernt das veraltete **Mycelium Drive**-Symbol ganz rechts in `[data-xen-status-controls]`.
  3. Setzt die passiven Statusanzeigen (Octave, Sustain, Detach, Pedal/Knob, Swell, Damp) flach in die Blende ein und hebt den klickbaren **Echo**-Schalter (`button[data-xen-status-toggle="echo"]`) als erhabenen, messinggerahmten Druckknopf mit „Echo“-Beschriftung und Leucht-Aktivzustand hervor.
- **Neue Datei:**
  - `styles/merge_meta_additions/047_xen-live-console-wood.css`
- **Build-Einbindung im Ziel-Repo:**
  - `src/index.template.html`: `<style id="xen-live-console-wood">...</style>` direkt nach `<style id="xen-h4-h1-icons-hairline-vector">` einfügen
  - `source-manifest.json`: neuen Eintrag für `styles/merge_meta_additions/047_xen-live-console-wood.css` ergänzen
- **Geänderte Code-Stelle (1 Element entfernt):**
  - `src/myzel/01_effect_mapping.js` — in `Noe` (`[data-xen-status-controls]`) das letzte Element `,u.jsx(kb,{kind:"drive",active:E,title:"Mycelium Drive ..."})` entfernen
- **Abhängigkeit:** Vollständig eigenständig.

---

## 3. Empfohlene Reihenfolge beim Übertragen auf `claude/charming-franklin-wouegz`

1. `UI-LIVE-CONSOLE-BURL-01` (sehr geringes Konfliktrisiko: neue CSS-Datei + 1 entfernte Zeile in `01_effect_mapping.js`)
2. `UI-PSYLAB-MODAL-01` (nur innerhalb von `034-xen-room-psylab.js`)
3. `UI-TITLE-ART-01` (neue Datei `06_room_title_art.js` + 4 kleine Aufrufstellen)
4. `UI-SOUND-DESIGN-HDR-01` (3 CSS-Regeln in `026_nodal-sound-designer-style.css`)
5. `UI-EMBLEM-STARS-01` (Header-Block + SVG in `034-xen-room-psylab.js` und `032-xen-room-multitrack.js`)
6. Danach im Ziel-Repo `python3 tools/build.py && python3 tools/build.py --check` sowie die bestehenden Tests (`run_tests.sh`) ausführen.
