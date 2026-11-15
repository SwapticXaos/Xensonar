# LONG-BARS-01 · Drums und Melodic Loop bis 64 Takte (vorher 16)

Parent: `502f95e` (LANE-EQ-01). Rollback: `502f95e`.
Zone: WARM (Editoroberfläche, Normalisierung). Kein Audio-Graph, kein Scheduler geändert.
Status: CODE_PRESENT, BROWSER_CHECKED (neuer Test). Wiedergabe langer Muster **nicht gehört**.

## Befund
Die 16 war an vielen Stellen einzeln festgeschrieben, nicht aus einem Grund im Raster: Auswahlfeld der Drum Machine (`Array.from({length:16})`), `Da()` (Melodic-Loop-Takte), Eingabefelder in `lab.js`/`canonical.js`, Material-Metadaten (`__xenAudioMaterialBars`, Standard 16), Meta-Menü-Prüfung für Synth-/Field-Muster. Die Drum-Funktion `wg` selbst hatte keine Obergrenze.

## Änderung
Eine Konstante `__xenMaxPatternBars = 64` (vor `__xenAudioMaterialBars`), verwendet für: Drum-„Pattern bars“, Melodic-Loop-Takte (`Da`, Eingabefelder, Kapazität `capUnits`/`neededBars`), Material-Takt-Helfer (Standardobergrenze, wirkt auf Loop-Metadaten, z. B. Melodic Loop → Material) und die drei Takt-Prüfungen im Meta-Menü. Unverändert 16: Taktsegmente, Schläge pro Takt, Hold-Pattern-Speicher (andere Funktion), Quantisierungs-Referenztakte.

## Messung (Chromium, Drum-Pattern-Manager)
| Takte | Umbau | DOM-Knoten |
|---|---|---|
| 4 | 111 ms | 3 171 |
| 16 | 123 ms | 5 871 |
| 32 | 207 ms | 9 471 |
| 64 | 369 ms | 16 671 |
Einen Schritt umschalten bei 64 Takten: ca. 25 ms. Das Raster ist DOM je Schritt, kein Canvas; deshalb wächst die Knotenzahl linear.

## Test
`tests/e2e/long_bars.cjs`: Melodic Loop behält 40 Takte, 200 wird auf 64 begrenzt; Drum-Auswahl bietet 1–64 und nimmt 48 an; keine Seitenfehler.

## Offene Risiken / nächster Schritt
- 20 Minuten (ca. 600 Takte bei 120 BPM, 4/4) sind mit einem einzelnen Muster nicht erreichbar und mit dem DOM-Raster auch nicht sinnvoll: dafür braucht es ein Song-Modell (Abschnitte/Pattern in Reihenfolge) und ein virtualisiertes Raster.
- Nicht geprüft: Wiedergabe und Scheduler bei 64 Takten, Senden eines 64-Takte-Melodic-Loops an Material/Root Follow, Speichern und Laden, Hold-Pattern.
- Alte Songs sind unberührt (Obergrenze nur angehoben).
