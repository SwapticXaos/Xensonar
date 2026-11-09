# XenSonar W31 → AF01 → ML01 | Melodic Loop als primärer Einstieg

**Datum:** 2026-11-08  
**Status:** QA-Kandidat; lokale Firefox-Abnahme durch Nutzer noch ausstehend.  
**Korrekte Basis:** `XenSonar_W31_AF01_FIREFOX_AUDIOPARAM_FIX_TEST.html` — SHA-256 `09fba43a4848356ae4edf56057255e830e24ec893016135c41d206c568219c95`. Die vorherige Firefox-AudioParam-Korrektur AF01 bleibt enthalten.

**Ausgabe:** `XenSonar_W31_AF01_ML01_MELODIC_ENTRY_TEST.html` — SHA-256 `bde19bbab6705b3131ef44daad0cb4ca8bbb45efd090ce883b755c00e9575f69`.

## Ausgangsproblem

Der Canonical-Workbench-Einstieg `HWe()` verwendete persistierte Unterbereichswerte und nahm bei Erstaufruf standardmäßig `drums` an. Wer „Melodic Loop“ öffnete, landete deshalb im älteren Drum-Machine-Unterbereich. Das konterkariert die Produkt-Hierarchie: primärer Melodic-Loop-Kompositionsbereich, sekundärer, weiterhin zugänglicher Drum-Machine-Bereich.

## ML01: gezielter Eingriff

1. `HWe()` gibt als normalen Standard `melodic` zurück, unabhängig von historischen lokalen `drums`-Werten. Es werden **keine** gespeicherten Datensätze gelöscht oder migriert.
2. Der erste WWe-Render berücksichtigt weiterhin einen **expliziten** `__xenFirstForgeIntent` für `drums` (direkte Navigation aus dem Drum-Manager). Die bereits vorhandene Eventroute bleibt erhalten.
3. Das Anklicken der großen „Melodic Loop“-Kachel setzt nicht nur `canonical`, sondern auch den Unterbereich `melodic` – auch bei einer bereits geöffneten Drum Machine.
4. Die beiden bestehenden Unterbereich-Buttons sind umsortiert: **Melodic Loop links/erstes Element**, **Drum Machine danach**. CSS-Klassen, Beschriftung, Klick-Funktionen und gespeicherte musikalische Inhalte bleiben unverändert.

**Abgrenzung:** Kein Löschen/Deaktivieren der Drum Machine, kein Eingriff in die Audioengine, Effektketten, Sessions, Datenbank oder das Recording. Explizites Öffnen der alten Drum Machine ist weiterhin möglich; der Standard-Einstieg ist Melodic Loop.

## Nachweise

- RED (AF01): Erstanmeldung fällt auf `drums`; gespeicherte Drum-Sitzung ebenso.
- GREEN (ML01): Erstaufruf, alte lokale Drum-Einstellung, alte Sitzungs-Drum-Einstellung, beide zusammen, bereits `melodic` gespeichert.
- GREEN: ausdrücklich angeforderter Drum-Intent vom Host wird bereits beim ersten Render respektiert; der registrierte Drum-Event-Handler schaltet auf `drums`.
- GREEN: Hauptkachel „Melodic Loop“ schaltet `canonical` und `melodic`; die beiden untergeordneten Buttons sind in richtiger Reihenfolge und behalten richtige Handler.
- GREEN: AF01-AudioParam-Regression (Refucktor und Material), alle vier Refucktor-Kurven, beide Material-Fade-Richtungen.
- GREEN: Syntax aller 32 Inline-Skripte; 77 CSS-Style-Blöcke bytegleich zu AF01.
- Codevergleich: Änderungen nur an Inline-Skriptinseln #19/#20 (plus Dokumenttitel/Milestone-Metadaten). `W31_AF01_ML01_MELODIC_ENTRY.patch` rekonstruiert diese Unterschiede.
- Kontrollmutationen: Rückfall auf alte Initialisierung und absichtlich falsch verdrahtete Button-Aktionen werden von den Tests erkannt.
- **Nicht verfügbar:** Vollständiges visuelles Browser-E2E in hiesigem Chromium (`ERR_BLOCKED_BY_ADMINISTRATOR` für lokale HTML/HTTP-Routen); kein Firefox in dieser Umgebung. Daher kein Anspruch auf vollständige Hardware-/Browserfreigabe.

## Praktische Abnahme (lokal in Firefox)

1. Die ML01-HTML öffnen und über „Melodic Loop“ in den Material-Forge-/Workbench-Bereich gehen. **Erstes geöffnetes Teilfenster: Melodic Loop.**
2. Auf die ältere „Drum Machine“ wechseln: Sie soll weiterhin funktionieren. Danach auf die große „Melodic Loop“-Kachel klicken: zurück zum Composer.
3. Seite neu laden: wieder Melodic Loop als primärer Start, auch nach einem Besuch der Drum Machine.
4. Die direkte Drum-Machine-Navigation aus dem Drum-Manager kurz prüfen: Diese ausdrücklich angeforderte Aktion muss weiter funktionieren.
5. Die von AF01 reparierten Refucktor-Patternwechsel und Materialfades stichprobenartig prüfen; es darf kein „XenSonar needs recovery“ erscheinen.

## Adversarial-User-Rejection-Gate

- **Schutz-Invarianten:** Primärer Einstieg sinnvoll, sekundäre Drum-Funktion erreichbar, keine verlorenen Sessions, AF01-Audiofix nicht regressiert.
- **Mögliche Nutzer-Ablehnung:** (a) ältere Drum-Sessions ziehen Start weiter auf Drums; (b) „Go to Drum Machine“ öffnet irrtümlich Melodic Loop; (c) Klick auf große Melodic-Loop-Kachel belässt alte Drum-Ansicht; (d) Button-Reihenfolge ist korrekt, aber Klickaktionen vertauscht; (e) AF01-Recovery-Fehler kehrt zurück.
- **Diskriminatoren:** echte `HWe`, `WWe` und `SQe`-Produktionsfunktionen über VM; React-like State- und JSX-Handler; Host-Intent und Eventroute; AudioParam-Regression.
- **Selbstprüfung:** AF01 RED für Standardstart; ML01 GREEN. Negative Mutationen (alter Default, fehlverdrahtete Navigation) FAIL wie erwartet.
- **Urteil:** **PROVISIONAL/PASS für funktionale Codepfade**, reale Firefox-UI-Abnahme offen.

## Netlify

`XenSonar_W31_AF01_ML01_NETLIFY_ORDNER.zip` enthält einen deploybaren Ordner mit `index.html`; ZIP **entpacken** und den enthaltenen Ordner beim bestehenden Netlify-Projekt unter **Deploys** hochladen. Kein neues Netlify-Projekt erforderlich. Vor produktiver Veröffentlichung zuerst lokal testen; bei gleichem Netlify-Origin bleiben Browser-Speicherdaten normalerweise erhalten, der Patch löscht keine Datensätze.
