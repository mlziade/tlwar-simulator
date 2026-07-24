# Units

## Unit types

| Unit | HP | Damage | Resistance | Move Speed | Attack Speed | Shape | Size | Description |
|---|---|---|---|---|---|---|---|---|
| **Warrior** | 100 | 15 | 15 | 72 | 1.2 | Circle (`ellipse`) | 32px | Balanced across all stats |
| **Tank** | 200 | 12 | 40 | 36 | 0.6 | Square (`rectangle`) | 48px | High durability, low output |
| **Assassin** | 60 | 45 | 3 | 144 | 2.4 | Diamond (`diamond`) | 24px | Glass cannon — high risk, high reward |

Shape geometry and size are the sole visual differentiators between unit types — color is reserved for the health gradient (fill) and team identity (border). Size reflects durability: Tanks are large and hard to miss, Assassins are small and fast.

> Stat values are illustrative; final balance is set in code constants per class.

## Stat definitions

| Stat | Unit | Description |
|---|---|---|
| `hp` / `maxHp` | points | Current and maximum health |
| `damage` | points/hit | Raw damage dealt per attack |
| `resistance` | points | Logarithmic damage mitigation: `effective = damage × (1 - resistance / (resistance + ARMOR_CONSTANT))` — diminishing returns so no unit is ever immune |
| `moveSpeed` | px/sec | Distance traveled per second |
| `attackSpeed` | attacks/sec | How often the unit can attack |

All units share a single global attack range constant (`ATTACK_RANGE`, defined in `constants.ts`). Effective melee range is `ATTACK_RANGE + attacker.radius + target.radius`, so larger units have slightly more reach. There are no ranged vs. melee distinctions.

## Health color gradient

Unit fill color interpolates based on `hp / maxHp`:

| Health % | Color |
|---|---|
| 100% | Green (`#4CAF50`) |
| 50% | Yellow-orange (interpolated) |
| ~10% | Red (`#F44336`) |
| 0% (dead) | Gray (`#9E9E9E`) |

> **Important:** tldraw's built-in `geo` shapes only accept named palette colors (e.g. `'blue'`, `'red'`), not arbitrary hex values. The hex gradient above requires a **custom `ShapeUtil` with an `HTMLContainer` renderer** that applies the color as an inline CSS style. This is also why a custom shape is mandatory (not optional) — it's the only way to achieve the gradient.

## Team identity

Each team has an assigned color shown as a border/stroke on the unit shape, separate from the health fill. Border color does not change during combat.

Default team colors (2-team): Blue (`#1565C0`) / Magenta (`#C2185B`)  
Default team colors (4-team): add Purple (`#6A1B9A`) and Teal (`#00838F`) for teams C and D — warm colors avoided to prevent visual conflict with the health gradient.

## Code architecture

All unit types inherit from a shared `Unit` base class:

- **Stats**: `hp`, `maxHp`, `damage`, `resistance`, `moveSpeed`, `attackSpeed`
- **State**: `position`, `team`, `isAlive`, `currentTarget`, `attackCooldownMs`
- **Combat methods**: `takeDamage(amount)`, `die()`
- **Lifecycle hooks**: `onSpawn()`, `onTick(elapsed)`, `onDeath()`

`onTick(elapsed)` handles the unit's own internal state only — it decrements `attackCooldownMs` by `elapsed` and applies any future ticking effects (e.g. burning). It does **not** make decisions; the AI module in `loop.ts` handles that separately after `onTick` runs.

`attackCooldownMs` starts at 0. After each attack it resets to `1000 / attackSpeed` ms. The AI only issues an attack action when `attackCooldownMs ≤ 0`.

Subclasses override only the stat defaults. Adding a new unit type means creating a new class that extends `Unit`, overriding stats, and registering it in `units/registry.ts`. No other changes required.

```
units/
  Unit.ts        # Base class
  Warrior.ts
  Tank.ts
  Assassin.ts
  registry.ts    # Maps unit type keys to classes
```
