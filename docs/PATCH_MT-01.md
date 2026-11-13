# MT-01 · Multitrack: Tempo-Eingabe · mehrere Projekte · Stem-Übernahme

Parent: PSY-X-02-Stand. Status: CODE_PRESENT, BROWSER_CHECKED (`tests/e2e/multitrack_projects_tempo.cjs`, `tests/e2e/stems_record.cjs` verschärft; Chromium headless). **Nicht von Hand bedient, nicht USER_ACCEPTED.** Zone: KALT (Raum IV schläft, bis er geöffnet wird; Projektliste lädt nur beim Öffnen des Menüs). HTML-Zuwachs: ca. +9 KB (9 111 399 → 9 120 232 Bytes).

## 1 · Tempo (MT-TEMPO)
**Befund:** Das Tempofeld war ein Zahlenfeld, das bei **jedem Tastendruck** committete (`retempo` auf alle Clips): Wer „120“ tippte, lief über 1 → 20, 12 → 20, 120 und zeitskalierte die Clips dreimal (Undo-Einträge inklusive). Daher das „Rumtricksen“.
**Jetzt:** Zahlenfeld mit Entwurf (Komma oder Punkt), **Enter** oder Verlassen des Feldes setzt das Tempo einmal; Esc verwirft; **↑/↓ = ±1 BPM** (Shift ±10, Alt ±0,1); dazu ein **logarithmischer Schieberegler** (20–400 BPM, Mitte ≈ 89 BPM), der erst beim Loslassen committet. Bereich 20–400 unverändert.
Test: Tippen löst keinen Commit aus; Enter/Tab/↑/Slider/Bereichsgrenze.

## 2 · Mehrere Projekte (MT-PROJECTS)
**Befund:** Es gab genau ein Projekt (IndexedDB `xensonar-multitrack-v1` / `projects` / Schlüssel `current`), keine Liste, kein „Neu“.
**Jetzt (oben rechts in Raum IV):** **„+ New project“** und **„Projects ▾“**. `current` bleibt das **Arbeitsprojekt** (alle bestehenden Wege – Inbox, Stems, Round-Trip, Export – lesen/schreiben es unverändert; **Retrokompatibilität**: vorhandene Projekte sind sofort das Arbeitsprojekt). Weitere Projekte liegen im selben Store unter `proj:<id>`.
- *Neu / Öffnen:* Das Arbeitsprojekt wird zuerst unter einem neuen Schlüssel **weggelegt** (ein unberührtes leeres „Untitled Arrangement“ nicht); schlägt das fehl, ändert sich **nichts**. Verlauf (Undo) wird beim Wechsel geleert, Wiedergabe gestoppt, Spurauswahl zurückgesetzt.
- *Liste:* Name, Tempo, Spuren, Clips, Datum; **Open · Copy · Rename · Delete**; „Save a copy of the working project“.
- *Löschen* entfernt **nur den Projekteintrag** nach Rückfrage; das Audiomaterial der Bibliothek bleibt (Clips verweisen nur darauf).
Test: Neu legt das alte weg; Liste mit Tempo; Open tauscht (das bisherige Arbeitsprojekt landet in der Liste); Copy, Rename (Dialog), Delete (abgelehnt = nichts gelöscht; bestätigt = nur dieser Eintrag).
**Offen:** Kein Export/Import einzelner Projekte als Datei, keine Projekt-Vorschau, EQ-Zustand je Spur-ID wird beim Öffnen aus dem Projekt gesetzt (Kopien teilen Spur-IDs, aber jeweils nur das geöffnete Projekt schreibt zurück).

## 3 · Stem-Übernahme „nur eine Spur“ (MT-STEMS-VIEW)
**Befund (gemessen):** Bei zwei Stems mit Klang entstehen **zwei Spuren** (neu mit Test belegt: genau zwei Clips auf zwei Spuren). Eine Spur entsteht nur für Stems **mit Klang**; stille werden übersprungen, und laufen Wave Starter und Keyboard auf **demselben Synthesizer**, ist das nach der vereinbarten Regel **eine** Spur (STEMS-04). Sah man nur eine Spur, hatte vermutlich genau eine Spur Klang.
**Jetzt:** Die Meldung sagt es ausdrücklich: „… only this stem carried sound (a track exists only for a stem that is not silent; one synth shared by Wave Starter and Keyboard is one track)“. Die Spurzahl-Prüfung in `stems_record.cjs` ist verschärft (zuvor ließ sie 1–4 zu).
Rollback: Commit davor (PSY-X-02).

## 4 · STEMS-05: „Rec also records stems“ – der Ablauf Rec → Enough! → Send to Multitrack
**Befund (Nutzer-Ablauf, reproduzierbar):** Instrument-/Rolle-Schalter wählen → Rec → Enough! → „Send to Multitrack“ ergab **genau eine zusätzliche Spur**. Ursache: Rec/Enough! nimmt nur das **Stereo-Take** auf und „Send to Multitrack“ sendet dieses als **eine** Spur; die Stem-Schalter wirkten nur auf den **separaten** Knopf „● Record stems → Multitrack“ daneben. Das war irreführend (und meine frühere Messung hat genau diesen Ablauf nicht abgedeckt).
**Jetzt:** Neben den Stem-Schaltern steht **„Rec also records stems: off / on“** (Standard **off**, kein Mehraufwand für normale Takes). **On:** Rec (Header- oder Panel-Knopf) startet die Stems mit, Enough! beendet sie (sample-synchron, bleiben als „kept“), und **„Send to Multitrack“ dieses Takes schickt die gewählten Stems als getrennte Spuren** („<Take-Name> · Instruments“ usw.). **Off:** wie bisher eine Stereo-Spur. Ein Crop-Bereich fällt auf die Stereo-Datei zurück. Ein neuer Take verwirft Stems des vorigen (kein Versand veralteter Stems); schlägt der Stem-Versand fehl, erscheint die Fehlermeldung (kein stilles Zurückfallen auf die Stereo-Spur).
**Grenzen:** Stems laufen höchstens **5:00** (Take bis 15 min / Long Session 2 h: die Stems decken die ersten 5 Minuten); Stems nur bei laufender Live-Engine; stille Stems werden nicht gesendet. Der separate Knopf „Record stems → Multitrack“ bleibt für Stems ohne Stereo-Take.
**Test:** `tests/e2e/stems_with_take.cjs` (der Nutzer-Ablauf im echten Layout): on → zwei Spuren „… · Instruments“, „… · Rhythm“, keine Archivreste; off → genau eine neue Spur. Zone: WARM (Start/Stop am Rec-Knopf, im Take läuft derselbe Stem-Worklet wie bei STEMS-01).
Rollback: der Commit davor (MT-01).

## 5 · MT-PLAYHEAD · MT-NAV-SEEK · eindeutigere Stem-Box
- **Playhead:** Die Linie (`.ph`, `top:0; bottom:0` im Scroll-Container) war nur so hoch wie der **sichtbare** Bereich und lief mit dem Inhalt mit – bei vielen oder neu hinzugekommenen Spuren endete sie über der ersten Bildschirmhöhe (Test auf Parent: Linie 538 px bei 989 px Inhalt, rot). Jetzt wird die Höhe im Meter-Loop auf `scrollHeight` gesetzt (nur bei Änderung). Mit Test: Linie = Inhaltshöhe, auch ganz nach unten gescrollt.
- **Navigator-Klick spult beim Abspielen:** Ein Klick in die Zeitleisten-Übersicht (Navigator, `rail h`) setzt bei **laufender** Wiedergabe zusätzlich den Abspielpunkt (und den Cursor) auf die angeklickte Stelle (auf das Raster gerastet, wenn Snap an ist) und spielt von dort weiter – gleiche Bedienlogik wie die Übersicht im Wave Editor (die Wave-Editor-Übersicht selbst ist ein anderer Code-Pfad; ein gemeinsamer Mechanismus wurde **nicht** erzwungen: der Multitrack hat Beats/Projekt-Engine, der Editor Sample-Frames). Steht die Wiedergabe, scrollt der Klick nur die Ansicht (unverändert). Test: Klick bei 75 % → Takt 13.1, Playhead läuft weiter; angehalten bleibt der Cursor.
- **Eindeutige Stem-Box:** Die Stem-Schalter stehen jetzt in einer eigenen Box mit Beschriftung „STEMS · SEPARATE TRACKS:“ (Rec / Enough! darunter bleibt das Stereo-Take).
Rollback: der Commit davor (STEMS-05).
