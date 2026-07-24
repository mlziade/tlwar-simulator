# UnitShape — Custom ShapeUtil

`shapes/UnitShape.ts` is a tldraw `ShapeUtil` that renders all unit types. A custom ShapeUtil is mandatory (not optional) because tldraw's built-in `geo` shapes only accept named palette colors — the health gradient requires arbitrary hex values applied via inline CSS.

## Shape props

The shape stores only what it needs to render. Simulation stats (damage, resistance, etc.) live exclusively on the `Unit` object in `world.ts` — the shape is not a second source of truth.

| Prop | Type | Description |
|---|---|---|
| `unitType` | `'warrior' \| 'tank' \| 'assassin'` | Determines geometry and base size |
| `hp` | `number` | Current health — drives fill color |
| `maxHp` | `number` | Max health — used to compute `hp / maxHp` ratio |
| `team` | `string` | Team identifier — drives border color |

Position and size are standard tldraw shape fields (`x`, `y`, `w`, `h`) — not custom props.

## Geometry and size

Each unit type maps to a fixed `w`/`h` on spawn:

| Unit type | tldraw geo | `w` / `h` |
|---|---|---|
| Warrior | `ellipse` | 32 × 32 |
| Tank | `rectangle` | 48 × 48 |
| Assassin | `diamond` | 24 × 24 |

The `getGeometry()` method returns the appropriate shape (ellipse or polygon) so tldraw's hit-testing uses the correct bounding area. For the delete tool, the hitbox is the full bounding box — no sub-shape precision needed.

## Rendering (HTMLContainer)

The `component()` method returns an `HTMLContainer` with a single `<div>` sized to fill the shape bounds. All visual state is applied as inline CSS:

- **Fill color**: computed from `hp / maxHp` ratio, interpolated between green (`#4CAF50`) → yellow-orange → red (`#F44336`), gray (`#9E9E9E`) at 0 HP. Applied as `background-color`.
- **Border**: fixed-width stroke in the team color. Applied as `border` + `border-radius` (100% for Warrior circles, 0 for Tanks, kept square for Diamonds via CSS `transform: rotate(45deg)` on the inner div if needed).
- **Shape clip**: `border-radius` handles circles; diamonds use a CSS `clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)` to clip the div into a diamond.

```
component(shape) {
  const ratio = shape.props.hp / shape.props.maxHp
  const fill = interpolateHealthColor(ratio)
  const border = teamColor(shape.props.team)
  // return HTMLContainer with inline styles
}
```

`interpolateHealthColor` and `teamColor` are pure utility functions in `shapes/colorUtils.ts`.

## Simulation update contract

The tick loop never recreates shapes — it updates only the props that changed:

```ts
editor.run(() => {
  editor.updateShapes(units.map(u => ({
    id: u.shapeId,
    type: 'unit',
    x: u.position.x,
    y: u.position.y,
    props: { hp: u.hp },
  })))
}, { history: 'ignore' })
```

`maxHp` and `team` are set once at spawn and never updated. `unitType` is immutable. Only `hp` and position change each tick.

## indicator()

The `indicator()` method returns `null` — no selection highlight is shown on units during simulation (selection is disabled while the battle runs).
