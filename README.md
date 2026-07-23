# tlwar-simulator

A battle simulator built on [tldraw offline](https://github.com/tldraw/tldraw-offline). Spawn units on a canvas, divide them into teams, hit play, and watch them fight to the last unit.

## What it is

tlwar-simulator turns a tldraw offline canvas into a real-time battlefield. Units are shapes with stats (health, damage, resistance, speed). Each unit follows a simple AI and fights until one side has nothing left standing.

## Features

- **Unit types** — Warrior, Tank, Assassin, etc each with a distinct stat profile — see [`docs/units.md`](./docs/units.md)
- **Spawn tools** — a pencil tool (click to place, drag to scatter along a path) and a brush tool (click to scatter a cluster within a circular area) — see [`docs/spawning-tools.md`](./docs/spawning-tools.md)
- **2 or 4 team modes** — toggle between a left/right split or four quadrants before the battle starts
- **Health-based color gradient** — units shift from green to red as they take damage, and turn gray when they die
- **Team identity** — each team has a distinct colored border on their units
- **Gameplay Controls** — Play / Pause / Clear All / etc — see [`docs/controls.md`](./docs/controls.md)
- **AI & simulation** — pluggable tick-based combat loop — see [`docs/ai-logic.md`](./docs/ai-logic.md)

## How to use

1. Open the `.tldraw` file in [tldraw offline](https://github.com/tldraw/tldraw-offline)
2. Choose 2-team or 4-team mode using the toggle in the toolbar
3. Select a unit type and a spawn tool, then place units on the canvas — each region belongs to a team
4. Hit **Play** to start the simulation
5. The battle runs until one team has no units left — the sim pauses automatically

## Controls

| Button | Action |
|---|---|
| Play | Start or resume the simulation |
| Pause | Freeze the simulation (units hold position) |
| Clear All | Remove all units and reset the canvas |

## Planned

- Speed dial to change simulation speed in real time
- Additional unit types
- Additional team split options (8, 16 quadrants)
- Improved AI algorithms (flanking, formations, target priority)

## Documentation

See [`tldraw-offline-docs.md`](./docs/tldraw-offline/tldraw-offline-docs.md) for a full reference on the tldraw offline scripting API used to build this simulator.

**Official sources:**
- [tldraw offline GitHub](https://github.com/tldraw/tldraw-offline)
- [tldraw offline User Manual](https://tldraw.notion.site/User-manual-tldraw-offline-39a3e4c324c080e7b2eacc5afd078e85)
