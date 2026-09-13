# The House Is Watching

A first-person psychological survival horror game built with pure Three.js and the Web Audio API, designed for mobile and desktop web browsers.

## Overview
- **Engine**: Three.js (r128) + Procedural Web Audio Synthesizer (zero external audio or texture asset dependencies).
- **Core Loop**: Complete 5-phase progressive narrative objective chain:
  1. Enter house & explore in darkness.
  2. Locate Fuse in West Wing and install into East Wing Generator.
  3. Power restores: lights activate, flicker, and Entity begins active stalking.
  4. Locate the Master Bedroom Key to unlock the North Ritual Chamber.
  5. Retrieve the Watcher Doll. The Entity enters aggressive hunt/chase mode.
  6. Return to the Front Door to escape.
- **Entity AI**: Multi-state behavioral machine (`STALKING`, `WATCHING`, `CHASE`) featuring line-of-sight vanishing, stalking at distances, flashlight sensitivity, and endgame sprint interception.
- **Fear System**: Dynamic proximity vignette darkening, heartbeat audio synthesis, and visual distortion.
- **Platforms**: Mobile landscape (virtual joystick + right touch look zone + touch buttons) and Desktop (WASD + Pointer Lock).

## Controls

| Action | Desktop | Mobile |
| :--- | :--- | :--- |
| **Move** | `W, A, S, D` / Arrow Keys | Left Virtual Joystick |
| **Look** | Mouse Look (Pointer Lock) | Right Screen Drag |
| **Interact** | `E` | `USE` Button |
| **Flashlight** | `F` | `LIGHT` Button |
| **Sprint** | `Shift` (consumes stamina) | `RUN` Button |

## Settings & Persistence
- **Quality**: Low (1.0x pixel ratio, lightweight rendering for mobile), Medium (1.25x), High (1.5x, antialiased).
- **Sensitivity**: Real-time look sensitivity scaling saved to `localStorage`.

## Local Development
Run with any static web server:
```bash
# Python 3
python3 -m http.server 8080

# Node.js
npx serve .
