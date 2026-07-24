# Spawning Tools

Units are placed on the canvas using two spawn tools. The flow is always: **select unit type → select spawn tool → place on canvas**.

## Mode 1 — Pencil

- **Single click + release**: spawn 1 unit at cursor position
- **Click + drag**: spawn units at regular distance intervals along the drag path
  - Interval is distance-based, not time-based — drag speed does not affect spawn count
  - Interval distance: `PENCIL_SPAWN_INTERVAL` (px, hardcoded constant in `constants.ts`)

## Mode 2 — Brush

A circular spawn area centered on the cursor.

- **Click**: scatter N units inside the circle in pseudo-random positions
- Two **user-adjustable dials** in the tool panel:
  - **Brush radius**: controls the size of the spawn circle
  - **Unit count**: controls how many units spawn per click
- Two **code-only constants** (not exposed to the user):
  - `BRUSH_MIN_UNIT_DISTANCE`: minimum distance between any two spawned units
  - `BRUSH_MAX_UNIT_DISTANCE`: maximum distance between any two spawned units (soft limit, best-effort)
- The placement algorithm retries positions until spacing constraints are satisfied, up to a max attempt count to prevent infinite loops

## Deletion tool

A dedicated delete tool in the toolbar. Click a unit to remove it. No drag-delete in the initial implementation.

## Constants (constants.ts)

| Constant | Description |
|---|---|
| `PENCIL_SPAWN_INTERVAL` | Distance in px between units when dragging with the pencil tool |
| `BRUSH_MIN_UNIT_DISTANCE` | Minimum px distance between brush-spawned units |
| `BRUSH_MAX_UNIT_DISTANCE` | Maximum px distance between brush-spawned units (soft limit) |
