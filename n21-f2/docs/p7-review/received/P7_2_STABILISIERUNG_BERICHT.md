# XenSonar – P7.2 Spätphase / Rebase-Audit (20.10.2026)

## Entscheidung und Geltungsbereich

P7.2 ist eine **QA- und Quellmetadaten-Stufe**, kein Klangpatch. Sie enthält den P7.1-Handoff unverändert (Funktionspatches 00–08, Testpatch 09) und ergänzt die Stufe **10_P7_2_QA_FRESH_INDEX** mit drei Tests sowie der Aktualisierung von `source-index.json`. Keine Änderung an der Anwendung, AudioNodes, Scheduler, UI oder am generierten HTML.

**Originale Quelle:** `XenSonar_N21_F2_Nodal_Ball_Grid_Quellen(1).zip`, darin `n21-f2/`.

**Ziel-Artefakt:** P7-HTML SHA256 `bc0260682088a3a37a7bf9637d634b8027bc121b2546cb9b520a9760d94c002d` (5.672.609 Bytes).

## I. Ergebnis, vollständig ausgeführt auf frisch entpackter Codex-Quellbasis

| Prüfung | Status und Bedeutung |
|---|---|
| `apply_patches.py --to 10` | PASS; Stufen 00–10 sequentiell auf **frischem** Archiv; inklusive Dateihashes und Zwischen-HTML-Prüfsummen |
| `node build.cjs --verify` | PASS; exakt dieselben P7-HTML-Bytes wie vor P7.2 |
| Zehn erhaltene Domänentests | 10/10 PASS, darunter Keyboard-C11, Apostroph, Power, Nodal-PCM-Grid-Bank, Forge und Navigation |
| `p7_live_grid_space_behavior.cjs` | 17/17 PASS: tatsächlich extrahierte Grid-/Space-Logik mit begrenzten Browserstubs |
| `p7_unchanged_source_boundary.cjs` | PASS: 216 unveränderte Dateien, 20 deklarierte Änderungen, eine deklarierte Add-on-Datei |
| **Neu** `p7_2_patch_ancestry.cjs` | PASS: 55 Dateianwendungen und 168 genaue Quelltextänderungen aus 00–08 unabhängig im Speicher reproduziert; 21 unterschiedliche Module |
| **Neu** `p7_2_installation_ball_audio.cjs` | PASS: reale Ball-Grid-Control-Funktion: Initialisierung, Rasterkreuzung, Muting, Gate, Pitch-Erhalt, kein Catch-up. Zusätzlich Signalgrenzen für Fallback/Worklet statisch geprüft |
| **Neu** `p7_2_source_index_freshness.cjs` | PASS: neu erzeugter Index exakt reproduzierbar; **6.501 Deklarationen**, **1.113 Modulabhängigkeiten** |
| Negativtest Source-Index | PASS: der Test schlägt mit dem alten Index erwartungsgemäß fehl und nach der Aktualisierung erfolgreich an |
| `npm run test:live-stability` | PASS: RFL-Grenzen, nativer Fallback, Lifecycle, Worklet-Fragmentpreparation über 44,1/48/96 kHz |
| `npm run test:merge` | **ROT, nach wie vor.** Historischer Nodal-Preservation-Hash, Details unten. Nicht als funktionalen Audiofehler werten, aber Testschuld offen lassen. |

Alle Green-Gates sind reproduzierbare Softwareprüfungen; kein Ersatz für einen manuellen Opera-/PipeWire-Hörtest. Die RFL-Live-Suite testet isolierte DSP-/Lifecycle-Szenarien, nicht sämtliche gemeinsamen Live-Spielkonfigurationen.

## II. Was die Analyse von Stage 00 tatsächlich ergab

Stage 00 wurde im ursprünglichen Handoff verkürzend „UI Cleanup“ genannt. Die Analyse der **Original-Spans** ergibt vier fachliche Gruppen:

1. **Installation Sound On/Off**: zusätzlicher boolescher Soundstatus; dreifache Zulassungsschranke im Nodal-/Topologie-Kontext; neuer Schalter im Installation-Header. Keine Refucktor- oder Keyboard-Implementierung.
2. **Ball-Eigenton/Root- und Myzel-Pegel**: `ballToneLevel` wird durch die native Fallback-Pegelsteuerung **und** die Myzel-DSP-Worklet-Parameter geleitet; die Node-/Resident-Gains bleiben separat. Gezielte Funktionstests bestehen. Das ist **audio-relevant**, nicht lediglich CSS.
3. **Startdefault und Terminologie**: u. a. Sonar-Waves/Cursor-Konfiguration, `Semantic Tension` → `Klangspannung`, Anfangs-Nodal-Modus `installation`.
4. **Effektrack und Layout**: vorhandene Effekt-Bedienung einklappbar; die Anordnung wird per CSS verändert. Der UI-Bereich wurde nicht in diesem P7.2-Lauf erneut visuell geprüft.

Damit ist 00 technisch erklärbar und belegt, aber **seine endgültige Übernahme in einen *abweichenden* aktuellen Codex-Hauptzweig ist nicht automatisch freigegeben**. Dort muss geprüft werden, ob Installation-Sound und Ball-Tone bereits enthalten sind. Vor einer Doppelübernahme keine neue Engine/kein zweites Gating bauen.

## III. Warum `test:merge` rot bleibt

Die **ungepatchte** Codex-Basis besteht ihren historischen `npm run test:merge`-Lauf.

Nach Stage 00 ändert sich `src/nodal/07_sound_designer.js` absichtlich. `tests/nodal-ball-grid-preservation.cjs` erwartet nach Rückabwicklung nur der damals erlaubten `Nodal Ball Grid`-Spans den **alten Byte-Hash**. Der aktuelle Test kennt die danach entstandenen Änderungen aus Stage 00 nicht und scheitert sofort am ersten nicht erlaubten Hash.

Diese Invariante ist historisch real und wurde **nicht** ausgeschaltet oder durch einen neuen Sollhash ersetzt. P7.2 ergänzt stattdessen einen unabhängigen Herkunftsnachweis, der exakt prüft, *welche* neuen Spans hinzugekommen sind. Der Konflikt bleibt fachlich zu entscheiden: entweder die Stage-00-Änderungen behalten und die historischen Tests um explizit erlaubte neue Transformationen erweitern oder nicht gewünschte Stage-00-Spans aus der Übernahme herausnehmen. Ein Hash-Bulk-Update wäre unzulässig.

## IV. Metadaten und Wartbarkeit

`source-index.json` war veraltet. Das Original enthielt 6.468 Deklarationen und 1.099 Modulverbindungen; mit P7-Code sind es 6.501 und 1.113. Die neue Stufe 10 trägt ausschließlich den **Differenzpatch des Index** ein, kein vollständiges Source-Index-Duplikat. Der neue Index kann mit `npm run map:sources` unabhängig reproduziert werden; der Test kontrolliert Bytegleichheit.

Das neue `src/handoff/00_chat_feature_addons.js` bleibt ein bewusst gekennzeichneter Übergangscontainer (~22,8 KB) für mehrere fachliche Funktionen. Die fachliche Modulaufteilung sollte erst nach musikalischer Bestätigung und mit Äquivalenztests erfolgen – idealerweise als separater späterer Codex-Refactor, nicht als Teil eines Bugfixes.

## V. Begrenzter Opera-Spieltest (nächster menschlicher Schritt)

1. **Power/Echo**: Echo per Rechtsklick aktivieren; Power aus/ein; weder Feedback-Schleife noch reaktiviertes Echo ohne neue Aktion.
2. **Legacy zuerst**: Broken Lilt, Tape Halo, Dust Chime, RFL; einige Minuten Keyboard, Wellenstarter und Partikel. Achte besonders auf gleichzeitigen Beat-/RFL-Ausfall, nicht auf interne Pressure-Zahlen allein.
3. **Tuning / Space**: Hauptmelodie auf 12-EDO, Bass Grid abgeleitet oder separat z. B. 9-EDO. Während Space den Keyboard-Glissando-Bogen spielen; Bass/RFL/Drone behalten die vorherige Root. Nach dem Loslassen kein Catch-up; erst die nächste ausdrückliche Eingabe koppelt wieder ein.
4. **Drone**: Dark Sub / Ethereal Halo, eigene Frequenz, Cursor Follow und Grid-Snap unabhängig prüfen. Wobble-/Mute-Pattern speichern, Seite neu laden, wiederhergestellte Einstellung und Audio-Lifecycle prüfen.
5. **Spectral Forge**: Navigator-Region auswählen und mit ▶ vorhören; Save as Sample bleibt separat bedienbar und geometrisch unverdeckt.
6. **Nodal als Letztes**: siebenknotiges Instrument, hohe Stimmendichte, kleine Clicks von echtem Beat-Totalausfall unterscheiden. Nur sekundäre Stimmen dürfen bei Budgetüberschreitung gedroppt werden.

Bei Auffälligkeiten: Version/HTML, Aktion, Timing und ggf. aktuelle Browser-Runtime-ZIP sichern. Es sind keine zusätzlichen kontinuierlichen Messungen oder A/B-Hörschleifen als Selbstzweck nötig.

## VI. Freigabegrenze / Codex

- **Hier erledigt:** Quellrebase, Patch-Genealogie, Stage-00-Domänengrenzen, frischer Quellindex, Software-Regressionsläufe.
- **Hier nicht erledigt:** kompletter Browser-Hör-/Audiooutputtest; Bewertung jeder geänderten UI-Geometrie; produktive CPU-Profilmessung; endgültige neue Preservation-Vertragsdefinition gegen Codex-Hauptzweig.
- **Für Codex nur bei Anlass:** Konflikt im aktiven Hauptzweig, klarer gemessener Live-Engpass, unabhängige Prüfung der Zustandsübergänge oder modulare Aufteilung des Handoff-Containers. Keine Wiederimplementierung der neun bereits geprüften Funktionspatches.

## Anwendung in Codex

```bash
python3 apply_patches.py /PFAD/ZU/ENTPACKT/n21-f2 --to 10
cd /PFAD/ZU/ENTPACKT/n21-f2
node tests/p7_2_patch_ancestry.cjs . /PFAD/ZU/ORIGINALEN/n21-f2 /PFAD/ZUM/HANDOFF/patches
node tests/p7_2_installation_ball_audio.cjs .
node tests/p7_2_source_index_freshness.cjs .
node tests/p7_live_grid_space_behavior.cjs .
npm run test:live-stability
node build.cjs --verify
```

Für die vollständige alte `test:merge` ist der Preservation-Konflikt gesondert zu behandeln. Weder Teststatus noch Hardware-Performance als grün deklarieren, solange das entsprechende Gate nicht bestanden wurde.
