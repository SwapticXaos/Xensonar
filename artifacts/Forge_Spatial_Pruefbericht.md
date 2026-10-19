# Forge: räumliche Bedienung, Metadaten und Patch-Nachprüfung

Stand: 19.10.2026. Basis: `e9bd304a22cbfc90b549fad579c1132b180a0ca5`.
Build: `Xensonar_N21_F2_Forge_Spatial_Test.html`, 5,599,768 Byte.
SHA-256: `7a34ef54d3d41248967fc370e9b7f9a74831fb425a62d16833a75951647a36f1`.

## Bestätigte Fehler und Korrektur

Der gelieferte Navigator-Patch hatte den Sample-Button absolut mit `bottom-full` positioniert. Diese nachträglich verwendete Utility ist im statischen CSS nicht definiert. Im alten Browserlauf lag Save bei y=498,58 bis 523,58; Root Follow bei y=495,08 bis 531,08: echte Überdeckung. Die bisherigen Tests hatten den Speicherweg, aber diese Geometrie nicht abgesichert.

Save und Root Follow liegen jetzt in **einem normalen vertikalen Layoutfluss**, Save mit 4 px Abstand nördlich von Root Follow. Die anderen Ziele bleiben eigene Aktionen. Die kompakte Höhe von 25 px bleibt erhalten. Bei schmalem Platz darf der ganze Aktionsblock umbrechen; er überdeckt keine Nachbaraktion. Dynamische Statusmeldungen stehen ebenfalls im Layoutfluss. Die bestehende Größe des Bars-/Segments-Feldes und der Renderweg ändern sich nicht.

Der Navigator hatte nach dem Patch überall `cursor-crosshair`. Hover verwendet jetzt dieselbe `e_`-/`Z5e`-Geometrie wie der tatsächliche Drag-Beginn: **ew-resize** an beiden sichtbaren Griffen, **crosshair** für die zentrale Sample-Auswahl und **grab** für Alt-Verschieben. Die Geometrie wird aus dem aktuellen Navigator-Bitmap übernommen, auch nach Zoom und Größenänderung; eine zweite Zeit-/Zoom-Formel wird nicht eingeführt.

Verworfene Alternative: einen weiteren absoluten Offset über dem Root-Button festlegen. Das könnte einen einzelnen Desktop-Zustand reparieren, überlappt aber bei umgebrochenen Zielzeilen erneut Nachbarn. Der normale Fluss kostet beim Erscheinen der Auswahl etwas Höhe und bleibt dafür ohne abhängig positionierte Überlagerung bedienbar.

## Heutiges Material-Konzept und Altlasten

| Objekt | Inhalt / nötige Information | Verwendung |
| --- | --- | --- |
| One-shot / Sample | PCM bzw. WAV; Ursprung ist importiertes/aufgenommenes oder gerendertes Audio | Particles, Wave Starter, Melodic Loop, Drums; keine exklusive Rolle erforderlich |
| Audio-Loop | Audio, Dauer, Anzahl Bars und optionaler Frequenzanker; Herkunft über vorhandene Render-/Quellinformation | Material Track, Root Follow oder Melodic Loop über die ausdrücklich gewählte Aktion |
| Synthetischer / hybrider Render | Audio-Ergebnis der jeweiligen Klangmaschine plus vorhandene Herkunft | Nach dem Rendern als Sample oder Loop nutzbar; Syntheseverfahren bleiben verschieden |
| Instrument-Rezept | Originale Synthese-/Instrumentdaten und Kurven | Bestehender Custom-Instrument-Weg; kein gewöhnlicher Audio-Sample-Typ |
| Forge-Projekt | Komposition/Raster, Body, Instrument-/Donor-Zustand und Editor-Einstellungen | Wiederherstellung und Weiterbearbeitung; Bars/Guide Segments dürfen als Editorzustand erhalten bleiben |

`particleExciter`, `waveMaterial` und `droneTexture` waren historische Nutzungsrollen. Sie sind keine verlässliche Aussage darüber, was die Audio-Datei ist. Im **aktiven Raw-Audio-Import** wird diese Auswahlliste deshalb nicht mehr angeboten. Auch der zweite Archiv-Name entfällt dort; der vorhandene Titel „Loop/Sample betiteln“ bleibt für Raw-Übergaben zuständig. Die Benennung des Forge-Projekts bleibt separat im vorhandenen Projektfeld.

Alte Rollenwerte werden beim Laden und Bearbeiten eines Projekts nicht gelöscht oder umgeschrieben. Frühere Archive, Adapter und zusätzliche historische Werkstätten behalten ihre Lesekompatibilität. Ausdrückliche **neue Loop-Übergaben** aus dem aktuellen Forge-Workflow verwenden unabhängig von einem alten Role-Wert den vorhandenen `loop`-Vertrag. One-Shots bleiben in der gemeinsamen Sample-Datenbank. Es wird keine neue Typ-Hierarchie und keine Dateiformat-Migration eingeführt.

## Timing und Frequenzanker

Das aktive Metadatenfeld enthält Bars, einen optionalen **Frequency Anchor (Hz)** und das aus Bars/Ausschnitt berechnete ursprüngliche Tempo. **Bar Segments** sind hinter „Melodic Loop · visual guides“ erreichbar. Es sind visuelle Bearbeitungshilfen, keine zusätzliche Root-Follow-Unterteilung. Vorhandene gespeicherte Guides bleiben erhalten; die Root-Follow-Engine wurde nicht geändert und liest für den Tonhöhenanker weiterhin `entry.rootHz`.

Ein tatsächlich gefundener Übergabefehler: Sowohl die Raw-Audio-Adapter als auch die gerenderten Forge-Übergaben setzten `rootHz` fest auf `null`. Die gemeinsame kleine Funktion `__forgeMaterialRootHz` prüft jetzt den optionalen Wert, und die bestehenden Übergaben reichen ihn weiter. Leer bedeutet weiterhin automatische/bisherige Fallback-Behandlung. Ein gesetzter Anker wird weder aus dem Sample neu geschätzt noch als Änderung der Audiodaten angewandt. Wird der Anker während einer Render-Übergabe geändert, verwirft der bestehende Export-Guard das veraltete Ergebnis.

Belegt sind 110 Hz / 3 Bars in tatsächlichen Raw-Übergaben an Material und Root Follow, ein beibehaltener 110-Hz-Anker im gerenderten Root-Export sowie vollständige Wiederherstellung des Wertes durch Projekt-Snapshot und Undo/Redo. Das Render-Beispiel hat nach dem Carrier-Import wieder 1 Bar; diese absichtliche Kompositionsvorgabe bleibt korrekt erhalten.

## Lokale Anordnung und Zuständigkeit

Dies ist ein Live-/Iterationswerkzeug: Auswahl → hören → Ziel wählen muss beim Editor erreichbar bleiben. Geprüft wurden der Transport-Rack-Container, seine Status-/Projektzeile, die Zielzeile, der Navigator und das angrenzende Donor-Importfeld.

| Kontrolle | Forge-Zeichnung | Raw-Import | Andere Räume |
| --- | --- | --- | --- |
| Navigator-Auswahl / Save | primär; bezieht sich auf gerenderten Forge-Hörweg | keine Umdeutung zum Raw-Speichern | nicht global eingeblendet |
| Root-/Material-/Pink-Ziele | primär; getrennte Ziele | eigene Raw-Aktionen bleiben erhalten | vorhandene Empfänger unverändert |
| Raw-Metadaten | kein zweiter globaler Konfigurationsblock | primär nach Laden einer Quelle | kein neuer dauerhafter Streifen |
| Bar Segments | Editor-Hilfe | optionales Detail | keine neue RFL-Quantisierung |

Keine neue zweite Transportinstanz, kein neuer DSP-Pfad und kein neuer Scroll-Container. Die kleine Metadaten-Komponente isoliert das Formular vom umfangreichen Import-/Vorschau-Controller; ihre Eingaben ändern keine historischen Rollen.

## Nachprüfung und Grenzen

Die Freigabeprogramme `npm run test:consolidation` und `npm run test:consolidation:browser` sind um die neuen Vertrags-, Geometrie- und Übergabetests erweitert; Nachweise liegen unter `results/forge-spatial/`.

- Erwarteter Gegenbeweis am unveränderten Vorgänger: derselbe Cursor-Test scheitert mit `crosshair` statt `ew-resize` am linken Griff. Als erwarteter Fehler separat dokumentiert, nicht als bestandener aktueller Test gezählt.
- 1490 × 1000 und 720 × 1000: echte DOM-Rechtecke, Abstand oberhalb von Root Follow, unabhängige Pointer-Hit-Targets und genau ein Sample-Button. Screenshots sind als Nachweis enthalten.
- Echte linke/rechte Zoom-Gesten, beibehaltene Gegenkante, Alt-Verschieben, Whole Drawing und zentrale Auswahl; keine bloße Prüfung des Symboltexts.
- Native OGG-/IndexedDB-/WebAudio-Prüfungen aller vier vorher gelieferten Patches: überlappende Imports, Eingaben ohne React-Event-Absturz, Donor-Erhalt, Sample-WAV, expliziter Pink-Versand und Nodal-Auto-/Intervallvorschau.
- Readiness und Hz-/Detune-Prüfungen aller acht Carrier-Maschinen sowie Projektintegrität, geteiltes Undo, Merge, Granular-Hold und die 65 N21-Prüfungen.
- Exakte Quellgrenze: alle 205 Quellmodule und 27 Styles gegenüber dem Vorgänger. Erlaubt sind ausschließlich die aufgeführten Ersetzungen und der neue kleine Metadaten-Adapter. Frühere Baselines werden nicht neu berechnet; alte Prüfungen akzeptieren die neue Schicht erst nach dieser Prüfung.

Die Aggregate `host-validation.json` und `browser-validation.json` nennen Build-Hash, abgeschlossene Programme und tatsächliche Ergebnisse. Der Prüfbericht bestätigt lokale Tests, keinen entfernten Actions-Lauf. Historische Nachweise und Builds bleiben unverändert.

Offen: physische Hörprobe, Opera-/Firefox-/Safari- und Dauerlastprüfung, globale Render-/Live-Ressourcenbudgets. Ältere zusätzliche Werkstätten dürfen weiterhin ihre historischen Rollen zeigen; sie wurden nicht blind auf das aktive Importmodell umgestellt. Die allgemeine Sample-/Loop-/Projekt-Klassifikation ist hier geklärt und lokal bereinigt, nicht durch eine riskante Migration aller Alt-Adapter vereinheitlicht. Keine Zusicherung vollständiger Fehlerfreiheit aus diesen begrenzten Prüfungen.

Abgeschlossene Freigabe: 18 Host-/Build-Prüfungen, 7 Browser-/Build-Prüfungen und 65 N21-Prüfungen erfolgreich; zusätzlich Merge und Granular-Hold. Alle aktuellen Aggregate passen zum oben angegebenen Build.
