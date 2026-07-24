# AI & Simulation Loop

## Tick loop

The simulation uses the tldraw-native `editor.on('tick', handler)` event, which fires at 60+ fps and provides an `elapsed` millisecond delta. This is preferred over a manual `requestAnimationFrame` or `setTimeout` loop — it runs in sync with the editor's rendering pipeline and requires no lifecycle management.

`TICK_RATE` in `constants.ts` throttles how often the simulation actually advances (default 16ms ≈ 60 logic-ticks/sec), independent of the render rate.

Each tick:

1. `unit.onTick(elapsed)` — decay cooldowns
2. **AI decision** per unit — movement and attacks are applied inline as decisions are made
3. **Separation pass** — position-level nudge to resolve any remaining physical overlaps
4. Rebuild spatial grid once after the pass
5. **Death fade** — update opacity of recently-killed shapes (0.6 s fade); delete shapes that have fully faded
6. Batch all canvas writes (`editor.run`, `history: 'ignore'`)
7. Check victory condition

---

## AI algorithm — Tactical AI (`simulation/ai/tacticalAI.ts`)

The AI is a swappable module implementing `AIAlgorithm.decide(unit, world): AIAction`. No AI logic lives in `Unit` itself.

### The blob problem

Pure "seek nearest enemy" causes all units to converge on a single point because:
- Every unit picks the same nearest target
- Units move in a straight line toward it
- They stack up and overlap once there

The fix is two complementary mechanisms:

### 1. Steering separation (continuous lateral force)

When moving toward a target, units also apply a **repulsive force from nearby allies**. This force is blended into the movement direction every tick.

```
lateral_sep = sep - dot(sep, seek_norm) × seek_norm   // strip the forward/backward component
move_direction = normalize(seek_direction + lateral_sep × WEIGHT)
```

Only the **lateral** (perpendicular-to-seek) component of the separation force is applied. Stripping the forward/backward component means separation can never push a unit away from its target — it can only deflect it sideways. This prevents back-row units from stalling and eliminates oscillation at the attack-range boundary.

The separation force itself is computed from spatial-grid neighbors (same team only):

```
for each ally within STEERING_SEPARATION_RADIUS:
  push += (unit_pos - ally_pos).normalized × linear_falloff(distance)
separation_force = normalize(push)
```

Constants: `STEERING_SEPARATION_RADIUS = 80px`, `STEERING_SEPARATION_WEIGHT = 0.8`

### 2. Target spreading on pick

When a unit needs a new target (start of battle, or after current target dies), it scores enemies rather than just picking the nearest:

```
score = 1000 / (distance + 50)  −  attacker_count × 0.5
```

`attacker_count` = how many allied units already have this enemy as their `currentTarget`.

Because `world.units` is processed sequentially each tick, once warrior A sets a target that enemy's count increments immediately, and warrior B (processed next) sees the congested count and may prefer a different enemy. Result: warriors spread across the enemy front within a single tick at battle start.

After a target is picked it is **kept sticky until death** — no mid-pursuit re-evaluation. Sticky targeting prevents jitter and lets units commit to kills.

### Per-unit-type strategy

| Type | Target selection | Rationale |
|------|-----------------|-----------|
| **Warrior** | Spread-score (distance − congestion) | Distributes evenly across enemy front |
| **Tank** | Enemy with smallest minimum distance to any ally | Rushes to protect the most-threatened ally |
| **Assassin** | Globally lowest-HP enemy | Picks off weakened units to maximize kill rate |

All types apply the separation steering force while moving toward their target.

### Melee lock-on

Once a unit's target is within `ATTACK_RANGE`:
- Cooldown ready → attack
- Cooldown active → **idle** (holds position, does not push into the target)

Holding position prevents units from pushing into their target while waiting to swing, which previously caused constant overlap that the separation pass had to undo every tick.

---

## Spatial indexing

The world is partitioned into a grid of buckets (`SPATIAL_GRID_CELL_SIZE = 100px`). Nearest-enemy searches check the unit's cell and its 8 neighbors — O(k) where k is the average occupancy per cell.

The grid is rebuilt once per tick after the separation pass. `getNearbyAllies(unit)` filters grid neighbors to same-team living units only, used by the separation force.

**`getMostDangerousEnemy` (Tank):** O(enemies × allies) per tank per tick. Fine at game scale; avoid hundreds of tanks.

---

## Victory condition

- Ends when only one team has living units
- Tick loop stops; win announcement displayed
- Canvas not cleared automatically — press **Clear All** to reset

---

## Performance guidelines

- All shape updates batched into one `editor.run(..., { history: 'ignore' })` per tick
- Dead units removed from `world.units` immediately
- Separation steering uses spatial grid → O(k) per unit, not O(n)
- Warrior spread-target scan is O(n) per warrior per tick (O(n²) total) — acceptable at 50–200 units
- Avoid tens of thousands of units; test at 50–100 per team first

---

## Code structure

```
simulation/
  loop.ts              # Tick loop orchestration
  world.ts             # World state, spatial grid, team assignments, enemy queries
  ai/
    interface.ts       # AIAlgorithm / AIAction interface
    nearestEnemy.ts    # Original nearest-enemy AI (kept for reference)
    tacticalAI.ts      # Active AI: steering separation + spread targeting + sticky lock-on
```
