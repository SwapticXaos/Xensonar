# FORGE-DETUNE · Detune bipolar, Hz-Achse folgt · TIPS-EN

Parent: TAKT-SEEK-Stand. Status: CODE_PRESENT, BROWSER_CHECKED (`tests/e2e/forge_detune_bipolar.cjs`; `tests/tooltips_english.cjs` in der grünen Liste). **Nicht gehört, nicht USER_ACCEPTED.** Zone: KALT (Spectral Forge; Render-Transform wie bisher nur bei Bedarf). HTML-Zuwachs: ca. +2,3 KB.

## Detune (Spectral Forge, Carrier)
**Befund:** Detune war ein reiner Stauchungs-Regler (0–100 %) als **Render-Transform** (`__forgeDetuneRenderGrid`: das Gemalte bleibt unverändert, nur der Klang wird in ein engeres Tonhöhenfenster um den Schwerpunkt des Bildes gelegt). Die **Hz-Zahlen links blieben fest** – die Anzeige war nicht kohärent: eine Zeile mit „1k“ klang schon ganz anders.
**Jetzt:**
- **Bipolar:** Schieberegler −100 … +100 %. **Rechts = stauchen** (wie bisher, gespeicherte Werte 0…1 bleiben gültig und klingen gleich), **links = spreizen**: dieselbe Abbildung in die Gegenrichtung (vom Stauchungsfenster weg), also weiter auseinander um die Mitte. Beim Spreizen werden Anteile, die aus 20 Hz – 20 kHz herausfielen, **verworfen** (nicht an der Kante aufgetürmt). Ausgabe „compress 50 %“ / „spread 50 %“; der Schalter „Detune“ schaltet ein/aus (die Null auf dem Regler schaltet nicht aus, er springt auf ±1 %).
- **Hz-Achse folgt:** Ist Detune an (Carrier/Hearing), stehen die Zahlen 20k…20 dort, wo das **gemalte Hz liegt, das als diese Zahl klingt** (Umkehrfunktion der Abbildung, `__forgeDetuneInverse`, ein Besitzer mit dem Render über `__forgeDetuneMapper`); Zahlen, die nicht erreicht werden, entfallen. Die Achse trägt „detuned Hz“. Aus = Achse exakt wie zuvor (Test).
- Master-Tuning wirkt wie bisher auf die Achse.
**Test:** Synthetisches Bild mit zwei Linien (102 Zeilen auseinander): aus 102 · +50 % 68 · −50 % 138 · −100 % 174; im Forge: Regler bipolar, Achsenzahlen bewegen sich bei Stauchen und Spreizen gegenläufig („1k“), Achsenhinweis erscheint/verschwindet, aus = Achse identisch.
**Grenzen:** Der Detune-Schalter liegt im eingeklappten **Synth Lab** (Expand Synth Lab). Der Mittelpunkt ist der Schwerpunkt des gemalten Bildes (wie bisher), nicht die Mitte der Zeichenfläche. Gehört wurde nichts.

## TIPS-EN · Tooltips auf Englisch
Fester Bestand deutscher `title`/`aria-label`/`placeholder`-Texte übersetzt (Taktometer, Drum-EQ, EQ-Fenster/Bänder/Statuszeile) und per `tests/tooltips_english.cjs` abgesichert (scannt alle Quelldateien).
**Noch deutsch, bewusst nicht angefasst (sichtbare Beschriftungen, von Tests festgeschrieben bzw. größerer Umfang) – Entscheidung offen:** Paketstation (Rubriken „Projekte & Arbeitsstände“ …, Knöpfe „Alle / Keine / Invertieren / Nur / Außer“ samt Tooltips, Fehlermeldungen „Paketstation: …“), Bibliothek-Löschdialog („Überall löschen“), Wave-Editor-Effektparameter („Frequenz“, „Resonanz Q“, „Effektanteil“, „LFO-Frequenz“ …) und einzelne Fehlertexte.
Rollback: Commit davor (TAKT-SEEK).
