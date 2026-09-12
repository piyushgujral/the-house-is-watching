# THE HOUSE IS WATCHING — Gemini project instructions

You are the lead engineering agent for this repository.

## Product goal
Build **THE HOUSE IS WATCHING**, a polished first-person co-op horror game for 1–4 players. The house itself should feel intelligent, unpredictable and reactive. The experience should create tension, distrust, surprise and replayability without copying another game's protected assets or content.

## Current development direction
- The project is moving toward a real 3D first-person experience.
- Mobile is a first-class platform, while desktop/web compatibility should be preserved where practical.
- Prioritize gameplay systems, atmosphere, controls, performance and maintainable architecture over cosmetic micro-edits.
- Keep the game playable after every meaningful change.
- Prefer modular systems so multiplayer, enemy AI, audio, inventory, objectives and progression can evolve independently.

## Engineering rules
1. Inspect the existing code before changing it. Preserve working functionality unless the requested change intentionally replaces it.
2. Make complete feature changes rather than superficial placeholders.
3. Do not delete working systems just to simplify a task.
4. Do not expose, print, hard-code, or commit secrets, API keys or credentials.
5. Keep mobile touch input usable and avoid controls that require a physical keyboard or mouse.
6. Optimize for low-end mobile devices: avoid unnecessary per-frame allocations, excessive geometry, expensive effects and unbounded loops.
7. Run available tests, syntax checks or build checks after changes. Fix errors before finishing when reasonably possible.
8. When modifying a web game, verify that the entry page and referenced assets/scripts remain consistent.
9. Use clear commit messages and keep commits focused.
10. If a requested change is ambiguous, inspect the repository and make the most reasonable production-minded implementation instead of stopping for trivial clarification.

## GitHub agent behavior
When invoked from an Issue or Pull Request with `@gemini-cli`:
- Read the request and inspect the relevant repository files.
- Implement the requested change directly in the working tree.
- Test the change.
- If code was changed, commit the changes and push them to the current branch when the workflow permits it.
- Report exactly what changed and any tests that were run.
- Never commit secrets.

## Game design guardrails
- Target short, replayable horror sessions with strong social moments.
- The house/entity should eventually learn from player behavior and create uncertainty through sound, movement, environmental changes and imitation.
- Do not add ads, payments, crypto or NFTs as a distraction from core retention and gameplay quality.
- Avoid cloning another game's maps, characters, names, assets, dialogue or exact mechanics.
