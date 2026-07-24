# World State (world.ts)

## Overview

`simulation/world.ts` holds the runtime state of an active battle. It is the single source of truth for which units are alive, where they are, and which team they belong to. The AI, tick loop, and ZoneManager all read from or write to `World`.

## Structure

| Field | Type | Description |
|---|---|---|
| `units` | `Unit[]` | All living units; dead units are removed immediately on death |
| `spatialGrid` | `SpatialGrid` | Bucketed grid for O(1) nearest-enemy lookups |
| `teamMap` | `Map<string, string>` | Maps `unitId → teamId`; set at Play time and never mutated |

## Lifecycle

### Play — initialization

A new `World` instance is created fresh on each Play press. Stale state from a previous battle is discarded rather than reset in-place.

Initialization steps:
1. Iterate all unit shapes currently on the canvas
2. Call `ZoneManager.getTeam(shape.position)` for each to resolve team assignment
3. Instantiate the corresponding `Unit` subclass (via `units/registry.ts`) and populate `teamMap`
4. Build the initial `spatialGrid` from unit positions
5. Hand the `World` instance to `loop.ts` to begin ticking

### Pause

`World` is not modified on pause — the tick loop simply stops calling it. All unit state (position, HP, cooldowns) is preserved exactly as-is.

### Clear All

1. Stop the tick loop
2. Remove all unit shapes from the canvas via `editor.deleteShapes()`
3. Call `ZoneManager.cleanup()` to remove border shapes
4. Discard the `World` instance — it is not reused

The canvas returns to a blank pre-battle state. The zone toggle is re-enabled.

## SpatialGrid

The grid is built once at initialization and updated incrementally each tick as units move. Dead units are evicted from both `units` and the grid immediately when `die()` is called — they never appear in subsequent spatial lookups.

See [`ai-logic.md`](./ai-logic.md) for how the grid is used during nearest-enemy search and target caching.
