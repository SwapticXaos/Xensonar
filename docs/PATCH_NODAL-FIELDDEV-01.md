# NODAL-FIELDDEV-01: „Room III Field Devices“ aus Art Installation entfernt; Mycelium-Scoped-Post-FX (Echo auf Keyboard-Tönen) standardmäßig aus

Parent: Commit RESIDENT-HIT-01. Zone: WARM (Oberfläche) + Mycelium-Zweig des Live-Audios (HEISS, nur Standardwert). Status: CODE_PRESENT, UNIT_VERIFIED (run_tests 128/128), BROWSER_CHECKED (Block weg). **Klang nicht gehört, PCM-Vergleich nicht belastbar** (Messversuch Ausklang zu verrauscht).

## Befund 1: zwei Welten mit gleichen Namen
Die An/Aus-Schalter „Swarm Interpreter / Memory Window / Psychedelic Spiral / Cluster Glue / Semantic Friction / Topological Resonator“ in Art Installation sind **nicht** die Effekte des Hauptraums (`schwarmEnabled`, `schwarmUi`, …, die echte Send-Effekt-Geräte steuern). Sie gehören zu `nodalDeviceMatrix` und wirken nur auf die **Mycelium Color Voice** (Funktion `ru(…, "myzelColorVoice")`). Die Ziel-Regler Drone/Particles/Waves/Carrier/OneShot sind nur „prepared“, ohne Verbraucher. Zwei unabhängige Zustände, gleiche Namen → die Anzeige konnte scheinbar widersprechen.
Änderung: Block aus der Oberfläche entfernt. Daten und Standardwerte (`nodalDeviceMatrix`) bleiben, die Color Voice klingt unverändert. Nicht in Sessions persistiert, keine Migration nötig.

## Befund 2: Echo bei Mycelium ON
Mycelium ON schaltet das **Scoped Post-FX** (Router `eJ`: Hochpass, Tiefpass, Waveshaper, **Delay 0,12 s, Feedback 0,18**, Parallel 0,42, Gruppe „master“) parallel auf die Lanes drone/particles/waves/myzel/forge. Standard war „aktiv“; die Bedienung (`roe`) liegt in der historischen Enhancer-Ansicht, die auf Art Installation umgeleitet wird, also **nicht erreichbar**. Das ist die Kopplung zu den Keyboard-Tönen.
Änderung: Standard `myzelPostFxEnabled` = aus (`src/audio/01_voice_and_rfl_ownership.js`). Nicht persistiert; wer es zurück will, braucht wieder eine Bedienfläche.

Rollback: Commit davor (RESIDENT-HIT-01).
