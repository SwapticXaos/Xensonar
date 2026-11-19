# MYZEL-COSMOS-01 · Art Installation: jedes Würfeln ein eigener Klangkosmos

Parent: `93dbe4d` (KEY-HANG-01, Zweig `claude/stoic-knuth-a6nx6f`). Rollback: `93dbe4d`.
Zonen: **HEISS** (Worklet-Kernel `createMyzelGDSP`: Knotennetz, Knotenton-Teiltöne, Resonator-Moden), **WARM** (Live-Brücke `myzelGUpdate`, 33 Hz; Canvas-Linien; Regler und Anzeige im Nodal Center), **KALT**: nichts.
Status: CODE_PRESENT, UNIT_VERIFIED (`tests/myzel_cosmos_01.test.cjs`, 10 Fälle), BROWSER_CHECKED (`tests/e2e/myzel_cosmos.cjs`, Chromium). **Nicht gehört.**

## Auftrag
Grundidee und Bewegungslogik des Oszillatorballs bleiben. Die Wechselwirkung der Knoten untereinander und mit dem Ball, also die Klangqualität je Sternbild, soll stärker variieren: jedes Würfeln ein anderer Soundkosmos.

## Befund (vorher)
„Rebuild Layout“ würfelt Positionen und die Organ-Zuordnung (11 Organe + 1 Doppel). Die zwölf JI-Tonhöhen bleiben. Was davon global klingt, sind vier Mittelwerte über alle 66 Knotenpaare (`density`, `spread`, `hollow`, `bloom` in `myzelGSpatialFrame`). Mittelwerte über 66 Paare zufälliger Punkte schwanken kaum: über 500 Würfe sd 0,047 / 0,034 / 0,076 / 0,078 (Skala 0–1). Jeder Wurf klang deshalb im Grundcharakter gleich; es wechselte nur, welcher Knoten gerade nah am Ball liegt.

## Änderung
1. **Sternbild-Signatur** (`myzelGConstellation`, `src/audio/07_myzel_g_geometry.js`). Aus Positionen, Organ-Rollen und JI-Verhältnissen einer Konstellation:
   - **Linien:** jeder Knoten zu seinen zwei nächsten Nachbarn; daraus Inseln (Zusammenhangskomponenten).
   - **Rohmerkmale:** Ballung (Clark-Evans), Streckung und Achse, vertikale Ausdehnung, Schwerpunkt, Linienlänge, harmonische Einfachheit der verbundenen Intervalle, Organ-Nachbarschaften.
   - **Verteilung:** Jedes Rohmerkmal wird gegen seine Verteilung über 4000 Zufallswürfe (gleiche Verteilung wie Rebuild Layout) in einen Rang 0–1 übersetzt. So landet jeder Wurf irgendwo im ganzen Bereich statt nahe am Mittel.
   - **Kosmos-Parameter:** Netz-Rückkopplung, Laufzeit, Anschlag, Ausklang, Metall (Teiltonlage), Hohlheit, Helligkeit, Schwebung, Registerspreizung, Mitklang, Glühen.
   - Reine Geometrie, kein Zufall, keine ID: eine gespeicherte Konstellation bringt ihren Kosmos zurück. Neu berechnet wird nur bei Layout-Änderung (Schlüsselvergleich).
2. **Knotennetz im Worklet** (`src/audio/09_myzel_g_dsp.js`): bis 16 Knotenstimmen (4 Teiltöne als rotierende Zeiger).
   - **Zupfen:** Der Ball zupft einen Knoten einmal pro Vorbeiflug (Nähe > 0,5, wieder scharf < 0,2) und lässt ihn in der Nähe leise glühen.
   - **Mitklang:** Eine Rasterlinie, die der Ball kreuzt, lässt Knoten im Oktav- oder Quintabstand mitklingen (je Knoten höchstens alle 0,3 s). Das bleibt lokal.
   - **Kaskade:** Der Impuls eines Zupfers wandert entlang der Sternbild-Linien, mit der Laufzeit der Linie (Länge × Laufzeit-Faktor des Kosmos) und ihrem Anteil.
   - **Stabilität:** Ein Knoten gibt höchstens „web“ < 0,85 seines Impulses weiter, die Gesamtenergie fällt also je Schritt. Stimmen unter −80 dB schlafen.
   - **Takt:** Steuertick ca. 2,5 ms. Alles ist beim Erzeugen allokiert; ohne Netzdaten oder bei Web 0 läuft nichts davon.
3. **Knotentöne** (Haupt- und Nachbarknoten-Ton) übernehmen die Klangfarbe des Kosmos: Teiltöne von harmonisch Richtung Biegestab-Moden (`toneMetal`). Root-Referenz und Ballton bleiben unverändert.
4. **Gemeinsame Farbe:** Die vier G2-Mittelwerte weichen bis 2,4-fach weiter vom Mittel ab (nur bei Web > 0).
5. **Resonator-Organe** klingen mit den Intervallen ihrer zwei stärksten Linien (in 2…4 gefaltet) statt fester 2,0/3,0-Moden.
6. **Oberfläche** (Nodal Center → Art Installation):
   - Regler **„Constellation Web“** neben Root Reference / Node Presence (Standard 70 %; 0 % = bisheriger G2-Klang, bit-genau).
   - Zeile **„Constellation cosmos“** unter dem Feld benennt den Kosmos, z. B. „resonant web · glassy · plucked · drifting echoes · wide registers · 2 islands“.
   - Die tragenden Linien sind im Canvas gestrichelt gezeichnet (Strichlänge ~ Laufzeit, Stärke ~ Anteil).

**Unverändert:** Bewegung und Physik des Oszillatorballs (kein Code berührt), Organ-Auswahl und -Route (max. 3 seriell), Root-Referenz, Hum stumm/Mycelium an/aus, Fallback ohne Worklet (dort ohne Netz).

## Daten-Owner, Persistenz
Der Kosmos ist eine Funktion der Konstellation (Owner wie bisher: `topologyRefs.current.nodes`, gespeicherte Resident Constellations). Neu ist nur `webLevel` im Installations-Mix (`myzelInstallationMix`, Standard in `Q4`), nicht persistiert wie die übrigen Mix-Werte. Keine Migration, keine Änderung gespeicherter Daten. Gespeicherte Konstellationen klingen jetzt mit ihrem eigenen Kosmos; bei Web 0 % wie vorher.

## Messung (Prüfstand `tests/helpers/myzel_cosmos_rig.cjs`: echte Brücke + Kernel, 48 kHz, Ballweg als Lissajous)
Werkzeug: `node tools/probes/myzel_cosmos_measure.cjs 16 10`.

**Bestimmt das Layout den Charakter?** ICC je Kennwert: Anteil der Varianz, den das Layout erklärt, gegenüber zwei verschiedenen Ballwegen. 16 Würfe × 2 Ballwege × 10 s.

| Kennwert | G2 (vorher) | Kosmos (nachher) |
|---|---|---|
| (wird nach dem Messlauf eingetragen) | | |

**Spannweite über Würfe** (400 Würfe, 5.–95. Perzentil): siehe Ausgabe unten.

**Pegel:** RMS Kosmos/G2 je Layout (gleicher Ballweg, 16 Layouts): min 0,99, Median 1,09, max 1,41 (Median +0,75 dB). Im Browser (3 Seitenaufrufe, Zufallslayouts): G2 0,090, Kosmos 0,077, Web 0 % 0,087, alles innerhalb der Layout-Streuung.

**Web 0 %:** PCM bit-identisch zum Parent über Brücke und Kernel (max. Abweichung 0, zwei Layouts, mit und ohne Ballkopplung).

**Rechenzeit Kernel** (Node, gleiche V8 wie Chromium, ms pro Audiosekunde): G2 ca. 88–95, Kosmos ca. 110–120, also **+20 bis 28 %** dieses einen Worklets. Läuft nur, wenn Mycelium an ist. Zeiger statt Sinustabelle in Netz und Knotentönen, Schlaf unter −80 dB, Liste wacher Stimmen.

## Tests
- `tests/myzel_cosmos_01.test.cjs` (in `GREEN_NODE_TESTS.txt`):
  - Web 0 % bit-identisch; Kernel ohne Netzdaten = G2-Kernel.
  - Kosmos ist reine Geometrie (Cache, IDs/Reihenfolge egal); Würfe spannen den Bereich auf.
  - Ballzupfen → Nachbar setzt genau eine Linien-Laufzeit später ein (±30 ms); Ballung klingt länger nach als eine gestreckte Linie.
  - Extremlayouts endlich und begrenzt; Netz leert sich ohne Kopplung.
  - Neuer Wurf während des Klingens ohne Sprung; Resonator-Partner nur bei Web > 0; Rechenzeit < 1,8× G2.
- `tests/e2e/myzel_cosmos.cjs` (Mess-Test, `MEASURE_TESTS.txt`), im echten Layout:
  - Regler in der Mix-Zeile; Anzeige vor/nach Mycelium; Linien werden je Frame gezeichnet.
  - 5 Würfe = 5 Layouts, mindestens 2 verschiedene Welten.
  - Hum hörbar bei 70 % und 0 %; Hum stumm bringt auch das Netz zum Schweigen.
- Fixtures: `tests/fixtures/myzel_g2_pre_cosmos/` (Parent-Stand der drei Dateien).

## HTML-Größe
`index.html` 8 321 267 → (wird eingetragen) Bytes. Audio-Teil im Hauptbündel (der Hum läuft auch außerhalb des Nodal Centers), Oberfläche im Lazy-Chunk `nodal`.

## Offen / Risiken
- **Nicht gehört.** Gewichte (Zupfstärke, Mitklang, Netzpegel 0,2, Ausklangbereich) sind aus Hüllkurven und Pegeln abgeleitet, nicht aus Abhören. Der Test-Ball fliegt schneller als der Ball im Raum; ein langsamer Ball zupft seltener, das Netz wird dann sparsamer.
- Ohne AudioWorklet (Fallback mit nativen Oszillatoren) gibt es kein Netz und keine Teiltonfarbe.
- Mehr als 16 Knoten (viele Custom Residents): die 16 tiefsten bilden das Netz.
