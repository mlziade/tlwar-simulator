# tlwar-simulator — Implementation Plan

This document is the AI's implementation roadmap. Work through phases in order; each task within a phase can be completed independently unless a dependency is noted. Mark each task done before moving on. When in doubt about behaviour, the spec doc takes precedence; when the spec is silent, prefer the simplest approach.

**Source docs:** `docs/SPEC.md`, `docs/units.md`, `docs/shapes.md`, `docs/ai-logic.md`, `docs/zones.md`, `docs/world.md`, `docs/spawning-tools.md`, `docs/controls.md`, `docs/tldraw-offline/tldraw-offline-docs.md`

---

## How tldraw offline document scripts actually work

Before reading any task, understand this — it changes the entire project structure:

**The `.tldraw` file is a ZIP archive**, not a plain JSON file. It contains:
```
script/main.js      ← the simulation/runtime logic
script/config.js    ← shape/tool/UI registration (runs BEFORE editor mounts)
db.sqlite           ← canvas data
metadata.json
```

**Two entry points are required:**

`script/main.js` — receives the live editor after mount:
```js
export default function ({ editor, signal }) {
  // editor: live Editor instance
  // signal: AbortSignal — fires on doc close or script reload; use for cleanup
  signal.addEventListener('abort', () => { /* cleanup */ })
}
```

`script/config.js` — runs BEFORE mount to register custom shapes, tools, and UI:
```js
export default function ({ config }) {
  config.shapeUtils.push(MyShapeUtil)
  config.tools.push(MyTool)
  config.components.TopPanel = MyToolbar
  return config
}
```

Both files are **native ES modules** — not IIFE bundles. They can `import` from `'tldraw'` directly because the app pre-bundles tldraw in its Electron runtime.

**The development loop** uses the local HTTP API at port 7236:
- `POST /api/doc/:id/script-workspace` → returns `{ mainJsPath, configJsPath }` — paths on disk the app is watching
- Write compiled output directly to those paths; the app's file watcher hot-reloads instantly
- `POST /api/doc/:id/exec` → runs a JS snippet one-time against the live editor (useful for probing)

**`editor.registerShapeUtils()` and `editor.registerTools()` do not exist.** Registration only happens via `config.js`. Any plan task that says "register in index.ts via `editor.registerShapeUtils`" is wrong — that's the old (incorrect) plan.

---

## Phase 1 — Project Bootstrap

Goal: two compiling ES modules (`dist/main.js`, `dist/config.js`) that write into the tldraw offline workspace on each build.

### Task 1.1 — Initialize the npm project

- Run `npm init -y` in the project root.
- Install dependencies:
  - `tldraw` (latest stable) — needed for TypeScript types only; the runtime provides it
  - `react`, `react-dom` — types and JSX transform target; runtime provides them too
  - Dev: `typescript`, `esbuild`, `@types/react`, `@types/react-dom`
- Create `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "jsx": "react-jsx",
      "strict": true,
      "noEmit": true
    },
    "include": ["src"]
  }
  ```
- Create build scripts in `package.json`:
  ```json
  {
    "scripts": {
      "build": "npm run build:main && npm run build:config",
      "build:main": "esbuild src/main.ts --bundle --outfile=dist/main.js --format=esm --external:tldraw --external:react --external:react-dom",
      "build:config": "esbuild src/tlconfig.ts --bundle --outfile=dist/config.js --format=esm --external:tldraw --external:react --external:react-dom",
      "watch": "concurrently \"npm run build:main -- --watch\" \"npm run build:config -- --watch\"",
      "typecheck": "tsc --noEmit"
    }
  }
  ```
  Install `concurrently` as a dev dep for the watch script.

- `--external:tldraw --external:react --external:react-dom` tells esbuild to leave those imports as-is in the output. The tldraw offline Electron runtime resolves them from its own bundled copy, so the script can import from `'tldraw'` directly (confirmed by real example scripts).

- Done when: `npm run build` completes without errors on empty `src/main.ts` and `src/tlconfig.ts`.

### Task 1.2 — Create the src directory structure

Create all directories and empty placeholder files:

```
src/
  main.ts           ← script/main.js entry: { editor, signal }
  tlconfig.ts       ← script/config.js entry: { config }
  constants.ts      ← game constants (not to be confused with tldraw's config)
  simulation/
    loop.ts
    world.ts
    ai/
      interface.ts
      nearestEnemy.ts
  units/
    Unit.ts
    Warrior.ts
    Tank.ts
    Assassin.ts
    registry.ts
  tools/
    PencilSpawnTool.ts
    BrushSpawnTool.ts
    DeleteTool.ts
  ui/
    state.ts
    controls.tsx
    toolbar.tsx
    zoneToggle.tsx
  zones/
    ZoneManager.ts
  shapes/
    UnitShape.ts
    colorUtils.ts
```

Each file: a single `// TODO` comment or minimal typed export.

**Note:** `src/constants.ts` is the game constants file (attack range, tick rate, etc.). It is NOT the tldraw offline `config.js` — that is `src/tlconfig.ts`.

### Task 1.3 — Wire the development loop

Before writing any logic, set up the path between the build output and the live tldraw offline document.

1. Open the target `.tldraw` file in tldraw offline.
2. Use the local API (port 7236) to get the workspace paths:
   ```
   POST http://localhost:7236/api/doc/<docId>/script-workspace
   ```
   Response includes `mainJsPath` and `configJsPath` — absolute paths on disk.
3. Update the build scripts to write directly to those paths:
   ```json
   "build:main": "esbuild src/main.ts ... --outfile=<mainJsPath>",
   "build:config": "esbuild src/tlconfig.ts ... --outfile=<configJsPath>"
   ```
   Or use a `deploy.js` script that copies `dist/main.js` → `mainJsPath` and `dist/config.js` → `configJsPath` after each build.
4. Run `npm run watch` — esbuild rebuilds on save, the app's file watcher hot-reloads automatically.

To find the `<docId>`: call `GET http://localhost:7236/` which lists open documents with their IDs.

Done when: saving `src/main.ts` triggers a rebuild and the tldraw offline canvas reloads the script without manually reopening the file.

### Task 1.4 — Minimal entry points

**`src/main.ts`** (simulation entry):
```ts
import type { Editor } from 'tldraw'

export default function ({ editor, signal }: { editor: Editor; signal: AbortSignal }) {
  console.log('[tlwar] main loaded', editor)
  // All simulation wiring goes here in later phases
}
```

**`src/tlconfig.ts`** (registration entry):
```ts
export default function ({ config }: { config: any }) {
  // Shape utils, tools, and UI components are pushed onto config here
  return config
}
```

Done when: opening the document logs `[tlwar] main loaded` in the app's developer console.

---

## Phase 2 — Constants & Utilities

Goal: a single authoritative constants file and pure color utility functions.

### Task 2.1 — constants.ts

File: `src/constants.ts`

Define and export every hardcoded game constant as a named `const`:

| Constant | Value | What it controls |
|---|---|---|
| `ATTACK_RANGE` | `60` | Distance in px at which a unit can attack |
| `TICK_RATE` | `16` | Minimum ms between simulation ticks (~60fps) |
| `SPATIAL_GRID_CELL_SIZE` | `100` | Grid cell size in px for spatial indexing |
| `RETARGET_RADIUS` | `200` | How far a cached target can drift before re-lookup |
| `BORDER_TOLERANCE_PX` | `8` | How close to a border line counts as "on the line" |
| `PENCIL_SPAWN_INTERVAL` | `50` | px between units when dragging with pencil tool |
| `BRUSH_MIN_UNIT_DISTANCE` | `30` | Min px distance between brush-spawned units |
| `BRUSH_MAX_UNIT_DISTANCE` | `80` | Max px distance between brush-spawned units (soft) |
| `ZONE_LINE_EXTENT` | `10000` | Half-length of zone border lines in px (effectively infinite) |

All values are starting points, not final. Every other file imports from this one — no magic numbers anywhere else.

Done when: every constant referenced in subsequent tasks resolves to this file with no duplicates.

### Task 2.2 — colorUtils.ts

File: `src/shapes/colorUtils.ts`

Two pure functions, no side effects, no imports:

**`interpolateHealthColor(ratio: number): string`**
- `ratio` is `hp / maxHp`, clamped to `[0, 1]`
- `ratio = 0`: return `'#9E9E9E'` (gray — dead)
- `ratio ∈ (0, 1]`: linearly interpolate RGB between red `#F44336` (at 0) → green `#4CAF50` (at 1)
  - At 0.5 the result should look yellow-orange
  - Use linear RGB channel interpolation: `r = r1 + (r2-r1)*ratio`, same for g and b
- Return a hex string `'#RRGGBB'`
- Helper: `toHex(n: number): string` — clamps to [0,255], rounds, zero-pads to 2 chars

**`teamColor(team: string): string`**
- `'A'` → `'#1565C0'` (blue)
- `'B'` → `'#E65100'` (orange)
- `'C'` → `'#6A1B9A'` (purple — not red/green, to avoid confusion with health gradient)
- `'D'` → `'#00838F'` (teal — not red/green, to avoid confusion with health gradient)
- `'unassigned'` → `'#888888'` (gray border before Play is pressed)
- Unknown → `'#888888'`

Done when: `interpolateHealthColor(1) === '#4CAF50'`, `interpolateHealthColor(0) === '#9E9E9E'`, `interpolateHealthColor(0.5)` is visually between yellow and orange.

---

## Phase 3 — Unit System

Goal: the Unit class hierarchy is fully implemented in isolation (no tldraw involvement yet).

### Task 3.1 — Unit base class

File: `src/units/Unit.ts`

```ts
export class Unit {
  id: string                          // unique, set at construction (crypto.randomUUID())
  shapeId: string = ''                // tldraw shape ID, set during World.init()
  team: string
  position: { x: number; y: number }
  hp: number
  maxHp: number
  damage: number
  resistance: number
  moveSpeed: number                   // px/sec
  attackSpeed: number                 // attacks/sec
  attackCooldownMs: number = 0        // counts down; attack fires when ≤ 0
  isAlive: boolean = true
  currentTarget: Unit | null = null
  unitType: 'warrior' | 'tank' | 'assassin'

  constructor(team: string, position: { x: number; y: number }) { ... }

  takeDamage(amount: number): void {
    const effective = Math.max(0, amount - this.resistance)
    this.hp -= effective
    if (this.hp <= 0) this.die()
  }

  die(): void {
    this.hp = 0
    this.isAlive = false
    this.onDeath()
  }

  onSpawn(): void {}   // lifecycle hook, subclasses may override
  onDeath(): void {}   // lifecycle hook, subclasses may override

  onTick(elapsed: number): void {
    // Only internal bookkeeping — no decisions
    if (this.attackCooldownMs > 0) {
      this.attackCooldownMs = Math.max(0, this.attackCooldownMs - elapsed)
    }
  }
}
```

### Task 3.2 — Warrior, Tank, Assassin subclasses

Files: `src/units/Warrior.ts`, `src/units/Tank.ts`, `src/units/Assassin.ts`

Each overrides only the stat defaults and `unitType`:

| Stat | Warrior | Tank | Assassin |
|---|---|---|---|
| `maxHp` / `hp` | 100 | 250 | 50 |
| `damage` | 15 | 8 | 40 |
| `resistance` | 10 | 30 | 2 |
| `moveSpeed` | 60 | 30 | 120 |
| `attackSpeed` | 1.0 | 0.5 | 2.0 |
| `unitType` | `'warrior'` | `'tank'` | `'assassin'` |

No other logic in subclasses.

### Task 3.3 — Unit registry

File: `src/units/registry.ts`

```ts
export type UnitType = 'warrior' | 'tank' | 'assassin'

const registry = {
  warrior: Warrior,
  tank: Tank,
  assassin: Assassin,
} satisfies Record<UnitType, new (team: string, pos: {x:number,y:number}) => Unit>

export function createUnit(type: UnitType, team: string, pos: {x:number,y:number}): Unit {
  return new registry[type](team, pos)
}
```

Done when: `createUnit('assassin', 'A', {x:0,y:0}).damage === 40`.

---

## Phase 4 — Custom Shape (UnitShape)

Goal: units can be created on the canvas and render correctly with health gradient and team border.

### Task 4.1 — UnitShape ShapeUtil

File: `src/shapes/UnitShape.ts`

This is the core tldraw integration. Reference `docs/shapes.md` and `docs/tldraw-offline/tldraw-offline-docs.md §7`.

**Props schema** (use tldraw's `T` validators for runtime type safety):

```ts
import { ShapeUtil, HTMLContainer, Rectangle2d, Ellipse2d, Polygon2d, T } from 'tldraw'
import { interpolateHealthColor, teamColor } from './colorUtils'

const unitShapeProps = {
  unitType: T.literalEnum('warrior', 'tank', 'assassin'),
  hp: T.number,
  maxHp: T.number,
  team: T.string,
}

export class UnitShapeUtil extends ShapeUtil<UnitShape> {
  static override type = 'unit' as const
  static override props = unitShapeProps

  getDefaultProps() {
    return { unitType: 'warrior' as const, hp: 100, maxHp: 100, team: 'unassigned' }
  }
  ...
}
```

**Size map** (used at shape creation time only — `w`/`h` are set once and never changed):

| `unitType` | `w` | `h` |
|---|---|---|
| `'warrior'` | 32 | 32 |
| `'tank'` | 48 | 48 |
| `'assassin'` | 24 | 24 |

Export a helper:
```ts
export function unitSize(type: UnitType): { w: number; h: number } { ... }
```

**`getGeometry(shape)`**: return the appropriate geometry for hit-testing:
- Warrior → `new Ellipse2d({ width: shape.props.w, height: shape.props.h, isFilled: true })`

  Wait — `w`/`h` are standard tldraw shape fields on the shape itself, not in `props`. Access as `shape.w` and `shape.h`, not `shape.props.w`.

- Warrior → `new Ellipse2d({ width: shape.w, height: shape.h, isFilled: true })`
- Tank → `new Rectangle2d({ width: shape.w, height: shape.h, isFilled: true })`
- Assassin → `new Polygon2d({ points: diamond(shape.w, shape.h), isFilled: true })`

  where `diamond(w, h)` returns 4 `Vec` points: top `(w/2,0)`, right `(w, h/2)`, bottom `(w/2, h)`, left `(0, h/2)`.

**`component(shape)`**:
```tsx
component(shape) {
  const ratio = shape.props.hp / shape.props.maxHp
  const fill = interpolateHealthColor(ratio)
  const border = teamColor(shape.props.team)

  const baseStyle: React.CSSProperties = {
    width: '100%', height: '100%',
    backgroundColor: fill,
    border: `3px solid ${border}`,
    boxSizing: 'border-box',
    pointerEvents: 'none',
  }

  const shapeStyle: React.CSSProperties =
    shape.props.unitType === 'warrior'
      ? { ...baseStyle, borderRadius: '50%' }
      : shape.props.unitType === 'assassin'
      ? { ...baseStyle, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }
      : baseStyle // tank: plain rectangle

  return <HTMLContainer><div style={shapeStyle} /></HTMLContainer>
}
```

**`indicator(shape)`**: return `null` — no selection highlight during simulation.

**Registration**: this class is NOT registered here. It is pushed onto `config.shapeUtils` in `src/tlconfig.ts` (Phase 8).

Done when: creating a shape of type `'unit'` on the canvas renders a green circle (warrior) with a gray border (unassigned team).

---

## Phase 5 — Zone System

Goal: zone borders render on canvas; `getTeam` and `isOnBorder` work correctly.

### Task 5.1 — ZoneManager

File: `src/zones/ZoneManager.ts`

Reference: `docs/zones.md` in full.

**Important:** zone geometry is fixed to canvas coordinates centered at `(0, 0)` — not viewport-relative. This means the split is always at x=0 (vertical line) and y=0 (horizontal line), regardless of where the user has panned the camera. The zone borders extend `±ZONE_LINE_EXTENT` px from the origin.

```ts
import { Editor, createShapeId } from 'tldraw'
import { BORDER_TOLERANCE_PX, ZONE_LINE_EXTENT } from '../constants'

export class ZoneManager {
  private editor: Editor
  private zoneCount: 2 | 4 = 2
  private borderShapeIds: string[] = []

  constructor(editor: Editor) { this.editor = editor }

  setZoneCount(count: 2 | 4): void {
    this.zoneCount = count
    this.cleanup()
    this.renderBorders()
  }

  renderBorders(): void {
    // Create line shapes at x=0 (vertical split) and y=0 (horizontal split)
    // Shapes must be: isLocked: true, opacity: 0.3 or a colored overlay
    // Use createShapeId('zone-v') and createShapeId('zone-h') for stable IDs
    // Use tldraw 'line' or 'geo' shape with a very large w/h to span the canvas
    // Store created IDs in this.borderShapeIds
  }

  getTeam(pos: { x: number; y: number }): string {
    if (this.zoneCount === 2) {
      return pos.x < 0 ? 'A' : 'B'
    }
    // 4 zones: quadrants of (0,0)
    if (pos.x < 0 && pos.y < 0) return 'A'  // top-left
    if (pos.x >= 0 && pos.y < 0) return 'B'  // top-right
    if (pos.x < 0 && pos.y >= 0) return 'C'  // bottom-left
    return 'D'                                  // bottom-right
  }

  isOnBorder(pos: { x: number; y: number }): boolean {
    const onVertical = Math.abs(pos.x) <= BORDER_TOLERANCE_PX
    if (this.zoneCount === 2) return onVertical
    const onHorizontal = Math.abs(pos.y) <= BORDER_TOLERANCE_PX
    return onVertical || onHorizontal
  }

  cleanup(): void {
    if (this.borderShapeIds.length > 0) {
      this.editor.deleteShapes(this.borderShapeIds)
      this.borderShapeIds = []
    }
  }
}
```

Done when: `getTeam({x: -100, y: 0})` returns `'A'` and `isOnBorder({x: 5, y: 999})` returns `true` with default `BORDER_TOLERANCE_PX = 8`.

---

## Phase 6 — World State & Simulation Loop

Goal: the tick loop runs, units move, combat resolves correctly.

### Task 6.1 — SpatialGrid

Define as a private class in `src/simulation/world.ts`:

```ts
class SpatialGrid {
  private cells = new Map<string, Set<Unit>>()
  constructor(private cellSize: number) {}

  private key(pos: {x:number,y:number}): string {
    const col = Math.floor(pos.x / this.cellSize)
    const row = Math.floor(pos.y / this.cellSize)
    return `${col},${row}`
  }

  insert(unit: Unit): void { ... }   // add to cell for unit.position
  remove(unit: Unit): void { ... }   // remove from its cell
  move(unit: Unit, oldPos: {x:number,y:number}): void {
    // only call remove/insert if the cell key changed
  }
  getNearbyUnits(pos: {x:number,y:number}): Unit[] {
    // return units from the 3×3 neighborhood of cells around pos
  }
  clear(): void { this.cells.clear() }
}
```

Grid cell size: `SPATIAL_GRID_CELL_SIZE` from `src/constants.ts`.

### Task 6.2 — World class

File: `src/simulation/world.ts`

```ts
export class World {
  units: Unit[] = []
  spatialGrid: SpatialGrid
  teamMap = new Map<string, string>()  // unitId → teamId

  constructor(editor: Editor, zoneManager: ZoneManager) {
    this.spatialGrid = new SpatialGrid(SPATIAL_GRID_CELL_SIZE)

    // Get all unit shapes from the canvas
    const shapes = editor.getCurrentPageShapes().filter(s => s.type === 'unit')

    for (const shape of shapes) {
      const pos = { x: shape.x, y: shape.y }
      const props = shape.props as UnitShapeProps
      const team = zoneManager.getTeam(pos)
      const unit = createUnit(props.unitType as UnitType, team, pos)
      unit.shapeId = shape.id
      unit.hp = props.hp
      this.units.push(unit)
      this.teamMap.set(unit.id, team)
      this.spatialGrid.insert(unit)
    }
  }

  removeUnit(unit: Unit): void {
    unit.isAlive = false
    this.units = this.units.filter(u => u !== unit)
    this.spatialGrid.remove(unit)
  }

  getNearestEnemy(unit: Unit): Unit | null {
    const candidates = this.spatialGrid.getNearbyUnits(unit.position)
    let nearest: Unit | null = null
    let minDist = Infinity
    for (const other of candidates) {
      if (!other.isAlive) continue
      if (this.teamMap.get(other.id) === this.teamMap.get(unit.id)) continue
      const d = dist(unit.position, other.position)
      if (d < minDist) { minDist = d; nearest = other }
    }
    return nearest
  }

  checkVictory(): string | null {
    const livingTeams = new Set(
      this.units.filter(u => u.isAlive).map(u => this.teamMap.get(u.id)!)
    )
    return livingTeams.size === 1 ? [...livingTeams][0] : null
  }
}

function dist(a: {x:number,y:number}, b: {x:number,y:number}): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}
```

### Task 6.3 — AI interface

File: `src/simulation/ai/interface.ts`

```ts
import type { Unit } from '../../units/Unit'
import type { World } from '../world'

export type AIAction =
  | { type: 'move'; direction: { x: number; y: number } }
  | { type: 'attack'; target: Unit }
  | { type: 'idle' }

export interface AIAlgorithm {
  decide(unit: Unit, world: World): AIAction
}
```

### Task 6.4 — Nearest-enemy AI

File: `src/simulation/ai/nearestEnemy.ts`

```ts
decide(unit: Unit, world: World): AIAction {
  // 1. Validate cached target
  if (unit.currentTarget && (!unit.currentTarget.isAlive ||
      dist(unit.position, unit.currentTarget.position) > RETARGET_RADIUS)) {
    unit.currentTarget = null
  }
  if (!unit.currentTarget) {
    unit.currentTarget = world.getNearestEnemy(unit)
  }
  if (!unit.currentTarget) return { type: 'idle' }

  const target = unit.currentTarget
  const d = dist(unit.position, target.position)

  // 2. Attack if in range and cooldown expired
  if (d <= ATTACK_RANGE && unit.attackCooldownMs <= 0) {
    return { type: 'attack', target }
  }

  // 3. Move toward target
  const dx = target.position.x - unit.position.x
  const dy = target.position.y - unit.position.y
  const len = Math.hypot(dx, dy)
  return { type: 'move', direction: { x: dx/len, y: dy/len } }
}
```

### Task 6.5 — Tick loop

File: `src/simulation/loop.ts`

```ts
import { Editor } from 'tldraw'
import { TICK_RATE, ATTACK_RANGE } from '../constants'
import type { World } from './world'
import type { AIAlgorithm } from './ai/interface'

export class SimulationLoop {
  private accumulated = 0
  private _running = false

  constructor(
    private editor: Editor,
    private world: World,
    private ai: AIAlgorithm,
    private onVictory: (team: string) => void
  ) {}

  start(): void {
    this._running = true
    this.editor.on('tick', this.onTick)
  }

  stop(): void {
    this._running = false
    this.editor.off('tick', this.onTick)
  }

  private onTick = (elapsed: number): void => {
    this.accumulated += elapsed
    if (this.accumulated < TICK_RATE) return
    const dt = this.accumulated
    this.accumulated = 0

    const { world, ai, editor } = this
    const shapeUpdates: any[] = []
    const shapeDeletes: string[] = []

    // 1. Per-unit tick (cooldowns)
    for (const unit of world.units) {
      unit.onTick(dt)
    }

    // 2. AI decisions + apply
    for (const unit of world.units) {
      const action = ai.decide(unit, world)

      if (action.type === 'move') {
        const oldPos = { ...unit.position }
        unit.position.x += action.direction.x * unit.moveSpeed * (dt / 1000)
        unit.position.y += action.direction.y * unit.moveSpeed * (dt / 1000)
        world.spatialGrid.move(unit, oldPos)
        shapeUpdates.push({
          id: unit.shapeId, type: 'unit',
          x: unit.position.x, y: unit.position.y,
        })
      } else if (action.type === 'attack') {
        action.target.takeDamage(unit.damage)
        unit.attackCooldownMs = 1000 / unit.attackSpeed

        if (!action.target.isAlive) {
          shapeDeletes.push(action.target.shapeId)
          world.removeUnit(action.target)
        } else {
          shapeUpdates.push({
            id: action.target.shapeId, type: 'unit',
            props: { hp: action.target.hp },
          })
        }
      }
    }

    // 3. Batch all canvas writes in one call — history:'ignore' is mandatory
    editor.run(() => {
      if (shapeUpdates.length > 0) editor.updateShapes(shapeUpdates)
      if (shapeDeletes.length > 0) editor.deleteShapes(shapeDeletes)
    }, { history: 'ignore' })

    // 4. Victory check
    const winner = world.checkVictory()
    if (winner) {
      this.stop()
      this.onVictory(winner)
    }
  }
}
```

---

## Phase 7 — Spawn Tools

Goal: user can place units on the canvas before the simulation starts.

### Task 7.1 — PencilSpawnTool

File: `src/tools/PencilSpawnTool.ts`

```ts
import { StateNode, TLPointerEventInfo, createShapeId } from 'tldraw'
import { unitSize } from '../shapes/UnitShape'
import { selectedUnitType } from '../ui/state'

export class PencilSpawnTool extends StateNode {
  static override id = 'pencil-spawn'
  static override initial = 'idle'

  private isDragging = false
  private lastSpawnPos: {x:number,y:number} | null = null

  onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
    this.isDragging = false
    this.lastSpawnPos = this.editor.inputs.currentPagePoint
  }

  onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
    if (!this.editor.inputs.isDragging) return
    const current = this.editor.inputs.currentPagePoint
    if (!this.lastSpawnPos) return
    const d = Math.hypot(current.x - this.lastSpawnPos.x, current.y - this.lastSpawnPos.y)
    if (d >= PENCIL_SPAWN_INTERVAL) {
      this.spawnAt(current)
      this.lastSpawnPos = { ...current }
      this.isDragging = true
    }
  }

  onPointerUp: TLEventHandlers['onPointerUp'] = (info) => {
    if (!this.isDragging) {
      this.spawnAt(this.editor.inputs.currentPagePoint)
    }
    this.isDragging = false
    this.lastSpawnPos = null
  }

  private spawnAt(pos: {x:number,y:number}): void {
    const type = selectedUnitType.get()
    const size = unitSize(type)
    this.editor.createShape({
      id: createShapeId(),
      type: 'unit',
      x: pos.x - size.w / 2,
      y: pos.y - size.h / 2,
      props: { unitType: type, hp: unitMaxHp(type), maxHp: unitMaxHp(type), team: 'unassigned' },
    })
  }
}
```

`unitMaxHp(type)` is a small helper returning the base `maxHp` for each unit type (from constants or Unit class defaults). Import `PENCIL_SPAWN_INTERVAL` from `src/constants.ts`.

### Task 7.2 — BrushSpawnTool

File: `src/tools/BrushSpawnTool.ts`

```ts
export class BrushSpawnTool extends StateNode {
  static override id = 'brush-spawn'

  onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
    const center = this.editor.inputs.currentPagePoint
    const R = brushRadius.get()
    const N = unitCount.get()
    const type = selectedUnitType.get()
    const size = unitSize(type)
    const placed: {x:number,y:number}[] = []

    let attempts = 0
    const maxAttempts = 50 * N

    while (placed.length < N && attempts < maxAttempts) {
      attempts++
      const angle = Math.random() * 2 * Math.PI
      const r = Math.random() * R
      const candidate = { x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r }

      const tooClose = placed.some(p =>
        Math.hypot(p.x - candidate.x, p.y - candidate.y) < BRUSH_MIN_UNIT_DISTANCE
      )
      if (!tooClose) placed.push(candidate)
    }

    this.editor.run(() => {
      for (const pos of placed) {
        this.editor.createShape({
          id: createShapeId(),
          type: 'unit',
          x: pos.x - size.w / 2,
          y: pos.y - size.h / 2,
          props: { unitType: type, hp: unitMaxHp(type), maxHp: unitMaxHp(type), team: 'unassigned' },
        })
      }
    })
  }
}
```

Read `brushRadius`, `unitCount`, `selectedUnitType` atoms from `src/ui/state.ts`. Import constants from `src/constants.ts`.

### Task 7.3 — DeleteTool

File: `src/tools/DeleteTool.ts`

```ts
export class DeleteTool extends StateNode {
  static override id = 'unit-delete'

  onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
    const shape = this.editor.getShapeAtPoint(this.editor.inputs.currentPagePoint)
    if (shape && shape.type === 'unit') {
      this.editor.deleteShape(shape.id)
    }
  }
}
```

`getShapeAtPoint` returns `TLShape | undefined` — the undefined guard is already handled by the `if (shape && ...)` check.

---

## Phase 8 — UI Layer

Goal: user has toolbar for tools/unit types, brush dials, Play/Pause/Clear All, and zone toggle.

### Task 8.1 — Simulation state atoms

File: `src/ui/state.ts`

```ts
import { atom } from 'tldraw'
import type { UnitType } from '../units/registry'

export const simState = atom<'idle' | 'running' | 'paused'>('simState', 'idle')
export const selectedUnitType = atom<UnitType>('selectedUnitType', 'warrior')
export const selectedTool = atom<'pencil' | 'brush' | 'delete'>('selectedTool', 'pencil')
export const brushRadius = atom<number>('brushRadius', 80)
export const unitCount = atom<number>('unitCount', 5)
export const zoneCount = atom<2 | 4>('zoneCount', 2)
export const borderWarning = atom<boolean>('borderWarning', false)
```

All UI components and tools import from this file. Atom names (first arg to `atom()`) must be globally unique strings.

### Task 8.2 — Controls component

File: `src/ui/controls.tsx`

React component using `useValue` from tldraw to read atoms reactively. The `editor` and `zoneManager` instances and the current `SimulationLoop | null` are passed as props (or via a React context set up in `src/tlconfig.ts`).

**Play button**: show when `simState === 'idle'` or `'paused'`; disabled when `borderWarning === true`
- On click:
  1. Re-validate: get all unit shapes, call `zoneManager.isOnBorder(pos)` on each. If any returns true → `borderWarning.set(true)` and return.
  2. `borderWarning.set(false)`
  3. Create `new World(editor, zoneManager)` and `new SimulationLoop(editor, world, new NearestEnemyAI(), announceVictory)`
  4. Store loop reference (React ref or module-level var)
  5. `loop.start()` → `simState.set('running')`

**Pause button**: show when `simState === 'running'`
- On click: `loop.stop()` → `simState.set('paused')`

**Clear All button**: always visible
- On click: `loop?.stop()` → delete all unit shapes via `editor.deleteShapes(unitShapeIds)` → `zoneManager.cleanup()` → `zoneManager.renderBorders()` → `simState.set('idle')` → `borderWarning.set(false)`

**Victory display**: shown when a winner has been announced. Display "Team X wins!" as a styled overlay div. Cleared on Clear All.

### Task 8.3 — Zone toggle

File: `src/ui/zoneToggle.tsx`

```tsx
export function ZoneToggle({ zoneManager }: { zoneManager: ZoneManager }) {
  const count = useValue(zoneCount)
  const state = useValue(simState)
  const disabled = state !== 'idle'

  function toggle() {
    const next = count === 2 ? 4 : 2
    zoneCount.set(next)
    zoneManager.setZoneCount(next)
  }

  return (
    <button onClick={toggle} disabled={disabled}>
      {count === 2 ? '2 Teams' : '4 Teams'}
    </button>
  )
}
```

### Task 8.4 — Toolbar

File: `src/ui/toolbar.tsx`

React component containing:

1. **Unit type selector**: Warrior / Tank / Assassin buttons. Clicking sets `selectedUnitType.set(type)`. Disabled while `simState === 'running'`.

2. **Tool picker**: Pencil / Brush / Delete buttons. Clicking sets `selectedTool.set(tool)` AND calls `editor.setCurrentTool(toolId)` to activate the matching StateNode. Disabled while `simState === 'running'`.

3. **Brush dials** (only shown when `selectedTool === 'brush'`):
   - Brush Radius: `<input type="range" min={20} max={200} step={10}>` → writes to `brushRadius` atom
   - Unit Count: `<input type="range" min={1} max={20} step={1}>` → writes to `unitCount` atom

### Task 8.5 — Wire everything in tlconfig.ts

File: `src/tlconfig.ts`

This is the `script/config.js` entry point. It runs BEFORE the editor mounts.

```ts
import { UnitShapeUtil } from './shapes/UnitShape'
import { PencilSpawnTool } from './tools/PencilSpawnTool'
import { BrushSpawnTool } from './tools/BrushSpawnTool'
import { DeleteTool } from './tools/DeleteTool'
import { Controls } from './ui/controls'
import { Toolbar } from './ui/toolbar'
import { ZoneToggle } from './ui/zoneToggle'

export default function ({ config }: { config: any }) {
  // Register custom shapes
  config.shapeUtils.push(UnitShapeUtil)

  // Register custom tools
  config.tools.push(PencilSpawnTool, BrushSpawnTool, DeleteTool)

  // Mount UI into tldraw's component slots
  // Refer to TLComponents type from tldraw for valid slot names
  config.components = {
    ...config.components,
    TopPanel: Controls,
    // The toolbar and zone toggle can be part of Controls or separate slots
    // Check tldraw's TLComponents for available slots (TopPanel, BottomPanel, etc.)
  }

  return config
}
```

### Task 8.6 — Wire main.ts

File: `src/main.ts`

After the editor mounts, set up the ZoneManager (initial borders) and activate the pencil tool as the default:

```ts
import { Editor } from 'tldraw'
import { ZoneManager } from './zones/ZoneManager'

export default function ({ editor, signal }: { editor: Editor; signal: AbortSignal }) {
  const zoneManager = new ZoneManager(editor)
  zoneManager.renderBorders()

  // Activate pencil tool by default
  editor.setCurrentTool('pencil-spawn')

  // Store zoneManager somewhere the UI components can access it
  // Option: module-level singleton, React context, or window.__tlwar
  ;(window as any).__tlwarZoneManager = zoneManager

  // Clean up on document close or script reload
  signal.addEventListener('abort', () => {
    zoneManager.cleanup()
  })
}
```

The `zoneManager` instance must be accessible to the UI components (Controls, ZoneToggle). Use a module-level singleton or React context — the simplest approach is a module-level variable in a shared file (e.g., `src/runtime.ts`) that `main.ts` sets on startup and components import from.

---

## Phase 9 — Integration & Polish

Goal: full end-to-end battle scenario works without errors.

### Task 9.1 — Dev workflow verification

Confirm the development loop works before testing logic:
1. Open the `.tldraw` file in tldraw offline
2. Call `POST /api/doc/:id/script-workspace` — get `mainJsPath` and `configJsPath`
3. Run `npm run watch` — confirm that esbuild writes to those paths
4. Save any `.ts` file — confirm tldraw offline reloads the script automatically (no file reopening needed)

Done when: a `console.log` in `main.ts` appears in the app's developer console on every save.

### Task 9.2 — Integration smoke test

Manual test:
1. Open the document
2. Toggle to 4-team mode — four quadrant borders appear (two lines at x=0, y=0)
3. Spawn ~5 Warriors in the top-left quadrant and ~5 Tanks in the top-right quadrant
4. Press Play — units begin moving toward each other; colors shift as HP drops; dead units disappear
5. Simulation ends with "Team X wins!" overlay
6. Press Clear All — canvas resets, borders re-render, Play is re-enabled, simState returns to idle

Fix any crash or incorrect behavior before moving on.

### Task 9.3 — Performance check

Spawn 50 Warriors per team (100 total) and run. Target: no visible frame drop.

If performance is poor, check in order:
- Every `editor.run()` in the tick loop has `{ history: 'ignore' }` — verify
- Dead units are removed from `world.units` immediately via `world.removeUnit()` — verify
- `currentTarget` caching is working (units should not lookup spatialGrid every tick) — add a debug counter
- Tune `SPATIAL_GRID_CELL_SIZE` or `RETARGET_RADIUS` in `src/constants.ts`

### Task 9.4 — Border validation UX

1. Spawn a unit exactly on the x=0 vertical border line
2. Press Play — Play should be disabled or the action should be blocked, with the message shown
3. Move the unit away from the border
4. Play should become enabled again

Border re-check should run reactively: subscribe to `editor.store.listen(...)` and re-check all unit positions on each shape change, updating `borderWarning` accordingly. Do NOT re-check only on Play click — the disabled state should track live.

### Task 9.5 — Final build check

- `npm run typecheck` produces zero TypeScript errors
- `npm run build` succeeds and produces `dist/main.js` and `dist/config.js` as valid ES modules
- Remove all `// TODO` stubs from Phase 1

---

## Implementation Notes

**Phase ordering:** Phases 3–5 are independent of each other and can be done in parallel. Phase 6 requires Phase 3 (Unit classes) and Phase 5 (ZoneManager). Phases 7–8 require Phase 4 (UnitShape). Phase 9 requires all previous phases.

**The two-file architecture is mandatory.** `config.js` registers shapes/tools/UI before mount; `main.js` runs after mount. Any attempt to register shapes at runtime (after mount) will fail — there is no `editor.registerShapeUtils()` method.

**`history: 'ignore'` is mandatory** on every `editor.run()` in the tick loop. Omitting it will fill the undo stack within seconds and kill performance.

**Zone coordinates are fixed to canvas origin `(0, 0)`.** Team assignment (`getTeam`) uses canvas-space coordinates, not screen/viewport coordinates. Units placed at `x < 0` are always Team A, regardless of where the camera is panned.

**`editor.getShapeAtPoint()` returns `TLShape | undefined`** — always guard against undefined before accessing `.type` or `.id`.

**`editor.getViewportPageBounds()` returns `Box | undefined`** — always guard if used. Prefer using fixed canvas coordinates (e.g., `(0, 0)` as zone center) to avoid viewport dependency.

**`atom()` import:** use `import { atom, useValue } from 'tldraw'`. These are re-exported from `@tldraw/state` and `@tldraw/state-react` respectively.

**Team colors for 4-team mode:** use purple (`#6A1B9A`) and teal (`#00838F`) for teams C and D — NOT red or green, which would conflict visually with the health gradient.

**Units spawn with `team: 'unassigned'`** — the `UnitShape` renders these with a gray border (`teamColor('unassigned') === '#888888'`). Teams are resolved by `World` constructor at Play time.
