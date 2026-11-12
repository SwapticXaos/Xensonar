# STEMS-01 · KBD-WINDOW

Parent: `882b494`. Status: CODE_PRESENT, UNIT_VERIFIED (`tests/stems_worklet.cjs`), BROWSER_CHECKED (`tests/e2e/stems_record.cjs`, `tests/e2e/live_keyboard_window_keys.cjs`; Chromium headless). **Nicht gehört, nicht USER_ACCEPTED.**
Rollback: `882b494`. HTML-Zuwachs: ca. +16 KB (Modul und Worklet-Code, kalt: läuft nichts, solange nicht aufgenommen wird; Lazy-Laden wäre möglich, hier bewusst im Hauptbündel, weil Power-off und Multitrack-Übergabe es ohne Ladezeit erreichen müssen).

## STEMS-01: „● Record stems → Multitrack“ (Aufnahmebereich des Live-Raums, neben Take / Long Session)
**Was aufgenommen wird:** die vier Rollen-Busse des Live-Mixers: *Instruments* (`main`: Partikel, Wellen, Keyboard, Entrophon …), *Drone*, *Rhythm* (Drums, Loops, Root-Follow-Impulse), *Space* (Echo-Rückwege). Abgegriffen **nach** der Rollen-EQ/-Lautstärke und **vor** der Master-Kette (Premaster, Glue, Clipper, Limiter, Trim). Die Summe der vier Spuren ist exakt das, was in die Master-Kette läuft.
Die Abgriffe sind zusätzliche Ausgänge der vorhandenen Rollen-Gains (Fan-out): keine bestehende Verbindung ändert sich, kein Knoten sitzt im Live-Pfad.

**Ablauf:** Knopf → Aufnahme (bis 5:00, Anzeige läuft mit) → Stopp (oder Limit/Power off) → alle Spuren stoppen sample-genau am selben Frame → hörbare Spuren gehen als **neue Spuren mit gemeinsamem Start** (Beat 0) und dem Live-Tempo als Quelltempo in den Multitrack, Room IV öffnet sich → die Zwischenarchive werden gelöscht. **Stille Spuren werden nicht gesendet** und in der Meldung genannt. Der Stereo-Master-Take bleibt unverändert und kann separat genutzt werden (beide Knöpfe schließen sich gegenseitig nicht technisch aus, der Stems-Knopf ist während einer Master-Aufnahme gesperrt, um Last zu sparen).

**Architektur (Heiß / Warm / Kalt):**
- HEISS: ein einziger AudioWorklet mit N Stereo-Eingängen, sample-synchron, Typed Arrays und Pufferpool (keine Allokation pro Block); existiert nur während der Aufnahme. Messung (V8, `tools/probes/stems_worklet_bench.cjs`): **7,99 µs pro 128-Frame-Block für 4 Spuren = 0,28 % des 2,9-ms-Budgets** (5 Eingänge: 0,36 %).
- WARM: der Hauptthread schiebt nur 8192-Frame-Blöcke (≈ 1,4 MB/s bei 4 Spuren) in den vorhandenen plattengestützten PCM-Speicher (IndexedDB, 4-MiB-Batches, atomare Checkpoints). Kein React-State pro Block. Hauptthread-Last gemessen (CDP, `tools/probes/stems_cost.js`): ca. +0,005–0,012 s/s gegenüber Leerlauf (Anlauf der ersten Aufnahme einmalig höher). AudioRenderCapacity liefert im Headless-Browser keine Werte: **echte Audiolast am Gerät nicht gemessen**.
- KALT: Dateien, Übergabe, Aufräumen nur auf Knopfdruck/Stopp.
- Speicher: nichts liegt im RAM; ein Limit von 5 Minuten (4 Spuren × 5 min Float32 ≈ 424 MB auf der Platte, danach im Multitrack-Material zusätzlich als lossless WAV).

**Datensicherheit:** Stem-Archive tragen `kind:'stem'` und erscheinen nie in der Liste der Master-Archive. Schlägt die Übergabe an den Multitrack fehl, bleiben die Stems im Browser-Archiv (Meldung), nichts wird gelöscht. Reste eines Absturzes werden beim nächsten Start entfernt. Ohne laufende Live-Engine (Power aus, auch nach Raumwechsel!) wird die Aufnahme mit klarer Meldung abgelehnt (kein stilles Aufnehmen von Stille). Power off während der Aufnahme beendet sie und übergibt das bisher Aufgenommene.

**Belege (`tests/e2e/stems_record.cjs`):**
- **Nulltest:** Summe der vier Spuren = Premaster (diagnostischer fünfter Abgriff), größte Abweichung **3·10⁻⁸** (Float-Rundung bei Spitzenwerten um 0,9); alle Spuren exakt gleich lang; Archive nicht in der Master-Liste.
- Echte Oberfläche: Knopf → Aufnahme → Taste gehalten → Stopp → Spuren erscheinen als Clips im Multitrack mit gleichem Start; stille Spuren gemeldet und nicht gesendet; keine Archivreste.
- Ablehnung ohne Engine mit Meldung; Power off während der Aufnahme ohne Hänger.
- `tests/stems_worklet.cjs` (Node): Lock-Step-Blöcke, Stille bei fehlendem Eingang, Mono = beide Kanäle, NaN → 0, sample-genaues Stop, Start mitten im Block, Limit, Lückenzählung, Pufferpool (ohne Recycling klare Fehlermeldung statt stillem Verlust).

**Grenzen / offen:**
- Granularität: vier Rollen, nicht einzeln Partikel / Wellen / Keyboard (sie teilen den `main`-Bus). Feinere Spuren und die editierbare **Slot-Zuordnung** (Stufe 2) brauchen zusätzliche Abgriffe im Graphen vor dem `main`-Bus und damit PCM-Vorher/Nachher.
- Spuren sind nach Rollen-EQ/-Level; ein Schalter „vor EQ“ fehlt.
- Spuren vor Live Mastering: der Master-Take klingt anders als die Summe (Glue, Clipper, Limiter fehlen).
- Gehört wurde nichts; die Audiolast im echten Gerät und die Auswirkung auf Aussetzer (Underruns) sind nicht gemessen.

## KBD-WINDOW: Tastatur-Fenster ließ sich nach unten schieben, aber nicht zurück
Gemeldet: Das Tastaturfenster steht ganz unten, beide Fenstertasten bewegen es nicht mehr, die Klaviatur ist unbenutzbar. **Reproduziert** für Tastaturen, deren physische „Minus“-Taste ein „-“ tippt (US/EN): Der Partikelsystem-Hotkey („-“/„_“) wurde vor der Fenstertaste „hoch“ (`Minus`) ausgewertet und verschluckte sie. Das Fenster ging mit der Taste „runter“ (`[`/`ü`), kam aber nicht mehr zurück und die „hoch“-Taste schaltete stattdessen das Partikelsystem um.
- Fix: Die physische Fenstertaste hat Vorrang; Shift+Minus („_“) schaltet weiter die Partikelsysteme zurück, die deutsche „-“-Taste (physisch `Slash`) unverändert.
- Test `tests/e2e/live_keyboard_window_keys.cjs`: runter bis unten, dann zurück bis oben, mit US/EN-Tasten und mit deutschen Tasten (`ü`/`ß`); keine Partikelsystem-Umschaltung durch die Fenstertasten; die Zeichen-Hotkeys bleiben erhalten.
- **Ehrlich:** Mit deutschen Tasten (`ß` auf Minus) trat der Fehler nicht auf (Test lief dort schon auf dem Parent). Falls das Fenster bei dir trotzdem klemmt, bitte Tastaturlayout (DE/EN-Schalter) und die gedrückten Tasten nennen. Ein Wechsel des Grid-Modus setzt das Fenster zusätzlich immer auf den Anfang zurück.

## KBD-WINDOW-02: Opera (Meldung: „geht in den anderen Browsern, in Opera scheint es eingefroren“)
Auf einer deutschen Tastatur sind die Fenstertasten **Ü** (runter) und **ß / ?** (hoch). Nachgestellt und bestätigt für Chromium (deutsche und US-Tasten) – **Opera selbst konnte ich hier nicht testen**. Die Ursache in Opera ist daher nicht belegt; zwei Absicherungen, die unabhängig vom Browser wirken:
1. **Zeichen-Ersatz für fehlende Tastencodes:** Meldet ein Browser keinen physischen Tastencode (leer oder „Unidentified“), werden dieselben zwei Tasten über das getippte Zeichen erkannt: Ü / [ = runter, ß / ? / - = hoch (Shift+ß = „?“ eingeschlossen). Mit vorhandenem Code ändert sich nichts.
2. **Bedienelemente neben den Tasten:** Im Hotkeys-Panel („Hotkeys A–#“) steht jetzt **„Keyboard window · row N of M“ mit ▲ ▼ und „⟲ start“**. Sie nutzen denselben Besitzer wie die Tasten (`shiftWindow` / `resetWindow`), funktionieren also auch, wenn ein Browser die Tasten abfängt. Tooltip nennt die Taste je nach DE/EN-Layout.
Test (`tests/e2e/live_keyboard_window_keys.cjs`): Zeichen-Ersatz mit leerem und „Unidentified“-Code (Ü, ß, Shift+ß), Buttons ▼ ▲ ⟲ mit Zeilenanzeige.
**Falls es in Opera weiter klemmt:** bitte mit gedrückter Taste in der Konsole (F12 → `window.addEventListener('keydown',e=>console.log(e.code,JSON.stringify(e.key),e.shiftKey,e.defaultPrevented),true)`) die Ausgabe für Ü und ß schicken; dann kenne ich die tatsächlichen Werte und kann gezielt reparieren. Bis dahin: ▲ ▼ ⟲ im Hotkeys-Panel.
