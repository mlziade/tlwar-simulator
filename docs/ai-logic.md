# AI & Simulation Loop

## Tick loop

The simulation uses the tldraw-native `editor.on('tick', handler)` event, which fires at 60+ fps and provides an `elapsed` millisecond delta. This is preferred over a manual `requestAnimationFrame` or `setTimeout` loop — it runs in sync with the editor's rendering pipeline and requires no lifecycle management.

`TICK_RATE` in `config.ts` is kept as a configurable throttle (e.g. skip ticks when `elapsed` accumulates below the threshold) for tuning simulation speed independently of the render rate.

Each tick:

1. For each living unit, call `unit.onTick(elapsed)` — updates internal state (cooldowns, effects)
2. Run the **AI algorithm** for each living unit — returns an action (move/attack/idle)
3. Apply movement deltas (scaled by `elapsed` ms for frame-rate-independent motion)
4. **Separation pass** — nudge overlapping units apart using the spatial grid; rebuild grid once after
5. Resolve attacks and apply damage
6. Update unit shape appearance (color, position) in a single batched `editor.run` call
7. Check victory condition

## AI algorithm — Tactical AI

The AI is a **separate, swappable module** — the `Unit` class has no AI logic itself. The algorithm receives a unit and the current world state, and returns an action: move direction, attack target, or idle.

The active implementation is `TacticalAI` (`simulation/ai/tacticalAI.ts`). It applies per-unit-type targeting logic and re-evaluates targets every tick rather than caching a sticky lock-on.

### Melee lock-on

If a unit's current target is alive and already within `ATTACK_RANGE`, it stays committed:
- Cooldown expired: attack
- Cooldown active: idle (stops pushing into the target, which would fight the separation pass)

The lock-on is dropped the moment the target leaves `ATTACK_RANGE` or dies. This prevents units from chasing a retreating target after it escapes melee.

### Per-unit-type targeting

| Type | Strategy | Rationale |
|------|----------|-----------|
| **Warrior** | Nearest enemy (re-evaluated each tick) | Balanced all-rounder; always engages the most immediate threat |
| **Tank** | Enemy with the smallest minimum distance to any ally | Rushes to protect allies — targets the enemy deepest inside our lines |
| **Assassin** | Lowest-HP enemy (global scan) | Picks off weakened units; maximises kill pressure |

Warriors no longer sticky-chase a target that a faster unit has already passed — they switch every tick. Tanks provide a soft "bodyguard" effect without any explicit aggro system. Assassins naturally gravitate toward dying enemies to secure kills.

### Target re-evaluation

All types re-evaluate every tick outside of the melee lock-on window. This solves the "passing unit" problem: if a faster enemy walks closer than the currently chased target, the unit immediately pivots.

## Spatial indexing

To avoid O(n²) nearest-enemy lookups, the world is partitioned into a **grid of buckets**. Each tick, units are assigned to buckets by position. Nearest-enemy search checks only the unit's bucket and its immediate neighbors; a global fallback is used when the neighborhood is empty (e.g. distant armies at battle start).

- Grid cell size: `SPATIAL_GRID_CELL_SIZE` (configurable constant in `constants.ts`)
- Grid is rebuilt once per tick after the separation pass

**Note on `getMostDangerousEnemy` (Tank):** this performs an O(enemies × allies) scan per tank. At typical game scales (10–30 tanks) this is negligible, but avoid spawning hundreds of tanks.

## Victory condition

- The simulation ends when **only one team has living units remaining**
- On victory: the tick loop stops and a win announcement is displayed (e.g. "Team A wins!")
- The canvas is not cleared automatically — units remain in their death positions
- The user must press **Clear All** to reset

## Performance guidelines

- The tick loop uses `editor.on('tick', ...)` — it runs on the editor's own animation frame, so it never blocks the UI thread
- All simulation shape updates (color, position) are batched into a single `editor.run(() => editor.updateShapes([...]), { history: 'ignore' })` call per tick — `history: 'ignore'` is mandatory to prevent the undo stack from filling up and killing performance
- Dead units are removed from the active unit list immediately to reduce loop iterations
- `TacticalAI` re-evaluates targets every tick; the spatial grid keeps warrior lookup O(k) where k = neighbors. Assassin and Tank use O(n) global scans — acceptable at game scale
- All performance-sensitive constants (`TICK_RATE`, `SPATIAL_GRID_CELL_SIZE`) are centralized in `constants.ts`
- tldraw is optimized for interactive use (thousands of shapes); avoid pushing unit counts into the tens of thousands — test at 50–100 units per team before scaling up

## Code structure

```
simulation/
  loop.ts              # Tick loop orchestration
  world.ts             # World state: active units, spatial grid, team assignments
  ai/
    interface.ts       # AI algorithm interface definition
    nearestEnemy.ts    # Original nearest-enemy AI (kept for reference)
    tacticalAI.ts      # Active AI: per-type targeting, no sticky lock-on
```
