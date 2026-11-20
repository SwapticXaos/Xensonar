# TS-MOD-01: Probelauf, ein Bereich des minifizierten Kerns zurück als typisiertes Modul

**Frage (Nutzer, 20.11.):** Lohnt eine Rückübersetzung in die TS-Aufteilung (`reference/ts-400.2`)? Antwort war: nicht komplett, aber bereichsweise. Dieser Probelauf misst an einem Bereich, was das kostet und bringt.

Zone: **WARM** (Myzel-Farbstimmen-Steuerung, Routenanzeige im Nodal Center). Kein Audio-Thread.

## Was gemacht wurde
- **Bereich:** Nodal-Modulationsmatrix. Im minifizierten Kern `src/runtime/instrument/07_interpreters_and_installation.js` waren das 12 Kurznamen (`nI`, `jy`, `Zo`, `Uae`, `Kae`, `$ae`, `R0`, `Xae`, `Yae`, `Jae`, `Zae`, `eoe`). Vorlage: `src/features/resonance/nodalModulationMatrix.ts` aus `reference/ts-400.2`, Zuordnung 1:1.
- **Neu:** `src/ts/nodal/nodalModulationMatrix.ts` (303 Zeilen, mit Typen und lesbaren Namen). Inhalt = heutiger Stand: Gegenüber der September-Vorlage waren nur die Beschriftungen ins Englische übersetzt worden (21 Texte), die Rechnung war unverändert. Die drei Typ-Importe aus Nachbardateien sind durch kleine lokale Eingabetypen ersetzt (nur die Felder, die wirklich gelesen werden).
- **Build:** `tools/ts_module.cjs` übersetzt `.ts`-Dateien aus dem Manifest mit dem schon vorhandenen esbuild in eine globale `__XenTs_<name>`. `tools/build.py` und `tools/slim/page.cjs` rufen es auf. Die Auslieferung bleibt eine Datei.
- **Bindung:** Im Kern ersetzt eine Zeile die 4,6 KB minifizierten Code: die alten Kurznamen werden an die Modul-Exporte gebunden (`let`, damit sie wie die früheren Funktionsdeklarationen überschreibbar bleiben). Die Aufrufer in `src/rooms/nodal.js` und `src/rhythm/02_bass_and_rack.js` bleiben unverändert.
- **Typprüfung:** TypeScript 5.6.3 in `tools/slim` (fest versioniert), `src/ts/tsconfig.json` streng. `npm run typecheck --prefix tools/slim` und der Test `tests/ts_typecheck.cjs`.

## Prüfung
- `tests/ts_mod01_parity.test.cjs`: alter minifizierter Bereich (eingefroren in `tests/fixtures/ts_mod01_legacy_07.js`) gegen das neue Modul. Alle Konstanten identisch. 5 000 Zufallsfälle plus Grenzwerte (`NaN`, `null`, `±Infinity`, Text, negative Werte), jede Funktion einzeln: identisch (`Object.is` bzw. tiefer Vergleich).
- Negativtest Typprüfung: Ein Tippfehler `'softknee'` statt `'softKnee'` wird von `tsc` sofort gemeldet („Did you mean 'softKnee'?“). Im minifizierten Code wäre er still durchgegangen (die Kurve fiele auf linear zurück).
- `tests/e2e/ts_mod01_live.cjs` (echte App): Die alten Namen zeigen auf das Modul, die Routenanzeige in Art Installation zeigt die Texte aus dem Modul, keine Seitenfehler.
- `run_tests.sh` 138/138 (2 neu), `build.py --check` OK, `run_e2e.sh --fast` 77 grün, 0 rot, 0 flaky.

## Messwerte
| | vorher | nachher |
|---|---|---|
| `index.html` | 8 344 394 B | 8 347 191 B (**+2 797**) |
| Quelltext des Bereichs | 4,6 KB minifiziert | 10,5 KB TS (Typen, Namen, Kommentar) |
| Laufzeit | direkte Funktionen | dieselben Funktionen, einmal beim Laden gebunden; kein Aufruf-Mehraufwand |

Der Größenzuwachs kommt von der esbuild-Hülle (~1 KB) und den langen Namen, die die Verdichtung absichtlich stehen lässt. Bei weiteren Modulen kann `ts_module.cjs` die Namen intern kürzen (esbuild `minifyIdentifiers`), dann sollte der Zuwachs nahe null liegen. Nicht umgesetzt, weil es den Ein-Bereich-Vergleich verwischt hätte.

## Aufwand (Kern der Frage)
- Eigentliche Übertragung (Vorlage holen, mit heutigem Stand vergleichen, Labels nachziehen, Bindung): klein, weil der Bereich in sich geschlossen war und seit September rechnerisch unverändert ist.
- Einmalige Infrastruktur (Build-Schritt, Analysewerkzeug, Typprüfung, Paritätstest-Muster): der größere Teil. Für alle weiteren Bereiche wiederverwendbar.
- Unerwarteter Teil: Ein Analysewerkzeug (`tools/slim/page.cjs`) las Quellen roh ein und musste nachgezogen werden. Löschungen der Verschlankungswerkzeuge in `.ts`-Dateien werden jetzt abgelehnt (die übersetzte Ausgabe darf nie über die Quelle geschrieben werden).

## Nebenbefund
Die eigentliche Rechnung (Farbstimme `vpe` in `src/rhythm/02_bass_and_rack.js`, Aufruf aus `Ape`) läuft nur, wenn Mycelium an ist, **ohne** Installationsklang, mit Live-Power und außerhalb von Art Installation. Über die Oberfläche habe ich diesen Zustand nicht erreicht, auch nicht im alten Stand (der Mycelium-Knopf schaltet beides zusammen). Möglicherweise ist die alte Farbstimme toter Code. Nicht entschieden und nicht entfernt; Kandidat für eine eigene Prüfung.

## Risiken
- Reihenfolge im Manifest: Das Modul muss vor `07_interpreters_and_installation.js` stehen (steht es). Ein späterer Umbau, der die Reihenfolge ändert, fiele im Build-Check und im Live-Test auf.
- Analysewerkzeuge, die Quelldateien selbst lesen, kennen `.ts` nur über `page.cjs`. Andere Werkzeuge in `tools/analysis/` lesen das Manifest ebenfalls; sie liefen hier nicht.

Rollback: `54c212b`. **Nicht gehört** (Rechnung nachweislich identisch).
