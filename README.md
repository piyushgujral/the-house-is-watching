# The House Is Watching

A first-person psychological survival horror prototype built for mobile and desktop web browsers.

## Overview
- **Engine**: Pure Three.js + Web Audio API synthesizer.
- **Loop**: 10-phase narrative objective chain (Fuse $\rightarrow$ Generator $\rightarrow$ Bedroom Key $\rightarrow$ Watcher Doll $\rightarrow$ Front Escape).
- **Monster**: Non-linear psychological AI exhibiting dynamic stalking, line-of-sight vanishing, and endgame sprint chases.
- **Platforms**: Mobile (touch joystick + look pad) and Desktop (WASD + Pointer Lock).

## Controls
| Action | Desktop | Mobile |
| :--- | :--- | :--- |
| Move | `W, A, S, D` | Virtual Left Thumbstick |
| Look | Mouse Look | Right Screen Drag |
| Flashlight | `F` | `LIGHT` Button |
| Interact | `E` | `USE` Button |
| Sprint | `Shift` | `RUN` Button |

## Local Execution
Open `index.html` via any static file server:
```bash
npx serve .
# or
python3 -m http.server 8080
