# AI & Simulation Loop

## Tick loop

The simulation runs on a fixed-interval tick loop (target: ~60 ticks/sec, configurable via `TICK_RATE` in `config.ts`). Each tick:

1. For each living unit, run the **AI algorithm**
2. Apply movement deltas
3. Resolve attacks and apply damage
4. Update unit shape appearance (color, position)
5. Check victory condition

## AI algorithm (pluggable)

The AI is a **separate, swappable module** — the `Unit` class has no AI logic itself. The algorithm receives a unit and the current world state, and returns an action: move direction, attack target, or idle.

The module must implement a defined interface (`simulation/ai/interface.ts`) so it can be replaced without touching `Unit` or the tick loop.

**Default algorithm — "nearest enemy":**
1. Find the nearest living enemy unit (via spatial index)
2. If within `ATTACK_RANGE`: attack — deal `max(0, damage - target.resistance)` HP damage
3. If not in range: move toward target at `moveSpeed`

## Spatial indexing

To avoid O(n²) nearest-enemy lookups, the world is partitioned into a **grid of buckets**. Each tick, units are assigned to buckets by position. Nearest-enemy search checks only the unit's bucket and its immediate neighbors.

- Grid cell size: `SPATIAL_GRID_CELL_SIZE` (configurable constant in `config.ts`)
- The grid is rebuilt or updated incrementally each tick

## Victory condition

- The simulation ends when **only one team has living units remaining**
- On victory: the tick loop stops and a win announcement is displayed (e.g. "Team A wins!")
- The canvas is not cleared automatically — units remain in their death positions
- The user must press **Clear All** to reset

## Performance guidelines

- The tick loop must not block the UI thread — use `requestAnimationFrame` or a `setTimeout`-based loop with yielding
- Unit shape updates (color, position) are batched and applied once per tick via `editor.updateShapes()`
- Dead units are removed from the active unit list immediately to reduce loop iterations
- All performance-sensitive constants (`TICK_RATE`, `SPATIAL_GRID_CELL_SIZE`) are centralized in `config.ts`

## Code structure

```
simulation/
  loop.ts              # Tick loop orchestration
  world.ts             # World state: active units, spatial grid, team assignments
  ai/
    interface.ts       # AI algorithm interface definition
    nearestEnemy.ts    # Default AI implementation
```
