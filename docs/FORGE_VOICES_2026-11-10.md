# FORGE-VOICES-01: drei neue Hörweisen in der Spectral Forge (Gaia, Hildegard, Isolde)

Stand 10.11.2026. Auftrag: die Spectral Forge mit neuen Interpretationen und Syntheseverfahren weiterentwickeln, ausgehend von Donor (Dual Donor Assembly) und Fractalia.

**Status: CODE_PRESENT · UNIT_VERIFIED · BROWSER_CHECKED (Headless-Chromium). Nicht abgehört, nicht USER_ACCEPTED, nicht RELEASED.** Ob die drei Verfahren musikalisch überzeugen, kann nur das Ohr entscheiden. Gemessen ist, was sich messen lässt (Tonhöhe, Bandbegrenzung, Pegel, Stereo, Loop-Naht).

## Was neu ist

Die Hörweisen-Auswahl im Synth Lab hat drei neue Einträge hinter Fractalia. Jede liest dieselbe gezeichnete Figur auf eine eigene Art. Der Carrier liefert wie bisher Tonhöhe, Zeit und Dynamik; die Hörweise liefert die Klangfarbe.

| Hörweise | Idee | Herkunft der Idee |
|---|---|---|
| **G · Gaia · Terrain Orbit** | Die Zeichnung ist eine Landschaft. Jede Note kreist um ihre eigene Stelle im Bild und klingt nach dem, was sie dort findet: Nachbarstimmen färben den Ton. Das linke Ohr schaut zurück in der Zeit, das rechte voraus. | Fractalia (Zeichnung als Instrument), hier zweidimensional und pro Note aus ihrer Umgebung gelesen |
| **H · Hildegard · Mirror Spectrum** | Die Intervalle, die in der Figur vorkommen, werden zu den Obertönen jeder Note (Prinzip nach Sethares). Jede Stimmung bekommt so die Klangfarbe, in der ihre eigenen Intervalle verschmelzen. Dazu ein Halo aus Resonatoren auf den Tönen der Figur, Anschlag stufenlos zwischen geschlagen und gestrichen. | Fractalia (relationales Lesen), Donor (Resonanzkörper) |
| **I · Isolde · Endless Spiral** | Ein selbstähnlicher Ton: derselbe Klang in jedem Register, wiederholt im frei wählbaren Rahmenintervall (Oktave, Tritave 3/1, 3/2, φ, beliebig). Linien können endlos steigen. Auf Wunsch pulst jedes Register in seinem eigenen, zum Loop synchronen Tempo, sodass sich auch der Rhythmus auf jeder Stufe wiederholt. | Fractalia (Selbstähnlichkeit), auf Spektrum und Zeit übertragen |

Gemeinsam für alle drei:

- **Stereo.** Die bisherigen Hörweisen rendern mono; diese drei rendern zwei Kanäle. WAV- und FLAC-Download behalten beide Kanäle.
- **Tonhöhe exakt** aus den Hz-Werten des Carriers (Phasenakkumulation), auch bei Glissandi und Mikrointervallen.
- **Kein Aliasing**: Jede Teilschwingung liegt unter der halben Abtastrate (additiv bzw. bandbegrenzte Wellentabellen pro Zeitpunkt).
- **Loop-bewusst.** Ausklang und Hall werden nicht abgeschnitten, sondern laufen am Loop-Anfang weiter. Der Hall ist als Rückkopplungsnetz so gebaut, dass das Ergebnis dem Dauerzustand einer endlosen Wiederholung entspricht. Für Einzelklänge abschaltbar („Tails continue at the loop start“).
- **Pegel ohne Verzerrung.** Statt eines Begrenzers wird der ganze Durchlauf leiser gestellt, wenn die Spitze über −0,7 dBFS läge. Die Statuszeile nennt den Wert.
- **Räumlicher Anteil** (Room, Room size) pro Hörweise einstellbar.
- **Freie Verhältnisse.** Rahmenintervall, Pulse pro Loop und Puls-Verhältnis nehmen Zahlen oder Brüche („3/2“, „7“, „1.618“). Schnellwahlen sind Abkürzungen, keine Grenze.

## Bedienung

Synth Lab → Hörweise wählen → Bild, fünf Presets, Regler. Der gemeinsame Play-Knopf darunter rendert und spielt die Figur. Regler reagieren sofort in Anzeige und Bild; gerechnet wird erst, wenn die Hand loslässt. Läuft die Vorschau gerade, startet sie danach von selbst wieder. Jeder Regler hat einen Tooltip mit seiner Bedeutung, alle sind per Tastatur bedienbar.

Die Bilder zeigen, was der Renderer tatsächlich liest: bei Gaia eine Lupe auf die längste Note mit der Bahn beider Ohren, bei Hildegard die Obertöne (farbig: auf ein Intervall der Figur verschoben), bei Isolde die Spirale der Teiltöne.

## Zone und Daten-Owner

- **Zone: KALT.** Offline-Render im kurzlebigen Worker, der nach jedem Render beendet wird. Keine Animationsschleife, kein Audioknoten und kein Timer, der weiterläuft: Nur während eines Renders prüft ein 20-ms-Intervall auf Abbruch (wie bei Fractalia), und nach einer Rezepturänderung bei laufender Vorschau wartet ein einmaliger, auf 20 s begrenzter Beobachter auf das Ende des Vorrechnens. Die Bilder werden nur bei geänderter Rezeptur oder Zeichnung neu gezeichnet. Im Live Room läuft davon nichts.
- **Owner:** `__ForgeVoices` (`src/forge/voices/02_owner.js`). Eine Rezeptur je Hörweise. Entwurf in `localStorage` unter `xensonar.forge.voices.v1`; zusätzlich Teil jedes Forge-Projekts (Feld `forgeVoices` im Projekt-Snapshot). Parameterbereiche, Standardwerte und Presets stehen an genau einer Stelle (`00_spec.js`).
- **Kein zweiter Audio-Kontext, kein zweiter Speicherweg.** Render, Cache, Play, Export und Transfer laufen über die bestehenden Forge-Pfade (`__f333RenderHearing`, Hörpfad-Cache, `__FractaliaLiveTransfer`).

## Geänderte Stellen

Neu: `src/forge/voices/00_spec.js`, `02_owner.js` (Hauptbundle), `01_dsp.js`, `03_runtime.js`, `04_lab_ui.js` (Lazy-Chunk `xen-room-lab`).

Bestehend, jeweils kleine Einhängepunkte:

- `app/forge/04_profiles_and_body_models.js`: drei Maschinen-Einträge; `forgeVoices` im Projekt-Snapshot und beim Laden.
- `forge/ui/02_donor_routing_and_hearing.js`: Listeneinträge und Farbe.
- `forge/editor/09_workflow_controls.js`, `rooms/lab.js`: beide Auswahlfelder lesen die Liste der selbst rendernden Hörweisen aus einer Funktion (`__forgeSelfMachine`) statt aus zwei fest verdrahteten Namen; Panel-Dispatch.
- `forge_and_melodic/10_audition_and_persistence.js`: Render-Dispatch, Cache-Schlüssel, Bereitschaftsanzeige, Route; Stereo-Export nur für die neuen Hörweisen.
- `forge/fractalia/14_live_transfer.js`, `forge/editor/06_output_routing.js`, `07_composition_and_preview_ui.js`: Der Transfer „gehörtes PCM als Material“ trägt jetzt auch die neuen Hörweisen. Für Fractalia sind die erzeugten Pläne unverändert (gegen die Vorversion verglichen, 4 Ziele).
- `storage/05_project_snapshots.js`, `forge/stamps/02_atlas_audition.js`: Rezeptur wird mit dem Projekt geprüft bzw. bei Stamp-Vorschau mitgegeben.

Unverändert: alle 76 Style-Blöcke byteidentisch, 32 Script-Blöcke (2 davon geändert: Hauptbundle und Lab-Chunk).

## Größe

| | Bytes |
|---|---|
| `index.html` vorher | 8 559 982 (SHA-256 `f10d77b2…c83a`) |
| `index.html` nachher | 8 617 859 (SHA-256 `36c51696…5a57`) |
| Zuwachs | 57 877 (+0,68 %) |
| davon lazy (Lab-Chunk, lädt erst mit der Forge) | 44 781 |
| davon im Hauptbundle (Rezeptur-Owner, Presets, Einhängepunkte) | 13 096 |

## Rückwärtskompatibilität

- Projekte ohne `forgeVoices` laden wie bisher und behalten den aktuellen Entwurf.
- Beschädigte Rezeptur einer Hörweise wird für diese eine Hörweise verworfen, der Rest bleibt.
- Die Cache-Schlüssel der bisherigen Hörweisen sind unverändert (das neue Feld wird nur bei den neuen Maschinen angehängt).
- Download der bisherigen Hörweisen unverändert (Kanal 0). Nur die drei neuen exportieren zwei Kanäle.
- Fractalia rendert und überträgt unverändert (Browser-Test: weiterhin mono; Transferpläne identisch).

## Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `python3 tools/build.py --check` | grün |
| `./tools/run_tests.sh` | 99 von 99 (97 bestehende + 2 neue Dateien mit 14 Fällen) |
| `tests/forge_voices_dsp.test.cjs` (PCM-Messung) | Tonhöhe < 0,4 Cent bei 146,83 Hz, 19-EDO-Stufe und 987,77 Hz +31 ct; Energie neben dem Teiltonraster < −75 dB bei 3520 Hz; Spitze ≤ 0,92; L ≠ R, bei Breite 0 identisch; Naht am Loop nicht größer als ein normaler Abtastschritt; Ausklang am Loop-Anfang vorhanden bzw. abgeschaltet null; deterministisch; Spiegelspektrum 5-EDO (3. Oberton +18,0 ct, im gerenderten Klang nachgemessen); Oktav- bzw. Tritavidentität; Spirale steigt um genau die eingestellten Stufen; 4 Pulse pro Loop; Carrier Tuning ändert Gaias Klangfarbe nicht; leere Figur, leeres Gelände, falsche Grenzen, Abbruch |
| Negativkontrolle | 7 gezielt eingebaute Fehler (Phasenkopplung, Bandgrenze, Ausklang, Spiegel, Spirale, Tuning, Hall) machen den Test jeweils rot |
| `tests/forge_voices_owner.test.cjs` | Entwurf, beschädigter Speicher, Projektladen, Invalidierung nur bei Klangänderung, Lazy-Laden, Fractalia-Transfer unverändert |
| `tests/e2e/forge_voices.cjs` (echte App) | Auswahl in beiden Auswahlfeldern, mit dem Pinsel zeichnen, je Hörweise Stereo-Loop in Figurlänge gespielt, Preset, Regler (kein Render während des Ziehens, Wiederaufnahme nach Loslassen), Bruch-Eingabe mit sichtbarer Ablehnung falscher Eingaben, Tastatur, Stereo-WAV, Wiederherstellung aus dem Forge-Workspace ohne Browser-Entwurf, Fractalia weiterhin mono, keine Seitenfehler |
| `./tools/run_e2e.sh` | alle grün |
| Transfer zum Material Track | im Browser geprüft: kommt im Live Room an (wie bei Fractalia) |
| Rechenzeit (Node, 48 kHz) | 24 Noten in 8 s: 0,2 bis 0,7 s. Dichtester Fall (512 Noten): 1 bis 7 s, im Worker mit Fortschrittsanzeige |

Angepasster Alt-Test: `tests/test_stamp_figure_p37.cjs` bekommt den neuen Owner als Attrappe in seine Sandbox (der Test lädt echten Quelltext mit nachgebauten Globals).

## Sichtbare Grenzen

- Mehr als 512 Noten in einer Figur (dichte Texturen, importierte Bilder): Gerendert werden die 512 mit dem meisten Klanganteil; die Statuszeile nennt, wie viele ausgelassen wurden.
- Isolde: Pulse pro Loop werden je Register auf ganze Zahlen gerundet, damit der Loop nahtlos bleibt (steht im Tooltip). Sehr enge Rahmenintervalle begrenzen die Stufen pro Rahmen (Teiltöne mindestens ca. 117 Cent auseinander).
- Töne außerhalb 20 Hz bis 12 kHz werden wie bei den bestehenden Carrier-Renderern oktavweise gefaltet.

## Offen

- **Abhören.** Klangcharakter, Pegelverhältnis zu den bestehenden Hörweisen, Preset-Auswahl und sinnvolle Reglerbereiche sind ungehört. Hier sind Korrekturen nach dem ersten Abhören zu erwarten.
- **Package Station.** Die Rezepturen reisen mit Forge-Projekten. Eine eigene Export-Kategorie für den losen Entwurf (wie bei Emilia/Fractalia) gibt es noch nicht.
- **Root Follow und Pink Track.** Der Transferplan nutzt denselben Vertrag wie Fractalia; im Browser geprüft ist nur das Ziel Material Track. Ob der Material Track im Live Room beide Kanäle wiedergibt, ist nicht untersucht.
- **Schmale Bildschirme.** Die Forge-Seite ist bei Telefonbreite insgesamt breiter als der Bildschirm (vorbestehend); das Panel folgt diesem Layout.
- **Dual Donor Assembly** selbst ist nicht verändert. Der STFT-Pfad dort ließe sich ohne Abhörvergleich nicht verantwortbar umbauen. Naheliegender nächster Schritt mit Hörprobe: Donor-Spektrogramm als Gelände für Gaia, und Hildegards Halo mit dem Resonanzprofil eines Donors.
- Firefox und Safari nicht geprüft.

## Lieferstand

`index.html`: 8 617 859 Bytes, SHA-256 `36c516965d239b375547ed9d9a492577b20ba13e7b3ccf951e11d72c669d5a57`.

## Rollback

Vorversion: Commit `f282965`, `index.html` SHA-256 `f10d77b231d3e2ca22eef1597dc3575153056826b81f86c2ed639c2f7637c83a`. Der Patch ist ein einzelner Commit; ein Revert entfernt ihn vollständig. Mit den neuen Hörweisen gespeicherte Projekte sollten in der Vorversion weiter laden: Laut Code (`F0`/`mo`) fällt eine unbekannte Maschine dort auf Cecilia zurück, das Feld `forgeVoices` wird nicht gelesen. Das ist aus dem Quelltext abgeleitet, nicht ausgeführt.
