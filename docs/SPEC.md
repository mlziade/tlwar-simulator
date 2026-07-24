# tlwar-simulator — Specification

## Overview

tlwar-simulator is a real-time battle simulation running inside a tldraw offline canvas. Units are tldraw shapes with embedded stats; a tick-based simulation loop drives movement, combat, and state updates. The scripting layer lives inside the `.tldraw` document.

---

## 1. Canvas & Team Layout

### Team split

- The canvas is divided into **2 or 4 zones** via a toggle button
- Toggle is only available **before a battle starts** or **after Clear All**
- Zones are always split at the **center of the canvas**
  - 2 teams: left half / right half
  - 4 teams: four equal quadrants (top-left, top-right, bottom-left, bottom-right)
- Zone borders are rendered as **background shapes** (locked, non-selectable, non-movable)
- Each zone is visually distinct (colored overlay or border line)

### Team assignment

- A unit's team is determined by **which zone it occupies when Play is pressed**
- Units placed on a border default to the zone with the majority of their area
- Team assignment is **fixed** once the simulation starts

### Future extensibility

The zone system must be designed so that adding 8, 16, etc. zones requires only a configuration change — the number of zones is always a power of 2 and the split is always centered.

---

## 2. Unit System

See [`units.md`](./units.md) for the full unit type roster, stat definitions, health color gradient, team colors, and code architecture.

### Summary

- Three initial unit types: **Warrior** (balanced), **Tank** (high HP/resistance, slow), **Assassin** (glass cannon)
- All units share a global `ATTACK_RANGE` constant — no ranged vs. melee distinction
- All unit types inherit from a shared `Unit` base class; adding a new type requires only a new subclass and a registry entry

---

## 3. AI & Simulation Loop

See [`ai-logic.md`](./ai-logic.md) for the full simulation loop, pluggable AI interface, spatial indexing strategy, victory condition, and performance guidelines.

### Summary

- Tick loop driven by `editor.on('tick', handler)` (~60 fps); each tick runs AI, moves units, resolves combat, updates visuals, checks victory
- All shape updates batched per tick via `editor.run(() => editor.updateShapes([...]), { history: 'ignore' })` — `history: 'ignore'` is required to prevent undo stack bloat
- AI is a swappable module with a defined interface — `Unit` has no AI logic itself
- Default algorithm: find nearest enemy → move toward → attack when in range
- Spatial grid bucketing avoids O(n²) nearest-enemy lookups

---

## 4. Visual System

### Health color gradient

Unit fill color interpolates based on `hp / maxHp`:

| Health % | Color |
|---|---|
| 100% | Green (`#4CAF50`) |
| 50% | Yellow-orange (interpolated) |
| ~10% | Red (`#F44336`) |
| 0% (dead) | Gray (`#9E9E9E`) |

Interpolation is linear HSL or RGB — consistent across all unit types.

> **Constraint:** Built-in `geo` shapes only accept named palette colors, not hex values. The gradient requires a custom `ShapeUtil` using `HTMLContainer` with inline CSS styles. See [`units.md`](./units.md) for details.

### Team identity

Each team has an assigned color. Units display that color as a **border/stroke** on their shape, separate from the health fill. Border color does not change during combat.

Default team colors (2-team):
- Team A: Blue (`#1565C0`)
- Team B: Orange (`#E65100`)

Default team colors (4-team): add Red and Green (distinct from the health gradient).

### Unit shape

Each unit is rendered as a tldraw shape. Shape type and size are the sole visual differentiators between unit types — color is reserved for health (fill gradient) and team identity (border).

| Unit | Shape | Size |
|---|---|---|
| Warrior | Circle (`ellipse`) | 32px |
| Tank | Square (`rectangle`) | 48px |
| Assassin | Diamond (`diamond`) | 24px |

Size scales with durability: Tanks are large and prominent, Assassins are small and fast.

---

## 5. Spawn Tools

See [`spawning-tools.md`](./spawning-tools.md) for the full spawning tool specification including both modes, user-adjustable dials, and code-only constants.

### Summary

- **Pencil tool**: single click places 1 unit; click+drag places units at distance intervals along the path
- **Brush tool**: click scatters N units in a circle; radius and unit count are user-controlled dials; min/max unit spacing are code-only constants
- **Delete tool**: click a unit to remove it

---

## 6. Controls

See [`controls.md`](./controls.md) for the full controls specification including the team toggle lock behavior and planned speed dial.

### Summary

- **Play**: starts the loop, locks team assignment, disables zone toggle
- **Pause**: suspends the loop; units hold position
- **Clear All**: resets everything, re-enables zone toggle
- Zone toggle only available before battle starts or after Clear All

---

## 7. Code Architecture

```
/src
  config.ts              # All hardcoded constants (tick rate, range, grid size, spawn intervals, etc.)
  simulation/
    loop.ts              # Tick loop orchestration
    world.ts             # World state: active units, spatial grid, team assignments
    ai/
      interface.ts       # AI algorithm interface definition
      nearestEnemy.ts    # Default AI implementation
  units/
    Unit.ts              # Base unit class
    Warrior.ts
    Tank.ts
    Assassin.ts
    registry.ts          # Maps unit type keys to classes
  tools/
    PencilSpawnTool.ts   # Mode 1 spawn tool
    BrushSpawnTool.ts    # Mode 2 spawn tool
    DeleteTool.ts
  ui/
    controls.tsx         # Play / Pause / Clear All
    toolbar.tsx          # Unit type selector, tool picker, dials
    zoneToggle.tsx       # 2-team / 4-team toggle
  zones/
    ZoneManager.ts       # Zone layout, border shapes, team assignment logic
  shapes/
    UnitShape.ts         # tldraw ShapeUtil for rendering units
```

---

## 8. Reference

- [tldraw offline GitHub](https://github.com/tldraw/tldraw-offline)
- [tldraw offline User Manual](https://tldraw.notion.site/User-manual-tldraw-offline-39a3e4c324c080e7b2eacc5afd078e85)
- [`tldraw-offline-docs.md`](./tldraw-offline/tldraw-offline-docs.md) — local scripting API reference
- [`units.md`](./units.md) — unit types, stats, color system, and class architecture
- [`shapes.md`](./shapes.md) — custom ShapeUtil: props, rendering, simulation update contract
- [`spawning-tools.md`](./spawning-tools.md) — spawn tool modes, dials, and constants
- [`controls.md`](./controls.md) — play/pause/clear controls and zone toggle behavior
- [`ai-logic.md`](./ai-logic.md) — simulation loop, pluggable AI, spatial indexing, victory condition
