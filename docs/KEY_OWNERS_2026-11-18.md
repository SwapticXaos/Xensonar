# Tasten-Zuständigkeit (KEY-ROUTER Stufe 1, Messung)

Werkzeug: `tools/probes/key_owner_map.cjs` (unverdichteter Build, Chromium, Power an). „Beansprucht“ = der Listener ruft `preventDefault` oder `stopPropagation` für diese Taste auf. Handler, die ohne diese Aufrufe handeln, sind hier nicht sichtbar.

Angemeldete Tasten-Listener an window/document: 19 (am Ende noch aktiv: 11).

## LIVE ROOM

| Fokus · Taste | beansprucht von |
|---|---|
| body | Backspace | src/rhythm/04_workspace_and_transport.js:173:3000 |
| body | Delete | – |
| body | Space | src/rhythm/04_workspace_and_transport.js:173:3000 |
| body | Enter | src/rhythm/04_workspace_and_transport.js:173:3000 |
| body | Escape | – |
| body | Tab | src/rhythm/04_workspace_and_transport.js:173:3000 |
| body | ArrowLeft | src/rhythm/04_workspace_and_transport.js:173:2318 |
| body | ArrowRight | src/rhythm/04_workspace_and_transport.js:173:2318 |
| body | ArrowUp | src/rhythm/04_workspace_and_transport.js:173:2318 |
| body | ArrowDown | src/rhythm/04_workspace_and_transport.js:173:2318 |
| body | KeyA | src/rhythm/04_workspace_and_transport.js:173:3000 |
| body | KeyQ | src/rhythm/04_workspace_and_transport.js:303:41 |
| body | Digit1 | src/rhythm/04_workspace_and_transport.js:303:41 |
| body | KeyB | src/rhythm/04_workspace_and_transport.js:303:41 |
| body | KeyM | src/rhythm/04_workspace_and_transport.js:303:41 |
| body | Comma | src/rhythm/04_workspace_and_transport.js:303:41 |
| body | Period | src/rhythm/04_workspace_and_transport.js:303:41 |
| body | Control+KeyZ | src/rhythm/04_workspace_and_transport.js:303:41 |
| body | Control+KeyX | src/rhythm/04_workspace_and_transport.js:173:3000 |
| body | Control+KeyC | src/rhythm/04_workspace_and_transport.js:173:3000 |
| body | Control+KeyV | src/rhythm/04_workspace_and_transport.js:173:3000 |
| body | Shift+KeyA | src/rhythm/04_workspace_and_transport.js:173:3000 |
| text field | Backspace | – |
| text field | Delete | – |
| text field | Space | – |
| text field | Enter | – |
| text field | Escape | – |
| text field | Tab | – |
| text field | ArrowLeft | – |
| text field | ArrowRight | – |
| text field | ArrowUp | – |
| text field | ArrowDown | – |
| text field | KeyA | – |
| text field | KeyQ | – |
| text field | Digit1 | – |
| text field | KeyB | – |
| text field | KeyM | – |
| text field | Comma | – |
| text field | Period | – |
| text field | Control+KeyZ | – |
| text field | Control+KeyX | – |
| text field | Control+KeyC | – |
| text field | Control+KeyV | – |
| text field | Shift+KeyA | – |

## MATERIAL FORGE

| Fokus · Taste | beansprucht von |
|---|---|
| body | Backspace | – |
| body | Delete | – |
| body | Space | – |
| body | Enter | – |
| body | Escape | – |
| body | Tab | – |
| body | ArrowLeft | – |
| body | ArrowRight | – |
| body | ArrowUp | – |
| body | ArrowDown | – |
| body | KeyA | – |
| body | KeyQ | – |
| body | Digit1 | – |
| body | KeyB | – |
| body | KeyM | – |
| body | Comma | – |
| body | Period | – |
| body | Control+KeyZ | – |
| body | Control+KeyX | – |
| body | Control+KeyC | – |
| body | Control+KeyV | – |
| body | Shift+KeyA | – |
| text field | Backspace | – |
| text field | Delete | – |
| text field | Space | – |
| text field | Enter | – |
| text field | Escape | – |
| text field | Tab | – |
| text field | ArrowLeft | – |
| text field | ArrowRight | – |
| text field | ArrowUp | – |
| text field | ArrowDown | – |
| text field | KeyA | – |
| text field | KeyQ | – |
| text field | Digit1 | – |
| text field | KeyB | – |
| text field | KeyM | – |
| text field | Comma | – |
| text field | Period | – |
| text field | Control+KeyZ | – |
| text field | Control+KeyX | – |
| text field | Control+KeyC | – |
| text field | Control+KeyV | – |
| text field | Shift+KeyA | – |

## NODAL CENTER

| Fokus · Taste | beansprucht von |
|---|---|
| body | Backspace | – |
| body | Delete | – |
| body | Space | – |
| body | Enter | – |
| body | Escape | – |
| body | Tab | – |
| body | ArrowLeft | – |
| body | ArrowRight | – |
| body | ArrowUp | – |
| body | ArrowDown | – |
| body | KeyA | – |
| body | KeyQ | – |
| body | Digit1 | – |
| body | KeyB | – |
| body | KeyM | – |
| body | Comma | – |
| body | Period | – |
| body | Control+KeyZ | – |
| body | Control+KeyX | – |
| body | Control+KeyC | – |
| body | Control+KeyV | – |
| body | Shift+KeyA | – |
| text field | Backspace | – |
| text field | Delete | – |
| text field | Space | – |
| text field | Enter | – |
| text field | Escape | – |
| text field | Tab | – |
| text field | ArrowLeft | – |
| text field | ArrowRight | – |
| text field | ArrowUp | – |
| text field | ArrowDown | – |
| text field | KeyA | – |
| text field | KeyQ | – |
| text field | Digit1 | – |
| text field | KeyB | – |
| text field | KeyM | – |
| text field | Comma | – |
| text field | Period | – |
| text field | Control+KeyZ | – |
| text field | Control+KeyX | – |
| text field | Control+KeyC | – |
| text field | Control+KeyV | – |
| text field | Shift+KeyA | – |

## PSY LAB

| Fokus · Taste | beansprucht von |
|---|---|
| body | Backspace | – |
| body | Delete | – |
| body | Space | src/startup/02_boot_stage_controller.js:49:12 (stop) |
| body | Enter | – |
| body | Escape | src/startup/02_boot_stage_controller.js:49:12 |
| body | Tab | – |
| body | ArrowLeft | src/startup/02_boot_stage_controller.js:49:12 (stop) |
| body | ArrowRight | src/startup/02_boot_stage_controller.js:49:12 (stop) |
| body | ArrowUp | src/startup/02_boot_stage_controller.js:49:12 (stop) |
| body | ArrowDown | src/startup/02_boot_stage_controller.js:49:12 (stop) |
| body | KeyA | src/startup/02_boot_stage_controller.js:49:12 (stop) |
| body | KeyQ | src/startup/02_boot_stage_controller.js:49:12 (stop) |
| body | Digit1 | src/startup/02_boot_stage_controller.js:49:12 (stop) |
| body | KeyB | – |
| body | KeyM | – |
| body | Comma | src/startup/02_boot_stage_controller.js:49:12 (stop) |
| body | Period | src/startup/02_boot_stage_controller.js:49:12 (stop) |
| body | Control+KeyZ | – |
| body | Control+KeyX | – |
| body | Control+KeyC | – |
| body | Control+KeyV | – |
| body | Shift+KeyA | src/startup/02_boot_stage_controller.js:49:12 (stop) |
| text field | Backspace | – |
| text field | Delete | – |
| text field | Space | – |
| text field | Enter | – |
| text field | Escape | – |
| text field | Tab | – |
| text field | ArrowLeft | – |
| text field | ArrowRight | – |
| text field | ArrowUp | – |
| text field | ArrowDown | – |
| text field | KeyA | – |
| text field | KeyQ | – |
| text field | Digit1 | – |
| text field | KeyB | – |
| text field | KeyM | – |
| text field | Comma | – |
| text field | Period | – |
| text field | Control+KeyZ | – |
| text field | Control+KeyX | – |
| text field | Control+KeyC | – |
| text field | Control+KeyV | – |
| text field | Shift+KeyA | – |

## MULTITRACK

| Fokus · Taste | beansprucht von |
|---|---|
| body | Backspace | – |
| body | Delete | – |
| body | Space | src/startup/02_boot_stage_controller.js:13:61 |
| body | Enter | – |
| body | Escape | – |
| body | Tab | – |
| body | ArrowLeft | – |
| body | ArrowRight | – |
| body | ArrowUp | – |
| body | ArrowDown | – |
| body | KeyA | – |
| body | KeyQ | – |
| body | Digit1 | – |
| body | KeyB | – |
| body | KeyM | – |
| body | Comma | – |
| body | Period | – |
| body | Control+KeyZ | src/startup/02_boot_stage_controller.js:13:61 |
| body | Control+KeyX | – |
| body | Control+KeyC | – |
| body | Control+KeyV | src/startup/02_boot_stage_controller.js:13:61 |
| body | Shift+KeyA | – |
| text field | Backspace | – |
| text field | Delete | – |
| text field | Space | – |
| text field | Enter | – |
| text field | Escape | – |
| text field | Tab | – |
| text field | ArrowLeft | – |
| text field | ArrowRight | – |
| text field | ArrowUp | – |
| text field | ArrowDown | – |
| text field | KeyA | – |
| text field | KeyQ | – |
| text field | Digit1 | – |
| text field | KeyB | – |
| text field | KeyM | – |
| text field | Comma | – |
| text field | Period | – |
| text field | Control+KeyZ | – |
| text field | Control+KeyX | – |
| text field | Control+KeyC | – |
| text field | Control+KeyV | – |
| text field | Shift+KeyA | – |

## Mehrfach beansprucht (gleiche Taste, mehrere Listener)

keine

## Listener nach Quelldatei

- `src/startup/02_boot_stage_controller.js:28:45` document keydown (capture) · `event=>{if(!event.repeat)protect('key')}`
- `src/handoff/00_chat_feature_addons.js:10:10` window keyup (capture) · `e=>{m.delete(e.code)}`
- `src/mix/03_quick_menu__after_eq-core__after_eq-ui.js:876:10` window keydown (capture) · `e=>{ if(e.key==='Escape'&&session?.dragging){e.preventDefault();e.stopImmediatePropagation();clear()} else if(`
- `src/mix/03_quick_menu__after_eq-core__after_eq-ui.js:897:9` window keydown (capture) · `e=>{if(e.target?.closest?.('.xen-quick-save-dialog,[data-xen-header-menu="meta"],[data-xen-preset-overlay]'))r`
- `src/rhythm/04_workspace_and_transport.js:173:1037` window keydown · `i=>{if(i.code!=="F8"||i.repeat||Hke(i.target))return;const s=performance.now(),l=Number(i.timeStamp),c=Number.`
- `src/rhythm/04_workspace_and_transport.js:173:3000` window keydown (capture) (removed) · `r=>{!e||Qp(r.target)||ng(r.target)||ISe(r,t.current.quantizeOn)&&r.preventDefault()}`
- `src/audio/05_live_voice_runtime.js:470:3257` window keydown · `event=>{if(event.key==='Escape')stop()}`
- `src/rhythm/04_workspace_and_transport.js:173:2318` window keydown (capture) (removed) · `r=>{Qp(r.target)||Qke.has(r.key)&&(ng(r.target)||e||t)&&r.preventDefault()}`
- `src/rhythm/04_workspace_and_transport.js:173:1921` window keydown · `a=>{!e||Qp(a.target)||ng(a.target)||Y3(a,!0,t.current)}`
- `src/rhythm/04_workspace_and_transport.js:173:1958` window keyup · `a=>{!e||Qp(a.target)||ng(a.target)||Y3(a,!1,t.current)}`
- `src/rhythm/04_workspace_and_transport.js:173:3000` window keydown (capture) (removed) · `r=>{!e||Qp(r.target)||ng(r.target)||ISe(r,t.current.quantizeOn)&&r.preventDefault()}`
- `src/rhythm/04_workspace_and_transport.js:303:41` window keydown (removed) · `i=>{ const owner=ownership.current,id=i.code||i.key,previous=owner.keys.get(id); const token=previous?.token??`
- `src/rhythm/04_workspace_and_transport.js:303:78` window keyup (removed) · `i=>{releaseOwned(i)}`
- `src/rhythm/04_workspace_and_transport.js:173:2318` window keydown (capture) (removed) · `r=>{Qp(r.target)||Qke.has(r.key)&&(ng(r.target)||e||t)&&r.preventDefault()}`
- `src/rhythm/04_workspace_and_transport.js:173:3000` window keydown (capture) · `r=>{!e||Qp(r.target)||ng(r.target)||ISe(r,t.current.quantizeOn)&&r.preventDefault()}`
- `src/rhythm/04_workspace_and_transport.js:173:2318` window keydown (capture) · `r=>{Qp(r.target)||Qke.has(r.key)&&(ng(r.target)||e||t)&&r.preventDefault()}`
- `src/startup/02_boot_stage_controller.js:49:12` document keydown (capture) (removed) · `e=>{if(Qp(e.target)||!inside(e.target))return; // Arrow keys belong to the cursor, not to the page scroll (sli`
- `src/startup/02_boot_stage_controller.js:50:19` document keyup (capture) (removed) · `e=>{if(e.key.startsWith('Arrow')){const ar=arrow.current;ar[e.key==='ArrowUp'?'up':e.key==='ArrowDown'?'down':`
- `src/startup/02_boot_stage_controller.js:13:61` document keydown · `e=>{const t=e.target;if(t!==document.body&&!rootRef.current?.contains(t))return;keyRef.current?.(e)}`
