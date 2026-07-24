# Zone System

## Overview

The canvas is divided into 2 or 4 equal zones before a battle starts. A unit's team is determined by which zone it occupies when Play is pressed. The zone toggle is only available before a battle starts or after Clear All.

## Zone layout

| Mode | Layout |
|---|---|
| 2 teams | Left half / right half, split at canvas center (vertical line) |
| 4 teams | Four equal quadrants, split at canvas center (horizontal + vertical lines) |

Zone borders are rendered as locked background shapes — non-selectable and non-movable. Each zone has a distinct colored overlay so team areas are visually unambiguous.

## Team assignment

Team assignment is determined at Play time: whichever zone a unit's center point `(x, y)` falls in becomes its team. Assignment is fixed for the duration of the battle.

## Border validation

Units whose center falls exactly on a border line (within a tolerance of `BORDER_TOLERANCE_PX`, defined in `config.ts`) are considered "on the line." The **Play button is disabled** while any such unit exists, and a message is shown:

> "Some units are on a zone border. Remove or move them before starting."

This avoids any ambiguous team assignment — the user must resolve it explicitly.

## Extensibility

The number of zones is always a power of 2 (`2`, `4`, `8`, `16`, …). Adding more zones requires only a config change — the split is always centered and the layout is always a uniform grid. `ZoneManager` derives zone boundaries from the zone count and canvas dimensions at runtime; no hardcoded coordinates.

## ZoneManager interface

`ZoneManager` is responsible for:

- **Rendering** zone border shapes on the canvas (called when the toggle changes or the canvas is initialized)
- **`getTeam(position)`** — returns the team identifier for a given `(x, y)` point; used at Play time to assign teams to units
- **`isOnBorder(position)`** — returns `true` if the position is within `BORDER_TOLERANCE_PX` of any zone line; used to gate the Play button
- **Cleanup** — removes border shapes on Clear All

## Constants (config.ts)

| Constant | Description |
|---|---|
| `BORDER_TOLERANCE_PX` | How close to a border line a unit's center must be to count as "on the line" |
