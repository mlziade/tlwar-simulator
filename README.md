# tlwar-simulator

A battle simulator built on [tldraw offline](https://github.com/tldraw/tldraw-offline). Spawn units on a canvas, divide them into teams, hit play, and watch them fight to the last unit.

## Download & Play

> **Requires [tldraw offline](https://github.com/tldraw/tldraw-offline/releases/latest)** — a free desktop app (Mac & Windows).

1. Install tldraw offline from the link above
2. Download **tlwar-simulator.tldraw** from the [latest release](https://github.com/mlziade/tlwar-simulator/releases/latest)
3. Open the file in tldraw offline — the simulator loads automatically, no setup needed

## How to use

1. Choose **2 Teams** or **4 Teams** from the toolbar
2. Select a unit type (Warrior / Tank / Assassin) and a spawn tool (Pencil or Brush)
3. Draw units onto the canvas — each region on screen belongs to a team
4. Hit **Play** and watch the battle unfold
5. The simulation stops automatically when one team wins

## Controls

| Button | Action |
|---|---|
| Play / Resume | Start or resume the simulation |
| Pause | Freeze the simulation |
| Clear | Remove all units and reset |
| 2 Teams / 4 Teams | Toggle between left-right split and four-quadrant mode |

## Unit types

| Unit | HP | Damage | Resistance | Speed | Role |
|---|---|---|---|---|---|
| Warrior | 100 | 15 | 15 | Fast | Balanced all-rounder |
| Tank | 200 | 12 | 40 | Slow | Frontline absorber |
| Assassin | 60 | 45 | 3 | Very fast | Glass-cannon finisher |

Resistance uses a logarithmic formula — high resistance gives diminishing returns, so no unit is immune.

## Features

- **Tactical AI** — Warriors spread across the enemy front, Tanks protect nearby allies, Assassins target the enemy with the lowest current HP
- **Steering separation** — units fan out laterally instead of stacking into a blob
- **Death animations** — units fade out over 0.6s when killed
- **Damage numbers** — floating red values show effective damage on each hit
- **Health gradient** — units shift from green → red as they take damage
- **Team borders** — each team has a distinct color border on their units

## Building from source

```bash
npm install
npm run deploy   # builds and deploys scripts to the active tldraw offline workspace
```

Scripts are written in TypeScript and bundled with esbuild. See [`docs/`](./docs/) for architecture notes.

## Planned

- Speed dial to change simulation speed in real time
- Additional unit types
- Flanking and formation behaviors

## Documentation

- [`docs/units.md`](./docs/units.md) — unit stats and resistance formula
- [`docs/ai-logic.md`](./docs/ai-logic.md) — AI algorithm and tick loop
- [`docs/spawning-tools.md`](./docs/spawning-tools.md) — spawn tool behavior
- [`docs/controls.md`](./docs/controls.md) — controls panel reference

**tldraw offline:**
- [GitHub](https://github.com/tldraw/tldraw-offline)
- [User Manual](https://tldraw.notion.site/User-manual-tldraw-offline-39a3e4c324c080e7b2eacc5afd078e85)
