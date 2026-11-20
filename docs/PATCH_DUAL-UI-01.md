# DUAL-UI-01 · Dual Donor: Variante 3 ersetzt 1 und 2, Oberfläche neu, Donor-Workshop aufgeräumt, Vorschau-Knacksen

Zone: **KALT** (Donor Workshop, Forge-Vorschau-Player beim Stoppen/Starten). Zweig `claude/stoic-knuth-a6nx6f` (auf Wunsch des Nutzers; Basis `d406387` + DUAL-ALIGN-01).
Rollback: `f1a7e08` (Stand direkt vor diesem Patch).

## 1 · Variante 3 ersetzt 1 und 2
- Die Auswahl „Synthesis variant“ entfällt. Jeder Entwurf (auch gespeicherte mit `revision: original|revised`) wird mit Variante 3 gerechnet;
  `__f35634Clean` normalisiert auf `aligned`. Fertige Ergebnisse älterer Fassungen bleiben als Audio abspielbar/exportierbar und zeigen „previous render“.
- Die Renderer `f3.56.36` (`src/forge/original/05_dual_donor.js`, gelöscht) und `f3.56.41` (aus `src/forge/dual/01_dsp_and_worker.js` entfernt) sind
  aus dem Seitenquelltext raus; Variante 2 bleibt als eingefrorene Messreferenz in `tests/fixtures/dual_donor_v2_renderer.js`
  (die Vorher/Nachher-Tests von DUAL-ALIGN-01 laufen weiter).
- `__F35636DualDSP` ist jetzt ein kleiner Halter, der Renderer registriert sich aus dem Lab-Raum (lazy). `__SpectralForgeF35.variants.*.dual` ist ein Getter.
- **Größe:** `index.html` 8 360 045 → 8 319 082 B (−40 963 B), ein `<style>`-Block weniger (77).

## 2 · Oberfläche Dual Donor (komplett neu)
Vorher: Experimental-Etikett, schmale Mittelspalte mit Methode/Richtung/Variante, Ergebnis nur als Textkachel, Bauen/Hören/Exportieren auf zwei
Bereiche verteilt (zwei „Build“-Knöpfe), versteckte Expertenschalter, drei übereinander gelegte CSS-Schichten mit `!important`.
Jetzt:
1. Kopf: Titel, **Fortschrittsband** (Sources → Relationship → Build → Use, aus dem echten Zustand), Name + Autosave-Punkt.
2. Zwei breite Quellkarten A/B (Spender wählen, Hören, „Draw a region as“, Spektrum, numerisches Markieren, Regionenliste).
3. **Relationship**: Methode als drei Karten mit je einem Satz Wirkung (Radiogroup), Richtung (nur bei Imprint) als Umschalter,
   „Optional: connect specific regions“ (Hinweis, A↔B-Pillen, Knopf), Verbindungsliste als Chips (Rolle, Richtung, ×), Rest-Material.
4. **Build**: links Länge/Stärke/Morph start/Morph end/Zeitausrichtung mit Wertanzeige und Einzeiler; rechts **ein** Primärknopf
   („Auto-Cross & hear“ bzw. „Build & hear“), Hear, Use in Forge, In Carrier, Save to Library, Export WAV, das **Spektrogramm des Hybrids**,
   die Analysezeile, Hinweise.
5. Ein einklappbarer Bereich „Keep, share and restore this experiment“ (Sitzung/Blueprint/Figur) statt Knöpfen im Kopf.
Alles ohne Expertenschalter erreichbar. CSS: eine Datei `styles/areas/022_…css` (−3 Schichten, `023_inline-023.css` entfernt).

## 3 · Donor Workshop allgemein
- Tabs „Single Donor / Dual Donor“ (ohne „Experimental“), Dialogkopf „Donor Workshop“.
- Werkzeugleiste: Hauptaktion „Listen to Figure“ hervorgehoben, „Reset recipe“ (statt „Base Recipe · Clear Markings“), ↶ Undo / ↷ Redo rechts gruppiert (statt „Back to Workshop“/„Workshop Forward“), Tooltips.
- Deutsch/Englisch-Mischung beseitigt (Anzeigetexte und Barrierefreiheitsnamen): u. a. Source time, Material direction, Pendulum, Preserve resonances,
  Spectral film, Breath & friction, Still image, Wandering, „Sound Form · …“ statt „Klanggestalt · …“. IDs der Presets unverändert, gespeicherte Rezepte unberührt.

## 4 · Knacksen beim Anwenden eines Donors (Melodic-Loop-Figur)
Ursache (belegt im Code und im Browser mitgeschnitten): Der einzige Vorschau-Player der Forge (`xt`) beendete **jede** laufende Quelle mit sofortigem
`source.stop()` mitten in der Schwingung; nur der Seek-Pfad rampte 6 ms aus. Der Workshop ruft vor jeder Änderung `Vt.stop();xt.stop()` auf, und neue
Starts mitten im Puffer setzten die Lautstärke ohne Rampe auf voll. Beim Anwenden eines Donors, während die importierte Melodie läuft, entstanden so zwei Sprünge.
Fix (`src/app/forge/07_preview_cache_and_controls.js`): jeder Stopp rampt 6 ms auf 0 und stoppt dann (Zustand sofort wie vorher); ein Start bei Position > 0 rampt 6 ms hoch,
ein Start bei 0 bleibt unverändert (die gerenderten Puffer tragen ihre eigene 2-ms-Kante).
Nicht verändert: Renderpfade (Klanggestalt/Material). Ein Melodie-Träger mit sieben Noten (Legato, Pausen, Pegelwechsel) zeigte im gerenderten PCM keinen Sprung an den Notengrenzen.
Test `tests/e2e/preview_click.cjs` (Web-Audio-Aufrufe im Seitenkontext mitgeschnitten): rot auf dem Parent (Stop sofort, ohne Rampe), grün mit dem Fix.
**Nicht gehört**; ob alle Knacksquellen damit erledigt sind, kann nur das Ohr entscheiden. Sollte es weiter knacksen: Hörfall mit der Melodie nennen, dann Worker-Eingabe mitschneiden (Methode in `PATCH_DUAL-ALIGN-01.md` §7).

## 5 · Prüfungen
`build.py --check` OK; Unit `tests/dual_donor_aligned.test.cjs` (10), Browser `tests/e2e/dual_donor_aligned.cjs` (angepasst: kein Variantenwahl-Feld, Methodenkarten,
Fortschrittsband, Spektrogramm, Morph-Weg) und `tests/e2e/preview_click.cjs` (neu); Gesamtläufe siehe Status.
