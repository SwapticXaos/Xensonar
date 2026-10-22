# XenSonar — konsolidiertes Codex-Übergabelogbuch

**Bearbeitungsstand:** 22.10.2026; ergänzt bis zum gesicherten P7.37 Hover/Boot-Guard-Artefakt  
**Status:** **Quellen- und HTML-Netto-Diffs verifiziert; letzte HTML-only-Funktionen noch nicht modular portiert**.  
**Historischer Codex-Bezug:** P7.24 / archivierter Commit `e3568a8` (`XenSonar_P7_24_Song_Projects_Quellen.zip`), inklusive Merge mit „Live Control Isolation“, UI- und Keyboard-Volume-Fix.  
**Neuester konsolidierter, modularer Patch:** P7.24 → **P7.37 Rhythm** (noch ohne späteren Grid-Profile/Period-Workbench-HTML-Patch).  
**Späterer Arbeitsstand:** P7.37 **Grid Profiles → Native Workbench UI Fix → Hover/Bars/Boot Guard**; die Gesamtdifferenz liegt als geprüfte **HTML-Netto-Diff**, noch nicht als modularer Codex-Quellpatch vor.  
**Integration:** Gesicherte neue Ziel-HTML ist bytegenau rekonstruierbar. Die neuen HTML-only-Funktionen müssen vor einer endgültigen Source-Kumulation in den modularen Dateien umgesetzt und erneut verifiziert werden.

## 1. Entscheidungsprotokoll zum Handoff-Format

- **Genau eine aktive kumulative Quellcode-Diff** von nachweislich identischer Baseline zum freigegebenen Zielstand. Alte kumulative Patchstände sind Alternativen, *keine* anzuwendende Kette.
- **Dieses Logbuch** zur semantischen Historie, Rücknahmen, Risiken, Tests und offenen Befunden. Einzelpatch-Dateien als forensische Reserve; nur bei Konflikt oder bisektioniertem Regressionstest heranziehen.
- **Eine referenzierte Test-HTML**, die bytegenau aus dem finalen modularen Quellenbaum reproduzierbar ist; ergänzend Manifest mit Base-Commit, Base-Archiv-SHA, Ziel-SHA, Patch-SHA, geänderten Dateien und Teststatus.
- **Abweichender Codex-HEAD:** Drei-Wege-Merge, nicht `git apply` blind. Die mit Codex parallel fortgeführten Audio-/Entrophon-/Worklet-Fixes haben Vorrang vor bequemen Whole-File-Überschreibungen.
- **Speicherpolitik:** keine redundanten `node_modules`, Git-Historien oder mehrfachen Full-Project-ZIPs. Ein wiederherstellbarer Milestone plus Netto-Diff/Handoff/HTML genügt.

## 2. Was ist der 'letzte Codex-Stand'?

Die erhaltenen Handoffs nennen als **archivierten, für die Direktpatches geprüften Codex-Basisstand** P7.24, Commit `e3568a8`. Der *tatsächliche derzeitige HEAD einer weitergelaufenen Codex-Sitzung* ist anhand dieser Dokumente **nicht sicher bekannt**. Darum ist `P7.24 → Ziel` zunächst eine **Basis-relative Änderungsdarstellung**, keine Aussage, dass Codex seit P7.24 nichts getan habe. Vor Merge Branch, HEAD-SHA, uncommittete Änderungen, Dateibestand und das letzte testfähige HTML feststellen.

Ältere P7.10- und N21-F2-Dokumente beschreiben historische Vorläufer; sie sind **nicht zusätzlich auf P7.24 anzuwenden**. P7.12/P7.23 wurden in der P7.24-Mergehistorie ausdrücklich nicht als zusätzliche Mergebestandteile übernommen.

## 3. Chronologisches Patch-Logbuch seit P7.24

| Zeitraum / Stand | Änderungen und Motivation | Integrationsstatus |
|---|---|---|
| **P7.24 — Ausgangspunkt (21.10.)** | Song Projects als damaliger UI-Stand. P7-UI per Drei-Wege-Merge auf Codex **Live Control Isolation** übertragen; initiales Keyboard-Volume/Wave-Starter-Volume-Problem separat repariert. Gespeicherte Entrophon-Sounds im Gegensatz zu `Current` weiterhin Gegenstand einer eigenen Resolver-/C11-Prüfung. | **Archivierte Codex-Referenz**, nicht automatisch aktueller HEAD. |
| **P7.25–P7.27** | 🎧 Meta-Menü-Konzept A statt altem Song-Projects-Editor; referenzbasierte Session-Collection, Save/Load, Drag/Drop, Undo/Redo, Quick Access, Originalbibliotheken, Navigation; Forge-PLAY-Typografie und Navigator-Selektion aufgenommen. | Später in Netto-Diffs konsolidiert. |
| **P7.28 / P7.28.1** | Sessions-Reiter, Donor-/Fullscreen-/Layout-Integration; optionale Übernahme von Hauptraum-Einstellungen mit `Include Settings`. | Implementierte Zwischenstände; vollständige atomare Multi-Store-Wiederherstellung **nicht nachgewiesen**. |
| **P7.29** | Layout und Beschriftungen konsolidiert; Geometrie/Quick-Dock untersucht. | Zwischenstand. |
| **P7.30** | **Engage!** aktiviert Session/Quick-Access ohne automatischen Transport und ohne automatisches Speichern; **Edit Current Live Session** holt die aktuelle Live-Palette als Editorentwurf; Dock erscheint erst nach gültiger erster Geometriemessung. | Quellpatch + Build-/Komponententests dokumentiert. |
| **P7.31** | P7.24→P7.31 als erste bereinigte **direkte Netto-Diff**, alte Song-Projects-Module/Tests entfernt; veraltete Pfeilgeometrie später korrigiert. | **Durch P7.32+ ersetzt. Nicht separat anwenden.** |
| **P7.32** | Richtung und Position der Engage-/Edit-Pfeile, fünf Links zu nativen Bibliotheksdialogen, sechste Navigationsposition, Overlay-Z-Index-Korrektur. | 19 Regressionen, Browser-Klickpfade, frischer Build und 13 geschützte Audio-Dateien laut Handoff geprüft. **Durch neuere Kumulation ersetzt.** |
| **P7.33** | Native Bibliothekslinks / Eckdreiecke / Fokus- und Layoutkorrekturen. | In P7.34 ff. enthalten. |
| **P7.34** | Palette, Bibliotheks-Buttons, kompakte Play/Stop-Tiles; **Materialspur-Preview** mit eigenem tatsächlichen Playerstatus/Ende; erster Grid-Audition-Provider über echten Keyboard-Owner, 155-ms-Step, Tuningperiode. RFL-/Drum-/Bass-Preview fehlen. | Reproduzierbarer P7.24→P7.34-Direktpatch, aber Grid-Audio anfangs nicht zuverlässig hörbar; später überholt. |
| **P7.35-F1** | Bibliotheksviolett auf reale XenSonar-Farbwerte `#4c316c` / `#a78bfa` abgestimmt; Grid-Play startet bei Bedarf AudioContext via `ensureAudioReady()`; Playback bleibt unabhängig vom Live-Tuning. | **TEILSTAND**, löst nicht Grid-Stufen- und Timingfehler; ersetzt P7.34-Netto-Diff. |
| **P7.35-F2** | Vollständige Stufenfolge inkl. Oktave/Tritave statt fehlerhafter `Fx(...)`-Tastaturregion; keine künstliche 23-Noten-Grenze; **fixer Bowed-Glass-Klang**, ohne Live-Preset-Umschaltung. | Quell-Direktpatch auf P7.24 vorhanden. 12/17/53 EDO, Tritave und irreguläre Raster in Stufentests. **`setTimeout`-Timing weiterhin schwankend.** |
| **P7.36** | Versuch des AudioContext-Lookahead-Schedulings. Hauptthread-Stalls über Lookahead-Fenster führen durch `continue` zu **ausgelassenen Stufen**. | Historischer Reparaturversuch, **für Zielstand von P7.37 abgelöst**. Nicht separat hinzufügen. |
| **P7.37 Rhythm** | Grid-Vorschau vollständig vorab im `OfflineAudioContext` zu **einem PCM-Puffer** rendern, anschließend **eine AudioBufferSource** mit samplegenauen Tonabständen 155 ms. Stopp/Race-Schutz. Keine Änderung an Keyboard-/RFL-/Drum-/Bass-/Worklet-Schedulern. | **Neuester nachgewiesener modularer Quellen-Direktpatch** `P7.24→P7.37 FullBuffer`. Chromium-PCM: 13/13 Onsets, künstlicher 650-ms-Hauptthread-Stall; Build/Verify; 13 geschützte Audio-Quelldateien unverändert. **Physischer Opera-Hörtest offen.** |
| **P7.37 Profiles / Period Workbench (später am 21.10.)** | Grid-Tiles mit eigenen `instanceId`, Modus/Mutes/Bassgrid-Konfiguration und Farben; `Clone and deviate`; Edit eines Klons mit optionaler Period Workbench; versioniertes v2-Session-/Quick-Storage und isolierte Bibliotheks-Variation. | **HTML-zu-HTML-Patch** `XenSonar_P7_37_GridProfiles_PeriodWorkbench.patch`; Chromium-Smoke und VM-Checks, aber **noch kein Quellcode-Direktpatch**, keine vollständige Persistenz-/Klang-Abnahme. Die damals beanstandete UI wurde in der nächsten Native-Workbench-HTML überarbeitet; **diese erste Version nicht als Zielzustand übernehmen**. |

### 3.1 Wichtige Korrekturen gegenüber älteren Handoffs

1. In P7.34 wurde eine **23-Stufen-Begrenzung** beschrieben; sie ist durch P7.35-F2 aufgehoben. Nicht als neue Einschränkung zurückbringen.
2. P7.36 hatte einen schedulerbasierten Auslasspfad; er ist **nicht** der Zielalgorithmus. P7.37 Rhythm löst die Grid-Preview anders: vollständiger PCM-Buffer statt Timer-/Lookahead-Kette.
3. P7.37 Rhythm hat eine **kumulative Quellen-Diff**; P7.37 Profiles nur eine **HTML-Diff**. Diese nicht zusammen als bereits integrierten Quellstand deklarieren.
4. `Clone and deviate` bedeutet zunächst **eigene Session-Instanz** des Tunings, nicht Kopie des zentralen Tuningdatensatzes. Nur nach einer wirklich bestätigten Tuningänderung darf ein neues `custom:`-Tuning entstehen.
5. P7.37 Profiles ist in der **ersten Profiles-Iteration grafisch beanstandet**; anschließend im Native Workbench Fix korrigiert (Nutzer-/Opera-Endabnahme noch offen). Die früheren Probleme mit Abstand, playartigen orangenen Markern und BP-Lambda bei 19 EDO wurden im HTML durch native Marker-Wiederverwendung, Bassgrid-Gruppierung und Tuningpolicy-Filterung adressiert. Dieser neuere Zustand muss modular portiert und im Nutzerbrowser bestätigt werden.

## 4. Technische Integrationsgrenze: Grid-Profile sind kein HTML-Src-Patch

Der **historische erste** Profiles-Patch begann nachweislich mit:

```diff
--- XenSonar_P7_37_Grid_SingleBuffer_Rhythm_Test.html
+++ XenSonar_P7_37_Grid_SingleBuffer_Rhythm_Profiles_Test.html
```

Er patchte eine **gebaute Testdatei**, nicht die modularen `src/`-Quellen. Die **neue kumulative HTML-Diff** reicht darüber hinaus bis zum Hover/BootGuard-Stand. Für Codex ist erforderlich:

- die tatsächlich gültige Grid-Profil-Semantik aus dem HTML-Teststand **gezielt in modularen Eigentümermodulen** implementieren (Meta-Sessions, Quick-Dock, Grid-/Bass-Resolver, Tuning/Period-Workbench),
- die inzwischen im Native-Workbench-Fix korrigierte UI-Geometrie und Zeichensprache aus dem neuesten HTML **in modulare Quellen übertragen**,
- keine zweite Tuningbibliothek und keinen zweiten Bassgrid-Manager erzeugen,
- Build aus modularen Quellen zur final freigegebenen HTML **bytegenau** oder nach dokumentierter bewusst geänderter Zielversion reproduzieren,
- aufbauend auf diesem Quellenbaum **einen neuen P7.24→FINAL-Netto-Diff** erstellen.

Dies ist der wichtigste noch ausstehende Quellkonsolidierungsschritt. Eine HTML-Diff kann als **visuelle/semantische Referenz** dienen, nicht als regulärer `git apply`-Patch ins Modulsystem.

## 5. Persistenz- und Audioverträge für den künftigen Quell-Merge

- Grid-Session `instanceId` ist die Tile-/Quick-/Preview-/Drag-/Color-Identität, `id` bleibt Tuning-Library-Identität. Zwei Tiles mit identischer Tuning-ID müssen unterschiedliche Profile live aktivieren können.
- `xensonar.meta-sessions.v2` und `xensonar.quick-menu.v2` dürfen vorhandene v1-Sessions nicht zerstören; Migration muss idempotent und möglichst reversibel sein. `Session Edit`, `Session Save`, `Engage` und `Live Quick` sind getrennte Transaktionen. Keine Editor→Live-Leaks.
- Bassgrid-Draft pro Profil darf globalen `__XenBassGrid`-Speicher nicht überschreiben; alter nativer Editor weiterhin wahrer Eigentümer seines globalen Datenmodells. Derived/Linked-, Mute-, Cent-/Drone-/RFL-Zustände beim Wechsel atomar behandeln.
- Kein 12-EDO-Default auf 19 EDO, JI oder nichtoktavierte Tritaven übertragen; Periodenendton, Mutes, Root-Policy und eigene Stufenfolge beachten. Bass-/RFL-/Materialspur-Tempo und Patternlängen bleiben unabhängig.
- Der Grid-Preview-PCM-Puffer ist **Preview-Isolation**, keine Rechtfertigung, Live-Keyboard, Wellenstarter oder Partikel ebenfalls offline zu rendern.
- Keine Veränderungen an Apostroph-Sample-/Keyboard-Notenlänge oder Root-Follow-Loop-Scheduler, solange dort kein eigener reproduzierbarer Bug belegt wird. Priorität Beat+Bass+Materialspur; Nebenereignisse bei Last droppen, keine Catch-up-Bursts.
- Der bislang nachweislich nicht endgültig behobene sporadische **Fullscreen-Überlauf nach anfangs korrektem Layout** bleibt eigener Regressionsfall. Reiner CSS-Viewport-Smoke genügt nicht.

## 6. Verifizierte Tests vs. offene reale Abnahmen

**Dokumentiert bestanden:** P7.24-basierte Direktpatch-Anwendung bis P7.37 Rhythm, `build.cjs`, `build.cjs --verify`, relevante Node-/DOM-/Chromium-Tests; P7.37 Rhythm Chromium-Audiopuffer/Onset-Messung (13/13 Stufen) unter künstlichem Main-Thread-Stall; Schutz von 13 definierten Entrophon-/Audioquellen laut P7.37-Manifest/Handoff.

**Nicht daraus ableiten:** stabiler physischer Audio-Output in Opera/Firefox unter PipeWire; Burstfreiheit unter Live-Last; vollständiger Hardware-/Touchpad-Test; korrekte RFL-/Drum-/Bass-Isolationspreviews; Langzeit-Session-Persistenz nach Reload/Quellmigration; eindeutiges BP-Lambda/19-EDO-Verhalten; grafische Freigabe des Period-Workbench-Editors; behobenes Fullscreen-Überlaufen.

**Neue kritische Tests für FINAL:** `Same Tuning A→B→A` (19 EDO, getrennte Modi/Bassmasken), Custom-Tuning-Klonvariation ohne Bibliotheksänderung am Original, Browser-Reload v1/v2, Session Quick-Save/Edit Current Live, Offline-Audio-Vorschau bei langer Tonleiter/Tritave, Meta-Layout bei Zoom/Fullscreen, echte Opera-Audiohörprobe unter gleichzeitiger Last, gesicherter Stop/Cancel auch beim Rendering.

## 7. Offene Arbeiten für den parallelen Chat / für Codex

**Vor Freigabe des neuen FINAL-Standes:**

- Native-Workbench-UI-Korrektur aus der neueren HTML-Demo in modularen Quellen nachziehen; alte orange Play-Symbolik nicht zurückholen.
- Quellmodul-Integration der Grid-Profile und Period-Workbench-Funktionen; keinen Direktpatch aus der bloßen HTML-Diff behaupten.
- Letzten gesicherten Stand `Hover_BootGuard` (SHA256 `35406409…`) als Reviewziel behalten; bei weiterer Iteration Ziel-SHA und kumulative HTML-Diff erneut aktualisieren.
- Die gesonderte **Saved-Entrophon-ID/Current**-Resolveraufgabe und die fehlenden Root Follow Loop-/Drum-/Bass-Audition-Provider offen halten; nicht mit Grid-Preview-Timing vermengen.
- Operas sporadischen Fullscreen-Überlauf, Lade-/Performanceprobleme und reale Audio-Bursts als eigene Gates behandeln.

**Vor tatsächlichem Codex-Merge:**

1. Codex `HEAD`, Branch, Dirty-Status und vorhandene Audiofixes sichern.
2. Gemeinsamen Vorfahren gegen den archivierten P7.24-Snapshot mit Commit `e3568a8` verifizieren.
3. Auf dem final bestätigten modularen Zielbaum ein einziges neues `P7.24_to_FINAL_CUMULATIVE.patch` samt SHA/Dateimanifest erzeugen.
4. Codex-HEAD *dreiseitig* auf Konflikte prüfen; keine älteren Kumulationen P7.31–P7.37 vorher anwenden.
5. Audio-/Entrophon-Owner, `source-manifest.json`, Testverträge, Quick-/Session-Migration und CSS/Portals gezielt vergleichen; alle abweichenden Audioquellen einzeln reviewen.
6. Frischer Build/Verify, Regressionen und reale Opera-Hörabnahme. Erst danach Integrationsfreigabe.

## 8. Fortsetzung der Patch-Historie bis zum neuesten gesicherten Browser-Artefakt

Die frühere Tabelle endet bei der **ersten P7.37-Profiles/Period-Workbench-HTML**. Danach wurden **zwei weitere Iterationen** gesichert. Sie ersetzen den ursprünglichen UI-Entwurf, ohne eine neue Audioengine-Iteration zu behaupten.

| Iteration | Tatsächliche Änderung | Prüf- und Integrationsstand |
| --- | --- | --- |
| **P7.37 NativeWorkbench UI Fix** | Gemeinsame Marker-Darstellung `__XenNativePeriodMarkerRack` für originale Workbench und Session-Tuningdialog; native Linien mit linksweisenden Dreiecken am rechten Rand statt playartiger orange Marker. `Add Bass Grid` und `Edit Bass Grid` kompakt gruppiert (im Chromium 10 px Abstand). Modusliste über native Tuningpolicy gefiltert: BP Lambda nicht bei 19 EDO; aus BP geklonte Custom-Tunings behalten ihre BP-Mode-Familie. | Zwei HTML-Patches (Folgepatch und netto ab P7.37 Rhythm). Laut Handoff Syntax-, Isolations- und Chromium-Smokes grün; kein modularer Quellpatch. |
| **P7.37 Hover/Bars + Boot Guard** | Die vier zeitbasierten Quick-Kategorien Material Track, Root Follow Loop, Drums und Bass zeigen die **aus der Originalbibliothek stammende** tatsächliche Taktzahl (`1 Takt`/`N Takte`); unbekannte Längen bleiben unbekannt. Grid-Hover bleibt erhalten. Das Quick-Dock erscheint erst nach zwei übereinstimmenden `requestAnimationFrame`-Geometriemessungen. Ein begrenzter Startbeobachter stellt `window.__XenStartupDiagnostics.snapshot()` bereit. | Jüngste HTML-only-Iteration; dokumentierte Chromium-/Hover-Smokes grün. Keine physische Opera-/Langlauf-Abnahme, keine bewiesene Crash-Ursache und kein Startzeit-Speedup. |

### 8.1 Aktuelle Ziel-HTML und Prüfsummen

`XenSonar_P7_37_GridProfiles_Hover_BootGuard_Test.html`  
SHA256: `35406409a61e3cbe8d989490b2f8dedd95ac2934205248f1873f643a1219d9bb` · 5.841.506 Bytes.

Der unmittelbar vorausgehende *modulare* Build `XenSonar_P7_37_Grid_SingleBuffer_Rhythm_Test.html` hat SHA256 `18445166e19116b2267cbdaf42ab2e0a0478bed951838e37d9cc87f1338cfc86` (5.812.820 Bytes).

### 8.2 Kumulationsprinzip in diesem Paket

- **Source-Netto-Diff:** `patches/P7_24_to_P7_37_Rhythm_SOURCE_CUMULATIVE.patch` auf **genau** dem P7.24-Archiv (Commit `e3568a8`), bis zum modularen P7.37-Rhythmusstand.
- **HTML-Netto-Diff ab P7.37 Rhythm:** `patches/P7_37_Rhythm_to_GridProfiles_Hover_BootGuard_HTML_CUMULATIVE.patch` enthält in **einem** HTML-Patch sämtliche jüngeren Profile-, Native-Workbench-, Hover- und Boot-Guard-Schritte. **Kein Source-Patch!**
- **Alternative direkte HTML-Netto-Diff ab P7.24:** `patches/P7_24_to_Hover_BootGuard_HTML_NET_REFERENCE.patch`. Zum Diff-/Endzustandsreview, nicht zusätzlich zur vorherigen HTML-Diff anwenden; **kein Source-Patch!**
- **Noch ausstehend:** ein einziger **P7.24→LATEST modularer Quellcode-Patch** nach Portierung der aktuell nur im erzeugten HTML liegenden Features.

Damit ist der Wunsch nach einer **kumulativen Diff seit Codex** bereits auf Artefaktebene überprüfbar erfüllt; auf modularer Ebene wird ausdrücklich zwischen *bereits integrierten* und *noch zu portierenden* Änderungen unterschieden.

### 8.3 In dieser Sitzung tatsächlich verifiziert

1. Archiviertes original P7.24-Quell-ZIP ausgepackt. `git apply --check` und tatsächliches `git apply` der Source-Kumulation bestanden. `node build.cjs` und `node build.cjs --verify` erzeugen einen **byteidentischen P7.37-Rhythmus-Build**. `node tests/p737-grid-buffered-audio.cjs` bestanden.
2. Netto-Diff P7.37-Rhythmus-HTML → aktuelle Ziel-HTML mit `patch --batch --fuzz=0` auf **sauberer Kopie** angewandt; Ergebnis SHA256 exakt `35406409…`.
3. Alternative P7.24-HTML → Ziel-HTML ebenso auf **anderer sauberer Kopie** angewandt; Ergebnis SHA256 exakt `35406409…`.
4. Beide eingebetteten Skripte des aktuellen Ziel-HTML mit `node --check` geprüft, ohne Syntaxfehler.
5. **Nicht erneut durchgeführt:** aktueller vollständiger Chromium-End-to-End-Test, physischer Opera-PipeWire-Hörtest, Real-LocalStorage-Reload, Multi-Tab-/OOM-Profiling. Vorherige Handoffs enthalten dafür selektive Smokes, aber keine Freigabe dieser offenen Punkte.

### 8.4 Boot/Memory: Diagnose darf nicht als Optimierung erscheinen

Die historische Stichprobe enthielt etwa 91,7 MB JS-Heap und Long Tasks um 350/310 ms; eine weitere einzelne Messung zeigte etwa 87 MB Heap, aber weiterhin Long Tasks von mehreren hundert Millisekunden. **Nicht** als belastbaren Vorher/Nachher-Gewinn interpretieren. Der Boot Guard hält lediglich die erste Dock-Position bis zur stabilen Messung verborgen und sammelt zeitlich begrenzte Daten. Noch keine nachgewiesene vollständige Browserstart-/Crash-Sanierung; schweres Audio darf nicht ohne unabhängige Analyse durch Delay-/Lazy-Hacks aus dem Startup entfernt werden.

### 8.5 Unverändert offene System-Gates

- Schnelles Umschalten zwischen Grid-Profilen desselben 19-EDO-Tunings (verschiedene Mode/Mute/Linked-Bass-Konfigurationen) ohne Global-Store-Leak, Audio-Bursts oder falsche erste Note.
- V1/V2-Persistenz nach echtem Origin-Reload, Session-Undo/Redo, Quick-Save/Edit-Current-Live, Custom-Tuning-Variation und Native Bassgrid unverändert.
- Realer Opera-/Linux-/PipeWire-Hörtest mit RFL/Bass/Materialspur-Last, Pointer, Fullscreen-Zoom und längerem Betrieb.
- Sporadische Browserabstürze und Startup-Long-Tasks präzise profilieren; Boot Guard und Heap-Snapshot genügen nicht als Ursachebeweis.
- RFL-/Drum-/Bass-Preview-Provider sowie Saved-Entrophon-vs-Current bleiben separate Aufgaben und dürfen nicht mit der Grid-Rhythmus-Korrektur vermischt werden.

---

## 9. Quellennachweis / archivierte Dokumente

- `XenSonar_Codex_Uebergabe_P7_10_plus_Preview_UI_2026-10-20.md` — historischer N21-F2/P7.10-Handoff.
- `XenSonar_P7_32_Codex_Handoff.md` — P7.24→P7.32 direkte Netto-Diff.
- `XenSonar_P7_34_Codex_Handoff.md` — P7.24→P7.34, neue Audition-Architektur.
- `XenSonar_P7_35_F1_Codex_Handoff.md` — Farb- und Audio-Boot-Teilstand.
- `XenSonar_P7_35_F2_Schmaler_Codex_Handoff.zip` — P7.24→P7.35-F2 mit Stufen- und Bowed-Glass-Korrektur.
- `XenSonar_P735_F2_Grid_Rhythm_Runtime_Forensik.md` — Hauptthread-Timing-Ursache, Vor-P7.36-Analyse.
- `XenSonar_P7_37_Codex_Hades_Rhythm_Repair.zip` — **Quellenpatch** `XenSonar_P7_24_to_P7_37_FullBuffer_Grid_Cumulative.patch`, 843.608 Byte, SHA256 `4903c81433c1bc33ccc59bb1ca7a1163d58deb0bb7a6eb9906a59867ee58018b`, Test-HTML-SHA256 `18445166e19116b2267cbdaf42ab2e0a0478bed951838e37d9cc87f1338cfc86`.
- `XenSonar_P7_37_GridProfiles_Slim_Handoff.zip` / `XenSonar_P7_37_GridProfiles_PeriodWorkbench_Handoff.md` — **HTML-Diff**, *nicht* Quellenpatch; Demo-HTML-SHA256 `9312f80b413bd8606fe2836c0f6086debcae84e99f7d8d939adeefc063f96d7c`.
- `XenSonar_P7_37_NativeWorkbench_UI_Fix_Handoff.md` — Marker-/BP-Policy-/Bassgrid-UI-Fix.
- `XenSonar_P7_37_Hover_BootGuard_Handoff.md` — Takt-Hover, Dock-2rAF und Boot-Diagnose.
- `XenSonar_MetaMenu_GridProfiles_Patchplan_V2_2026-10-21.md` — gründlicher **Entwurfs-/Abnahmeplan**, bei Konflikt mit bestätigtem Enddesign nicht als automatisch umgesetzter Code behandeln.

---

**Dokumentenpolitik:** Dieses fortlaufende Master-Handoff ersetzt für die *nächste Übergabe* die Auswahl mehrerer historischer P7.31–P7.37-Handoffs, **nicht** deren archivalische Aussagekraft. Bis die finale Test-HTML und Quellen-Diff aus dem anderen Chat vorliegen, ausdrücklich **keine Integrationsempfehlung als freigegeben**.
