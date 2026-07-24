# Units

## Unit types

| Unit | HP | Damage | Resistance | Move Speed | Attack Speed | Description |
|---|---|---|---|---|---|---|
| **Warrior** | 100 | 15 | 10 | 60 | 1.0 | Balanced across all stats |
| **Tank** | 250 | 8 | 30 | 30 | 0.5 | High durability, low output |
| **Assassin** | 50 | 40 | 2 | 120 | 2.0 | Glass cannon — high risk, high reward |

> Stat values are illustrative; final balance is set in code constants per class.

## Stat definitions

| Stat | Unit | Description |
|---|---|---|
| `hp` / `maxHp` | points | Current and maximum health |
| `damage` | points/hit | Raw damage dealt per attack |
| `resistance` | points | Flat damage reduction applied before HP loss |
| `moveSpeed` | px/sec | Distance traveled per second |
| `attackSpeed` | attacks/sec | How often the unit can attack |

All units share a single global attack range constant (`ATTACK_RANGE`, defined in `config.ts`). There are no ranged vs. melee distinctions.

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

Default team colors (2-team): Blue (`#1565C0`) / Orange (`#E65100`)  
Default team colors (4-team): add Red and Green (distinct from the health gradient).

## Code architecture

All unit types inherit from a shared `Unit` base class:

- **Stats**: `hp`, `maxHp`, `damage`, `resistance`, `moveSpeed`, `attackSpeed`
- **State**: `position`, `team`, `isAlive`, `currentTarget`
- **Combat methods**: `takeDamage(amount)`, `die()`
- **Lifecycle hooks**: `onSpawn()`, `onTick(delta)`, `onDeath()`

Subclasses override only the stat defaults. Adding a new unit type means creating a new class that extends `Unit`, overriding stats, and registering it in `units/registry.ts`. No other changes required.

```
units/
  Unit.ts        # Base class
  Warrior.ts
  Tank.ts
  Assassin.ts
  registry.ts    # Maps unit type keys to classes
```
